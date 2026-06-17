from datetime import UTC, date, datetime

from sqlalchemy import Date, DateTime
from sqlalchemy.orm import Mapped, mapped_column

from app.databases import Base


class BodyweightEntry(Base):
    """A logged bodyweight measurement (one per date). Weight is stored in lbs."""

    __tablename__ = "bodyweight_entries"

    id: Mapped[int] = mapped_column(primary_key=True)
    date: Mapped[date] = mapped_column(Date, index=True, unique=True)
    weight: Mapped[float]  # lbs
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(UTC)
    )
