from datetime import datetime, timezone

from sqlalchemy import JSON, Boolean, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from backend.database import Base


class ApplicationProfile(Base):
    __tablename__ = "application_profiles"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    profile_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("user_profiles.id", ondelete="CASCADE"), unique=True, nullable=False
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    # Documents
    resume_text: Mapped[str | None] = mapped_column(Text, nullable=True)
    cover_letter_template: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Personal
    name_pronunciation: Mapped[str | None] = mapped_column(String(255), nullable=True)

    # Availability
    start_date: Mapped[str | None] = mapped_column(String(255), nullable=True)
    timeline_notes: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Visa / work auth
    requires_visa_sponsorship: Mapped[bool | None] = mapped_column(Boolean, nullable=True)
    requires_future_visa_sponsorship: Mapped[bool | None] = mapped_column(Boolean, nullable=True)

    # Location / office
    willing_to_relocate: Mapped[bool | None] = mapped_column(Boolean, nullable=True)
    office_availability: Mapped[str | None] = mapped_column(String(100), nullable=True)

    # EEOC voluntary self-identification
    eeoc_gender: Mapped[str | None] = mapped_column(String(100), nullable=True)
    eeoc_race: Mapped[str | None] = mapped_column(String(100), nullable=True)
    eeoc_veteran_status: Mapped[str | None] = mapped_column(String(100), nullable=True)
    eeoc_disability_status: Mapped[str | None] = mapped_column(String(100), nullable=True)

    # Custom Q&A: maps label-pattern substrings to answers
    # e.g. {"why anthropic": "Because...", "cloud platform": "Production experience on AWS"}
    custom_answers: Mapped[dict] = mapped_column(JSON, default=dict)
