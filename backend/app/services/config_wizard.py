from typing import List, Optional, Dict, Any

class ConfigWizardService:
    @staticmethod
    def generate_haproxy_snippet(
        section_type: str, # "listen", "frontend", "backend"
        section_name: str,
        mode: str = "http", # "http", "tcp"
        bind_ip: str = "*",
        bind_port: Optional[int] = 80,
        ssl_cert: Optional[str] = None,
        balance_algo: str = "roundrobin",
        default_backend: Optional[str] = None,
        servers: Optional[List[Dict[str, Any]]] = None,
        acl_rules: Optional[List[Dict[str, str]]] = None,
        timeout_connect: int = 5000,
        timeout_client: int = 50000,
        timeout_server: int = 50000,
        enable_stats: bool = False,
        stats_uri: str = "/haproxy?stats"
    ) -> str:
        lines = []
        
        if section_type == "frontend":
            lines.append(f"frontend {section_name}")
            lines.append(f"    mode {mode}")
            bind_str = f"    bind {bind_ip}:{bind_port}"
            if ssl_cert:
                bind_str += f" ssl crt {ssl_cert}"
            lines.append(bind_str)
            lines.append("    option httplog" if mode == "http" else "    option tcplog")
            lines.append(f"    timeout client {timeout_client}")
            
            if enable_stats:
                lines.append(f"    stats enable")
                lines.append(f"    stats uri {stats_uri}")

            if acl_rules:
                for rule in acl_rules:
                    lines.append(f"    acl {rule.get('name')} {rule.get('criterion')} {rule.get('value')}")
                    if rule.get('target_backend'):
                        lines.append(f"    use_backend {rule.get('target_backend')} if {rule.get('name')}")

            if default_backend:
                lines.append(f"    default_backend {default_backend}")

        elif section_type == "backend":
            lines.append(f"backend {section_name}")
            lines.append(f"    mode {mode}")
            lines.append(f"    balance {balance_algo}")
            lines.append(f"    timeout connect {timeout_connect}")
            lines.append(f"    timeout server {timeout_server}")
            if mode == "http":
                lines.append("    option forwardfor")
                lines.append("    http-reuse safe")
            
            if servers:
                for s in servers:
                    srv_line = f"    server {s.get('name', 'srv')} {s.get('ip')}:{s.get('port', 80)} check"
                    if s.get('weight'):
                        srv_line += f" weight {s.get('weight')}"
                    if s.get('maxconn'):
                        srv_line += f" maxconn {s.get('maxconn')}"
                    if s.get('backup'):
                        srv_line += " backup"
                    lines.append(srv_line)

        elif section_type == "listen":
            lines.append(f"listen {section_name}")
            lines.append(f"    mode {mode}")
            bind_str = f"    bind {bind_ip}:{bind_port}"
            if ssl_cert:
                bind_str += f" ssl crt {ssl_cert}"
            lines.append(bind_str)
            lines.append(f"    balance {balance_algo}")
            lines.append(f"    timeout connect {timeout_connect}")
            lines.append(f"    timeout client {timeout_client}")
            lines.append(f"    timeout server {timeout_server}")
            
            if enable_stats:
                lines.append("    stats enable")
                lines.append(f"    stats uri {stats_uri}")

            if servers:
                for s in servers:
                    srv_line = f"    server {s.get('name', 'srv')} {s.get('ip')}:{s.get('port', 80)} check"
                    if s.get('weight'):
                        srv_line += f" weight {s.get('weight')}"
                    lines.append(srv_line)

        return "\n".join(lines) + "\n"

    @staticmethod
    def generate_nginx_snippet(
        upstream_name: Optional[str],
        upstream_servers: Optional[List[Dict[str, Any]]],
        server_name: str = "example.com",
        listen_port: int = 80,
        ssl_cert: Optional[str] = None,
        ssl_key: Optional[str] = None,
        locations: Optional[List[Dict[str, str]]] = None
    ) -> str:
        lines = []
        
        if upstream_name and upstream_servers:
            lines.append(f"upstream {upstream_name} {{")
            for s in upstream_servers:
                srv_line = f"    server {s.get('ip')}:{s.get('port', 80)};"
                if s.get('weight'):
                    srv_line = srv_line[:-1] + f" weight={s.get('weight')};"
                lines.append(srv_line)
            lines.append("}\n")

        lines.append("server {")
        lines.append(f"    listen {listen_port}{' ssl' if ssl_cert else ''};")
        lines.append(f"    server_name {server_name};")
        
        if ssl_cert and ssl_key:
            lines.append(f"    ssl_certificate {ssl_cert};")
            lines.append(f"    ssl_certificate_key {ssl_key};")
            lines.append("    ssl_protocols TLSv1.2 TLSv1.3;")

        if locations:
            for loc in locations:
                path = loc.get('path', '/')
                proxy_pass = loc.get('proxy_pass', f'http://{upstream_name}' if upstream_name else 'http://127.0.0.1:8080')
                lines.append(f"    location {path} {{")
                lines.append(f"        proxy_pass {proxy_pass};")
                lines.append("        proxy_set_header Host $host;")
                lines.append("        proxy_set_header X-Real-IP $remote_addr;")
                lines.append("        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;")
                lines.append("        proxy_set_header X-Forwarded-Proto $scheme;")
                lines.append("    }")
        else:
            lines.append("    location / {")
            if upstream_name:
                lines.append(f"        proxy_pass http://{upstream_name};")
            else:
                lines.append("        proxy_pass http://127.0.0.1:8080;")
            lines.append("        proxy_set_header Host $host;")
            lines.append("        proxy_set_header X-Real-IP $remote_addr;")
            lines.append("    }")

        lines.append("}")
        return "\n".join(lines) + "\n"
