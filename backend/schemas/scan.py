from pydantic import BaseModel


class ScanRequest(BaseModel):
    profile_id: int
    sources: list[str] | None = None  # None means all sources


class ScanResponse(BaseModel):
    scan_id: str
    status: str
    message: str
