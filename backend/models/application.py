from datetime import datetime, timezone

from sqlalchemy import DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from backend.database import Base

VALID_STAGES = {
    "applied",
    "recruiter_screen",
    "technical",
    "interview_rounds",
    "offer_negotiating",
    "rejected",
    "withdrawn",
}


class Application(Base):
    __tablename__ = "applications"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    profile_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("user_profiles.id", ondelete="CASCADE"), nullable=False
    )
    job_id: Mapped[int | None] = mapped_column(
        Integer, ForeignKey("job_postings.id", ondelete="SET NULL"), nullable=True
    )
    company: Mapped[str] = mapped_column(String(255), nullable=False)
    job_title: Mapped[str] = mapped_column(String(500), nullable=False)
    job_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    stage: Mapped[str] = mapped_column(String(50), nullable=False, default="applied")
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    recruiter_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    applied_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )
    last_updated: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )
