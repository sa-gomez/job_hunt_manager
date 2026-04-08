from datetime import datetime

from pydantic import BaseModel


class CredentialCreate(BaseModel):
    profile_id: int
    service: str
    username: str | None = None
    password: str | None = None
    extra: str | None = None  # Optional JSON blob


class CredentialInfo(BaseModel):
    """Public view of a stored credential — never exposes secrets."""
    id: int
    service: str
    profile_id: int
    has_credentials: bool
    updated_at: datetime

    model_config = {"from_attributes": True}
