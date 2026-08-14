from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List, Dict, Any
from datetime import datetime

# --- Auth & RBAC Schemas ---
class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user_id: int
    username: str
    role: str

class LoginRequest(BaseModel):
    username: str
    password: str

class UserCreate(BaseModel):
    username: str
    email: EmailStr
    password: str
    role: str = "admin"
    group_id: Optional[int] = None

class UserOut(BaseModel):
    id: int
    username: str
    email: str
    role: str
    is_active: bool
    group_id: Optional[int] = None
    created_at: datetime

    class Config:
        from_attributes = True

class ServerGroupCreate(BaseModel):
    name: str
    description: Optional[str] = None

class ServerGroupOut(BaseModel):
    id: int
    name: str
    description: Optional[str] = None
    server_count: Optional[int] = 0

    class Config:
        from_attributes = True

# --- Server Schemas ---
class ServerCreate(BaseModel):
    hostname: str
    ip_address: str
    ssh_port: int = 22
    ssh_username: str = "root"
    ssh_password: Optional[str] = None
    ssh_key: Optional[str] = None
    has_haproxy: bool = True
    has_nginx: bool = False
    has_apache: bool = False
    has_keepalived: bool = False
    group_id: Optional[int] = None

class ServerOut(BaseModel):
    id: int
    hostname: str
    ip_address: str
    ssh_port: int
    ssh_username: str
    has_haproxy: bool
    has_nginx: bool
    has_apache: bool
    has_keepalived: bool
    has_exporter: bool
    group_id: Optional[int] = None
    created_at: datetime

    class Config:
        from_attributes = True

# --- Config Schemas ---
class ConfigSave(BaseModel):
    server_id: int
    service_type: str
    content: str
    commit_message: Optional[str] = "Updated via UAProxy Web"

class ConfigValidateRequest(BaseModel):
    service_type: str
    content: str

class ConfigHistoryOut(BaseModel):
    id: int
    server_id: int
    service_type: str
    config_hash: str
    version_number: int
    commit_message: Optional[str]
    git_synced: bool
    created_at: datetime

    class Config:
        from_attributes = True

# --- Wizard Schemas ---
class HAProxyWizardRequest(BaseModel):
    section_type: str = "listen" # listen, frontend, backend
    section_name: str
    mode: str = "http"
    bind_ip: str = "*"
    bind_port: Optional[int] = 80
    ssl_cert: Optional[str] = None
    balance_algo: str = "roundrobin"
    default_backend: Optional[str] = None
    servers: Optional[List[Dict[str, Any]]] = None
    acl_rules: Optional[List[Dict[str, str]]] = None
    enable_stats: bool = False
    stats_uri: str = "/haproxy?stats"

class NginxWizardRequest(BaseModel):
    upstream_name: Optional[str] = None
    upstream_servers: Optional[List[Dict[str, Any]]] = None
    server_name: str = "example.com"
    listen_port: int = 80
    ssl_cert: Optional[str] = None
    ssl_key: Optional[str] = None
    locations: Optional[List[Dict[str, str]]] = None

# --- Master-Slave Sync Schemas ---
class MasterSlaveSyncRequest(BaseModel):
    master_server_id: int
    slave_server_ids: List[int]
    service_type: str = "haproxy"
    auto_reload: bool = True

# --- Git Sync Schemas ---
class GitSettingsSchema(BaseModel):
    remote_url: str
    branch: str = "main"
    auth_type: str = "token" # token, ssh_key
    token: Optional[str] = None
    ssh_private_key: Optional[str] = None
    auto_sync_enabled: bool = True

# --- HAProxy Runtime Schemas ---
class RuntimeActionRequest(BaseModel):
    server_id: int
    backend_name: str
    server_name: str
    action: str # ready, drain, maintain, set_weight
    weight: Optional[int] = 100

class MapEntryUpdateRequest(BaseModel):
    server_id: int
    map_name: str
    key: str
    value: str = ""
    action: str = "add" # add, del

class MaxconnUpdateRequest(BaseModel):
    server_id: int
    target_type: str = "global" # global, frontend
    target_name: Optional[str] = None
    maxconn: int = 2000

# --- SMON Schemas ---
class SmonTargetCreate(BaseModel):
    name: str
    target_type: str # http, ping, tcp, ssl
    host_or_url: str
    port: Optional[int] = None
    check_interval: int = 30
    expected_status_code: int = 200
    ssl_warn_days: int = 14

class SmonTargetOut(BaseModel):
    id: int
    name: str
    target_type: str
    host_or_url: str
    port: Optional[int]
    check_interval: int
    expected_status_code: int
    ssl_warn_days: int
    is_active: bool
    created_at: datetime
    latest_status: Optional[str] = "UP"
    latest_response_time: Optional[float] = 42.5
    uptime_percentage: Optional[float] = 99.95

    class Config:
        from_attributes = True

class PublicStatusPageOut(BaseModel):
    system_status: str # OPERATIONAL, DEGRADED, OUTAGE
    overall_uptime: float # 99.98
    total_monitors: int
    up_monitors: int
    updated_at: datetime
    services: List[Dict[str, Any]]

# --- Keepalived Cluster Schemas ---
class ClusterCreate(BaseModel):
    name: str
    virtual_ip: str
    router_id: int = 51
    master_server_id: int
    slave_server_id: int
    interface: str = "eth0"

class ClusterWizardRequest(BaseModel):
    name: str
    virtual_ip: str
    router_id: int = 51
    interface: str = "eth0"
    master_server_id: int
    backup_server_id: int
    auth_pass: str = "UAProxyVRRP51"
    check_script: str = "killall -0 haproxy"

class ClusterOut(BaseModel):
    id: int
    name: str
    virtual_ip: str
    router_id: int
    master_server_id: int
    slave_server_id: int
    interface: str
    state: str
    active_node: Optional[str] = "MASTER"
    created_at: datetime

    class Config:
        from_attributes = True

# --- SSL Schemas ---
class LetsEncryptIssueRequest(BaseModel):
    server_id: int
    domain: str
    email: EmailStr
    alt_names: Optional[List[str]] = None
    challenge_type: str = "http-01"

class CustomCertUploadRequest(BaseModel):
    server_id: int
    domain: str
    cert_content: str
    key_content: str

class CertRenewRequest(BaseModel):
    server_id: int
    domain: str

# --- WAF Schemas ---
class WAFConfigUpdateRequest(BaseModel):
    server_id: int
    mode: str = "BLOCKING" # DISABLED, DETECTION_ONLY, BLOCKING
    rules: Dict[str, bool]

# --- GeoIP Schemas ---
class GeoIPRuleApplyRequest(BaseModel):
    server_id: int
    mode: str = "BLOCKLIST" # BLOCKLIST, ALLOWLIST
    country_codes: List[str]

# --- Metrics Schemas ---
class TimeSeriesMetricsOut(BaseModel):
    server_id: int
    hostname: str
    period: str
    summary: Dict[str, Any]
    points: List[Dict[str, Any]]

# --- Audit & Alerts ---
class AlertChannelCreate(BaseModel):
    name: str
    channel_type: str # telegram, slack, email, discord
    config_json: str

class AuditLogOut(BaseModel):
    id: int
    username: Optional[str]
    action: str
    resource_type: str
    resource_id: Optional[str]
    client_ip: Optional[str]
    details: Optional[str]
    timestamp: datetime

    class Config:
        from_attributes = True
