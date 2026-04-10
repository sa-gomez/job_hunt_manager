import uuid

from fastapi import APIRouter, Depends, HTTPException, UploadFile
from fastapi.responses import Response
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.database import get_db
from backend.models.resume import Resume
from backend.schemas.resume import ResumeInfo
from backend.services.storage import get_store

router = APIRouter(prefix="/api/resumes", tags=["resumes"])

ALLOWED_TYPES = {
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
}
MAX_SIZE = 10 * 1024 * 1024  # 10 MB


@router.get("/{profile_id}", response_model=list[ResumeInfo])
async def list_resumes(profile_id: int, db: AsyncSession = Depends(get_db)):
    rows = (
        await db.execute(
            select(Resume)
            .where(Resume.profile_id == profile_id)
            .order_by(Resume.uploaded_at.desc())
        )
    ).scalars().all()
    return rows


@router.post("/{profile_id}", response_model=ResumeInfo, status_code=201)
async def upload_resume(profile_id: int, file: UploadFile, db: AsyncSession = Depends(get_db)):
    if file.content_type not in ALLOWED_TYPES:
        raise HTTPException(status_code=400, detail="Only PDF and Word documents are supported")

    data = await file.read()
    if len(data) > MAX_SIZE:
        raise HTTPException(status_code=400, detail="File exceeds 10 MB limit")

    storage_key = f"{profile_id}/{uuid.uuid4().hex}_{file.filename}"
    await get_store().put(storage_key, data, file.content_type or "application/octet-stream")

    resume = Resume(
        profile_id=profile_id,
        filename=file.filename or "resume",
        storage_key=storage_key,
        content_type=file.content_type or "application/octet-stream",
        file_size=len(data),
    )
    db.add(resume)
    await db.commit()
    await db.refresh(resume)
    return resume


@router.get("/{profile_id}/{resume_id}/download")
async def download_resume(
    profile_id: int, resume_id: int, db: AsyncSession = Depends(get_db)
):
    row = (
        await db.execute(
            select(Resume).where(Resume.id == resume_id, Resume.profile_id == profile_id)
        )
    ).scalar_one_or_none()
    if not row:
        raise HTTPException(status_code=404, detail="Resume not found")
    data = await get_store().get(row.storage_key)
    return Response(
        content=data,
        media_type=row.content_type,
        headers={"Content-Disposition": f'attachment; filename="{row.filename}"'},
    )


@router.delete("/{profile_id}/{resume_id}", status_code=204)
async def delete_resume(
    profile_id: int, resume_id: int, db: AsyncSession = Depends(get_db)
):
    row = (
        await db.execute(
            select(Resume).where(Resume.id == resume_id, Resume.profile_id == profile_id)
        )
    ).scalar_one_or_none()
    if not row:
        raise HTTPException(status_code=404, detail="Resume not found")
    await get_store().delete(row.storage_key)
    await db.delete(row)
    await db.commit()
