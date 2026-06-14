from datetime import UTC, datetime

from sqlalchemy import DateTime, String
from sqlalchemy.orm import Mapped, mapped_column

from app.databases import Base


class Exercise(Base):
    __tablename__ = "exercises"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(100), unique=True, index=True)
    is_compound: Mapped[bool] = mapped_column(default=True)
    is_custom: Mapped[bool] = mapped_column(default=False)
    is_bodyweight: Mapped[bool] = mapped_column(default=False)
    # Progressive-overload step in lbs (e.g. 5.0 upper body, 10.0 lower body).
    increment: Mapped[float] = mapped_column(default=5.0)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(UTC)
    )
