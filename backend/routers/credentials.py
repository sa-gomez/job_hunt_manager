from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.database import get_db
from backend.models.credential import EncryptedCredential
from backend.schemas.credential import CredentialCreate, CredentialInfo
from backend.services import crypto

router = APIRouter(prefix="/api/credentials", tags=["credentials"])


@router.get("", response_model=list[CredentialInfo])
async def list_credentials(profile_id: int, db: AsyncSession = Depends(get_db)):
    rows = (
        await db.execute(
            select(EncryptedCredential).where(
                EncryptedCredential.profile_id == profile_id
            )
        )
    ).scalars().all()
    return [
        CredentialInfo(
            id=row.id,
            service=row.service,
            profile_id=row.profile_id,
            has_credentials=bool(row.username_enc or row.password_enc),
            updated_at=row.updated_at,
        )
        for row in rows
    ]


@router.post("", response_model=CredentialInfo, status_code=201)
async def store_credential(body: CredentialCreate, db: AsyncSession = Depends(get_db)):
    # Upsert: if a credential for this profile+service already exists, update it
    existing = (
        await db.execute(
            select(EncryptedCredential).where(
                EncryptedCredential.profile_id == body.profile_id,
                EncryptedCredential.service == body.service,
            )
        )
    ).scalar_one_or_none()

    username_enc = crypto.encrypt(body.username) if body.username else None
    password_enc = crypto.encrypt(body.password) if body.password else None
    extra_enc = crypto.encrypt(body.extra) if body.extra else None

    if existing:
        existing.username_enc = username_enc
        existing.password_enc = password_enc
        existing.extra_enc = extra_enc
        await db.commit()
        await db.refresh(existing)
        row = existing
    else:
        row = EncryptedCredential(
            profile_id=body.profile_id,
            service=body.service,
            username_enc=username_enc,
            password_enc=password_enc,
            extra_enc=extra_enc,
        )
        db.add(row)
        await db.commit()
        await db.refresh(row)

    return CredentialInfo(
        id=row.id,
        service=row.service,
        profile_id=row.profile_id,
        has_credentials=bool(row.username_enc or row.password_enc),
        updated_at=row.updated_at,
    )


@router.delete("/{service}", status_code=204)
async def delete_credential(
    service: str, profile_id: int, db: AsyncSession = Depends(get_db)
):
    row = (
        await db.execute(
            select(EncryptedCredential).where(
                EncryptedCredential.profile_id == profile_id,
                EncryptedCredential.service == service,
            )
        )
    ).scalar_one_or_none()
    if not row:
        raise HTTPException(status_code=404, detail="Credential not found")
    await db.delete(row)
    await db.commit()
