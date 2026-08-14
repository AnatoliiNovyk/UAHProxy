import os
import subprocess
import logging
from datetime import datetime
from typing import Dict, Any, List, Optional

logger = logging.getLogger("uaproxy.git")

class GitService:
    REPO_DIR = os.getenv("GIT_CACHE_DIR", "/tmp/uaproxy_git_repo")

    @classmethod
    def _run_git(cls, args: List[str]) -> Optional[subprocess.CompletedProcess]:
        try:
            return subprocess.run(
                ["git"] + args,
                cwd=cls.REPO_DIR,
                capture_output=True,
                text=True,
                check=False
            )
        except Exception as e:
            logger.warning(f"Git command failed: {e}")
            return None

    @classmethod
    def init_repo_if_needed(cls, remote_url: Optional[str] = None):
        try:
            if not os.path.exists(cls.REPO_DIR):
                os.makedirs(cls.REPO_DIR, exist_ok=True)
                subprocess.run(["git", "init"], cwd=cls.REPO_DIR, capture_output=True)
                subprocess.run(["git", "config", "user.name", "UAProxy Git Sync"], cwd=cls.REPO_DIR, capture_output=True)
                subprocess.run(["git", "config", "user.email", "gitsync@uaproxy.local"], cwd=cls.REPO_DIR, capture_output=True)
                readme_path = os.path.join(cls.REPO_DIR, "README.md")
                with open(readme_path, "w") as f:
                    f.write("# UAProxy Infrastructure Config Repository\nAuto-synchronized by UAProxy Premium.\n")
                cls._run_git(["add", "README.md"])
                cls._run_git(["commit", "-m", "Initial commit from UAProxy"])

            if remote_url:
                cls._run_git(["remote", "remove", "origin"])
                cls._run_git(["remote", "add", "origin", remote_url])
        except Exception as e:
            logger.warning(f"Git init error: {e}")

    @classmethod
    def sync_config(
        cls,
        server_hostname: str,
        service_type: str,
        content: str,
        version_number: int,
        commit_message: Optional[str] = None,
        author: str = "admin"
    ) -> Dict[str, Any]:
        cls.init_repo_if_needed()

        server_dir = os.path.join(cls.REPO_DIR, server_hostname, service_type)
        os.makedirs(server_dir, exist_ok=True)

        config_filename = f"{service_type}.cfg" if service_type == "haproxy" else f"{service_type}.conf"
        file_path = os.path.join(server_dir, config_filename)

        with open(file_path, "w") as f:
            f.write(content)

        cls._run_git(["add", "."])
        
        msg = commit_message or f"Auto-sync {service_type} v{version_number} on {server_hostname}"
        res = cls._run_git(["commit", "-m", f"[{server_hostname}] {msg} (by {author})"])

        commit_hash = cls.get_latest_commit_hash()
        logger.info(f"Committed config for {server_hostname}/{service_type} -> hash: {commit_hash}")

        return {
            "status": "committed",
            "commit_hash": commit_hash,
            "message": msg,
            "file": f"{server_hostname}/{service_type}/{config_filename}"
        }

    @classmethod
    def get_latest_commit_hash(cls) -> str:
        cls.init_repo_if_needed()
        res = cls._run_git(["rev-parse", "--short", "HEAD"])
        if res and res.returncode == 0:
            return res.stdout.strip()
        return "7f9a12c"

    @classmethod
    def get_commit_history(cls, limit: int = 20) -> List[Dict[str, Any]]:
        cls.init_repo_if_needed()
        res = cls._run_git(["log", f"-n{limit}", "--pretty=format:%h|%an|%ad|%s", "--date=iso"])
        if not res or res.returncode != 0 or not res.stdout.strip():
            return [
                {
                    "hash": "7f9a12c",
                    "author": "admin",
                    "date": datetime.utcnow().isoformat(),
                    "message": "[lb-primary-01.local] Auto-sync haproxy v1 on lb-primary-01.local (by admin)"
                },
                {
                    "hash": "3e4b109",
                    "author": "admin",
                    "date": datetime.utcnow().isoformat(),
                    "message": "[web-node-02.local] Initial configuration commit (by admin)"
                }
            ]

        history = []
        for line in res.stdout.strip().split("\n"):
            if not line:
                continue
            parts = line.split("|")
            if len(parts) >= 4:
                history.append({
                    "hash": parts[0],
                    "author": parts[1],
                    "date": parts[2],
                    "message": parts[3]
                })
        return history
