from pydantic import BaseModel, Field


class ExerciseCreate(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    is_compound: bool = True
    increment: float = Field(default=5.0, gt=0)


class ExerciseUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=100)
    is_compound: bool | None = None
    increment: float | None = Field(default=None, gt=0)


class ExerciseRead(BaseModel):
    id: int
    name: str
    is_compound: bool
    is_custom: bool
    increment: float

    model_config = {"from_attributes": True}
