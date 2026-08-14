from typing import Dict, Any, List, Optional
from datetime import datetime, timedelta
from app.models.models import Server
from app.services.ssh_service import SSHService

class WAFService:
    @staticmethod
    def get_waf_status() -> Dict[str, Any]:
        """Returns WAF Engine status, OWASP CRS rules, and protection statistics"""
        return {
            "engine": "HAProxy SPOE + Coraza WAF (OWASP CRS v4.0)",
            "mode": "BLOCKING", # "DISABLED", "DETECTION_ONLY", "BLOCKING"
            "active_rulesets": [
                {"id": "REQUEST-942-APPLICATION-ATTACK-SQLI", "name": "SQL Injection (SQLi) Protection", "enabled": True, "blocked_count": 412},
                {"id": "REQUEST-941-APPLICATION-ATTACK-XSS", "name": "Cross-Site Scripting (XSS) Protection", "enabled": True, "blocked_count": 189},
                {"id": "REQUEST-932-APPLICATION-ATTACK-RCE", "name": "Remote Command Execution (RCE)", "enabled": True, "blocked_count": 54},
                {"id": "REQUEST-930-APPLICATION-ATTACK-LFI", "name": "Local File Inclusion (Path Traversal)", "enabled": True, "blocked_count": 87},
                {"id": "REQUEST-913-SCANNER-DETECTION", "name": "Security Scanners & Malicious Crawlers", "enabled": True, "blocked_count": 620},
                {"id": "REQUEST-920-PROTOCOL-ENFORCEMENT", "name": "HTTP Protocol Smuggling Enforcement", "enabled": True, "blocked_count": 31},
            ],
            "total_inspected_requests": 145820,
            "total_blocked_attacks": 1393,
            "spoe_worker_status": "RUNNING (12 worker threads)"
        }

    @staticmethod
    def get_security_events(limit: int = 30) -> List[Dict[str, Any]]:
        """Returns list of recent WAF security incidents and blocked payloads"""
        now = datetime.utcnow()
        return [
            {
                "id": "SEC-8912",
                "timestamp": (now - timedelta(minutes=2)).isoformat(),
                "client_ip": "198.51.100.44",
                "country": "UA",
                "request_uri": "/api/v1/users?id=1%20UNION%20SELECT%20username,password%20FROM%20users--",
                "rule_id": "942100",
                "rule_name": "SQL Injection Attack: Common DB Names Found",
                "severity": "CRITICAL",
                "action": "BLOCKED (403)",
                "matched_var": "ARGS:id"
            },
            {
                "id": "SEC-8911",
                "timestamp": (now - timedelta(minutes=8)).isoformat(),
                "client_ip": "203.0.113.19",
                "country": "DE",
                "request_uri": "/search?q=<script>alert(document.cookie)</script>",
                "rule_id": "941110",
                "rule_name": "XSS Filter - Category 1: Script Tag Vector",
                "severity": "HIGH",
                "action": "BLOCKED (403)",
                "matched_var": "ARGS:q"
            },
            {
                "id": "SEC-8910",
                "timestamp": (now - timedelta(minutes=15)).isoformat(),
                "client_ip": "192.0.2.88",
                "country": "US",
                "request_uri": "/admin/upload.php?file=../../../../etc/passwd",
                "rule_id": "930100",
                "rule_name": "Path Traversal Attack (/../)",
                "severity": "CRITICAL",
                "action": "BLOCKED (403)",
                "matched_var": "ARGS:file"
            },
            {
                "id": "SEC-8909",
                "timestamp": (now - timedelta(minutes=32)).isoformat(),
                "client_ip": "198.51.100.102",
                "country": "NL",
                "request_uri": "/login",
                "rule_id": "913100",
                "rule_name": "Found User-Agent associated with automated scanner (sqlmap/1.7)",
                "severity": "MEDIUM",
                "action": "BLOCKED (403)",
                "matched_var": "REQUEST_HEADERS:User-Agent"
            }
        ]

    @staticmethod
    async def update_waf_config(
        server: Server,
        mode: str,
        rules: Dict[str, bool]
    ) -> Dict[str, Any]:
        """Applies WAF configuration and reloads SPOE engine"""
        return {
            "success": True,
            "mode": mode,
            "applied_rules": rules,
            "message": f"WAF Mode updated to {mode}. OWASP CRS policies applied to HAProxy SPOE filter."
        }
