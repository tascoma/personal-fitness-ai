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


class RecentPRRead(PersonalRecordRead):
    exercise_name: str


class RelativeStrengthLift(BaseModel):
    exercise_id: int
    exercise_name: str
    e1rm: float
    ratio: float | None  # e1rm / bodyweight; null when bodyweight unknown
    tier: str | None


class RelativeStrengthRead(BaseModel):
    bodyweight: float | None  # lbs; null when no bodyweight logged
    lifts: list[RelativeStrengthLift]


class SummaryRead(BaseModel):
    total_sessions: int
    total_tonnage: float
    training_days: int
    current_streak_weeks: int
    weekly_frequency: float
    this_week_tonnage: float
    last_week_tonnage: float
    active_pr_count: int
    sessions_this_week: int


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
