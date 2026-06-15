from datetime import date as date_type
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.databases import get_db
from app.models import Exercise, PersonalRecord, WorkoutSession, WorkoutSet
from app.schemas.analytics import (
    E1RMPoint,
    ExerciseSeries,
    PersonalRecordRead,
    PredictionRead,
    RecentPRRead,
    RelativeStrengthLift,
    RelativeStrengthRead,
    SummaryRead,
    TonnageBucket,
)
from app.services import analytics as svc
from app.services import strength_standards
from app.services.bodyweight import latest_weight
from app.services.exercises import get_exercise
from app.services.user_settings import get_settings

router = APIRouter(prefix="/analytics", tags=["analytics"])


@router.get("/summary", response_model=SummaryRead)
async def summary(db: AsyncSession = Depends(get_db)):
    stats = await svc.summary_stats(db, date_type.today())
    return SummaryRead(**stats.__dict__)


@router.get("/recent-prs", response_model=list[RecentPRRead])
async def recent_prs(
    limit: int = Query(10, ge=1, le=50),
    db: AsyncSession = Depends(get_db),
):
    rows = (
        await db.execute(
            select(PersonalRecord, Exercise.name)
            .join(Exercise, PersonalRecord.exercise_id == Exercise.id)
            .order_by(PersonalRecord.achieved_on.desc(), PersonalRecord.id.desc())
            .limit(limit)
        )
    ).all()
    return [
        RecentPRRead(**PersonalRecordRead.model_validate(pr).model_dump(), exercise_name=name)
        for pr, name in rows
    ]


@router.get("/relative-strength", response_model=RelativeStrengthRead)
async def relative_strength(db: AsyncSession = Depends(get_db)):
    """Current best e1RM ÷ bodyweight per trained lift, with a strength tier."""
    settings = await get_settings(db)
    bodyweight = await latest_weight(db)

    exercise_ids = (
        await db.scalars(
            select(WorkoutSet.exercise_id)
            .join(WorkoutSession, WorkoutSet.session_id == WorkoutSession.id)
            .where(WorkoutSet.is_warmup.is_(False))
            .distinct()
        )
    ).all()

    lifts: list[RelativeStrengthLift] = []
    for exercise_id in sorted(exercise_ids):
        exercise = await db.get(Exercise, exercise_id)
        if exercise is None:
            continue
        series = await svc.e1rm_series(db, exercise_id, settings.e1rm_formula)
        if not series:
            continue
        best = max(value for _, value in series)
        ratio = round(best / bodyweight, 2) if bodyweight else None
        tier = (
            strength_standards.classify(exercise.name, settings.sex, best, bodyweight)
            if bodyweight
            else None
        )
        lifts.append(
            RelativeStrengthLift(
                exercise_id=exercise_id,
                exercise_name=exercise.name,
                e1rm=round(best, 1),
                ratio=ratio,
                tier=tier,
            )
        )

    lifts.sort(key=lambda lift: lift.ratio or 0, reverse=True)
    return RelativeStrengthRead(bodyweight=bodyweight, lifts=lifts)


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
