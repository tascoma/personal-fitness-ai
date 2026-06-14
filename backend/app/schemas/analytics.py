from datetime import date as date_type

from pydantic import BaseModel


class TonnageBucket(BaseModel):
    bucket: str  # "2026-W23" or "2026-06"
    tonnage: float


class E1RMPoint(BaseModel):
    date: date_type
    e1rm: float


class PersonalRecordRead(BaseModel):
    id: int
    exercise_id: int
    set_id: int
    record_type: str
    value: float
    achieved_on: date_type

    model_config = {"from_attributes": True}


class ExerciseSeries(BaseModel):
    exercise_id: int
    exercise_name: str
    series: list[E1RMPoint]


class PredictionRead(BaseModel):
    exercise_id: int
    status: str  # "ok" | "insufficient_data" | "no_positive_trend" | "no_milestone"
    current_best: float
    milestone: float | None
    slope_per_week: float | None
    projected_date: date_type | None
    ci_earliest: date_type | None
    ci_latest: date_type | None
    n_points: int
