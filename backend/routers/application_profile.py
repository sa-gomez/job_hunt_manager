from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.database import get_db
from backend.models.application_profile import ApplicationProfile
from backend.models.profile import UserProfile
from backend.schemas.application_profile import ApplicationProfileResponse, ApplicationProfileUpsert

router = APIRouter(prefix="/api/application-profile", tags=["application-profile"])


@router.get("/{profile_id}", response_model=ApplicationProfileResponse)
async def get_application_profile(profile_id: int, db: AsyncSession = Depends(get_db)):
    ap = (
        await db.execute(
            select(ApplicationProfile).where(ApplicationProfile.profile_id == profile_id)
        )
    ).scalar_one_or_none()
    if not ap:
        raise HTTPException(status_code=404, detail="Application profile not found")
    return ap


@router.put("/{profile_id}", response_model=ApplicationProfileResponse)
async def upsert_application_profile(
    profile_id: int, body: ApplicationProfileUpsert, db: AsyncSession = Depends(get_db)
):
    profile = await db.get(UserProfile, profile_id)
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")

    ap = (
        await db.execute(
            select(ApplicationProfile).where(ApplicationProfile.profile_id == profile_id)
        )
    ).scalar_one_or_none()

    if ap:
        for key, val in body.model_dump().items():
            setattr(ap, key, val)
    else:
        ap = ApplicationProfile(profile_id=profile_id, **body.model_dump())
        db.add(ap)

    await db.commit()
    await db.refresh(ap)
    return ap
