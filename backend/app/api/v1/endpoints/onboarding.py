"""Onboarding endpoint"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel
from typing import Optional
import uuid
from datetime import datetime
from app.db.session import get_db
from app.models.models import OnboardingPlan, IDPlan, Candidate, Vacancy, User
from app.api.v1.endpoints.auth import get_current_user

router = APIRouter()


class GenerateOnboardingRequest(BaseModel):
    candidate_id: uuid.UUID
    vacancy_id: uuid.UUID
    start_date: Optional[datetime] = None


class GenerateIDPRequest(BaseModel):
    candidate_id: uuid.UUID
    vacancy_id: uuid.UUID
    current_role: str
    target_role: str


@router.post("/generate")
async def generate_onboarding(
    data: GenerateOnboardingRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    from app.services.ai.screening import onboarding_service
    result_c = await db.execute(select(Candidate).where(Candidate.id == data.candidate_id))
    result_v = await db.execute(select(Vacancy).where(Vacancy.id == data.vacancy_id))
    candidate = result_c.scalar_one_or_none()
    vacancy = result_v.scalar_one_or_none()
    if not candidate or not vacancy:
        raise HTTPException(404, "Not found")

    plan_data = await onboarding_service.generate_plan(
        vacancy={"title": vacancy.title, "department": vacancy.department},
        candidate={"skills": [], "seniority": "mid"},
    )
    plan = OnboardingPlan(
        candidate_id=data.candidate_id,
        vacancy_id=data.vacancy_id,
        start_date=data.start_date,
        checklist=plan_data.get("checklist", []),
        goals_30=plan_data.get("goals_30"),
        goals_60=plan_data.get("goals_60"),
        goals_90=plan_data.get("goals_90"),
        is_ai_generated=True,
    )
    db.add(plan)
    await db.commit()
    await db.refresh(plan)
    return {"id": str(plan.id), **plan_data}


@router.post("/idp/generate")
async def generate_idp(
    data: GenerateIDPRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    from app.services.ai.screening import idp_service
    result_c = await db.execute(select(Candidate).where(Candidate.id == data.candidate_id))
    candidate = result_c.scalar_one_or_none()
    if not candidate:
        raise HTTPException(404, "Candidate not found")

    plan_data = await idp_service.generate_plan(
        candidate={"full_name": candidate.full_name, "skills": [], "years_experience": 5},
        current_role=data.current_role,
        target_role=data.target_role,
    )
    plan = IDPlan(
        candidate_id=data.candidate_id,
        vacancy_id=data.vacancy_id,
        current_role=data.current_role,
        target_role=data.target_role,
        **{k: v for k, v in plan_data.items() if k in ["timeline_months", "roadmap", "skills_to_develop", "recommended_courses", "promotion_probability"]},
        is_ai_generated=True,
    )
    db.add(plan)
    await db.commit()
    return {"id": str(plan.id), **plan_data}
