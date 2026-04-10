from pydantic import BaseModel


class ContactInfo(BaseModel):
    name: str
    email: str | None = None
    phone: str | None = None
    location: str | None = None
    linkedin_url: str | None = None
    website_url: str | None = None


class WorkExperience(BaseModel):
    company: str
    title: str
    start_date: str | None = None
    end_date: str | None = None
    location: str | None = None
    bullets: list[str] = []


class Education(BaseModel):
    institution: str
    degree: str | None = None
    field: str | None = None
    graduation_year: str | None = None
    gpa: str | None = None


class ResumeData(BaseModel):
    contact: ContactInfo
    summary: str | None = None
    work_experience: list[WorkExperience] = []
    education: list[Education] = []
    skills: list[str] = []
