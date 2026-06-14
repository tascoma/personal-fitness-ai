from typing import AsyncIterator

from sqlalchemy import event
from sqlalchemy.ext.asyncio import (
    AsyncEngine,
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)
from sqlalchemy.orm import DeclarativeBase

from app.core.config import settings


class Base(DeclarativeBase):
    pass


def enable_sqlite_foreign_keys(target: AsyncEngine) -> None:
    """Turn on FK enforcement for the in-memory SQLite engine used by the test
    suite (SQLite ships with it off; ON DELETE CASCADE needs it). The runtime
    engine is Postgres, which enforces foreign keys natively."""
    if target.dialect.name != "sqlite":
        return

    @event.listens_for(target.sync_engine, "connect")
    def _on_connect(dbapi_connection, _record) -> None:
        cursor = dbapi_connection.cursor()
        cursor.execute("PRAGMA foreign_keys=ON")
        cursor.close()


engine = create_async_engine(settings.database_url)
AsyncSessionLocal = async_sessionmaker(engine, expire_on_commit=False)


async def get_db() -> AsyncIterator[AsyncSession]:
    async with AsyncSessionLocal() as session:
        yield session
