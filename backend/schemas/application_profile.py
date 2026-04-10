from datetime import datetime

from pydantic import BaseModel


class ApplicationProfileUpsert(BaseModel):
    resume_text: str | None = None
    cover_letter_template: str | None = None
    name_pronunciation: str | None = None
    start_date: str | None = None
    timeline_notes: str | None = None
    requires_visa_sponsorship: bool | None = None
    requires_future_visa_sponsorship: bool | None = None
    willing_to_relocate: bool | None = None
    office_availability: str | None = None
    country: str | None = None
    eeoc_gender: str | None = None
    eeoc_ethnicity: str | None = None
    eeoc_race: str | None = None
    eeoc_veteran_status: str | None = None
    eeoc_disability_status: str | None = None
    custom_answers: dict[str, str] = {}


class ApplicationProfileResponse(ApplicationProfileUpsert):
    id: int
    profile_id: int
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
