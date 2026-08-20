import logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.future import select

from app.core.config import settings
from app.core.database import init_db, get_session
from app.core.security import get_password_hash
from app.models.models import User, RoleEnum
from app.api.endpoints import router as api_router
import asyncio
from app.websockets.live_stream import ws_router, metrics_broadcaster_task
from app.services.smon_daemon import SmonDaemon

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("uaproxy")

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    docs_url="/docs"
)

# Enable CORS for React Frontend Development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
async def on_startup():
    logger.info("Initializing UAProxy database and bootstrapping initial tables...")
    await init_db()

    # Bootstrap Initial Superuser
    session = await get_session()
    try:
        result = await session.execute(select(User).where(User.username == settings.INITIAL_ADMIN_USERNAME))
        admin = result.scalars().first()
        if not admin:
            logger.info(f"Creating initial admin user: {settings.INITIAL_ADMIN_USERNAME}")
            hashed = get_password_hash(settings.INITIAL_ADMIN_PASSWORD)
            initial_admin = User(
                username=settings.INITIAL_ADMIN_USERNAME,
                email=settings.INITIAL_ADMIN_EMAIL,
                hashed_password=hashed,
                role=RoleEnum.ADMIN,
                is_active=True
            )
            session.add(initial_admin)

        await session.commit()
    finally:
        await session.close()

    # Start Background Daemons
    SmonDaemon.get_instance().start()
    asyncio.create_task(metrics_broadcaster_task())
    logger.info("UAProxy Background Probers and Metrics Broadcasters launched successfully.")

@app.on_event("shutdown")
async def on_shutdown():
    SmonDaemon.get_instance().stop()
    logger.info("UAProxy Background Services stopped.")

app.include_router(api_router, prefix=settings.API_V1_STR)
app.include_router(ws_router)

@app.get("/")
async def root():
    return {
        "app": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "status": "online",
        "docs": "/docs"
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
