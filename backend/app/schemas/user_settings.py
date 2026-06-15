from datetime import date as date_type
from typing import Literal

from pydantic import BaseModel, Field


class UserSettingsUpdate(BaseModel):
    unit: Literal["lbs", "kg"] | None = None
    e1rm_formula: Literal["epley", "brzycki"] | None = None
    height_cm: float | None = Field(default=None, gt=0)
    birth_date: date_type | None = None
    sex: Literal["male", "female"] | None = None
    training_goal: str | None = Field(default=None, max_length=500)


class UserSettingsRead(BaseModel):
    unit: str
    e1rm_formula: str
    height_cm: float | None = None
    birth_date: date_type | None = None
    sex: str | None = None
    training_goal: str | None = None
    # Derived, read-only.
    age: int | None = None
    current_bodyweight: float | None = None

    model_config = {"from_attributes": True}
