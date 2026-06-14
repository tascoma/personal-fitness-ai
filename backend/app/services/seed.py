import logging

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import Exercise, UserSettings

logger = logging.getLogger(__name__)

# (name, increment in lbs) — 10 lb steps for lower-body pulls/squats, 5 lb for upper body.
DEFAULT_EXERCISES: list[tuple[str, float]] = [
    ("Squat", 10.0),
    ("Bench Press", 5.0),
    ("Deadlift", 10.0),
    ("Overhead Press", 5.0),
    ("Barbell Row", 5.0),
    ("Romanian Deadlift", 10.0),
    ("Front Squat", 10.0),
    ("Incline Bench", 5.0),
    ("Close-Grip Bench", 5.0),
    ("Sumo Deadlift", 10.0),
    ("Power Clean", 10.0),
    ("T-Bar Row", 5.0),
    ("Row Machine", 5.0),
    ("Incline Dumbbell Press", 5.0),
]


async def seed_defaults(db: AsyncSession) -> None:
    """Idempotently insert default exercises and the settings row."""
    existing = set((await db.scalars(select(Exercise.name))).all())
    added = 0
    for name, increment in DEFAULT_EXERCISES:
        if name not in existing:
            db.add(Exercise(name=name, increment=increment, is_compound=True, is_custom=False))
            added += 1

    if await db.get(UserSettings, 1) is None:
        db.add(UserSettings(id=1))

    await db.commit()
    if added:
        logger.info("Seeded %d default exercises", added)
