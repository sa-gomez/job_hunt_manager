from datetime import datetime

from pydantic import BaseModel, field_validator

from backend.models.application import VALID_STAGES


class ApplicationCreate(BaseModel):
    profile_id: int
    company: str
    job_title: str
    job_url: str | None = None
    stage: str = "applied"
    notes: str | None = None
    recruiter_name: str | None = None
    applied_at: datetime | None = None
    job_id: int | None = None

    @field_validator("stage")
    @classmethod
    def validate_stage(cls, v: str) -> str:
        if v not in VALID_STAGES:
            raise ValueError(f"stage must be one of: {', '.join(sorted(VALID_STAGES))}")
        return v


class ApplicationUpdate(BaseModel):
    company: str | None = None
    job_title: str | None = None
    job_url: str | None = None
    stage: str | None = None
    notes: str | None = None
    recruiter_name: str | None = None
    applied_at: datetime | None = None

    @field_validator("stage")
    @classmethod
    def validate_stage(cls, v: str | None) -> str | None:
        if v is not None and v not in VALID_STAGES:
            raise ValueError(f"stage must be one of: {', '.join(sorted(VALID_STAGES))}")
        return v


class ApplicationResponse(BaseModel):
    id: int
    profile_id: int
    job_id: int | None
    company: str
    job_title: str
    job_url: str | None
    stage: str
    notes: str | None
    recruiter_name: str | None
    applied_at: datetime | None
    created_at: datetime
    last_updated: datetime

    model_config = {"from_attributes": True}
