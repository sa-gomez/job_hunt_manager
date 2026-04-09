from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import delete, func, select, update
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from backend.database import get_db
from backend.models.job import JobPosting
from backend.models.scan import ScanResult
from backend.schemas.job import (
    CommitResultsRequest,
    DiscardResultsRequest,
    JobResponse,
    ScanResultPage,
    ScanResultResponse,
    ScanResultStatusUpdate,
)

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


PAGE_SIZE = 25

@router.get("/results/pending", response_model=ScanResultPage)
async def list_pending_results(
    profile_id: int,
    db: AsyncSession = Depends(get_db),
):
    rows = (
        await db.execute(
            select(ScanResult)
            .where(ScanResult.profile_id == profile_id, ScanResult.status == "pending")
            .options(selectinload(ScanResult.job))
            .order_by(ScanResult.score.desc())
        )
    ).scalars().all()
    total = len(rows)
    return ScanResultPage(items=rows, total=total, page=1, page_size=total or 1)


@router.post("/results/commit", status_code=200)
async def commit_results(body: CommitResultsRequest, db: AsyncSession = Depends(get_db)):
    await db.execute(
        update(ScanResult)
        .where(ScanResult.profile_id == body.profile_id, ScanResult.status == "pending")
        .values(status="new")
    )
    await db.commit()


@router.post("/results/discard", status_code=204)
async def discard_results(body: DiscardResultsRequest, db: AsyncSession = Depends(get_db)):
    await db.execute(
        delete(ScanResult)
        .where(ScanResult.profile_id == body.profile_id, ScanResult.status == "pending")
    )
    await db.commit()


@router.get("/results", response_model=ScanResultPage)
async def list_results(
    profile_id: int,
    page: int = 1,
    db: AsyncSession = Depends(get_db),
):
    offset = (page - 1) * PAGE_SIZE
    total = (
        await db.execute(
            select(func.count()).select_from(ScanResult).where(
                ScanResult.profile_id == profile_id,
                ScanResult.status != "pending",
            )
        )
    ).scalar_one()
    rows = (
        await db.execute(
            select(ScanResult)
            .where(ScanResult.profile_id == profile_id, ScanResult.status != "pending")
            .options(selectinload(ScanResult.job))
            .order_by(ScanResult.score.desc())
            .offset(offset)
            .limit(PAGE_SIZE)
        )
    ).scalars().all()
    return ScanResultPage(items=rows, total=total, page=page, page_size=PAGE_SIZE)


@router.delete("/results/{result_id}", status_code=204)
async def delete_result(result_id: int, db: AsyncSession = Depends(get_db)):
    row = await db.get(ScanResult, result_id)
    if not row:
        raise HTTPException(status_code=404, detail="Result not found")
    await db.delete(row)
    await db.commit()


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
