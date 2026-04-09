from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import delete, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.database import get_db
from backend.models.employer_answer import EmployerAnswer
from backend.models.profile import UserProfile
from backend.schemas.employer_answer import EmployerAnswerGroup, EmployerAnswerItem, EmployerSlugSummary

router = APIRouter(prefix="/api/employer-answers", tags=["employer-answers"])


@router.get("/{profile_id}", response_model=list[EmployerSlugSummary])
async def list_employer_slugs(profile_id: int, db: AsyncSession = Depends(get_db)):
    rows = (
        await db.execute(
            select(EmployerAnswer.employer_slug, func.count().label("answer_count"))
            .where(EmployerAnswer.profile_id == profile_id)
            .group_by(EmployerAnswer.employer_slug)
            .order_by(EmployerAnswer.employer_slug)
        )
    ).all()
    return [EmployerSlugSummary(employer_slug=r.employer_slug, answer_count=r.answer_count) for r in rows]


@router.get("/{profile_id}/{slug}", response_model=EmployerAnswerGroup)
async def get_employer_answers(profile_id: int, slug: str, db: AsyncSession = Depends(get_db)):
    rows = (
        await db.execute(
            select(EmployerAnswer)
            .where(EmployerAnswer.profile_id == profile_id, EmployerAnswer.employer_slug == slug)
            .order_by(EmployerAnswer.question_label)
        )
    ).scalars().all()
    return EmployerAnswerGroup(
        employer_slug=slug,
        answers=[EmployerAnswerItem(question_label=r.question_label, answer=r.answer) for r in rows],
    )


@router.put("/{profile_id}/{slug}", response_model=EmployerAnswerGroup)
async def upsert_employer_answers(
    profile_id: int,
    slug: str,
    body: list[EmployerAnswerItem],
    db: AsyncSession = Depends(get_db),
):
    profile = await db.get(UserProfile, profile_id)
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")

    await db.execute(
        delete(EmployerAnswer).where(
            EmployerAnswer.profile_id == profile_id, EmployerAnswer.employer_slug == slug
        )
    )

    for item in body:
        label = item.question_label.strip()
        answer = item.answer.strip()
        if label and answer:
            db.add(EmployerAnswer(profile_id=profile_id, employer_slug=slug, question_label=label, answer=answer))

    await db.commit()

    rows = (
        await db.execute(
            select(EmployerAnswer)
            .where(EmployerAnswer.profile_id == profile_id, EmployerAnswer.employer_slug == slug)
            .order_by(EmployerAnswer.question_label)
        )
    ).scalars().all()
    return EmployerAnswerGroup(
        employer_slug=slug,
        answers=[EmployerAnswerItem(question_label=r.question_label, answer=r.answer) for r in rows],
    )


@router.delete("/{profile_id}/{slug}", status_code=204)
async def delete_employer_answers(profile_id: int, slug: str, db: AsyncSession = Depends(get_db)):
    await db.execute(
        delete(EmployerAnswer).where(
            EmployerAnswer.profile_id == profile_id, EmployerAnswer.employer_slug == slug
        )
    )
    await db.commit()
