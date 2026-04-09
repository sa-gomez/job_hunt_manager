from datetime import datetime

from pydantic import BaseModel


class JobResponse(BaseModel):
    id: int
    discovered_at: datetime
    source: str
    external_id: str | None
    url: str | None
    title: str
    company: str | None
    location: str | None
    remote_flag: bool | None
    description: str | None
    salary_min: int | None
    salary_max: int | None
    posted_at: datetime | None

    model_config = {"from_attributes": True}


class ScanResultResponse(BaseModel):
    id: int
    scanned_at: datetime
    profile_id: int
    job_id: int
    score: float
    score_breakdown: dict
    status: str
    job: JobResponse

    model_config = {"from_attributes": True}


class ScanResultStatusUpdate(BaseModel):
    status: str


class CommitResultsRequest(BaseModel):
    profile_id: int


class DiscardResultsRequest(BaseModel):
    profile_id: int


class ScanResultPage(BaseModel):
    items: list[ScanResultResponse]
    total: int
    page: int
    page_size: int
