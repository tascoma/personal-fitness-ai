from datetime import UTC, date, datetime
from typing import TYPE_CHECKING

from sqlalchemy import Date, DateTime
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.databases import Base

if TYPE_CHECKING:
    from app.models.workout_set import WorkoutSet


class WorkoutSession(Base):
    __tablename__ = "workout_sessions"

    id: Mapped[int] = mapped_column(primary_key=True)
    date: Mapped[date] = mapped_column(Date, index=True)
    notes: Mapped[str | None] = mapped_column(default=None)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(UTC)
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(UTC),
        onupdate=lambda: datetime.now(UTC),
    )

    sets: Mapped[list["WorkoutSet"]] = relationship(
        back_populates="session", cascade="all, delete-orphan", order_by="WorkoutSet.id"
    )
