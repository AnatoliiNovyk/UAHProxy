import asyncssh
import logging
from typing import Tuple, Optional
from app.models.models import Server
from app.core.security import decrypt_secret

logger = logging.getLogger("uaproxy.ssh")

class SSHService:
    @staticmethod
    def _prepare_auth(server: Server):
        password = decrypt_secret(server.encrypted_ssh_password) if server.encrypted_ssh_password else None
        client_keys = None
        if server.encrypted_ssh_key:
            raw_key = decrypt_secret(server.encrypted_ssh_key)
            try:
                client_keys = [asyncssh.import_private_key(raw_key)]
            except Exception:
                client_keys = [raw_key]
        return password, client_keys

    @staticmethod
    async def execute_command(server: Server, command: str) -> Tuple[int, str, str]:
        """
        Executes command on remote server via SSH.
        Returns: (exit_code, stdout, stderr)
        """
        password, client_keys = SSHService._prepare_auth(server)

        try:
            async with asyncssh.connect(
                server.ip_address,
                port=server.ssh_port,
                username=server.ssh_username,
                password=password,
                client_keys=client_keys,
                known_hosts=None,
                login_timeout=10.0
            ) as conn:
                result = await conn.run(command, check=False)
                return result.exit_status or 0, result.stdout, result.stderr
        except Exception as e:
            err_msg = f"SSH Connection Failed to {server.hostname} ({server.ip_address}:{server.ssh_port}): {str(e)}"
            logger.error(err_msg)
            return 1, "", err_msg

    @staticmethod
    async def write_remote_file(server: Server, remote_path: str, content: str) -> bool:
        """Writes content to remote file via SFTP over SSH"""
        password, client_keys = SSHService._prepare_auth(server)

        try:
            async with asyncssh.connect(
                server.ip_address,
                port=server.ssh_port,
                username=server.ssh_username,
                password=password,
                client_keys=client_keys,
                known_hosts=None,
                login_timeout=10.0
            ) as conn:
                async with conn.start_sftp_client() as sftp:
                    async with sftp.open(remote_path, 'w') as f:
                        await f.write(content)
                return True
        except Exception as e:
            logger.error(f"Failed to write remote file {remote_path} on {server.hostname}: {e}")
            return False

    @staticmethod
    async def read_remote_file(server: Server, remote_path: str) -> Optional[str]:
        """Reads content from remote file via SFTP"""
        password, client_keys = SSHService._prepare_auth(server)

        try:
            async with asyncssh.connect(
                server.ip_address,
                port=server.ssh_port,
                username=server.ssh_username,
                password=password,
                client_keys=client_keys,
                known_hosts=None,
                login_timeout=10.0
            ) as conn:
                async with conn.start_sftp_client() as sftp:
                    async with sftp.open(remote_path, 'r') as f:
                        return await f.read()
        except Exception as e:
            logger.error(f"Failed to read remote file {remote_path} on {server.hostname}: {e}")
            return None
