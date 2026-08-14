import asyncio
import time
import socket
import ssl
import subprocess
import httpx
import logging
from datetime import datetime, timezone
from cryptography import x509
from cryptography.hazmat.backends import default_backend
from typing import Dict, Any
from app.models.models import SmonTarget

logger = logging.getLogger("uaproxy.smon")

class SmonCheckerService:
    @staticmethod
    async def check_target(target: SmonTarget) -> Dict[str, Any]:
        """
        Executes genuine synthetic health-checks:
        - http / https: Real HTTP GET request & response time measurement
        - tcp: Real TCP socket handshake
        - ping: Real ICMP echo request
        - ssl: Real TLS handshake and X.509 certificate expiry extraction
        """
        start_time = time.time()
        status = "DOWN"
        details = ""
        response_time_ms = 0.0

        try:
            if target.target_type == "http":
                async with httpx.AsyncClient(verify=False, timeout=5.0) as client:
                    resp = await client.get(target.host_or_url)
                    response_time_ms = round((time.time() - start_time) * 1000, 2)
                    if resp.status_code == target.expected_status_code:
                        status = "UP"
                        details = f"HTTP {resp.status_code} OK ({response_time_ms} ms)"
                    else:
                        status = "WARNING"
                        details = f"HTTP {resp.status_code} (Expected {target.expected_status_code})"

            elif target.target_type == "tcp":
                host = target.host_or_url
                port = target.port or 80
                s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
                s.settimeout(3.0)
                try:
                    s.connect((host, port))
                    response_time_ms = round((time.time() - start_time) * 1000, 2)
                    status = "UP"
                    details = f"TCP Port {port} Connected ({response_time_ms} ms)"
                finally:
                    s.close()

            elif target.target_type == "ssl":
                host = target.host_or_url.replace("https://", "").replace("http://", "").split("/")[0].split(":")[0]
                port = target.port or 443
                ctx = ssl.create_default_context()
                ctx.check_hostname = False
                ctx.verify_mode = ssl.CERT_NONE

                with socket.create_connection((host, port), timeout=3.0) as sock:
                    with ctx.wrap_socket(sock, server_hostname=host) as ssock:
                        der_cert = ssock.getpeercert(binary_form=True)
                        response_time_ms = round((time.time() - start_time) * 1000, 2)
                        
                        if der_cert:
                            cert = x509.load_der_x509_certificate(der_cert, default_backend())
                            expire_dt = cert.not_valid_after_utc
                            days_left = (expire_dt - datetime.now(timezone.utc)).days

                            if days_left <= 0:
                                status = "DOWN"
                                details = f"SSL Expired on {expire_dt.strftime('%Y-%m-%d')}"
                            elif days_left <= target.ssl_warn_days:
                                status = "WARNING"
                                details = f"SSL Expiring in {days_left} days ({expire_dt.strftime('%Y-%m-%d')})"
                            else:
                                status = "UP"
                                details = f"SSL Valid: {days_left} days remaining ({expire_dt.strftime('%Y-%m-%d')})"
                        else:
                            status = "WARNING"
                            details = "TLS Handshake successful (No peer certificate presented)"

            elif target.target_type == "ping":
                host = target.host_or_url
                cmd = ["ping", "-c", "1", "-W", "2", host]
                proc = await asyncio.create_subprocess_exec(
                    *cmd,
                    stdout=asyncio.subprocess.PIPE,
                    stderr=asyncio.subprocess.PIPE
                )
                stdout, _ = await proc.communicate()
                response_time_ms = round((time.time() - start_time) * 1000, 2)

                if proc.returncode == 0:
                    status = "UP"
                    details = f"ICMP Echo Reply ({response_time_ms} ms)"
                else:
                    status = "DOWN"
                    details = "Host Unreachable / Packet Lost"

        except Exception as e:
            status = "DOWN"
            response_time_ms = round((time.time() - start_time) * 1000, 2)
            details = f"Probe Error: {str(e)}"

        return {
            "target_id": target.id,
            "name": target.name,
            "target_type": target.target_type,
            "status": status,
            "response_time_ms": response_time_ms,
            "details": details
        }
