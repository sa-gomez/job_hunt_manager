from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.database import get_db
from backend.models.job import JobPosting
from backend.models.profile import UserProfile
from backend.models.scan import ScanResult
from backend.services.matching import score_job

router = APIRouter(prefix="/api/autofill", tags=["autofill"])


class AppliedPayload(BaseModel):
    profile_id: int
    job_url: str
    job_title: str | None = None
    company: str | None = None
    source: str | None = None
    external_id: str | None = None


@router.post("/applied")
async def mark_applied(body: AppliedPayload, db: AsyncSession = Depends(get_db)):
    profile = await db.get(UserProfile, body.profile_id)
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")

    # Try to find an existing job posting by source+external_id, then by URL
    job: JobPosting | None = None
    if body.source and body.external_id:
        job = (
            await db.execute(
                select(JobPosting).where(
                    JobPosting.source == body.source,
                    JobPosting.external_id == body.external_id,
                )
            )
        ).scalar_one_or_none()

    if not job and body.job_url:
        job = (
            await db.execute(
                select(JobPosting).where(JobPosting.url == body.job_url)
            )
        ).scalar_one_or_none()

    if not job:
        job = JobPosting(
            source=body.source or "extension",
            external_id=body.external_id,
            url=body.job_url,
            title=body.job_title or "Unknown",
            company=body.company,
        )
        db.add(job)
        await db.flush()

    # Find or create scan result, then mark applied
    result = (
        await db.execute(
            select(ScanResult).where(
                ScanResult.profile_id == body.profile_id,
                ScanResult.job_id == job.id,
            )
        )
    ).scalar_one_or_none()

    if result:
        result.status = "applied"
    else:
        final_score, breakdown = score_job(profile, job)
        result = ScanResult(
            profile_id=body.profile_id,
            job_id=job.id,
            score=final_score,
            score_breakdown=breakdown,
            status="applied",
        )
        db.add(result)

    await db.commit()
    await db.refresh(result)
    return {"ok": True, "result_id": result.id}
