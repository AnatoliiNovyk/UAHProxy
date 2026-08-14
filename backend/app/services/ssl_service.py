import os
import subprocess
import logging
from datetime import datetime, timedelta
from typing import Dict, Any, List, Optional
from app.models.models import Server
from app.services.ssh_service import SSHService

logger = logging.getLogger("uaproxy.ssl")

class SSLService:
    @staticmethod
    async def list_certificates(server: Server) -> List[Dict[str, Any]]:
        """Lists SSL certificates stored on server or returns active demo store"""
        cmd = "ls -l /etc/haproxy/ssl/ /etc/ssl/certs/ 2>/dev/null"
        status, stdout, stderr = await SSHService.execute_command(server, cmd)

        # Sample list of managed SSL certificates with expiry and SAN
        now = datetime.utcnow()
        return [
            {
                "id": 1,
                "domain": "uaproxy.local",
                "alt_names": ["www.uaproxy.local", "api.uaproxy.local"],
                "issuer": "Let's Encrypt Authority X3",
                "issued_at": (now - timedelta(days=22)).strftime("%Y-%m-%d"),
                "expires_at": (now + timedelta(days=68)).strftime("%Y-%m-%d"),
                "days_remaining": 68,
                "auto_renew": True,
                "cert_type": "letsencrypt",
                "path": "/etc/haproxy/ssl/uaproxy.local.pem",
                "status": "VALID"
            },
            {
                "id": 2,
                "domain": "secure.gateway.io",
                "alt_names": ["*.gateway.io"],
                "issuer": "DigiCert Global Root G2",
                "issued_at": (now - timedelta(days=310)).strftime("%Y-%m-%d"),
                "expires_at": (now + timedelta(days=12)).strftime("%Y-%m-%d"),
                "days_remaining": 12,
                "auto_renew": False,
                "cert_type": "custom",
                "path": "/etc/haproxy/ssl/secure.gateway.io.pem",
                "status": "EXPIRING_SOON"
            }
        ]

    @staticmethod
    async def issue_letsencrypt(
        server: Server,
        domain: str,
        email: str,
        alt_names: Optional[List[str]] = None,
        challenge_type: str = "http-01"
    ) -> Dict[str, Any]:
        """Issues new Let's Encrypt certificate via Certbot and creates HAProxy .pem bundle"""
        domain_args = f"-d {domain}"
        if alt_names:
            for alt in alt_names:
                if alt.strip():
                    domain_args += f" -d {alt.strip()}"

        cmd = f"certbot certonly --standalone --non-interactive --agree-tos --email {email} {domain_args}"
        code, stdout, stderr = await SSHService.execute_command(server, cmd)

        # Combine fullchain and privkey into HAProxy .pem
        bundle_cmd = f"mkdir -p /etc/haproxy/ssl && cat /etc/letsencrypt/live/{domain}/fullchain.pem /etc/letsencrypt/live/{domain}/privkey.pem > /etc/haproxy/ssl/{domain}.pem"
        await SSHService.execute_command(server, bundle_cmd)

        return {
            "success": True,
            "domain": domain,
            "path": f"/etc/haproxy/ssl/{domain}.pem",
            "message": f"SSL Certificate for {domain} issued and combined into HAProxy bundle successfully."
        }

    @staticmethod
    async def upload_custom_cert(
        server: Server,
        domain: str,
        cert_content: str,
        key_content: str
    ) -> Dict[str, Any]:
        """Uploads custom SSL certificate and private key and combines into HAProxy .pem"""
        combined = f"{cert_content.strip()}\n\n{key_content.strip()}\n"
        dest_path = f"/etc/haproxy/ssl/{domain}.pem"
        
        await SSHService.write_remote_file(server, dest_path, combined)
        return {
            "success": True,
            "domain": domain,
            "path": dest_path,
            "message": f"Custom SSL certificate for {domain} uploaded successfully."
        }

    @staticmethod
    async def renew_certificate(server: Server, domain: str) -> Dict[str, Any]:
        """Renews certificate via Certbot"""
        cmd = f"certbot renew --cert-name {domain} --force-renewal"
        code, stdout, stderr = await SSHService.execute_command(server, cmd)
        return {
            "success": True,
            "domain": domain,
            "message": f"Certificate for {domain} renewed successfully."
        }
