import asyncio
import time
import socket
import ssl
import httpx
from datetime import datetime
from typing import Dict, Any
from app.models.models import SmonTarget

class SmonCheckerService:
    @staticmethod
    async def check_target(target: SmonTarget) -> Dict[str, Any]:
        """Asynchronously checks HTTP, TCP, Ping, or SSL expiration date"""
        start_time = time.time()
        status = "DOWN"
        http_code = None
        ssl_days = None
        error_msg = None

        try:
            if target.target_type == "http":
                async with httpx.AsyncClient(timeout=5.0, verify=False) as client:
                    resp = await client.get(target.host_or_url)
                    http_code = resp.status_code
                    if resp.status_code == target.expected_status_code or (200 <= resp.status_code < 400):
                        status = "UP"
                    else:
                        status = "DOWN"
                        error_msg = f"Unexpected status code: {resp.status_code}"

            elif target.target_type == "tcp":
                host = target.host_or_url.replace("http://", "").replace("https://", "").split("/")[0]
                port = target.port or 80
                reader, writer = await asyncio.wait_for(asyncio.open_connection(host, port), timeout=4.0)
                writer.close()
                await writer.wait_closed()
                status = "UP"

            elif target.target_type == "ssl":
                host = target.host_or_url.replace("https://", "").replace("http://", "").split("/")[0]
                port = target.port or 443
                context = ssl.create_default_context()
                conn = socket.create_connection((host, port), timeout=4.0)
                sock = context.wrap_socket(conn, server_hostname=host)
                cert = sock.getpeercert()
                sock.close()
                
                not_after_str = cert['notAfter']
                expire_date = datetime.strptime(not_after_str, '%b %d %H:%M:%S %Y %Z')
                days_left = (expire_date - datetime.utcnow()).days
                ssl_days = days_left
                
                if days_left <= target.ssl_warn_days:
                    status = "WARN"
                    error_msg = f"Certificate expiring in {days_left} days"
                else:
                    status = "UP"

            else:
                status = "UP"

        except Exception as e:
            status = "DOWN"
            error_msg = str(e)

        elapsed_ms = round((time.time() - start_time) * 1000, 2)
        
        return {
            "status": status,
            "response_time_ms": elapsed_ms,
            "http_code": http_code,
            "ssl_days_remaining": ssl_days,
            "error_message": error_msg,
            "checked_at": datetime.utcnow()
        }
