from datetime import date as date_type

from pydantic import BaseModel, Field


class BodyweightEntryCreate(BaseModel):
    date: date_type
    weight: float = Field(gt=0)  # lbs


class BodyweightEntryRead(BaseModel):
    id: int
    date: date_type
    weight: float

    model_config = {"from_attributes": True}
