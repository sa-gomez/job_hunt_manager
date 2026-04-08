from datetime import datetime, timezone

from sqlalchemy import JSON, Boolean, DateTime, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from backend.database import Base


class UserProfile(Base):
    __tablename__ = "user_profiles"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=lambda: datetime.now(timezone.utc)
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )
    full_name: Mapped[str] = mapped_column(String(255), nullable=False)
    email: Mapped[str | None] = mapped_column(String(255), unique=True, nullable=True)
    location: Mapped[str | None] = mapped_column(String(255), nullable=True)
    remote_ok: Mapped[bool] = mapped_column(Boolean, default=True)
    skills: Mapped[list] = mapped_column(JSON, default=list)
    experience_years: Mapped[int | None] = mapped_column(Integer, nullable=True)
    experience_notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    target_roles: Mapped[list] = mapped_column(JSON, default=list)
    target_companies: Mapped[list] = mapped_column(JSON, default=list)
    salary_min: Mapped[int | None] = mapped_column(Integer, nullable=True)
    salary_max: Mapped[int | None] = mapped_column(Integer, nullable=True)
