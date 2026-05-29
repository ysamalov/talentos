"""Screening endpoint"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel
import uuid
from app.db.session import get_db
from app.models.models import InterviewSession, InterviewType, User, Candidate, Vacancy
from app.api.v1.endpoints.auth import get_current_user

router = APIRouter()


class StartSessionRequest(BaseModel):
    candidate_id: uuid.UUID
    vacancy_id: uuid.UUID
    interview_type: InterviewType = InterviewType.HR


@router.post("/start")
async def start_screening(
    data: StartSessionRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    session = InterviewSession(
        candidate_id=data.candidate_id,
        vacancy_id=data.vacancy_id,
        interview_type=data.interview_type,
        is_ai_session=True,
        status="active",
    )
    db.add(session)
    await db.commit()
    await db.refresh(session)
    return {"session_id": str(session.id), "ws_url": f"/ws/screening/{session.id}"}


@router.get("/{session_id}")
async def get_session(
    session_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(select(InterviewSession).where(InterviewSession.id == session_id))
    session = result.scalar_one_or_none()
    if not session:
        raise HTTPException(404, "Session not found")
    return {
        "id": str(session.id),
        "status": session.status,
        "messages": session.messages,
        "ai_score": session.ai_score,
        "ai_summary": session.ai_summary,
    }


@router.post("/{candidate_id}/questions")
async def generate_questions(
    candidate_id: uuid.UUID,
    vacancy_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    from app.services.ai.scoring import scoring_engine
    result_c = await db.execute(select(Candidate).where(Candidate.id == candidate_id))
    result_v = await db.execute(select(Vacancy).where(Vacancy.id == vacancy_id))
    candidate = result_c.scalar_one_or_none()
    vacancy = result_v.scalar_one_or_none()
    if not candidate or not vacancy:
        raise HTTPException(404, "Not found")

    questions = await scoring_engine.generate_interview_questions(
        vacancy={"title": vacancy.title, "required_skills": vacancy.required_skills, "seniority_level": vacancy.seniority_level},
        candidate={"skills": [], "seniority": "mid"},
    )
    return questions
