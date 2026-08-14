from datetime import datetime
from typing import Optional
from sqlalchemy import Column, Integer, String, Boolean, DateTime, Text, ForeignKey, Float, Enum as SQLEnum
from sqlalchemy.orm import relationship
import enum
from app.core.database import Base

class RoleEnum(str, enum.Enum):
    ADMIN = "admin"
    MANAGER = "manager"
    VIEWER = "viewer"
    HIDEBLOCK = "hideblock"

class ServiceTypeEnum(str, enum.Enum):
    HAPROXY = "haproxy"
    NGINX = "nginx"
    APACHE = "apache"
    KEEPALIVED = "keepalived"

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(64), unique=True, index=True, nullable=False)
    email = Column(String(128), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    role = Column(SQLEnum(RoleEnum), default=RoleEnum.ADMIN, nullable=False)
    is_active = Column(Boolean, default=True)
    group_id = Column(Integer, ForeignKey("server_groups.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    group = relationship("ServerGroup", back_populates="users")

class ServerGroup(Base):
    __tablename__ = "server_groups"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(64), unique=True, nullable=False)
    description = Column(String(255), nullable=True)

    users = relationship("User", back_populates="group")
    servers = relationship("Server", back_populates="group")

class Server(Base):
    __tablename__ = "servers"

    id = Column(Integer, primary_key=True, index=True)
    hostname = Column(String(128), nullable=False)
    ip_address = Column(String(64), nullable=False, index=True)
    ssh_port = Column(Integer, default=22)
    ssh_username = Column(String(64), default="root")
    encrypted_ssh_password = Column(Text, nullable=True)
    encrypted_ssh_key = Column(Text, nullable=True)
    
    # Installed Services Flags
    has_haproxy = Column(Boolean, default=False)
    has_nginx = Column(Boolean, default=False)
    has_apache = Column(Boolean, default=False)
    has_keepalived = Column(Boolean, default=False)
    has_exporter = Column(Boolean, default=False)

    ssh_status = Column(String(32), default="UNCHECKED") # ONLINE, OFFLINE, UNCHECKED
    ssh_error_message = Column(Text, nullable=True)
    last_tested_at = Column(DateTime, nullable=True)

    group_id = Column(Integer, ForeignKey("server_groups.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    group = relationship("ServerGroup", back_populates="servers")
    configs = relationship("ConfigHistory", back_populates="server", cascade="all, delete-orphan")
    statuses = relationship("ServiceStatus", back_populates="server", cascade="all, delete-orphan")

class ServiceStatus(Base):
    __tablename__ = "service_statuses"

    id = Column(Integer, primary_key=True, index=True)
    server_id = Column(Integer, ForeignKey("servers.id"), nullable=False)
    service_name = Column(SQLEnum(ServiceTypeEnum), nullable=False)
    is_running = Column(Boolean, default=False)
    is_enabled = Column(Boolean, default=False)
    uptime = Column(String(64), nullable=True)
    version = Column(String(64), nullable=True)
    last_checked = Column(DateTime, default=datetime.utcnow)

    server = relationship("Server", back_populates="statuses")

class ConfigHistory(Base):
    __tablename__ = "config_histories"

    id = Column(Integer, primary_key=True, index=True)
    server_id = Column(Integer, ForeignKey("servers.id"), nullable=False)
    service_type = Column(SQLEnum(ServiceTypeEnum), nullable=False)
    content = Column(Text, nullable=False)
    config_hash = Column(String(64), nullable=False)
    version_number = Column(Integer, default=1)
    commit_message = Column(String(255), nullable=True)
    git_synced = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    server = relationship("Server", back_populates="configs")

class SmonTarget(Base):
    __tablename__ = "smon_targets"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(128), nullable=False)
    target_type = Column(String(32), default="http") # http, ping, tcp, ssl
    host_or_url = Column(String(255), nullable=False)
    port = Column(Integer, nullable=True)
    check_interval = Column(Integer, default=30) # in seconds
    expected_status_code = Column(Integer, default=200)
    ssl_warn_days = Column(Integer, default=14)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    results = relationship("SmonResult", back_populates="target", cascade="all, delete-orphan")

class SmonResult(Base):
    __tablename__ = "smon_results"

    id = Column(Integer, primary_key=True, index=True)
    target_id = Column(Integer, ForeignKey("smon_targets.id"), nullable=False)
    status = Column(String(32), nullable=False) # UP, DOWN, WARN
    response_time_ms = Column(Float, default=0.0)
    http_code = Column(Integer, nullable=True)
    ssl_days_remaining = Column(Integer, nullable=True)
    error_message = Column(Text, nullable=True)
    checked_at = Column(DateTime, default=datetime.utcnow)

    target = relationship("SmonTarget", back_populates="results")

class KeepalivedCluster(Base):
    __tablename__ = "keepalived_clusters"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(128), nullable=False)
    virtual_ip = Column(String(64), nullable=False)
    router_id = Column(Integer, default=51)
    master_server_id = Column(Integer, ForeignKey("servers.id"), nullable=False)
    slave_server_id = Column(Integer, ForeignKey("servers.id"), nullable=False)
    interface = Column(String(32), default="eth0")
    state = Column(String(32), default="HEALTHY") # HEALTHY, DEGRADED, FAIL
    created_at = Column(DateTime, default=datetime.utcnow)

class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, nullable=True)
    username = Column(String(64), nullable=True)
    action = Column(String(128), nullable=False)
    resource_type = Column(String(64), nullable=False)
    resource_id = Column(String(64), nullable=True)
    client_ip = Column(String(64), nullable=True)
    details = Column(Text, nullable=True)
    timestamp = Column(DateTime, default=datetime.utcnow)

class AlertChannel(Base):
    __tablename__ = "alert_channels"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(64), nullable=False)
    channel_type = Column(String(32), nullable=False) # telegram, slack, email, mattermost
    config_json = Column(Text, nullable=False) # JSON encoded API keys / Webhooks
    is_enabled = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

class WafEvent(Base):
    __tablename__ = "waf_events"

    id = Column(Integer, primary_key=True, index=True)
    server_id = Column(Integer, ForeignKey("servers.id"), nullable=True)
    client_ip = Column(String(64), nullable=False)
    country = Column(String(10), default="UA")
    request_uri = Column(Text, nullable=False)
    rule_id = Column(String(32), nullable=False)
    rule_name = Column(String(128), nullable=False)
    severity = Column(String(32), default="CRITICAL") # CRITICAL, HIGH, MEDIUM, LOW
    action = Column(String(32), default="BLOCKED (403)")
    matched_var = Column(String(128), nullable=True)
    timestamp = Column(DateTime, default=datetime.utcnow)
