from datetime import date as date_type

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import BodyweightEntry


async def log_weight(db: AsyncSession, entry_date: date_type, weight: float) -> BodyweightEntry:
    """Upsert the bodyweight for a date (one entry per day)."""
    entry = await db.scalar(select(BodyweightEntry).where(BodyweightEntry.date == entry_date))
    if entry is None:
        entry = BodyweightEntry(date=entry_date, weight=weight)
        db.add(entry)
    else:
        entry.weight = weight
    await db.commit()
    await db.refresh(entry)
    return entry


async def list_entries(db: AsyncSession) -> list[BodyweightEntry]:
    return list(
        (await db.scalars(select(BodyweightEntry).order_by(BodyweightEntry.date.desc()))).all()
    )


async def latest_weight(db: AsyncSession) -> float | None:
    return await db.scalar(
        select(BodyweightEntry.weight).order_by(BodyweightEntry.date.desc()).limit(1)
    )


async def delete_entry(db: AsyncSession, entry_id: int) -> bool:
    entry = await db.get(BodyweightEntry, entry_id)
    if entry is None:
        return False
    await db.delete(entry)
    await db.commit()
    return True
