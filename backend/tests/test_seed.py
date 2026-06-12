from sqlalchemy import select

from app.models import Exercise, UserSettings
from app.services.seed import DEFAULT_EXERCISES, seed_defaults


async def test_seed_creates_defaults(db_session):
    exercises = (await db_session.scalars(select(Exercise))).all()
    assert len(exercises) == len(DEFAULT_EXERCISES) == 11
    by_name = {e.name: e for e in exercises}
    assert by_name["Squat"].increment == 10.0
    assert by_name["Bench Press"].increment == 5.0
    assert all(e.is_compound and not e.is_custom for e in exercises)

    settings_row = await db_session.get(UserSettings, 1)
    assert settings_row.unit == "lbs"
    assert settings_row.e1rm_formula == "epley"


async def test_seed_is_idempotent(db_session):
    await seed_defaults(db_session)
    exercises = (await db_session.scalars(select(Exercise))).all()
    assert len(exercises) == 11
