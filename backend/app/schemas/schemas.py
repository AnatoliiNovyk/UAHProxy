from pydantic import BaseModel, EmailStr, Field, ConfigDict
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
    username: str = Field(..., min_length=2, max_length=64)
    password: str = Field(..., min_length=4)

class UserCreate(BaseModel):
    username: str = Field(..., min_length=2, max_length=64, pattern=r"^[a-zA-Z0-9_\-\.]+$")
    email: EmailStr
    password: str = Field(..., min_length=6)
    role: str = "admin"
    group_id: Optional[int] = None

class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    username: str
    email: str
    role: str
    is_active: bool
    group_id: Optional[int] = None
    created_at: datetime

class ServerGroupCreate(BaseModel):
    name: str = Field(..., min_length=2, max_length=64)
    description: Optional[str] = None

class ServerGroupOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    description: Optional[str] = None
    server_count: Optional[int] = 0

# --- Server Schemas ---
class ServerCreate(BaseModel):
    hostname: str = Field(..., pattern=r"^[a-zA-Z0-9_\-\.]+$")
    ip_address: str = Field(..., pattern=r"^[a-zA-Z0-9_\-\.:]+$")
    ssh_port: int = Field(22, ge=1, le=65535)
    ssh_username: str = Field("root", pattern=r"^[a-zA-Z0-9_\-]+$")
    ssh_password: Optional[str] = None
    ssh_key: Optional[str] = None
    has_haproxy: bool = True
    has_nginx: bool = False
    has_apache: bool = False
    has_keepalived: bool = False
    group_id: Optional[int] = None

class ServerOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

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
    ssh_status: Optional[str] = "UNCHECKED"
    ssh_error_message: Optional[str] = None
    last_tested_at: Optional[datetime] = None
    group_id: Optional[int] = None
    created_at: datetime

# --- Config Schemas ---
class ConfigSave(BaseModel):
    server_id: int
    service_type: str = Field(..., pattern=r"^(haproxy|nginx|apache2|keepalived)$")
    content: str
    commit_message: Optional[str] = "Updated via UAProxy Web"

class ConfigValidateRequest(BaseModel):
    service_type: str = Field(..., pattern=r"^(haproxy|nginx|apache2|keepalived)$")
    content: str

class ConfigHistoryOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    server_id: int
    service_type: str
    config_hash: str
    version_number: int
    commit_message: Optional[str]
    git_synced: bool
    created_at: datetime

# --- Wizard Schemas ---
class HAProxyWizardRequest(BaseModel):
    section_type: str = "listen" # listen, frontend, backend
    section_name: str = Field(..., pattern=r"^[a-zA-Z0-9_\-]+$")
    mode: str = "http"
    bind_ip: str = "*"
    bind_port: Optional[int] = Field(80, ge=1, le=65535)
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
    listen_port: int = Field(80, ge=1, le=65535)
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
    backend_name: str = Field(..., pattern=r"^[a-zA-Z0-9_\-]+$")
    server_name: str = Field(..., pattern=r"^[a-zA-Z0-9_\-]+$")
    action: str # ready, drain, maintain, set_weight
    weight: Optional[int] = Field(100, ge=0, le=256)

class MapEntryUpdateRequest(BaseModel):
    server_id: int
    map_name: str
    key: str
    value: str = ""
    action: str = "add" # add, set, del

class MaxconnUpdateRequest(BaseModel):
    server_id: int
    target_type: str = "global" # global, frontend
    target_name: Optional[str] = None
    maxconn: int = Field(2000, ge=1, le=1000000)

# --- SMON Schemas ---
class SmonTargetCreate(BaseModel):
    name: str = Field(..., min_length=2, max_length=128)
    target_type: str = Field(..., pattern=r"^(http|ping|tcp|ssl)$")
    host_or_url: str
    port: Optional[int] = Field(None, ge=1, le=65535)
    check_interval: int = Field(30, ge=5, le=3600)
    expected_status_code: int = Field(200, ge=100, le=599)
    ssl_warn_days: int = Field(14, ge=1, le=365)

class SmonTargetOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

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
    latest_response_time: Optional[float] = 0.0
    uptime_percentage: Optional[float] = 100.0

class PublicStatusPageOut(BaseModel):
    system_status: str # OPERATIONAL, DEGRADED, OUTAGE
    overall_uptime: float
    total_monitors: int
    up_monitors: int
    updated_at: datetime
    services: List[Dict[str, Any]]

# --- Keepalived Cluster Schemas ---
class ClusterCreate(BaseModel):
    name: str = Field(..., pattern=r"^[a-zA-Z0-9_\-]+$")
    virtual_ip: str = Field(..., pattern=r"^[a-zA-Z0-9_\-\.:]+$")
    router_id: int = Field(51, ge=1, le=255)
    master_server_id: int
    slave_server_id: int
    interface: str = "eth0"

class ClusterWizardRequest(BaseModel):
    name: str = Field(..., pattern=r"^[a-zA-Z0-9_\-]+$")
    virtual_ip: str = Field(..., pattern=r"^[a-zA-Z0-9_\-\.:]+$")
    router_id: int = Field(51, ge=1, le=255)
    interface: str = "eth0"
    master_server_id: int
    backup_server_id: int
    auth_pass: str = "UAProxyVRRP51"
    check_script: str = "killall -0 haproxy"

class ClusterOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

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

# --- SSL Schemas ---
class LetsEncryptIssueRequest(BaseModel):
    server_id: int
    domain: str = Field(..., pattern=r"^[a-zA-Z0-9_\-\.]+$")
    email: EmailStr
    alt_names: Optional[List[str]] = None
    challenge_type: str = "http-01"

class CustomCertUploadRequest(BaseModel):
    server_id: int
    domain: str = Field(..., pattern=r"^[a-zA-Z0-9_\-\.]+$")
    cert_content: str
    key_content: str

class CertRenewRequest(BaseModel):
    server_id: int
    domain: str = Field(..., pattern=r"^[a-zA-Z0-9_\-\.]+$")

# --- WAF Schemas ---
class WAFConfigUpdateRequest(BaseModel):
    server_id: int
    mode: str = "BLOCKING"
    rules: Dict[str, bool]

# --- GeoIP Schemas ---
class GeoIPRuleApplyRequest(BaseModel):
    server_id: int
    mode: str = "BLOCKLIST"
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
    name: str = Field(..., min_length=2, max_length=64)
    channel_type: str = Field(..., pattern=r"^(telegram|slack|email|discord|mattermost|webhook)$")
    config_json: str

class AuditLogOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    username: Optional[str]
    action: str
    resource_type: str
    resource_id: Optional[str]
    client_ip: Optional[str]
    details: Optional[str]
    timestamp: datetime
