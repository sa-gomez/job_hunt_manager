from datetime import datetime

from pydantic import BaseModel


class ResumeInfo(BaseModel):
    id: int
    profile_id: int
    filename: str
    content_type: str
    file_size: int
    uploaded_at: datetime

    model_config = {"from_attributes": True}
