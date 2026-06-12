from datetime import date as date_type

from pydantic import BaseModel

from app.schemas.workout_set import WorkoutSetRead


class WorkoutSessionCreate(BaseModel):
    date: date_type
    notes: str | None = None


class WorkoutSessionUpdate(BaseModel):
    date: date_type | None = None
    notes: str | None = None


class WorkoutSessionRead(BaseModel):
    id: int
    date: date_type
    notes: str | None
    sets: list[WorkoutSetRead]

    model_config = {"from_attributes": True}
