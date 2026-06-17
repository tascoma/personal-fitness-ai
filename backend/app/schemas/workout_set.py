from pydantic import BaseModel, Field


class WorkoutSetCreate(BaseModel):
    exercise_id: int
    weight: float = Field(ge=0)  # lbs; 0 for bodyweight exercises
    reps: int = Field(ge=1, le=100)
    rpe: float | None = Field(default=None, ge=1, le=10)
    is_warmup: bool = False
    set_number: int | None = Field(default=None, ge=1)  # auto-assigned if omitted
    notes: str | None = None


class WorkoutSetUpdate(BaseModel):
    weight: float | None = Field(default=None, gt=0)
    reps: int | None = Field(default=None, ge=1, le=100)
    rpe: float | None = Field(default=None, ge=1, le=10)
    is_warmup: bool | None = None
    set_number: int | None = Field(default=None, ge=1)
    notes: str | None = None


class WorkoutSetRead(BaseModel):
    id: int
    session_id: int
    exercise_id: int
    set_number: int
    weight: float
    reps: int
    rpe: float | None
    is_warmup: bool
    notes: str | None
    e1rm_epley: float
    e1rm_brzycki: float

    model_config = {"from_attributes": True}
