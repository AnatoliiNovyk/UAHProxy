from typing import Dict, Any, Tuple
from app.models.models import Server
from app.services.ssh_service import SSHService

class KeepalivedService:
    @staticmethod
    def generate_configs(
        cluster_name: str,
        virtual_ip: str,
        router_id: int,
        interface: str,
        master_ip: str,
        backup_ip: str,
        auth_pass: str = "UAProxyVRRP51",
        check_script: str = "killall -0 haproxy"
    ) -> Tuple[str, str]:
        """
        Generates pair of Keepalived configs:
        Returns (master_config, backup_config)
        """
        script_block = f"""vrrp_script chk_service {{
    script "{check_script}"
    interval 2
    weight 2
    fall 2
    rise 2
}}
"""

        master_conf = f"""! Configuration File for keepalived (MASTER)
global_defs {{
    router_id {cluster_name}_MASTER
    enable_script_security
    script_user root
}}

{script_block}

vrrp_instance VI_{router_id} {{
    state MASTER
    interface {interface}
    virtual_router_id {router_id}
    priority 101
    advert_int 1

    authentication {{
        auth_type PASS
        auth_pass {auth_pass}
    }}

    unicast_src_ip {master_ip}
    unicast_peer {{
        {backup_ip}
    }}

    virtual_ipaddress {{
        {virtual_ip}/24 dev {interface}
    }}

    track_script {{
        chk_service
    }}
}}
"""

        backup_conf = f"""! Configuration File for keepalived (BACKUP)
global_defs {{
    router_id {cluster_name}_BACKUP
    enable_script_security
    script_user root
}}

{script_block}

vrrp_instance VI_{router_id} {{
    state BACKUP
    interface {interface}
    virtual_router_id {router_id}
    priority 100
    advert_int 1

    authentication {{
        auth_type PASS
        auth_pass {auth_pass}
    }}

    unicast_src_ip {backup_ip}
    unicast_peer {{
        {master_ip}
    }}

    virtual_ipaddress {{
        {virtual_ip}/24 dev {interface}
    }}

    track_script {{
        chk_service
    }}
}}
"""
        return master_conf, backup_conf

    @staticmethod
    async def deploy_cluster(
        master_server: Server,
        backup_server: Server,
        master_conf: str,
        backup_conf: str
    ) -> Dict[str, Any]:
        """Deploys keepalived.conf to both nodes and reloads keepalived"""
        # Write to master
        await SSHService.write_remote_file(master_server, "/etc/keepalived/keepalived.conf", master_conf)
        await SSHService.execute_command(master_server, "systemctl enable --now keepalived && systemctl reload keepalived")

        # Write to backup
        await SSHService.write_remote_file(backup_server, "/etc/keepalived/keepalived.conf", backup_conf)
        await SSHService.execute_command(backup_server, "systemctl enable --now keepalived && systemctl reload keepalived")

        return {
            "success": True,
            "master_deployed": master_server.hostname,
            "backup_deployed": backup_server.hostname,
            "message": "Keepalived VRRP cluster configuration successfully applied to both nodes."
        }

    @staticmethod
    async def check_vip_status(server: Server, virtual_ip: str) -> bool:
        """Checks if virtual IP is currently bound on the interface (ip addr show)"""
        code, stdout, stderr = await SSHService.execute_command(server, f"ip addr show | grep '{virtual_ip}'")
        return code == 0 and virtual_ip in stdout
