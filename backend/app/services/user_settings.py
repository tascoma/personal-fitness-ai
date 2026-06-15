from datetime import date

from sqlalchemy.ext.asyncio import AsyncSession

from app.models import UserSettings
from app.schemas.user_settings import UserSettingsRead, UserSettingsUpdate
from app.services.bodyweight import latest_weight


def compute_age(birth_date: date | None, as_of: date | None = None) -> int | None:
    if birth_date is None:
        return None
    today = as_of or date.today()
    return today.year - birth_date.year - ((today.month, today.day) < (birth_date.month, birth_date.day))


async def settings_read(db: AsyncSession) -> UserSettingsRead:
    """Settings plus derived read-only fields (age, current bodyweight)."""
    row = await get_settings(db)
    return UserSettingsRead(
        unit=row.unit,
        e1rm_formula=row.e1rm_formula,
        height_cm=row.height_cm,
        birth_date=row.birth_date,
        sex=row.sex,
        training_goal=row.training_goal,
        age=compute_age(row.birth_date),
        current_bodyweight=await latest_weight(db),
    )


async def get_settings(db: AsyncSession) -> UserSettings:
    settings_row = await db.get(UserSettings, 1)
    if settings_row is None:
        settings_row = UserSettings(id=1)
        db.add(settings_row)
        await db.commit()
        await db.refresh(settings_row)
    return settings_row


async def update_settings(db: AsyncSession, data: UserSettingsUpdate) -> UserSettings:
    settings_row = await get_settings(db)
    formula_before = settings_row.e1rm_formula
    for field, value in data.model_dump(exclude_unset=True).items():
        if value is not None:
            setattr(settings_row, field, value)

    if settings_row.e1rm_formula != formula_before:
        # PR values are stored under the active formula — recompute the timeline.
        from app.services.prs import rebuild_all_prs

        await rebuild_all_prs(db, settings_row.e1rm_formula)

    await db.commit()
    await db.refresh(settings_row)
    return settings_row
