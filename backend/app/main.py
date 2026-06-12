import logging
from contextlib import asynccontextmanager
from typing import AsyncIterator

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

import app.models  # noqa: F401  — register models with Base.metadata
from app.core.config import settings
from app.core.logging import configure_logging
from app.databases import AsyncSessionLocal, Base, engine
from app.services.seed import seed_defaults

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(_app: FastAPI) -> AsyncIterator[None]:
    configure_logging()
    logger.info("Starting up (env=%s)", settings.app_env)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    async with AsyncSessionLocal() as db:
        await seed_defaults(db)
    yield
    logger.info("Shutting down")


app = FastAPI(
    title="agent-webapp-template",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins.split(","),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

from app.routes.analytics import router as analytics_router  # noqa: E402
from app.routes.exercises import router as exercises_router  # noqa: E402
from app.routes.sets import router as sets_router  # noqa: E402
from app.routes.user_settings import router as settings_router  # noqa: E402
from app.routes.workout_sessions import router as sessions_router  # noqa: E402

app.include_router(exercises_router, prefix="/api")
app.include_router(settings_router, prefix="/api")
app.include_router(sessions_router, prefix="/api")
app.include_router(sets_router, prefix="/api")
app.include_router(analytics_router, prefix="/api")


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "app.main:app",
        host=settings.host,
        port=settings.port,
        reload=True,
        reload_excludes=["logs/*"],
    )
