import logging
from contextlib import asynccontextmanager
from pathlib import Path
from typing import AsyncIterator

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

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
    title="Personal Fitness AI",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins.split(","),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
async def health() -> dict[str, str]:
    """Liveness probe for Render's health check."""
    return {"status": "ok"}

from app.routes.ai import router as ai_router  # noqa: E402
from app.routes.analytics import router as analytics_router  # noqa: E402
from app.routes.bodyweight import router as bodyweight_router  # noqa: E402
from app.routes.exercises import router as exercises_router  # noqa: E402
from app.routes.sets import router as sets_router  # noqa: E402
from app.routes.user_settings import router as settings_router  # noqa: E402
from app.routes.workout_sessions import router as sessions_router  # noqa: E402

app.include_router(exercises_router, prefix="/api")
app.include_router(settings_router, prefix="/api")
app.include_router(sessions_router, prefix="/api")
app.include_router(sets_router, prefix="/api")
app.include_router(analytics_router, prefix="/api")
app.include_router(ai_router, prefix="/api")
app.include_router(bodyweight_router, prefix="/api")


# Serve the built React app (single-service deploy). The frontend build outputs
# to frontend/dist; in local backend-only dev that directory may not exist, so
# guard on it. Registered after the API routers so /api/* and /health win.
_FRONTEND_DIST = Path(__file__).resolve().parents[2] / "frontend" / "dist"

if _FRONTEND_DIST.is_dir():
    app.mount(
        "/assets",
        StaticFiles(directory=_FRONTEND_DIST / "assets"),
        name="assets",
    )

    @app.get("/{full_path:path}")
    async def serve_spa(full_path: str) -> FileResponse:
        """Serve static files when they exist, else index.html for SPA routing."""
        candidate = _FRONTEND_DIST / full_path
        if full_path and candidate.is_file():
            return FileResponse(candidate)
        return FileResponse(_FRONTEND_DIST / "index.html")


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "app.main:app",
        host=settings.host,
        port=settings.port,
        reload=True,
        reload_excludes=["logs/*"],
    )
