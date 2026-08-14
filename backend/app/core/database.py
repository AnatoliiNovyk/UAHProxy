import asyncio
import logging
from typing import AsyncGenerator
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import declarative_base
from app.core.config import settings

logger = logging.getLogger("uaproxy.database")

Base = declarative_base()

engine = None
AsyncSessionLocal = None

async def init_db():
    global engine, AsyncSessionLocal
    
    # Try connecting to PostgreSQL with retries (for Docker Compose startup)
    connected = False
    for attempt in range(1, 6):
        try:
            logger.info(f"Connecting to PostgreSQL (Attempt {attempt}/5)...")
            temp_engine = create_async_engine(settings.DATABASE_URL, echo=False, pool_pre_ping=True)
            async with temp_engine.begin() as conn:
                await conn.run_sync(Base.metadata.create_all)
            engine = temp_engine
            AsyncSessionLocal = async_sessionmaker(bind=engine, class_=AsyncSession, expire_on_commit=False)
            connected = True
            logger.info("Successfully connected to PostgreSQL database.")
            break
        except Exception as e:
            logger.warning(f"PostgreSQL connection attempt {attempt} failed: {e}")
            await asyncio.sleep(2)

    if not connected:
        logger.warning(f"Could not connect to PostgreSQL after 5 attempts. Falling back to SQLite: {settings.SQLITE_FALLBACK_URL}")
        engine = create_async_engine(settings.SQLITE_FALLBACK_URL, echo=False)
        AsyncSessionLocal = async_sessionmaker(bind=engine, class_=AsyncSession, expire_on_commit=False)
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)

async def get_session() -> AsyncSession:
    if AsyncSessionLocal is None:
        raise RuntimeError("Database engine not initialized. Call init_db() first.")
    return AsyncSessionLocal()

async def get_db() -> AsyncGenerator[AsyncSession, None]:
    session = await get_session()
    try:
        yield session
    finally:
        await session.close()
