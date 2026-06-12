from sqlalchemy import String
from sqlalchemy.orm import Mapped, mapped_column

from app.databases import Base


class UserSettings(Base):
    """Single-row table (id=1) holding user preferences."""

    __tablename__ = "user_settings"

    id: Mapped[int] = mapped_column(primary_key=True)
    unit: Mapped[str] = mapped_column(String(3), default="lbs")  # "lbs" | "kg"
    e1rm_formula: Mapped[str] = mapped_column(String(10), default="epley")  # "epley" | "brzycki"
