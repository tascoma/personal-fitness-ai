from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.databases import get_db
from app.schemas.workout_set import WorkoutSetRead, WorkoutSetUpdate
from app.services import sets as svc

router = APIRouter(prefix="/sets", tags=["sets"])


@router.patch("/{set_id}", response_model=WorkoutSetRead)
async def update(set_id: int, data: WorkoutSetUpdate, db: AsyncSession = Depends(get_db)):
    return await svc.update_set(db, set_id, data)


@router.delete("/{set_id}", status_code=204)
async def delete(set_id: int, db: AsyncSession = Depends(get_db)):
    await svc.delete_set(db, set_id)
