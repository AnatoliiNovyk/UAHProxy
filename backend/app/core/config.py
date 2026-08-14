import os
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    PROJECT_NAME: str = "UAProxy Premium"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api/v1"
    
    # Environment
    ENVIRONMENT: str = "development"
    
    # Database
    DATABASE_URL: str = os.getenv("DATABASE_URL", "postgresql+asyncpg://uaproxy_user:uaproxy_secret_password@localhost:5432/uaproxy")
    SQLITE_FALLBACK_URL: str = os.getenv("SQLITE_FALLBACK_URL", "sqlite+aiosqlite:///./uaproxy.db")
    USE_SQLITE_FALLBACK: bool = True
    
    # Redis
    REDIS_URL: str = os.getenv("REDIS_URL", "redis://localhost:6379/0")
    
    # Security
    SECRET_KEY: str = os.getenv("SECRET_KEY", "super-secret-key-change-in-production-uaproxy-32bytes")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 30 # 30 days
    
    # Fernet 32-byte key for SSH key/password encryption at rest
    ENCRYPTION_KEY: str = os.getenv("ENCRYPTION_KEY", "W3o8OXRpYnptNmVqNmZsbThzdmVwY2NzaWk1cXZhcTg=")

    # Initial Superuser
    INITIAL_ADMIN_USERNAME: str = os.getenv("INITIAL_ADMIN_USERNAME", "admin")
    INITIAL_ADMIN_PASSWORD: str = os.getenv("INITIAL_ADMIN_PASSWORD", "admin123")
    INITIAL_ADMIN_EMAIL: str = os.getenv("INITIAL_ADMIN_EMAIL", "admin@uaproxy.local")

    class Config:
        case_sensitive = True

settings = Settings()
