from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.databases import get_db
from app.schemas.user_settings import UserSettingsRead, UserSettingsUpdate
from app.services import user_settings as svc

router = APIRouter(prefix="/settings", tags=["settings"])


@router.get("", response_model=UserSettingsRead)
async def get_settings(db: AsyncSession = Depends(get_db)):
    return await svc.settings_read(db)


@router.patch("", response_model=UserSettingsRead)
async def update_settings(data: UserSettingsUpdate, db: AsyncSession = Depends(get_db)):
    await svc.update_settings(db, data)
    return await svc.settings_read(db)
