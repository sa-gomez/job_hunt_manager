from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.database import get_db
from backend.models.application import Application, VALID_STAGES
from backend.schemas.application import ApplicationCreate, ApplicationResponse, ApplicationUpdate
from backend.services import sheets
from backend.services.sheets_worker import request_sync

router = APIRouter(prefix="/api/applications", tags=["applications"])


@router.get("", response_model=list[ApplicationResponse])
async def list_applications(profile_id: int, db: AsyncSession = Depends(get_db)):
    rows = (
        await db.execute(
            select(Application)
            .where(Application.profile_id == profile_id)
            .order_by(Application.last_updated.desc())
        )
    ).scalars().all()
    return rows


@router.post("", response_model=ApplicationResponse, status_code=201)
async def create_application(body: ApplicationCreate, db: AsyncSession = Depends(get_db)):
    app = Application(**body.model_dump())
    db.add(app)
    await db.commit()
    await db.refresh(app)
    request_sync()
    return app


@router.get("/stages")
async def list_stages():
    return {"stages": sorted(VALID_STAGES)}


@router.get("/{app_id}", response_model=ApplicationResponse)
async def get_application(app_id: int, db: AsyncSession = Depends(get_db)):
    app = await db.get(Application, app_id)
    if not app:
        raise HTTPException(status_code=404, detail="Application not found")
    return app


@router.patch("/{app_id}", response_model=ApplicationResponse)
async def update_application(
    app_id: int, body: ApplicationUpdate, db: AsyncSession = Depends(get_db)
):
    app = await db.get(Application, app_id)
    if not app:
        raise HTTPException(status_code=404, detail="Application not found")

    for field, value in body.model_dump(exclude_unset=True).items():
        setattr(app, field, value)

    await db.commit()
    await db.refresh(app)
    request_sync()
    return app


@router.delete("/{app_id}", status_code=204)
async def delete_application(app_id: int, db: AsyncSession = Depends(get_db)):
    app = await db.get(Application, app_id)
    if not app:
        raise HTTPException(status_code=404, detail="Application not found")
    profile_id = app.profile_id
    await db.delete(app)
    await db.commit()
    request_sync()


@router.post("/sync", status_code=200)
async def manual_sync(profile_id: int, db: AsyncSession = Depends(get_db)):
    """Immediately run a full bidirectional sync for a profile. Returns after sync completes."""
    await sheets.full_sync(db, profile_id)
    return {"status": "ok", "message": "Sync complete"}
