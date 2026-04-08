from datetime import datetime

from pydantic import BaseModel, EmailStr


class ProfileCreate(BaseModel):
    full_name: str
    email: str | None = None
    location: str | None = None
    remote_ok: bool = True
    skills: list[str] = []
    experience_years: int | None = None
    experience_notes: str | None = None
    target_roles: list[str] = []
    target_companies: list[str] = []
    salary_min: int | None = None
    salary_max: int | None = None


class ProfileUpdate(BaseModel):
    full_name: str | None = None
    email: str | None = None
    location: str | None = None
    remote_ok: bool | None = None
    skills: list[str] | None = None
    experience_years: int | None = None
    experience_notes: str | None = None
    target_roles: list[str] | None = None
    target_companies: list[str] | None = None
    salary_min: int | None = None
    salary_max: int | None = None


class ProfileResponse(BaseModel):
    id: int
    created_at: datetime
    updated_at: datetime
    full_name: str
    email: str | None
    location: str | None
    remote_ok: bool
    skills: list[str]
    experience_years: int | None
    experience_notes: str | None
    target_roles: list[str]
    target_companies: list[str]
    salary_min: int | None
    salary_max: int | None

    model_config = {"from_attributes": True}
