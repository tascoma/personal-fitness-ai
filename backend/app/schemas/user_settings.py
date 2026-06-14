from typing import Literal

from pydantic import BaseModel


class UserSettingsUpdate(BaseModel):
    unit: Literal["lbs", "kg"] | None = None
    e1rm_formula: Literal["epley", "brzycki"] | None = None


class UserSettingsRead(BaseModel):
    unit: str
    e1rm_formula: str

    model_config = {"from_attributes": True}
