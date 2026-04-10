from fastapi import APIRouter
from fastapi.responses import Response

from backend.schemas.resume_builder import ResumeData
from backend.services.resume_builder import build_resume_pdf

router = APIRouter(prefix="/api/resume-builder", tags=["resume-builder"])


@router.post("/generate")
async def generate_resume(data: ResumeData) -> Response:
    pdf_bytes = build_resume_pdf(data)
    filename = f"{data.contact.name.replace(' ', '_')}_resume.pdf"
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
