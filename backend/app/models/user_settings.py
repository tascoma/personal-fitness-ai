from datetime import date

from sqlalchemy import Date, String
from sqlalchemy.orm import Mapped, mapped_column

from app.databases import Base


class UserSettings(Base):
    """Single-row table (id=1) holding user preferences and athlete profile."""

    __tablename__ = "user_settings"

    id: Mapped[int] = mapped_column(primary_key=True)
    unit: Mapped[str] = mapped_column(String(3), default="lbs")  # "lbs" | "kg"
    e1rm_formula: Mapped[str] = mapped_column(String(10), default="epley")  # "epley" | "brzycki"

    # Athlete profile (all optional) — context for AI coaching and relative-strength metrics.
    height_cm: Mapped[float | None] = mapped_column(default=None)
    birth_date: Mapped[date | None] = mapped_column(Date, default=None)
    sex: Mapped[str | None] = mapped_column(String(6), default=None)  # "male" | "female"
    training_goal: Mapped[str | None] = mapped_column(String(500), default=None)
