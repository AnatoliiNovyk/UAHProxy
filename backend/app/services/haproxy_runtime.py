import logging
import csv
import io
from typing import List, Dict, Any, Optional
from app.models.models import Server
from app.services.ssh_service import SSHService

logger = logging.getLogger("uaproxy.runtime")

class HAProxyRuntimeService:
    @staticmethod
    async def _send_socket_command(server: Server, command: str, socket_path: str = "/var/run/haproxy.sock") -> str:
        """Sends raw command to HAProxy UNIX Runtime Socket via socat"""
        cmd = f"echo '{command}' | socat stdio unix-connect:{socket_path}"
        code, stdout, stderr = await SSHService.execute_command(server, cmd)
        if code != 0:
            logger.warning(f"Runtime socket command '{command}' failed on {server.hostname}: {stderr}")
            return ""
        return stdout

    @staticmethod
    async def get_stats(server: Server) -> List[Dict[str, Any]]:
        """Queries real 'show stat' from HAProxy socket and parses CSV output"""
        raw_csv = await HAProxyRuntimeService._send_socket_command(server, "show stat")
        if not raw_csv or not raw_csv.startswith("#"):
            return []

        # Remove leading '#' from header
        cleaned_csv = raw_csv.lstrip("# ")
        reader = csv.DictReader(io.StringIO(cleaned_csv))
        stats = []

        for row in reader:
            pxname = row.get("pxname")
            svname = row.get("svname")
            if not pxname or not svname:
                continue

            status = row.get("status", "UNKNOWN")
            weight = int(row.get("weight", 0)) if row.get("weight", "").isdigit() else 0
            scur = int(row.get("scur", 0)) if row.get("scur", "").isdigit() else 0
            smax = int(row.get("smax", 0)) if row.get("smax", "").isdigit() else 0
            rate = int(row.get("rate", 0)) if row.get("rate", "").isdigit() else 0
            hrsp_2xx = int(row.get("hrsp_2xx", 0)) if row.get("hrsp_2xx", "").isdigit() else 0
            hrsp_4xx = int(row.get("hrsp_4xx", 0)) if row.get("hrsp_4xx", "").isdigit() else 0
            hrsp_5xx = int(row.get("hrsp_5xx", 0)) if row.get("hrsp_5xx", "").isdigit() else 0

            stats.append({
                "pxname": pxname,
                "svname": svname,
                "status": status,
                "weight": weight,
                "scur": scur,
                "smax": smax,
                "rate": rate,
                "hrsp_2xx": hrsp_2xx,
                "hrsp_4xx": hrsp_4xx,
                "hrsp_5xx": hrsp_5xx
            })

        return stats

    @staticmethod
    async def execute_action(server: Server, backend_name: str, server_name: str, action: str, weight: Optional[int] = 100) -> Dict[str, Any]:
        """
        Executes real dynamic runtime action on backend server:
        - ready: 'enable server <bk>/<sv>'
        - drain: 'set server <bk>/<sv> state drain'
        - maintain: 'disable server <bk>/<sv>'
        - set_weight: 'set server <bk>/<sv> weight <w>'
        """
        if action == "ready":
            cmd = f"enable server {backend_name}/{server_name}"
        elif action == "drain":
            cmd = f"set server {backend_name}/{server_name} state drain"
        elif action == "maintain":
            cmd = f"disable server {backend_name}/{server_name}"
        elif action == "set_weight":
            cmd = f"set server {backend_name}/{server_name} weight {weight}"
        else:
            return {"success": False, "error": f"Invalid action: {action}"}

        out = await HAProxyRuntimeService._send_socket_command(server, cmd)
        return {
            "success": True,
            "action": action,
            "backend": backend_name,
            "server": server_name,
            "weight": weight,
            "response": out.strip() or "OK"
        }

    @staticmethod
    async def get_stick_tables(server: Server) -> List[Dict[str, Any]]:
        """Queries real stick tables from HAProxy runtime socket via 'show table'"""
        raw_tables = await HAProxyRuntimeService._send_socket_command(server, "show table")
        if not raw_tables:
            return []

        tables = []
        for line in raw_tables.splitlines():
            line = line.strip()
            if line.startswith("# table:"):
                # Parse: # table: http_rate_limit, type: ip, size: 1048576, used: 12
                parts = line.split(",")
                tbl_info: Dict[str, Any] = {"entries": []}
                for p in parts:
                    if ":" in p:
                        k, v = p.split(":", 1)
                        tbl_info[k.strip().replace("# ", "")] = v.strip()

                table_name = tbl_info.get("table", "")
                if table_name:
                    entries_out = await HAProxyRuntimeService._send_socket_command(server, f"show table {table_name}")
                    entries = []
                    for e_line in entries_out.splitlines():
                        if e_line.startswith("0x"): # pointer key values
                            e_parts = e_line.split(":")
                            if len(e_parts) >= 2:
                                entries.append({
                                    "key": e_parts[0].strip().split()[-1],
                                    "stats": e_parts[1].strip()
                                })
                    tbl_info["entries"] = entries

                tables.append(tbl_info)

        return tables

    @staticmethod
    async def clear_stick_table_key(server: Server, table_name: str, key: str) -> Dict[str, Any]:
        """Clears specific key or whole table from stick-table"""
        cmd = f"clear table {table_name} key {key}" if key != "all" else f"clear table {table_name}"
        out = await HAProxyRuntimeService._send_socket_command(server, cmd)
        return {"success": True, "table": table_name, "key": key, "response": out.strip() or "Cleared"}

    @staticmethod
    async def get_maps(server: Server) -> List[Dict[str, Any]]:
        """Lists real loaded HAProxy maps from runtime socket via 'show map'"""
        raw_maps = await HAProxyRuntimeService._send_socket_command(server, "show map")
        if not raw_maps:
            return []

        maps = []
        for line in raw_maps.splitlines():
            line = line.strip()
            if line.startswith("# id:"):
                # # id: 0, desc: /etc/haproxy/maps/hosts.map, entries: 5
                parts = line.split(",")
                m_info: Dict[str, Any] = {"entries": []}
                for p in parts:
                    if ":" in p:
                        k, v = p.split(":", 1)
                        m_info[k.strip().replace("# ", "")] = v.strip()

                map_id = m_info.get("id", "")
                if map_id:
                    entries_out = await HAProxyRuntimeService._send_socket_command(server, f"show map #{map_id}")
                    entries = []
                    for e_line in entries_out.splitlines():
                        if " " in e_line and not e_line.startswith("#"):
                            k, v = e_line.strip().split(None, 1)
                            entries.append({"key": k, "value": v})
                    m_info["entries"] = entries

                maps.append(m_info)

        return maps

    @staticmethod
    async def update_map_entry(server: Server, map_name: str, key: str, value: str, action: str = "add") -> Dict[str, Any]:
        """Adds, updates, or deletes real key-value entries in runtime map"""
        if action == "add":
            cmd = f"add map {map_name} {key} {value}"
        elif action == "set":
            cmd = f"set map {map_name} {key} {value}"
        elif action == "del":
            cmd = f"del map {map_name} {key}"
        else:
            return {"success": False, "error": f"Invalid map action: {action}"}

        out = await HAProxyRuntimeService._send_socket_command(server, cmd)
        return {"success": True, "map": map_name, "key": key, "value": value, "response": out.strip() or "Updated"}

    @staticmethod
    async def set_maxconn(server: Server, target_type: str, target_name: Optional[str], maxconn: int) -> Dict[str, Any]:
        """Sets maxconn dynamically on global or frontend level"""
        if target_type == "global":
            cmd = f"set maxconn global {maxconn}"
        elif target_type == "frontend" and target_name:
            cmd = f"set maxconn frontend {target_name} {maxconn}"
        else:
            return {"success": False, "error": "Invalid target type for maxconn"}

        out = await HAProxyRuntimeService._send_socket_command(server, cmd)
        return {"success": True, "target": target_type, "name": target_name, "maxconn": maxconn, "response": out.strip() or "Applied"}
