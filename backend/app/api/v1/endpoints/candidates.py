from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File, Form
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel, EmailStr
from typing import Optional, List
import uuid
import os
import aiofiles

from app.db.session import get_db
from app.models.models import Candidate, CandidateVacancy, Resume, CandidateStage, User
from app.api.v1.endpoints.auth import get_current_user
from app.core.config import settings

router = APIRouter()


class CandidateCreate(BaseModel):
    full_name: str
    email: EmailStr
    phone: Optional[str] = None
    linkedin_url: Optional[str] = None
    location: Optional[str] = None
    source: Optional[str] = None
    tags: List[str] = []
    vacancy_id: Optional[uuid.UUID] = None


class CandidateResponse(BaseModel):
    id: uuid.UUID
    full_name: str
    email: str
    phone: Optional[str]
    location: Optional[str]
    source: Optional[str]
    tags: list
    created_at: str

    class Config:
        from_attributes = True


class StageUpdateRequest(BaseModel):
    stage: CandidateStage
    note: Optional[str] = None


@router.get("/", response_model=List[dict])
async def list_candidates(
    vacancy_id: Optional[uuid.UUID] = Query(None),
    stage: Optional[str] = Query(None),
    min_score: Optional[int] = Query(None, ge=0, le=100),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, le=200),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if vacancy_id:
        q = (select(CandidateVacancy, Candidate)
             .join(Candidate, CandidateVacancy.candidate_id == Candidate.id)
             .where(CandidateVacancy.vacancy_id == vacancy_id,
                    Candidate.company_id == current_user.company_id))
        if stage:
            q = q.where(CandidateVacancy.stage == stage)
        if min_score:
            q = q.where(CandidateVacancy.ai_score >= min_score)
        q = q.offset(skip).limit(limit).order_by(CandidateVacancy.ai_score.desc().nullslast())
        result = await db.execute(q)
        rows = result.all()
        return [
            {
                "id": str(cv.id),
                "candidate_id": str(c.id),
                "full_name": c.full_name,
                "email": c.email,
                "stage": cv.stage,
                "ai_score": cv.ai_score,
                "score_breakdown": cv.score_breakdown,
                "applied_at": cv.applied_at.isoformat(),
            }
            for cv, c in rows
        ]
    else:
        q = (select(Candidate)
             .where(Candidate.company_id == current_user.company_id)
             .offset(skip).limit(limit).order_by(Candidate.created_at.desc()))
        result = await db.execute(q)
        return [{"id": str(c.id), "full_name": c.full_name, "email": c.email} for c in result.scalars()]


@router.post("/", status_code=201)
async def create_candidate(
    data: CandidateCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    candidate = Candidate(
        company_id=current_user.company_id,
        full_name=data.full_name,
        email=data.email,
        phone=data.phone,
        linkedin_url=data.linkedin_url,
        location=data.location,
        source=data.source,
        tags=data.tags,
    )
    db.add(candidate)
    await db.flush()

    if data.vacancy_id:
        cv = CandidateVacancy(candidate_id=candidate.id, vacancy_id=data.vacancy_id)
        db.add(cv)

    await db.commit()
    return {"id": str(candidate.id), "full_name": candidate.full_name}


@router.patch("/{candidate_vacancy_id}/stage")
async def update_stage(
    candidate_vacancy_id: uuid.UUID,
    data: StageUpdateRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(CandidateVacancy).where(CandidateVacancy.id == candidate_vacancy_id)
    )
    cv = result.scalar_one_or_none()
    if not cv:
        raise HTTPException(404, "Not found")
    cv.stage = data.stage
    await db.commit()
    return {"stage": data.stage}


@router.get("/{candidate_id}")
async def get_candidate(
    candidate_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Candidate).where(
            Candidate.id == candidate_id,
            Candidate.company_id == current_user.company_id,
        )
    )
    c = result.scalar_one_or_none()
    if not c:
        raise HTTPException(404, "Candidate not found")
    return {
        "id": str(c.id),
        "full_name": c.full_name,
        "email": c.email,
        "phone": c.phone,
        "linkedin_url": c.linkedin_url,
        "location": c.location,
        "tags": c.tags,
        "source": c.source,
    }
