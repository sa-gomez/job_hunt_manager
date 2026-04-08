from pydantic import BaseModel


class ScanRequest(BaseModel):
    profile_id: int


class ScanResponse(BaseModel):
    scan_id: str
    status: str
    message: str
