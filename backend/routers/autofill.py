from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.database import get_db
from backend.models.application_profile import ApplicationProfile
from backend.models.job import JobPosting
from backend.models.profile import UserProfile
from backend.models.scan import ScanResult
from backend.services.matching import score_job

router = APIRouter(prefix="/api/autofill", tags=["autofill"])


class FillData(BaseModel):
    first_name: str
    last_name: str
    full_name: str
    email: str | None
    phone: str | None
    location: str | None
    linkedin_url: str | None
    website_url: str | None
    work_authorization: str | None
    resume_text: str | None
    cover_letter_template: str | None
    name_pronunciation: str | None
    start_date: str | None
    timeline_notes: str | None
    requires_visa_sponsorship: bool | None
    requires_future_visa_sponsorship: bool | None
    willing_to_relocate: bool | None
    office_availability: str | None
    eeoc_gender: str | None
    eeoc_race: str | None
    eeoc_veteran_status: str | None
    eeoc_disability_status: str | None
    custom_answers: dict[str, str]


@router.get("/fill-data/{profile_id}", response_model=FillData)
async def get_fill_data(profile_id: int, db: AsyncSession = Depends(get_db)):
    profile = await db.get(UserProfile, profile_id)
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")

    ap = (
        await db.execute(
            select(ApplicationProfile).where(ApplicationProfile.profile_id == profile_id)
        )
    ).scalar_one_or_none()

    names = (profile.full_name or "").split(" ", 1)
    return FillData(
        first_name=names[0],
        last_name=names[1] if len(names) > 1 else "",
        full_name=profile.full_name or "",
        email=profile.email,
        phone=profile.phone,
        location=profile.location,
        linkedin_url=profile.linkedin_url,
        website_url=profile.website_url,
        work_authorization=profile.work_authorization,
        resume_text=ap.resume_text if ap else None,
        cover_letter_template=ap.cover_letter_template if ap else None,
        name_pronunciation=ap.name_pronunciation if ap else None,
        start_date=ap.start_date if ap else None,
        timeline_notes=ap.timeline_notes if ap else None,
        requires_visa_sponsorship=ap.requires_visa_sponsorship if ap else None,
        requires_future_visa_sponsorship=ap.requires_future_visa_sponsorship if ap else None,
        willing_to_relocate=ap.willing_to_relocate if ap else None,
        office_availability=ap.office_availability if ap else None,
        eeoc_gender=ap.eeoc_gender if ap else None,
        eeoc_race=ap.eeoc_race if ap else None,
        eeoc_veteran_status=ap.eeoc_veteran_status if ap else None,
        eeoc_disability_status=ap.eeoc_disability_status if ap else None,
        custom_answers=ap.custom_answers if ap else {},
    )


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
