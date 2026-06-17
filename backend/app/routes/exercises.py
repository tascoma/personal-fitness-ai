from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.databases import get_db
from app.schemas.exercise import ExerciseCreate, ExerciseRead, ExerciseUpdate
from app.services import exercises as svc

router = APIRouter(prefix="/exercises", tags=["exercises"])


@router.get("", response_model=list[ExerciseRead])
async def list_all(db: AsyncSession = Depends(get_db)):
    return await svc.list_exercises(db)


@router.post("", response_model=ExerciseRead, status_code=201)
async def create(data: ExerciseCreate, db: AsyncSession = Depends(get_db)):
    return await svc.create_exercise(db, data)


@router.get("/{exercise_id}", response_model=ExerciseRead)
async def get_one(exercise_id: int, db: AsyncSession = Depends(get_db)):
    return await svc.get_exercise(db, exercise_id)


@router.patch("/{exercise_id}", response_model=ExerciseRead)
async def update(exercise_id: int, data: ExerciseUpdate, db: AsyncSession = Depends(get_db)):
    return await svc.update_exercise(db, exercise_id, data)


@router.delete("/{exercise_id}", status_code=204)
async def delete(exercise_id: int, db: AsyncSession = Depends(get_db)):
    await svc.delete_exercise(db, exercise_id)
