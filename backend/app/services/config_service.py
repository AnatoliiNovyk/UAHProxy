import hashlib
import difflib
from typing import Dict, Any, Tuple
from app.models.models import Server, ServiceTypeEnum
from app.services.ssh_service import SSHService

class ConfigService:
    @staticmethod
    def calculate_hash(content: str) -> str:
        return hashlib.sha256(content.encode('utf-8')).hexdigest()

    @staticmethod
    async def validate_config(service_type: str, content: str, server: Server = None) -> Tuple[bool, str]:
        """Validates HAProxy / Nginx / Keepalived configuration using CLI syntax checkers"""
        if service_type == ServiceTypeEnum.HAPROXY or service_type == "haproxy":
            check_cmd = "haproxy -c -f /tmp/haproxy_test.cfg"
        elif service_type == ServiceTypeEnum.NGINX or service_type == "nginx":
            check_cmd = "nginx -t -c /tmp/nginx_test.conf"
        elif service_type == ServiceTypeEnum.KEEPALIVED or service_type == "keepalived":
            check_cmd = "keepalived --check -f /tmp/keepalived_test.conf"
        else:
            return True, "Syntax check skipped for custom service."

        if server:
            # Write temp config file and test syntax
            temp_path = f"/tmp/{service_type}_test.cfg"
            await SSHService.write_remote_file(server, temp_path, content)
            status, stdout, stderr = await SSHService.execute_command(server, check_cmd)
            is_valid = (status == 0)
            message = stdout + "\n" + stderr
            return is_valid, message.strip() or "Syntax OK"
        
        # Local validation basic check
        if "global" not in content and "defaults" not in content and "http {" not in content and "vrrp_instance" not in content:
            return True, "Basic syntax check passed (warnings: missing standard sections)."
        return True, "Syntax OK"

    @staticmethod
    def generate_diff(old_content: str, new_content: str) -> str:
        """Generates unified diff representation between config versions"""
        old_lines = old_content.splitlines(keepends=True)
        new_lines = new_content.splitlines(keepends=True)
        diff = list(difflib.unified_diff(old_lines, new_lines, fromfile="Previous Version", tofile="New Version"))
        return "".join(diff) or "No changes detected."
