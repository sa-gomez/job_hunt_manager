import uuid

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from backend.database import get_db
from backend.schemas.scan import ScanRequest, ScanResponse
from backend.services.scan_orchestrator import get_scan_state, run_scan

router = APIRouter(prefix="/api/scan", tags=["scan"])


@router.post("", response_model=ScanResponse, status_code=202)
async def trigger_scan(
    body: ScanRequest,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
):
    scan_id = str(uuid.uuid4())
    background_tasks.add_task(run_scan, scan_id, body.profile_id, db)
    return ScanResponse(
        scan_id=scan_id,
        status="running",
        message="Scan started. Poll /api/scan/{scan_id} for status.",
    )


@router.get("/{scan_id}", response_model=dict)
async def get_scan_status(scan_id: str):
    state = get_scan_state(scan_id)
    if state is None:
        raise HTTPException(status_code=404, detail="Scan not found")
    return {"scan_id": scan_id, **state}
