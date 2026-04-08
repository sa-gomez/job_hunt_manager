from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.database import get_db
from backend.models.profile import UserProfile
from backend.schemas.profile import ProfileCreate, ProfileResponse, ProfileUpdate

router = APIRouter(prefix="/api/profile", tags=["profile"])


@router.get("", response_model=list[ProfileResponse])
async def list_profiles(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(UserProfile))
    return result.scalars().all()


@router.post("", response_model=ProfileResponse, status_code=201)
async def create_profile(body: ProfileCreate, db: AsyncSession = Depends(get_db)):
    profile = UserProfile(**body.model_dump())
    db.add(profile)
    await db.commit()
    await db.refresh(profile)
    return profile


@router.get("/{profile_id}", response_model=ProfileResponse)
async def get_profile(profile_id: int, db: AsyncSession = Depends(get_db)):
    profile = await db.get(UserProfile, profile_id)
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")
    return profile


@router.put("/{profile_id}", response_model=ProfileResponse)
async def replace_profile(
    profile_id: int, body: ProfileCreate, db: AsyncSession = Depends(get_db)
):
    profile = await db.get(UserProfile, profile_id)
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")
    for field, value in body.model_dump().items():
        setattr(profile, field, value)
    await db.commit()
    await db.refresh(profile)
    return profile


@router.patch("/{profile_id}", response_model=ProfileResponse)
async def update_profile(
    profile_id: int, body: ProfileUpdate, db: AsyncSession = Depends(get_db)
):
    profile = await db.get(UserProfile, profile_id)
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")
    for field, value in body.model_dump(exclude_none=True).items():
        setattr(profile, field, value)
    await db.commit()
    await db.refresh(profile)
    return profile


@router.delete("/{profile_id}", status_code=204)
async def delete_profile(profile_id: int, db: AsyncSession = Depends(get_db)):
    profile = await db.get(UserProfile, profile_id)
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")
    await db.delete(profile)
    await db.commit()
