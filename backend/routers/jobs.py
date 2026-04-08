from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from backend.database import get_db
from backend.models.job import JobPosting
from backend.models.scan import ScanResult
from backend.schemas.job import JobResponse, ScanResultResponse, ScanResultStatusUpdate

router = APIRouter(prefix="/api", tags=["jobs"])

VALID_STATUSES = {"new", "saved", "applied", "archived"}


@router.get("/jobs", response_model=list[JobResponse])
async def list_jobs(
    skip: int = 0, limit: int = 50, db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(JobPosting).offset(skip).limit(limit)
    )
    return result.scalars().all()


@router.get("/jobs/{job_id}", response_model=JobResponse)
async def get_job(job_id: int, db: AsyncSession = Depends(get_db)):
    job = await db.get(JobPosting, job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    return job


@router.get("/results", response_model=list[ScanResultResponse])
async def list_results(
    profile_id: int,
    skip: int = 0,
    limit: int = 50,
    db: AsyncSession = Depends(get_db),
):
    rows = (
        await db.execute(
            select(ScanResult)
            .where(ScanResult.profile_id == profile_id)
            .options(selectinload(ScanResult.job))
            .order_by(ScanResult.score.desc())
            .offset(skip)
            .limit(limit)
        )
    ).scalars().all()
    return rows


@router.patch("/results/{result_id}", response_model=ScanResultResponse)
async def update_result_status(
    result_id: int,
    body: ScanResultStatusUpdate,
    db: AsyncSession = Depends(get_db),
):
    if body.status not in VALID_STATUSES:
        raise HTTPException(
            status_code=422,
            detail=f"Invalid status. Must be one of: {', '.join(VALID_STATUSES)}",
        )
    result = await db.execute(
        select(ScanResult)
        .where(ScanResult.id == result_id)
        .options(selectinload(ScanResult.job))
    )
    row = result.scalar_one_or_none()
    if not row:
        raise HTTPException(status_code=404, detail="Result not found")
    row.status = body.status
    await db.commit()
    await db.refresh(row)
    return row
