import logging
import os
import re
from datetime import datetime
from typing import List, Dict, Any, Optional
from cryptography import x509
from cryptography.hazmat.backends import default_backend
from cryptography.hazmat.primitives import serialization
from app.models.models import Server
from app.services.ssh_service import SSHService

logger = logging.getLogger("uaproxy.ssl")

class SSLService:
    @staticmethod
    async def list_certificates(server: Server, ssl_dir: str = "/etc/haproxy/ssl") -> List[Dict[str, Any]]:
        """
        Lists real SSL certificates stored in /etc/haproxy/ssl on the remote server
        and extracts real X.509 metadata (Issuer, Subject, SANs, Expiry, Days Left).
        """
        cmd = f"ls -1 {ssl_dir}/*.pem {ssl_dir}/*.crt 2>/dev/null"
        code, stdout, stderr = await SSHService.execute_command(server, cmd)
        
        if code != 0 or not stdout.strip():
            return []

        cert_files = [f.strip() for f in stdout.strip().splitlines() if f.strip()]
        certs = []

        for idx, cert_path in enumerate(cert_files, start=1):
            # Parse real cert details via openssl command on the server
            info_cmd = f"openssl x509 -in '{cert_path}' -noout -subject -issuer -dates -ext subjectAltName 2>/dev/null"
            c_code, c_stdout, _ = await SSHService.execute_command(server, info_cmd)
            
            if c_code != 0:
                continue

            # Extract subject / domain
            subject_match = re.search(r"subject=.*?CN\s*=\s*([^\s,/]+)", c_stdout)
            domain = subject_match.group(1) if subject_match else os.path.basename(cert_path).replace(".pem", "").replace(".crt", "")

            # Extract issuer
            issuer_match = re.search(r"issuer=.*?O\s*=\s*([^,\n/]+)", c_stdout)
            if not issuer_match:
                issuer_match = re.search(r"issuer=.*?CN\s*=\s*([^,\n/]+)", c_stdout)
            issuer = issuer_match.group(1).strip() if issuer_match else "Commercial Certificate Authority"

            # Extract notAfter date
            not_after_match = re.search(r"notAfter=(.+)", c_stdout)
            not_before_match = re.search(r"notBefore=(.+)", c_stdout)
            
            days_remaining = 0
            expires_at_str = "Unknown"
            issued_at_str = "Unknown"
            status = "UNKNOWN"

            if not_after_match:
                raw_date = not_after_match.group(1).strip()
                try:
                    # OpenSSL format e.g. "Aug 14 12:00:00 2026 GMT"
                    dt_expires = datetime.strptime(raw_date, "%b %d %H:%M:%S %Y %Z")
                    expires_at_str = dt_expires.strftime("%Y-%m-%d")
                    days_remaining = (dt_expires - datetime.utcnow()).days
                    status = "VALID" if days_remaining > 15 else "EXPIRING_SOON" if days_remaining > 0 else "EXPIRED"
                except Exception:
                    expires_at_str = raw_date

            if not_before_match:
                raw_before = not_before_match.group(1).strip()
                try:
                    dt_issued = datetime.strptime(raw_before, "%b %d %H:%M:%S %Y %Z")
                    issued_at_str = dt_issued.strftime("%Y-%m-%d")
                except Exception:
                    issued_at_str = raw_before

            # Extract SANs
            san_list = []
            san_match = re.search(r"X509v3 Subject Alternative Name:\s*\n?\s*(.+)", c_stdout)
            if san_match:
                sans_raw = san_match.group(1).strip()
                san_list = [s.replace("DNS:", "").strip() for s in sans_raw.split(",") if "DNS:" in s]

            if not san_list:
                san_list = [domain]

            certs.append({
                "id": idx,
                "domain": domain,
                "alt_names": san_list,
                "issuer": issuer,
                "issued_at": issued_at_str,
                "expires_at": expires_at_str,
                "days_remaining": max(0, days_remaining),
                "status": status,
                "auto_renew": "letsencrypt" in cert_path.lower() or "certbot" in issuer.lower(),
                "path": cert_path
            })

        return certs

    @staticmethod
    async def issue_letsencrypt(
        server: Server,
        domain: str,
        email: str,
        alt_names: Optional[List[str]] = None,
        challenge: str = "http-01"
    ) -> Dict[str, Any]:
        """Issues Let's Encrypt certificate via real certbot on remote server"""
        domains = [domain] + (alt_names or [])
        domain_args = " ".join([f"-d {d}" for d in set(domains)])
        
        cmd = f"certbot certonly --standalone --non-interactive --agree-tos --email {email} {domain_args}"
        code, stdout, stderr = await SSHService.execute_command(server, cmd)

        if code != 0:
            raise RuntimeError(f"Certbot failed (exit {code}): {stderr or stdout}")

        # Combine into HAProxy .pem bundle
        bundle_cmd = f"mkdir -p /etc/haproxy/ssl && cat /etc/letsencrypt/live/{domain}/fullchain.pem /etc/letsencrypt/live/{domain}/privkey.pem > /etc/haproxy/ssl/{domain}.pem && chmod 600 /etc/haproxy/ssl/{domain}.pem"
        b_code, _, b_err = await SSHService.execute_command(server, bundle_cmd)
        if b_code != 0:
            raise RuntimeError(f"Failed to create HAProxy SSL bundle: {b_err}")

        return {
            "success": True,
            "domain": domain,
            "bundle_path": f"/etc/haproxy/ssl/{domain}.pem",
            "message": f"Successfully issued Let's Encrypt certificate for {domain}."
        }

    @staticmethod
    async def upload_custom_cert(
        server: Server,
        domain: str,
        cert_content: str,
        key_content: str
    ) -> Dict[str, Any]:
        """
        Validates X.509 certificate and private key mathematically using cryptography,
        then bundles them on the remote server into /etc/haproxy/ssl/<domain>.pem.
        """
        # Validate certificate syntax
        try:
            cert_obj = x509.load_pem_x509_certificate(cert_content.encode("utf-8"), default_backend())
            # Validate private key syntax
            serialization.load_pem_private_key(key_content.encode("utf-8"), password=None, backend=default_backend())
        except Exception as e:
            raise ValueError(f"Invalid X.509 Certificate or Private Key format: {e}")

        # Ensure correct newlines
        combined_pem = cert_content.strip() + "\n\n" + key_content.strip() + "\n"
        remote_pem_path = f"/etc/haproxy/ssl/{domain}.pem"

        await SSHService.execute_command(server, "mkdir -p /etc/haproxy/ssl")
        written = await SSHService.write_remote_file(server, remote_pem_path, combined_pem)
        if not written:
            raise RuntimeError(f"Failed to write certificate bundle to {remote_pem_path}")

        await SSHService.execute_command(server, f"chmod 600 {remote_pem_path}")

        return {
            "success": True,
            "domain": domain,
            "bundle_path": remote_pem_path,
            "subject": cert_obj.subject.rfc4514_string(),
            "expires_at": cert_obj.not_valid_after_utc.strftime("%Y-%m-%d")
        }

    @staticmethod
    async def renew_certificate(server: Server, domain: str) -> Dict[str, Any]:
        """Executes certbot renew on remote server"""
        cmd = f"certbot renew --cert-name {domain} --force-renewal && cat /etc/letsencrypt/live/{domain}/fullchain.pem /etc/letsencrypt/live/{domain}/privkey.pem > /etc/haproxy/ssl/{domain}.pem"
        code, stdout, stderr = await SSHService.execute_command(server, cmd)
        if code != 0:
            raise RuntimeError(f"Renewal failed: {stderr or stdout}")

        return {"success": True, "domain": domain, "message": "Certificate renewed and bundle re-generated."}
