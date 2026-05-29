"""Analytics endpoint"""
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, case
from app.db.session import get_db
from app.models.models import CandidateVacancy, Candidate, Vacancy, User, CandidateStage
from app.api.v1.endpoints.auth import get_current_user

router = APIRouter()


@router.get("/funnel")
async def get_hiring_funnel(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(CandidateVacancy.stage, func.count(CandidateVacancy.id).label("count"))
        .join(Vacancy, CandidateVacancy.vacancy_id == Vacancy.id)
        .where(Vacancy.company_id == current_user.company_id)
        .group_by(CandidateVacancy.stage)
    )
    rows = result.all()
    return {str(r.stage): r.count for r in rows}


@router.get("/overview")
async def get_overview(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    total_candidates = await db.scalar(
        select(func.count(Candidate.id)).where(Candidate.company_id == current_user.company_id)
    )
    total_vacancies = await db.scalar(
        select(func.count(Vacancy.id)).where(Vacancy.company_id == current_user.company_id, Vacancy.status == "open")
    )
    hired_count = await db.scalar(
        select(func.count(CandidateVacancy.id))
        .join(Vacancy, CandidateVacancy.vacancy_id == Vacancy.id)
        .where(Vacancy.company_id == current_user.company_id, CandidateVacancy.stage == "hired")
    )
    avg_score = await db.scalar(
        select(func.avg(CandidateVacancy.ai_score))
        .join(Vacancy, CandidateVacancy.vacancy_id == Vacancy.id)
        .where(Vacancy.company_id == current_user.company_id, CandidateVacancy.ai_score.isnot(None))
    )
    return {
        "total_candidates": total_candidates or 0,
        "open_vacancies": total_vacancies or 0,
        "hired_this_period": hired_count or 0,
        "avg_ai_score": round(float(avg_score), 1) if avg_score else 0,
    }
