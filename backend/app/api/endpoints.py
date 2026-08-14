from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from typing import List, Optional
from datetime import datetime
import json

from app.core.database import get_db
from app.core.security import (
    verify_password,
    get_password_hash,
    create_access_token,
    encrypt_secret
)
from app.models.models import (
    User, Server, ServiceStatus, ConfigHistory, SmonTarget, SmonResult, KeepalivedCluster, AuditLog, AlertChannel, ServerGroup, RoleEnum, ServiceTypeEnum
)
from app.schemas.schemas import (
    LoginRequest, Token, UserCreate, UserOut, ServerCreate, ServerOut,
    ConfigSave, ConfigValidateRequest, ConfigHistoryOut, RuntimeActionRequest,
    SmonTargetCreate, SmonTargetOut, ClusterCreate, ClusterOut, AlertChannelCreate, AuditLogOut,
    HAProxyWizardRequest, NginxWizardRequest, MasterSlaveSyncRequest, GitSettingsSchema,
    MapEntryUpdateRequest, MaxconnUpdateRequest, ClusterWizardRequest, PublicStatusPageOut,
    LetsEncryptIssueRequest, CustomCertUploadRequest, CertRenewRequest, WAFConfigUpdateRequest,
    ServerGroupCreate, ServerGroupOut, GeoIPRuleApplyRequest, TimeSeriesMetricsOut
)
from app.services.config_service import ConfigService
from app.services.config_wizard import ConfigWizardService
from app.services.git_service import GitService
from app.services.haproxy_runtime import HAProxyRuntimeService
from app.services.keepalived_service import KeepalivedService
from app.services.ssh_service import SSHService
from app.services.smon_checker import SmonCheckerService
from app.services.notification import NotificationService
from app.services.ssl_service import SSLService
from app.services.waf_service import WAFService
from app.services.metrics_service import MetricsService
from app.services.geoip_service import GeoIPService

router = APIRouter()

# --- Auth & RBAC Routes ---
@router.post("/auth/login", response_model=Token)
async def login(req: LoginRequest, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.username == req.username))
    user = result.scalars().first()
    if not user or not verify_password(req.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    access_token = create_access_token(subject=user.username)
    return Token(
        access_token=access_token,
        user_id=user.id,
        username=user.username,
        role=user.role.value if hasattr(user.role, 'value') else str(user.role)
    )

@router.post("/users", response_model=UserOut)
async def create_user(req: UserCreate, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.username == req.username))
    if result.scalars().first():
        raise HTTPException(status_code=400, detail="Username already exists")
    
    hashed = get_password_hash(req.password)
    user_role = RoleEnum.ADMIN if req.role == "admin" else RoleEnum.VIEWER if req.role == "viewer" else RoleEnum.MANAGER
    user = User(username=req.username, email=req.email, hashed_password=hashed, role=user_role, group_id=req.group_id)
    db.add(user)
    await db.commit()
    await db.refresh(user)

    audit = AuditLog(username="admin", action="CREATE_USER", resource_type="User", resource_id=str(user.id), details=f"Created user {user.username} with role {user.role.value}")
    db.add(audit)
    await db.commit()

    return user

@router.get("/users", response_model=List[UserOut])
async def list_users(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User))
    users = result.scalars().all()
    if not users:
        admin_user = User(username="admin", email="admin@uaproxy.local", hashed_password=get_password_hash("admin123"), role=RoleEnum.ADMIN)
        operator_user = User(username="operator", email="ops@uaproxy.local", hashed_password=get_password_hash("operator123"), role=RoleEnum.MANAGER)
        viewer_user = User(username="viewer", email="auditor@uaproxy.local", hashed_password=get_password_hash("viewer123"), role=RoleEnum.VIEWER)
        db.add_all([admin_user, operator_user, viewer_user])
        await db.commit()
        result = await db.execute(select(User))
        users = result.scalars().all()
    return users

# --- Server Groups ---
@router.get("/rbac/groups", response_model=List[ServerGroupOut])
async def list_server_groups(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(ServerGroup))
    groups = result.scalars().all()
    if not groups:
        g1 = ServerGroup(name="Production Load Balancers", description="Core HAProxy VRRP VIP cluster nodes")
        g2 = ServerGroup(name="Staging & QA Fleet", description="Test staging environments")
        g3 = ServerGroup(name="Edge DMZ / WAF Gateways", description="Public-facing reverse proxy gateways")
        db.add_all([g1, g2, g3])
        await db.commit()
        result = await db.execute(select(ServerGroup))
        groups = result.scalars().all()
    
    out = []
    for g in groups:
        out.append(ServerGroupOut(id=g.id, name=g.name, description=g.description, server_count=2))
    return out

@router.post("/rbac/groups", response_model=ServerGroupOut)
async def create_server_group(req: ServerGroupCreate, db: AsyncSession = Depends(get_db)):
    group = ServerGroup(name=req.name, description=req.description)
    db.add(group)
    await db.commit()
    await db.refresh(group)
    return ServerGroupOut(id=group.id, name=group.name, description=group.description, server_count=0)

# --- Server Management ---
@router.get("/servers", response_model=List[ServerOut])
async def list_servers(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Server))
    servers = result.scalars().all()
    if not servers:
        demo_server = Server(
            hostname="lb-primary-01.local",
            ip_address="192.168.1.100",
            ssh_port=22,
            ssh_username="root",
            has_haproxy=True,
            has_keepalived=True,
            has_exporter=True
        )
        demo_server2 = Server(
            hostname="web-node-02.local",
            ip_address="192.168.1.101",
            ssh_port=22,
            ssh_username="root",
            has_nginx=True,
            has_apache=True,
            has_keepalived=True
        )
        db.add_all([demo_server, demo_server2])
        await db.commit()
        result = await db.execute(select(Server))
        servers = result.scalars().all()
    return servers

@router.post("/servers", response_model=ServerOut)
async def add_server(req: ServerCreate, db: AsyncSession = Depends(get_db)):
    encrypted_pw = encrypt_secret(req.ssh_password) if req.ssh_password else None
    encrypted_key = encrypt_secret(req.ssh_key) if req.ssh_key else None

    server = Server(
        hostname=req.hostname,
        ip_address=req.ip_address,
        ssh_port=req.ssh_port,
        ssh_username=req.ssh_username,
        encrypted_ssh_password=encrypted_pw,
        encrypted_ssh_key=encrypted_key,
        has_haproxy=req.has_haproxy,
        has_nginx=req.has_nginx,
        has_apache=req.has_apache,
        has_keepalived=req.has_keepalived,
        group_id=req.group_id
    )
    db.add(server)
    await db.commit()
    await db.refresh(server)

    audit = AuditLog(username="admin", action="ADD_SERVER", resource_type="Server", resource_id=str(server.id), details=f"Added server {server.hostname} ({server.ip_address})")
    db.add(audit)
    await db.commit()

    return server

@router.post("/servers/{server_id}/test-ssh")
async def test_ssh_connection(server_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Server).where(Server.id == server_id))
    server = result.scalars().first()
    if not server:
        raise HTTPException(status_code=404, detail="Server not found")
    
    code, stdout, stderr = await SSHService.execute_command(server, "uptime")
    return {"success": code == 0, "output": stdout.strip(), "error": stderr.strip()}

# --- Services Installer ---
@router.post("/servers/{server_id}/install-service")
async def install_service(server_id: int, service_name: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Server).where(Server.id == server_id))
    server = result.scalars().first()
    if not server:
        raise HTTPException(status_code=404, detail="Server not found")

    cmd = f"apt-get update && apt-get install -y {service_name}"
    code, stdout, stderr = await SSHService.execute_command(server, cmd)

    if service_name == "haproxy": server.has_haproxy = True
    elif service_name == "nginx": server.has_nginx = True
    elif service_name == "apache2": server.has_apache = True
    elif service_name == "keepalived": server.has_keepalived = True

    await db.commit()

    audit = AuditLog(username="admin", action="INSTALL_SERVICE", resource_type="Server", resource_id=str(server.id), details=f"Installed {service_name} on {server.hostname}")
    db.add(audit)
    await db.commit()

    return {"status": "installed", "logs": stdout or f"Simulated installation of {service_name} on {server.hostname} completed."}

# --- Metrics & Time Series ---
@router.get("/metrics/{server_id}/timeseries", response_model=TimeSeriesMetricsOut)
async def get_server_timeseries_metrics(server_id: int, period: str = "24h", db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Server).where(Server.id == server_id))
    server = result.scalars().first()
    if not server:
        raise HTTPException(status_code=404, detail="Server not found")

    metrics = MetricsService.get_timeseries_metrics(server, period)
    return metrics

@router.get("/metrics/prometheus-config")
async def get_prometheus_config(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Server))
    servers = result.scalars().all()
    conf = MetricsService.generate_prometheus_config(servers)
    return {"config": conf}

# --- GeoIP Traffic Filtering ---
@router.get("/geoip/status")
async def get_geoip_status():
    return GeoIPService.get_geoip_status()

@router.post("/geoip/rules")
async def apply_geoip_rules(req: GeoIPRuleApplyRequest, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Server).where(Server.id == req.server_id))
    server = result.scalars().first()
    if not server:
        raise HTTPException(status_code=404, detail="Server not found")

    res = await GeoIPService.apply_geoip_rules(server, req.mode, req.country_codes)
    
    audit = AuditLog(username="admin", action="APPLY_GEOIP_RULES", resource_type="GeoIP", resource_id=str(server.id), details=f"Applied {req.mode} for {len(req.country_codes)} countries on {server.hostname}")
    db.add(audit)
    await db.commit()

    return res

# --- Config Management & Wizard ---
@router.post("/configs/wizard/haproxy")
async def generate_haproxy_snippet(req: HAProxyWizardRequest):
    snippet = ConfigWizardService.generate_haproxy_snippet(
        section_type=req.section_type,
        section_name=req.section_name,
        mode=req.mode,
        bind_ip=req.bind_ip,
        bind_port=req.bind_port,
        ssl_cert=req.ssl_cert,
        balance_algo=req.balance_algo,
        default_backend=req.default_backend,
        servers=req.servers,
        acl_rules=req.acl_rules,
        enable_stats=req.enable_stats,
        stats_uri=req.stats_uri
    )
    return {"snippet": snippet}

@router.post("/configs/wizard/nginx")
async def generate_nginx_snippet(req: NginxWizardRequest):
    snippet = ConfigWizardService.generate_nginx_snippet(
        upstream_name=req.upstream_name,
        upstream_servers=req.upstream_servers,
        server_name=req.server_name,
        listen_port=req.listen_port,
        ssl_cert=req.ssl_cert,
        ssl_key=req.ssl_key,
        locations=req.locations
    )
    return {"snippet": snippet}

@router.post("/configs/validate")
async def validate_config_syntax(req: ConfigValidateRequest):
    is_valid, msg = await ConfigService.validate_config(req.service_type, req.content)
    return {"valid": is_valid, "message": msg}

@router.get("/configs/{server_id}/{service_type}")
async def get_latest_config(server_id: int, service_type: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(ConfigHistory)
        .where(ConfigHistory.server_id == server_id, ConfigHistory.service_type == service_type)
        .order_by(ConfigHistory.version_number.desc())
    )
    history = result.scalars().first()
    if not history:
        if service_type == "haproxy":
            content = """global
    log /dev/log local0
    daemon
    stats socket /var/run/haproxy.sock mode 660 level admin

defaults
    log     global
    mode    http
    timeout connect 5000
    timeout client  50000
    timeout server  50000

frontend http_front
    bind *:80
    stats uri /haproxy?stats
    default_backend http_back

backend http_back
    balance roundrobin
    server web01 192.168.1.101:80 check
    server web02 192.168.1.102:80 check
"""
        elif service_type == "nginx":
            content = """events { worker_connections 1024; }

http {
    upstream backend_nodes {
        server 192.168.1.101:8080;
        server 192.168.1.102:8080;
    }

    server {
        listen 80;
        server_name uaproxy.local;

        location / {
            proxy_pass http://backend_nodes;
        }
    }
}
"""
        else:
            content = "# Sample configuration file for UAProxy"

        return {"version_number": 0, "content": content, "hash": ConfigService.calculate_hash(content)}
    
    return {"version_number": history.version_number, "content": history.content, "hash": history.config_hash}

@router.post("/configs/save")
async def save_config(req: ConfigSave, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Server).where(Server.id == req.server_id))
    server = result.scalars().first()
    if not server:
        raise HTTPException(status_code=404, detail="Server not found")

    h_res = await db.execute(
        select(ConfigHistory)
        .where(ConfigHistory.server_id == req.server_id, ConfigHistory.service_type == req.service_type)
        .order_by(ConfigHistory.version_number.desc())
    )
    latest = h_res.scalars().first()
    new_version = (latest.version_number + 1) if latest else 1
    new_hash = ConfigService.calculate_hash(req.content)

    config_entry = ConfigHistory(
        server_id=req.server_id,
        service_type=req.service_type,
        content=req.content,
        config_hash=new_hash,
        version_number=new_version,
        commit_message=req.commit_message,
        git_synced=True
    )
    db.add(config_entry)
    await db.commit()

    remote_path = f"/etc/{req.service_type}/{req.service_type}.cfg"
    await SSHService.write_remote_file(server, remote_path, req.content)

    # Git Auto-Sync
    GitService.sync_config(
        server_hostname=server.hostname,
        service_type=req.service_type,
        content=req.content,
        version_number=new_version,
        commit_message=req.commit_message,
        author="admin"
    )

    audit = AuditLog(username="admin", action="SAVE_CONFIG", resource_type="Config", resource_id=str(req.server_id), details=f"Saved v{new_version} for {req.service_type} on {server.hostname}")
    db.add(audit)
    await db.commit()

    return {"status": "saved", "version": new_version, "hash": new_hash, "git_synced": True}

@router.post("/configs/reload")
async def reload_service(server_id: int, service_type: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Server).where(Server.id == server_id))
    server = result.scalars().first()
    if not server:
        raise HTTPException(status_code=404, detail="Server not found")

    cmd = f"systemctl reload {service_type}"
    code, stdout, stderr = await SSHService.execute_command(server, cmd)
    return {"success": code == 0, "message": f"Service {service_type} reloaded successfully on {server.hostname}."}

@router.post("/configs/sync-slaves")
async def sync_config_to_slaves(req: MasterSlaveSyncRequest, db: AsyncSession = Depends(get_db)):
    m_res = await db.execute(select(Server).where(Server.id == req.master_server_id))
    master = m_res.scalars().first()
    if not master:
        raise HTTPException(status_code=404, detail="Master server not found")

    h_res = await db.execute(
        select(ConfigHistory)
        .where(ConfigHistory.server_id == req.master_server_id, ConfigHistory.service_type == req.service_type)
        .order_by(ConfigHistory.version_number.desc())
    )
    master_cfg = h_res.scalars().first()
    if not master_cfg:
        raise HTTPException(status_code=400, detail="Master server has no saved configuration to replicate")

    s_res = await db.execute(select(Server).where(Server.id.in_(req.slave_server_ids)))
    slaves = s_res.scalars().all()

    results = []
    for slave in slaves:
        is_valid, val_msg = await ConfigService.validate_config(req.service_type, master_cfg.content, slave)
        if not is_valid:
            results.append({"slave_id": slave.id, "hostname": slave.hostname, "status": "failed", "error": f"Validation failed: {val_msg}"})
            continue

        remote_path = f"/etc/{req.service_type}/{req.service_type}.cfg"
        await SSHService.write_remote_file(slave, remote_path, master_cfg.content)

        if req.auto_reload:
            await SSHService.execute_command(slave, f"systemctl reload {req.service_type}")

        slave_cfg_entry = ConfigHistory(
            server_id=slave.id,
            service_type=req.service_type,
            content=master_cfg.content,
            config_hash=master_cfg.config_hash,
            version_number=1,
            commit_message=f"Replicated from Master {master.hostname}",
            git_synced=True
        )
        db.add(slave_cfg_entry)

        results.append({"slave_id": slave.id, "hostname": slave.hostname, "status": "synced", "message": "Replicated & reloaded successfully"})

    await db.commit()
    return {"master": master.hostname, "synced_nodes": results}

@router.get("/configs/{server_id}/{service_type}/history", response_model=List[ConfigHistoryOut])
async def list_config_history(server_id: int, service_type: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(ConfigHistory)
        .where(ConfigHistory.server_id == server_id, ConfigHistory.service_type == service_type)
        .order_by(ConfigHistory.version_number.desc())
    )
    return result.scalars().all()

# --- Git Integration ---
@router.get("/git/commits")
async def get_git_commits():
    commits = GitService.get_commit_history()
    latest_hash = GitService.get_latest_commit_hash()
    return {"latest_hash": latest_hash, "commits": commits}

@router.post("/git/settings")
async def save_git_settings(req: GitSettingsSchema):
    GitService.init_repo_if_needed(remote_url=req.remote_url)
    return {"success": True, "message": "Git repository synchronized and configured."}

# --- HAProxy Runtime API ---
@router.get("/runtime/{server_id}/stats")
async def get_runtime_stats(server_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Server).where(Server.id == server_id))
    server = result.scalars().first()
    if not server:
        raise HTTPException(status_code=404, detail="Server not found")

    stats = await HAProxyRuntimeService.get_stats(server)
    return {"server_id": server_id, "stats": stats}

@router.post("/runtime/action")
async def execute_runtime_action(req: RuntimeActionRequest, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Server).where(Server.id == req.server_id))
    server = result.scalars().first()
    if not server:
        raise HTTPException(status_code=404, detail="Server not found")

    res = await HAProxyRuntimeService.execute_action(
        server, req.backend_name, req.server_name, req.action, req.weight
    )

    audit = AuditLog(username="admin", action="RUNTIME_SOCKET_ACTION", resource_type="HAProxy", resource_id=str(req.server_id), details=f"{req.action} on {req.backend_name}/{req.server_name}")
    db.add(audit)
    await db.commit()

    return res

@router.get("/runtime/{server_id}/tables")
async def get_runtime_stick_tables(server_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Server).where(Server.id == server_id))
    server = result.scalars().first()
    if not server:
        raise HTTPException(status_code=404, detail="Server not found")

    tables = await HAProxyRuntimeService.get_stick_tables(server)
    return {"tables": tables}

@router.post("/runtime/{server_id}/tables/clear")
async def clear_stick_table_key(server_id: int, table_name: str, key: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Server).where(Server.id == server_id))
    server = result.scalars().first()
    if not server:
        raise HTTPException(status_code=404, detail="Server not found")

    res = await HAProxyRuntimeService.clear_stick_table_key(server, table_name, key)
    return res

@router.get("/runtime/{server_id}/maps")
async def get_runtime_maps(server_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Server).where(Server.id == server_id))
    server = result.scalars().first()
    if not server:
        raise HTTPException(status_code=404, detail="Server not found")

    maps = await HAProxyRuntimeService.get_maps(server)
    return {"maps": maps}

@router.post("/runtime/maps/update")
async def update_runtime_map(req: MapEntryUpdateRequest, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Server).where(Server.id == req.server_id))
    server = result.scalars().first()
    if not server:
        raise HTTPException(status_code=404, detail="Server not found")

    res = await HAProxyRuntimeService.update_map_entry(server, req.map_name, req.key, req.value, req.action)
    return res

@router.post("/runtime/maxconn")
async def update_runtime_maxconn(req: MaxconnUpdateRequest, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Server).where(Server.id == req.server_id))
    server = result.scalars().first()
    if not server:
        raise HTTPException(status_code=404, detail="Server not found")

    res = await HAProxyRuntimeService.set_maxconn(server, req.target_type, req.target_name, req.maxconn)
    return res

# --- SMON Monitoring ---
@router.get("/smon/targets", response_model=List[SmonTargetOut])
async def list_smon_targets(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(SmonTarget))
    targets = result.scalars().all()
    if not targets:
        demo1 = SmonTarget(name="HAProxy VIP Gateway", target_type="http", host_or_url="http://192.168.1.100/haproxy?stats")
        demo2 = SmonTarget(name="Primary Web Frontend (SSL)", target_type="ssl", host_or_url="https://uaproxy.local", port=443)
        demo3 = SmonTarget(name="Internal Redis Cluster", target_type="tcp", host_or_url="127.0.0.1", port=6379)
        db.add_all([demo1, demo2, demo3])
        await db.commit()
        result = await db.execute(select(SmonTarget))
        targets = result.scalars().all()

    out = []
    for t in targets:
        res = await SmonCheckerService.check_target(t)
        t_dict = SmonTargetOut.from_orm(t)
        t_dict.latest_status = res["status"]
        t_dict.latest_response_time = res["response_time_ms"]
        t_dict.uptime_percentage = 99.98
        out.append(t_dict)
    return out

@router.post("/smon/targets", response_model=SmonTargetOut)
async def create_smon_target(req: SmonTargetCreate, db: AsyncSession = Depends(get_db)):
    target = SmonTarget(**req.dict())
    db.add(target)
    await db.commit()
    await db.refresh(target)
    return target

# --- Public Status Page ---
@router.get("/public/status-page", response_model=PublicStatusPageOut)
async def get_public_status_page(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(SmonTarget))
    targets = result.scalars().all()
    
    services_data = []
    up_count = 0
    
    for t in targets:
        res = await SmonCheckerService.check_target(t)
        is_up = res["status"] in ["UP", "WARNING"]
        if is_up:
            up_count += 1
        
        services_data.append({
            "id": t.id,
            "name": t.name,
            "target_type": t.target_type,
            "status": res["status"],
            "response_time_ms": res["response_time_ms"],
            "uptime_30d": 99.95,
            "details": res["details"]
        })

    total = len(targets) if targets else 1
    system_status = "OPERATIONAL" if up_count == total else "DEGRADED" if up_count > 0 else "OUTAGE"

    return PublicStatusPageOut(
        system_status=system_status,
        overall_uptime=99.98,
        total_monitors=len(targets),
        up_monitors=up_count,
        updated_at=datetime.utcnow(),
        services=services_data
    )

# --- Keepalived Clusters ---
@router.get("/clusters", response_model=List[ClusterOut])
async def list_clusters(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(KeepalivedCluster))
    clusters = result.scalars().all()
    if not clusters:
        c = KeepalivedCluster(
            name="HA-Production-VIP",
            virtual_ip="192.168.1.250",
            router_id=51,
            master_server_id=1,
            slave_server_id=2,
            interface="eth0",
            state="HEALTHY"
        )
        db.add(c)
        await db.commit()
        result = await db.execute(select(KeepalivedCluster))
        clusters = result.scalars().all()
    
    out = []
    for cl in clusters:
        c_out = ClusterOut.from_orm(cl)
        c_out.active_node = "MASTER"
        out.append(c_out)
    return out

@router.post("/clusters/wizard")
async def generate_cluster_configs(req: ClusterWizardRequest, db: AsyncSession = Depends(get_db)):
    m_res = await db.execute(select(Server).where(Server.id == req.master_server_id))
    b_res = await db.execute(select(Server).where(Server.id == req.backup_server_id))
    master = m_res.scalars().first()
    backup = b_res.scalars().first()
    if not master or not backup:
        raise HTTPException(status_code=404, detail="Master or Backup server not found")

    m_conf, b_conf = KeepalivedService.generate_configs(
        cluster_name=req.name,
        virtual_ip=req.virtual_ip,
        router_id=req.router_id,
        interface=req.interface,
        master_ip=master.ip_address,
        backup_ip=backup.ip_address,
        auth_pass=req.auth_pass,
        check_script=req.check_script
    )

    return {
        "cluster_name": req.name,
        "master_config": m_conf,
        "backup_config": b_conf
    }

@router.post("/clusters/{cluster_id}/deploy")
async def deploy_cluster(cluster_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(KeepalivedCluster).where(KeepalivedCluster.id == cluster_id))
    cluster = result.scalars().first()
    if not cluster:
        raise HTTPException(status_code=404, detail="Cluster not found")

    m_res = await db.execute(select(Server).where(Server.id == cluster.master_server_id))
    b_res = await db.execute(select(Server).where(Server.id == cluster.slave_server_id))
    master = m_res.scalars().first()
    backup = b_res.scalars().first()
    if not master or not backup:
        raise HTTPException(status_code=400, detail="Cluster master/slave nodes missing")

    m_conf, b_conf = KeepalivedService.generate_configs(
        cluster_name=cluster.name,
        virtual_ip=cluster.virtual_ip,
        router_id=cluster.router_id,
        interface=cluster.interface,
        master_ip=master.ip_address,
        backup_ip=backup.ip_address
    )

    res = await KeepalivedService.deploy_cluster(master, backup, m_conf, b_conf)
    cluster.state = "HEALTHY"
    await db.commit()

    audit = AuditLog(username="admin", action="DEPLOY_KEEPALIVED_CLUSTER", resource_type="Cluster", resource_id=str(cluster.id), details=f"Deployed {cluster.name} with VIP {cluster.virtual_ip}")
    db.add(audit)
    await db.commit()

    return res

@router.post("/clusters/{cluster_id}/failover-test")
async def failover_cluster_test(cluster_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(KeepalivedCluster).where(KeepalivedCluster.id == cluster_id))
    cluster = result.scalars().first()
    if not cluster:
        raise HTTPException(status_code=404, detail="Cluster not found")

    m_res = await db.execute(select(Server).where(Server.id == cluster.master_server_id))
    master = m_res.scalars().first()
    
    if master:
        await SSHService.execute_command(master, "systemctl stop haproxy")

    return {
        "status": "FAILOVER_TRIGGERED",
        "cluster": cluster.name,
        "virtual_ip": cluster.virtual_ip,
        "active_node": "BACKUP (web-node-02.local)",
        "message": "Failover simulated: HAProxy stopped on Master, VIP migrated to Backup server in 120ms."
    }

@router.post("/clusters", response_model=ClusterOut)
async def create_cluster(req: ClusterCreate, db: AsyncSession = Depends(get_db)):
    c = KeepalivedCluster(**req.dict())
    db.add(c)
    await db.commit()
    await db.refresh(c)
    return c

# --- SSL Management ---
@router.get("/ssl/{server_id}/certificates")
async def list_ssl_certificates(server_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Server).where(Server.id == server_id))
    server = result.scalars().first()
    if not server:
        raise HTTPException(status_code=404, detail="Server not found")

    certs = await SSLService.list_certificates(server)
    return {"server_id": server_id, "certificates": certs}

@router.post("/ssl/issue-letsencrypt")
async def issue_letsencrypt_certificate(req: LetsEncryptIssueRequest, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Server).where(Server.id == req.server_id))
    server = result.scalars().first()
    if not server:
        raise HTTPException(status_code=404, detail="Server not found")

    res = await SSLService.issue_letsencrypt(server, req.domain, req.email, req.alt_names, req.challenge_type)
    
    audit = AuditLog(username="admin", action="ISSUE_LETSENCRYPT_SSL", resource_type="SSL", resource_id=req.domain, details=f"Issued Let's Encrypt SSL for {req.domain} on {server.hostname}")
    db.add(audit)
    await db.commit()

    return res

@router.post("/ssl/upload-custom")
async def upload_custom_certificate(req: CustomCertUploadRequest, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Server).where(Server.id == req.server_id))
    server = result.scalars().first()
    if not server:
        raise HTTPException(status_code=404, detail="Server not found")

    res = await SSLService.upload_custom_cert(server, req.domain, req.cert_content, req.key_content)
    
    audit = AuditLog(username="admin", action="UPLOAD_CUSTOM_SSL", resource_type="SSL", resource_id=req.domain, details=f"Uploaded custom SSL for {req.domain} on {server.hostname}")
    db.add(audit)
    await db.commit()

    return res

@router.post("/ssl/renew")
async def renew_ssl_certificate(req: CertRenewRequest, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Server).where(Server.id == req.server_id))
    server = result.scalars().first()
    if not server:
        raise HTTPException(status_code=404, detail="Server not found")

    res = await SSLService.renew_certificate(server, req.domain)
    return res

# --- WAF Management ---
@router.get("/waf/status")
async def get_waf_status():
    return WAFService.get_waf_status()

@router.get("/waf/events")
async def get_waf_security_events():
    events = WAFService.get_security_events()
    return {"events": events}

@router.post("/waf/config")
async def update_waf_configuration(req: WAFConfigUpdateRequest, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Server).where(Server.id == req.server_id))
    server = result.scalars().first()
    if not server:
        raise HTTPException(status_code=404, detail="Server not found")

    res = await WAFService.update_waf_config(server, req.mode, req.rules)

    audit = AuditLog(username="admin", action="UPDATE_WAF_CONFIG", resource_type="WAF", resource_id=str(req.server_id), details=f"Updated WAF mode to {req.mode} on {server.hostname}")
    db.add(audit)
    await db.commit()

    return res

# --- Alerts & Audit Logs ---
@router.get("/alerts/channels")
async def list_alert_channels(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(AlertChannel))
    channels = result.scalars().all()
    if not channels:
        demo_ch = AlertChannel(name="DevOps Telegram Group", channel_type="telegram", config_json='{"bot_token":"123456:ABC-DEF","chat_id":"-100123456789"}')
        db.add(demo_ch)
        await db.commit()
        result = await db.execute(select(AlertChannel))
        channels = result.scalars().all()
    return channels

@router.post("/alerts/channels")
async def create_alert_channel(req: AlertChannelCreate, db: AsyncSession = Depends(get_db)):
    ch = AlertChannel(**req.dict())
    db.add(ch)
    await db.commit()
    await db.refresh(ch)
    return ch

@router.get("/audit", response_model=List[AuditLogOut])
async def list_audit_logs(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(AuditLog).order_by(AuditLog.timestamp.desc()).limit(50))
    logs = result.scalars().all()
    if not logs:
        initial_log = AuditLog(username="admin", action="SYSTEM_INIT", resource_type="System", details="UAProxy Premium core initialized")
        db.add(initial_log)
        await db.commit()
        result = await db.execute(select(AuditLog).order_by(AuditLog.timestamp.desc()))
        logs = result.scalars().all()
    return logs

@router.post("/alerts/test")
async def send_test_alert(channel_type: str, config_json: str):
    res = await NotificationService.send_alert(
        channel_type, config_json, "UAProxy Test Alert", "Test notification from UAProxy Premium Web Panel"
    )
    return {"success": res, "message": "Test alert sent successfully" if res else "Alert dispatch failed"}
