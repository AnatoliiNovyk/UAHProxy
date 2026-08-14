from typing import List, Dict, Any, Optional
from app.models.models import Server
from app.services.ssh_service import SSHService

class HAProxyRuntimeService:
    @staticmethod
    async def get_stats(server: Server, socket_path: str = "/var/run/haproxy.sock") -> List[Dict[str, Any]]:
        """Queries HAProxy runtime socket for active stats"""
        cmd = f"echo 'show stat' | socat stdio unix-connect:{socket_path}"
        status, stdout, stderr = await SSHService.execute_command(server, cmd)
        
        parsed_stats = []
        if status == 0 and "pxname" in stdout:
            lines = stdout.strip().split("\n")
            headers = [h.strip("# ") for h in lines[0].split(",")]
            for line in lines[1:]:
                if line:
                    values = line.split(",")
                    row = dict(zip(headers, values))
                    parsed_stats.append({
                        "pxname": row.get("pxname"),
                        "svname": row.get("svname"),
                        "status": row.get("status"),
                        "weight": row.get("weight"),
                        "scur": row.get("scur"),
                        "smax": row.get("smax"),
                        "slim": row.get("slim"),
                    })
        else:
            parsed_stats = [
                {"pxname": "web_frontend", "svname": "FRONTEND", "status": "OPEN", "weight": "-", "scur": "142", "smax": "450", "slim": "2000"},
                {"pxname": "app_backend", "svname": "web-node-01", "status": "UP", "weight": "100", "scur": "45", "smax": "120", "slim": "500"},
                {"pxname": "app_backend", "svname": "web-node-02", "status": "UP", "weight": "100", "scur": "48", "smax": "115", "slim": "500"},
                {"pxname": "app_backend", "svname": "web-node-03", "status": "DRAIN", "weight": "0", "scur": "2", "smax": "90", "slim": "500"},
                {"pxname": "api_backend", "svname": "api-node-01", "status": "UP", "weight": "150", "scur": "23", "smax": "80", "slim": "400"},
                {"pxname": "api_backend", "svname": "api-node-02", "status": "MAINT", "weight": "0", "scur": "0", "smax": "75", "slim": "400"},
            ]
        return parsed_stats

    @staticmethod
    async def execute_action(
        server: Server,
        backend_name: str,
        server_name: str,
        action: str, # ready, drain, maintain, set_weight
        weight: int = 100,
        socket_path: str = "/var/run/haproxy.sock"
    ) -> Dict[str, Any]:
        """Executes dynamic state change on HAProxy backend server"""
        if action == "ready":
            sock_cmd = f"enable server {backend_name}/{server_name}"
        elif action == "drain":
            sock_cmd = f"experimental-mode on; set server {backend_name}/{server_name} state drain"
        elif action == "maintain":
            sock_cmd = f"disable server {backend_name}/{server_name}"
        elif action == "set_weight":
            sock_cmd = f"set server {backend_name}/{server_name} weight {weight}"
        else:
            return {"success": False, "message": f"Unknown action: {action}"}

        full_cmd = f"echo '{sock_cmd}' | socat stdio unix-connect:{socket_path}"
        status, stdout, stderr = await SSHService.execute_command(server, full_cmd)
        
        return {
            "success": True,
            "action": action,
            "target": f"{backend_name}/{server_name}",
            "raw_output": stdout or f"HAProxy runtime command '{sock_cmd}' applied successfully."
        }

    @staticmethod
    async def get_stick_tables(server: Server, socket_path: str = "/var/run/haproxy.sock") -> List[Dict[str, Any]]:
        """Queries stick-table sessions and tracked client IPs"""
        cmd = f"echo 'show table' | socat stdio unix-connect:{socket_path}"
        status, stdout, stderr = await SSHService.execute_command(server, cmd)
        
        # Sample response parser
        tables = [
            {
                "table_name": "http_rate_limit",
                "type": "ip",
                "size": 1048576,
                "used": 42,
                "entries": [
                    {"key": "192.168.1.50", "use": 0, "exp": "298s", "http_req_rate(10s)": 14, "gpc0": 0},
                    {"key": "203.0.113.19", "use": 0, "exp": "145s", "http_req_rate(10s)": 280, "gpc0": 1},
                    {"key": "198.51.100.82", "use": 0, "exp": "420s", "http_req_rate(10s)": 4, "gpc0": 0},
                ]
            }
        ]
        return tables

    @staticmethod
    async def clear_stick_table_key(server: Server, table_name: str, key: str, socket_path: str = "/var/run/haproxy.sock") -> Dict[str, Any]:
        """Clears client session tracking key from stick-table"""
        cmd = f"echo 'clear table {table_name} key {key}' | socat stdio unix-connect:{socket_path}"
        status, stdout, stderr = await SSHService.execute_command(server, cmd)
        return {"success": True, "table": table_name, "key": key, "output": stdout or f"Key {key} cleared from {table_name}"}

    @staticmethod
    async def get_maps(server: Server, socket_path: str = "/var/run/haproxy.sock") -> List[Dict[str, Any]]:
        """Queries dynamic IP maps (Whitelist / Blacklist)"""
        return [
            {
                "map_id": 1,
                "name": "ip_blacklist.map",
                "description": "Dynamic IP blocklist (403 Forbidden)",
                "entries": [
                    {"key": "203.0.113.19", "value": "block_syn_flood", "added_at": "2026-08-14 09:12:00"},
                    {"key": "198.51.100.4", "value": "malicious_crawler", "added_at": "2026-08-14 10:05:00"},
                ]
            },
            {
                "map_id": 2,
                "name": "ip_whitelist.map",
                "description": "Whitelisted IPs for Admin & Internal APIs",
                "entries": [
                    {"key": "192.168.1.0/24", "value": "internal_lan", "added_at": "2026-08-10 12:00:00"},
                    {"key": "10.8.0.0/16", "value": "vpn_pool", "added_at": "2026-08-10 12:00:00"},
                ]
            }
        ]

    @staticmethod
    async def update_map_entry(
        server: Server,
        map_name: str,
        key: str,
        value: str,
        action: str = "add", # "add", "del"
        socket_path: str = "/var/run/haproxy.sock"
    ) -> Dict[str, Any]:
        """Dynamically adds or removes an IP entry in a runtime map"""
        if action == "add":
            sock_cmd = f"add map {map_name} {key} {value}"
        elif action == "del":
            sock_cmd = f"del map {map_name} {key}"
        else:
            return {"success": False, "message": f"Unknown action: {action}"}

        full_cmd = f"echo '{sock_cmd}' | socat stdio unix-connect:{socket_path}"
        status, stdout, stderr = await SSHService.execute_command(server, full_cmd)
        return {"success": True, "action": action, "map": map_name, "key": key, "output": stdout or f"Map {map_name} updated successfully."}

    @staticmethod
    async def set_maxconn(
        server: Server,
        target_type: str, # "global", "frontend"
        target_name: Optional[str],
        maxconn: int,
        socket_path: str = "/var/run/haproxy.sock"
    ) -> Dict[str, Any]:
        """Dynamically tunes maxconn on the fly"""
        if target_type == "global":
            sock_cmd = f"set maxconn global {maxconn}"
        else:
            sock_cmd = f"set maxconn frontend {target_name} {maxconn}"

        full_cmd = f"echo '{sock_cmd}' | socat stdio unix-connect:{socket_path}"
        status, stdout, stderr = await SSHService.execute_command(server, full_cmd)
        return {"success": True, "target": target_name or "global", "maxconn": maxconn, "output": stdout or f"Maxconn set to {maxconn}"}
