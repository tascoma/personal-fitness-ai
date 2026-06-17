from fastapi import HTTPException
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import Exercise, WorkoutSet
from app.schemas.exercise import ExerciseCreate, ExerciseUpdate


async def list_exercises(db: AsyncSession) -> list[Exercise]:
    return list((await db.scalars(select(Exercise).order_by(Exercise.name))).all())


async def get_exercise(db: AsyncSession, exercise_id: int) -> Exercise:
    exercise = await db.get(Exercise, exercise_id)
    if exercise is None:
        raise HTTPException(status_code=404, detail="Exercise not found")
    return exercise


async def create_exercise(db: AsyncSession, data: ExerciseCreate) -> Exercise:
    existing = await db.scalar(select(Exercise).where(Exercise.name == data.name))
    if existing is not None:
        raise HTTPException(status_code=409, detail="Exercise with this name already exists")
    exercise = Exercise(**data.model_dump(), is_custom=True)
    db.add(exercise)
    await db.commit()
    await db.refresh(exercise)
    return exercise


async def update_exercise(db: AsyncSession, exercise_id: int, data: ExerciseUpdate) -> Exercise:
    exercise = await get_exercise(db, exercise_id)
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(exercise, field, value)
    await db.commit()
    await db.refresh(exercise)
    return exercise


async def delete_exercise(db: AsyncSession, exercise_id: int) -> None:
    exercise = await get_exercise(db, exercise_id)
    set_count = await db.scalar(
        select(func.count()).select_from(WorkoutSet).where(WorkoutSet.exercise_id == exercise_id)
    )
    if set_count:
        raise HTTPException(status_code=409, detail="Exercise has logged sets and cannot be deleted")
    await db.delete(exercise)
    await db.commit()
