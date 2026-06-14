from fastapi import HTTPException
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import Exercise, WorkoutSession, WorkoutSet
from app.schemas.workout_set import WorkoutSetCreate, WorkoutSetUpdate
from app.services.e1rm import compute_both
from app.services.prs import rebuild_prs
from app.services.user_settings import get_settings


async def _rebuild_for(db: AsyncSession, exercise_id: int) -> None:
    formula = (await get_settings(db)).e1rm_formula
    await rebuild_prs(db, exercise_id, formula)


async def create_set(db: AsyncSession, session_id: int, data: WorkoutSetCreate) -> WorkoutSet:
    if await db.get(WorkoutSession, session_id) is None:
        raise HTTPException(status_code=404, detail="Session not found")
    if await db.get(Exercise, data.exercise_id) is None:
        raise HTTPException(status_code=404, detail="Exercise not found")

    set_number = data.set_number
    if set_number is None:
        current_max = await db.scalar(
            select(func.max(WorkoutSet.set_number)).where(
                WorkoutSet.session_id == session_id,
                WorkoutSet.exercise_id == data.exercise_id,
            )
        )
        set_number = (current_max or 0) + 1

    e1rm_epley, e1rm_brzycki = compute_both(data.weight, data.reps)
    workout_set = WorkoutSet(
        **data.model_dump(exclude={"set_number"}),
        session_id=session_id,
        set_number=set_number,
        e1rm_epley=e1rm_epley,
        e1rm_brzycki=e1rm_brzycki,
    )
    db.add(workout_set)
    await db.flush()
    await _rebuild_for(db, data.exercise_id)
    await db.commit()
    await db.refresh(workout_set)
    return workout_set


async def create_sets_bulk(
    db: AsyncSession, session_id: int, items: list[WorkoutSetCreate]
) -> list[WorkoutSet]:
    if await db.get(WorkoutSession, session_id) is None:
        raise HTTPException(status_code=404, detail="Session not found")

    exercise_ids = {item.exercise_id for item in items}
    for eid in exercise_ids:
        if await db.get(Exercise, eid) is None:
            raise HTTPException(status_code=404, detail=f"Exercise {eid} not found")

    # Fetch current max set_number per exercise in one query each, before inserting
    max_set_numbers: dict[int, int] = {}
    for eid in exercise_ids:
        current_max = await db.scalar(
            select(func.max(WorkoutSet.set_number)).where(
                WorkoutSet.session_id == session_id,
                WorkoutSet.exercise_id == eid,
            )
        )
        max_set_numbers[eid] = current_max or 0

    workout_sets: list[WorkoutSet] = []
    for data in items:
        set_number = data.set_number
        if set_number is None:
            max_set_numbers[data.exercise_id] += 1
            set_number = max_set_numbers[data.exercise_id]

        e1rm_epley, e1rm_brzycki = compute_both(data.weight, data.reps)
        workout_set = WorkoutSet(
            **data.model_dump(exclude={"set_number"}),
            session_id=session_id,
            set_number=set_number,
            e1rm_epley=e1rm_epley,
            e1rm_brzycki=e1rm_brzycki,
        )
        db.add(workout_set)
        workout_sets.append(workout_set)

    await db.flush()

    # Rebuild PRs once per unique exercise instead of once per set
    formula = (await get_settings(db)).e1rm_formula
    for eid in exercise_ids:
        await rebuild_prs(db, eid, formula)

    await db.commit()
    for ws in workout_sets:
        await db.refresh(ws)
    return workout_sets


async def get_set(db: AsyncSession, set_id: int) -> WorkoutSet:
    workout_set = await db.get(WorkoutSet, set_id)
    if workout_set is None:
        raise HTTPException(status_code=404, detail="Set not found")
    return workout_set


async def update_set(db: AsyncSession, set_id: int, data: WorkoutSetUpdate) -> WorkoutSet:
    workout_set = await get_set(db, set_id)
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(workout_set, field, value)
    workout_set.e1rm_epley, workout_set.e1rm_brzycki = compute_both(
        workout_set.weight, workout_set.reps
    )
    await db.flush()
    await _rebuild_for(db, workout_set.exercise_id)
    await db.commit()
    await db.refresh(workout_set)
    return workout_set


async def delete_set(db: AsyncSession, set_id: int) -> None:
    workout_set = await get_set(db, set_id)
    exercise_id = workout_set.exercise_id
    await db.delete(workout_set)
    await db.flush()
    await _rebuild_for(db, exercise_id)
    await db.commit()
