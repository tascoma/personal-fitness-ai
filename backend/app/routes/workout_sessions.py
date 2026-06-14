from datetime import date as date_type

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.databases import get_db
from app.schemas.workout_session import (
    WorkoutSessionCreate,
    WorkoutSessionRead,
    WorkoutSessionUpdate,
)
from app.schemas.workout_set import WorkoutSetCreate, WorkoutSetRead
from app.services import sets as sets_svc
from app.services import workout_sessions as svc

router = APIRouter(prefix="/sessions", tags=["sessions"])


@router.post("", response_model=WorkoutSessionRead, status_code=201)
async def create(data: WorkoutSessionCreate, db: AsyncSession = Depends(get_db)):
    return await svc.create_session(db, data)


@router.get("", response_model=list[WorkoutSessionRead])
async def list_all(
    db: AsyncSession = Depends(get_db),
    date_from: date_type | None = Query(default=None, alias="from"),
    date_to: date_type | None = Query(default=None, alias="to"),
    exercise_id: int | None = None,
    q: str | None = None,
    limit: int = Query(default=50, ge=1, le=500),
    offset: int = Query(default=0, ge=0),
):
    return await svc.list_sessions(
        db,
        date_from=date_from,
        date_to=date_to,
        exercise_id=exercise_id,
        q=q,
        limit=limit,
        offset=offset,
    )


@router.get("/{session_id}", response_model=WorkoutSessionRead)
async def get_one(session_id: int, db: AsyncSession = Depends(get_db)):
    return await svc.get_session(db, session_id)


@router.patch("/{session_id}", response_model=WorkoutSessionRead)
async def update(session_id: int, data: WorkoutSessionUpdate, db: AsyncSession = Depends(get_db)):
    return await svc.update_session(db, session_id, data)


@router.delete("/{session_id}", status_code=204)
async def delete(session_id: int, db: AsyncSession = Depends(get_db)):
    await svc.delete_session(db, session_id)


@router.post("/{session_id}/sets", response_model=WorkoutSetRead, status_code=201)
async def add_set(session_id: int, data: WorkoutSetCreate, db: AsyncSession = Depends(get_db)):
    return await sets_svc.create_set(db, session_id, data)
