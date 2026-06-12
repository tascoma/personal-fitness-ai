from typing import Literal

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.databases import get_db
from app.models import PersonalRecord
from app.schemas.analytics import (
    E1RMPoint,
    ExerciseSeries,
    PersonalRecordRead,
    PredictionRead,
    TonnageBucket,
)
from app.services import analytics as svc
from app.services.exercises import get_exercise
from app.services.user_settings import get_settings

router = APIRouter(prefix="/analytics", tags=["analytics"])


@router.get("/tonnage", response_model=list[TonnageBucket])
async def tonnage(
    exercise_id: int | None = None,
    period: Literal["week", "month"] = "week",
    db: AsyncSession = Depends(get_db),
):
    buckets = await svc.tonnage_buckets(db, exercise_id, period)
    return [TonnageBucket(bucket=key, tonnage=value) for key, value in buckets]


@router.get("/e1rm", response_model=list[E1RMPoint])
async def e1rm(exercise_id: int, db: AsyncSession = Depends(get_db)):
    formula = (await get_settings(db)).e1rm_formula
    series = await svc.e1rm_series(db, exercise_id, formula)
    return [E1RMPoint(date=d, e1rm=v) for d, v in series]


@router.get("/prs", response_model=list[PersonalRecordRead])
async def prs(exercise_id: int, db: AsyncSession = Depends(get_db)):
    return list(
        (
            await db.scalars(
                select(PersonalRecord)
                .where(PersonalRecord.exercise_id == exercise_id)
                .order_by(PersonalRecord.achieved_on, PersonalRecord.id)
            )
        ).all()
    )


@router.get("/compare", response_model=list[ExerciseSeries])
async def compare(
    exercise_ids: str = Query(description="Comma-separated exercise ids, e.g. 1,3"),
    db: AsyncSession = Depends(get_db),
):
    try:
        ids = [int(part) for part in exercise_ids.split(",") if part.strip()]
    except ValueError:
        raise HTTPException(status_code=422, detail="exercise_ids must be comma-separated ints")
    if not 1 <= len(ids) <= 4:
        raise HTTPException(status_code=422, detail="Provide 1-4 exercise ids")

    formula = (await get_settings(db)).e1rm_formula
    result = []
    for exercise_id in ids:
        exercise = await get_exercise(db, exercise_id)
        series = await svc.e1rm_series(db, exercise_id, formula)
        result.append(
            ExerciseSeries(
                exercise_id=exercise_id,
                exercise_name=exercise.name,
                series=[E1RMPoint(date=d, e1rm=v) for d, v in series],
            )
        )
    return result


@router.get("/predictions", response_model=PredictionRead)
async def predictions(exercise_id: int, db: AsyncSession = Depends(get_db)):
    await get_exercise(db, exercise_id)  # 404 if unknown
    formula = (await get_settings(db)).e1rm_formula
    series = await svc.e1rm_series(db, exercise_id, formula)
    prediction = svc.project_milestone(series)
    return PredictionRead(exercise_id=exercise_id, **prediction.__dict__)
