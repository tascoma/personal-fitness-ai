from sqlalchemy.ext.asyncio import AsyncSession

from app.models import UserSettings
from app.schemas.user_settings import UserSettingsUpdate


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
