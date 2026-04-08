from datetime import datetime, timezone

from sqlalchemy import DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from backend.database import Base


class EncryptedCredential(Base):
    __tablename__ = "credentials"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )
    profile_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("user_profiles.id", ondelete="CASCADE"), nullable=False
    )
    service: Mapped[str] = mapped_column(String(100), nullable=False)
    username_enc: Mapped[str | None] = mapped_column(Text, nullable=True)
    password_enc: Mapped[str | None] = mapped_column(Text, nullable=True)
    extra_enc: Mapped[str | None] = mapped_column(Text, nullable=True)
