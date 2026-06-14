from datetime import UTC, date, datetime

from sqlalchemy import Date, DateTime, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column

from app.databases import Base


class PersonalRecord(Base):
    __tablename__ = "personal_records"

    id: Mapped[int] = mapped_column(primary_key=True)
    exercise_id: Mapped[int] = mapped_column(ForeignKey("exercises.id"), index=True)
    set_id: Mapped[int] = mapped_column(ForeignKey("sets.id", ondelete="CASCADE"))
    record_type: Mapped[str] = mapped_column(String(10))  # "weight" | "e1rm"
    value: Mapped[float]
    achieved_on: Mapped[date] = mapped_column(Date)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(UTC)
    )
