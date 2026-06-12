from datetime import date as date_type

from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models import WorkoutSession, WorkoutSet
from app.schemas.workout_session import WorkoutSessionCreate, WorkoutSessionUpdate
from app.services.prs import rebuild_prs
from app.services.user_settings import get_settings


async def create_session(db: AsyncSession, data: WorkoutSessionCreate) -> WorkoutSession:
    session = WorkoutSession(**data.model_dump())
    db.add(session)
    await db.commit()
    return await get_session(db, session.id)


async def get_session(db: AsyncSession, session_id: int) -> WorkoutSession:
    session = await db.scalar(
        select(WorkoutSession)
        .options(selectinload(WorkoutSession.sets))
        .where(WorkoutSession.id == session_id)
    )
    if session is None:
        raise HTTPException(status_code=404, detail="Session not found")
    return session


async def list_sessions(
    db: AsyncSession,
    *,
    date_from: date_type | None = None,
    date_to: date_type | None = None,
    exercise_id: int | None = None,
    q: str | None = None,
    limit: int = 50,
    offset: int = 0,
) -> list[WorkoutSession]:
    stmt = (
        select(WorkoutSession)
        .options(selectinload(WorkoutSession.sets))
        .order_by(WorkoutSession.date.desc(), WorkoutSession.id.desc())
        .limit(limit)
        .offset(offset)
    )
    if date_from is not None:
        stmt = stmt.where(WorkoutSession.date >= date_from)
    if date_to is not None:
        stmt = stmt.where(WorkoutSession.date <= date_to)
    if q:
        stmt = stmt.where(WorkoutSession.notes.ilike(f"%{q}%"))
    if exercise_id is not None:
        stmt = stmt.where(
            WorkoutSession.id.in_(
                select(WorkoutSet.session_id).where(WorkoutSet.exercise_id == exercise_id)
            )
        )
    return list((await db.scalars(stmt)).unique().all())


async def update_session(
    db: AsyncSession, session_id: int, data: WorkoutSessionUpdate
) -> WorkoutSession:
    session = await get_session(db, session_id)
    changes = data.model_dump(exclude_unset=True)
    date_changed = "date" in changes and changes["date"] != session.date
    for field, value in changes.items():
        setattr(session, field, value)

    if date_changed and session.sets:
        # PR timeline ordering depends on session dates.
        formula = (await get_settings(db)).e1rm_formula
        for exercise_id in {s.exercise_id for s in session.sets}:
            await rebuild_prs(db, exercise_id, formula)

    await db.commit()
    return await get_session(db, session_id)


async def delete_session(db: AsyncSession, session_id: int) -> None:
    session = await get_session(db, session_id)
    affected_exercises = {s.exercise_id for s in session.sets}
    await db.delete(session)
    await db.flush()

    if affected_exercises:
        formula = (await get_settings(db)).e1rm_formula
        for exercise_id in affected_exercises:
            await rebuild_prs(db, exercise_id, formula)
    await db.commit()
