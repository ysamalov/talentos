from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from sqlalchemy.orm import selectinload
from pydantic import BaseModel
from typing import Optional, List
import uuid

from app.db.session import get_db
from app.models.models import Vacancy, VacancyStatus, User
from app.api.v1.endpoints.auth import get_current_user

router = APIRouter()


class VacancyCreate(BaseModel):
    title: str
    department: Optional[str] = None
    location: Optional[str] = None
    remote_policy: Optional[str] = "hybrid"
    employment_type: Optional[str] = "full-time"
    seniority_level: Optional[str] = None
    salary_min: Optional[int] = None
    salary_max: Optional[int] = None
    description: Optional[str] = None
    requirements: Optional[str] = None
    responsibilities: Optional[str] = None
    required_skills: List[str] = []
    nice_to_have_skills: List[str] = []
    ai_screening_enabled: bool = True
    auto_reject_below_score: Optional[int] = 40


class VacancyUpdate(VacancyCreate):
    title: Optional[str] = None
    status: Optional[VacancyStatus] = None


class VacancyResponse(BaseModel):
    id: uuid.UUID
    title: str
    department: Optional[str]
    location: Optional[str]
    status: str
    seniority_level: Optional[str]
    salary_min: Optional[int]
    salary_max: Optional[int]
    required_skills: list
    applicant_count: int = 0
    ai_screening_enabled: bool

    class Config:
        from_attributes = True


@router.get("/", response_model=List[VacancyResponse])
async def list_vacancies(
    status: Optional[str] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, le=200),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    q = select(Vacancy).where(Vacancy.company_id == current_user.company_id)
    if status:
        q = q.where(Vacancy.status == status)
    q = q.offset(skip).limit(limit).order_by(Vacancy.created_at.desc())
    result = await db.execute(q)
    vacancies = result.scalars().all()

    out = []
    for v in vacancies:
        d = VacancyResponse.model_validate(v)
        d.applicant_count = len(v.candidates) if v.candidates else 0
        out.append(d)
    return out


@router.post("/", response_model=VacancyResponse, status_code=201)
async def create_vacancy(
    data: VacancyCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    vacancy = Vacancy(
        company_id=current_user.company_id,
        created_by_id=current_user.id,
        **data.model_dump(),
    )
    db.add(vacancy)
    await db.commit()
    await db.refresh(vacancy)

    # Generate embedding in background
    from app.workers.tasks import score_candidate_for_vacancies
    # (would trigger embedding generation task here)

    return vacancy


@router.get("/{vacancy_id}", response_model=VacancyResponse)
async def get_vacancy(
    vacancy_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Vacancy).where(
            Vacancy.id == vacancy_id,
            Vacancy.company_id == current_user.company_id
        )
    )
    vacancy = result.scalar_one_or_none()
    if not vacancy:
        raise HTTPException(404, "Vacancy not found")
    return vacancy


@router.patch("/{vacancy_id}", response_model=VacancyResponse)
async def update_vacancy(
    vacancy_id: uuid.UUID,
    data: VacancyUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Vacancy).where(Vacancy.id == vacancy_id, Vacancy.company_id == current_user.company_id)
    )
    vacancy = result.scalar_one_or_none()
    if not vacancy:
        raise HTTPException(404, "Vacancy not found")
    for k, v in data.model_dump(exclude_none=True).items():
        setattr(vacancy, k, v)
    await db.commit()
    await db.refresh(vacancy)
    return vacancy


@router.delete("/{vacancy_id}", status_code=204)
async def delete_vacancy(
    vacancy_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Vacancy).where(Vacancy.id == vacancy_id, Vacancy.company_id == current_user.company_id)
    )
    vacancy = result.scalar_one_or_none()
    if not vacancy:
        raise HTTPException(404, "Vacancy not found")
    await db.delete(vacancy)
    await db.commit()
