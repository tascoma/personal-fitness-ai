from datetime import UTC, datetime
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, ForeignKey, Index
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.databases import Base

if TYPE_CHECKING:
    from app.models.exercise import Exercise
    from app.models.workout_session import WorkoutSession


class WorkoutSet(Base):
    __tablename__ = "sets"
    __table_args__ = (Index("ix_sets_exercise_session", "exercise_id", "session_id"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    session_id: Mapped[int] = mapped_column(
        ForeignKey("workout_sessions.id", ondelete="CASCADE"), index=True
    )
    exercise_id: Mapped[int] = mapped_column(ForeignKey("exercises.id"), index=True)
    set_number: Mapped[int] = mapped_column(default=1)
    weight: Mapped[float]  # always stored in lbs
    reps: Mapped[int]
    rpe: Mapped[float | None] = mapped_column(default=None)
    is_warmup: Mapped[bool] = mapped_column(default=False)
    notes: Mapped[str | None] = mapped_column(default=None)
    e1rm_epley: Mapped[float] = mapped_column(default=0.0)
    e1rm_brzycki: Mapped[float] = mapped_column(default=0.0)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(UTC)
    )

    session: Mapped["WorkoutSession"] = relationship(back_populates="sets")
    exercise: Mapped["Exercise"] = relationship()
