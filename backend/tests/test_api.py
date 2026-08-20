import pytest
import pytest_asyncio
import httpx
import os
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy.pool import StaticPool

from app.main import app
from app.core.config import settings
from app.core.database import Base, get_db
from app.models.models import User, RoleEnum
from app.core.security import get_password_hash
from app.services.config_wizard import ConfigWizardService
from app.services.keepalived_service import KeepalivedService

TEST_DB_URL = "sqlite+aiosqlite:///:memory:"

@pytest_asyncio.fixture(scope="session", loop_scope="session")
async def client():
    # Setup isolated in-memory test database with StaticPool so tables persist across connections
    test_engine = create_async_engine(
        TEST_DB_URL,
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
        echo=False
    )
    test_session_maker = async_sessionmaker(bind=test_engine, class_=AsyncSession, expire_on_commit=False)

    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    # Seed admin user
    async with test_session_maker() as session:
        admin_user = User(
            username=settings.INITIAL_ADMIN_USERNAME,
            email=settings.INITIAL_ADMIN_EMAIL,
            hashed_password=get_password_hash(settings.INITIAL_ADMIN_PASSWORD),
            role=RoleEnum.ADMIN,
            is_active=True
        )
        session.add(admin_user)
        await session.commit()

    async def override_get_db():
        async with test_session_maker() as session:
            yield session

    app.dependency_overrides[get_db] = override_get_db

    async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://test") as c:
        yield c

    app.dependency_overrides.clear()
    await test_engine.dispose()

@pytest.mark.asyncio(loop_scope="session")
async def test_root_endpoint(client: httpx.AsyncClient):
    resp = await client.get("/")
    assert resp.status_code == 200
    data = resp.json()
    assert data["app"] == settings.PROJECT_NAME
    assert data["status"] == "online"

@pytest.mark.asyncio(loop_scope="session")
async def test_auth_and_profile_flow(client: httpx.AsyncClient):
    # 1. Login with initial admin credentials
    login_resp = await client.post("/api/v1/auth/login", json={
        "username": settings.INITIAL_ADMIN_USERNAME,
        "password": settings.INITIAL_ADMIN_PASSWORD
    })
    assert login_resp.status_code == 200
    login_data = login_resp.json()
    assert "access_token" in login_data
    assert login_data["username"] == settings.INITIAL_ADMIN_USERNAME
    token = login_data["access_token"]

    # 2. Query /auth/me with Bearer token
    me_resp = await client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert me_resp.status_code == 200
    me_data = me_resp.json()
    assert me_data["username"] == settings.INITIAL_ADMIN_USERNAME
    assert me_data["role"] == "admin"

@pytest.mark.asyncio(loop_scope="session")
async def test_smon_target_crud_lifecycle(client: httpx.AsyncClient):
    # 1. Create SMON target
    create_resp = await client.post("/api/v1/smon/targets", json={
        "name": "Pytest Synthetic Target",
        "target_type": "https",
        "host_or_url": "https://1.1.1.1",
        "port": 443,
        "check_interval": 30,
        "expected_status_code": 200
    })
    assert create_resp.status_code == 200
    target = create_resp.json()
    target_id = target["id"]
    assert target["name"] == "Pytest Synthetic Target"
    assert target["target_type"] == "https"

    # 2. List targets
    list_resp = await client.get("/api/v1/smon/targets")
    assert list_resp.status_code == 200
    targets = list_resp.json()
    assert any(t["id"] == target_id for t in targets)

    # 3. Delete target
    del_resp = await client.delete(f"/api/v1/smon/targets/{target_id}")
    assert del_resp.status_code == 200
    assert del_resp.json()["success"] is True

@pytest.mark.asyncio(loop_scope="session")
async def test_alert_channel_crud_lifecycle(client: httpx.AsyncClient):
    # 1. Create Alert Channel
    create_resp = await client.post("/api/v1/alerts/channels", json={
        "name": "Pytest Telegram Alerts",
        "channel_type": "telegram",
        "config_json": "{\"bot_token\":\"test_tok\",\"chat_id\":\"test_chat\"}"
    })
    assert create_resp.status_code == 200
    ch = create_resp.json()
    ch_id = ch["id"]

    # 2. List channels
    list_resp = await client.get("/api/v1/alerts/channels")
    assert list_resp.status_code == 200
    channels = list_resp.json()
    assert any(c["id"] == ch_id for c in channels)

    # 3. Delete channel
    del_resp = await client.delete(f"/api/v1/alerts/channels/{ch_id}")
    assert del_resp.status_code == 200
    assert del_resp.json()["success"] is True

def test_haproxy_wizard_generator():
    snippet = ConfigWizardService.generate_haproxy_snippet(
        section_type="frontend",
        section_name="fe_main",
        mode="http",
        bind_ip="*",
        bind_port=443,
        ssl_cert="/etc/haproxy/ssl/cert.pem",
        default_backend="be_app"
    )
    assert "frontend fe_main" in snippet
    assert "bind *:443 ssl crt /etc/haproxy/ssl/cert.pem" in snippet
    assert "default_backend be_app" in snippet

def test_keepalived_config_generator():
    master_cfg, backup_cfg = KeepalivedService.generate_configs(
        cluster_name="vrrp_prod",
        virtual_ip="192.168.1.100",
        router_id=51,
        interface="eth0",
        master_ip="192.168.1.10",
        backup_ip="192.168.1.11"
    )
    assert "state MASTER" in master_cfg
    assert "priority 101" in master_cfg
    assert "192.168.1.100/24 dev eth0" in master_cfg

    assert "state BACKUP" in backup_cfg
    assert "priority 100" in backup_cfg
    assert "192.168.1.100/24 dev eth0" in backup_cfg
