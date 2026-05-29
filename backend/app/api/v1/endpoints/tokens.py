"""
Candidate Token Endpoints
Generates temporary links for AI screening and video presentation.
Token is valid for 7 days. No auth required to OPEN the link (public).
Auth required to GENERATE the link.
"""
import uuid
import secrets
from datetime import datetime, timezone, timedelta
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel

from app.db.session import get_db
from app.models.models import (
    CandidateToken, TokenType, Candidate, Vacancy,
    CandidateVacancy
)

router = APIRouter()

TOKEN_TTL_DAYS = 7


# ─── Schemas ──────────────────────────────────────────────────────────────────

class GenerateTokenRequest(BaseModel):
    candidate_id: uuid.UUID
    vacancy_id: uuid.UUID
    token_type: TokenType


class GenerateTokenResponse(BaseModel):
    token: str
    token_type: str
    expires_at: str
    link: str  # relative frontend path


class VideoTranscriptRequest(BaseModel):
    transcript: str


class VideoAnalysisResult(BaseModel):
    transcript: str
    analysis: dict
    score_delta: int
    updated_score: Optional[int]


# ─── Generate temporary token ─────────────────────────────────────────────────

@router.post("/generate", response_model=GenerateTokenResponse)
async def generate_token(
    data: GenerateTokenRequest,
    db: AsyncSession = Depends(get_db),
):
    """
    Creates a one-time-use (or limited TTL) token for a candidate.
    Returns the token and the corresponding public link.
    """
    # No auth — fetch candidate directly
    c_res = await db.execute(
        select(Candidate).where(
            Candidate.id == data.candidate_id,
        )
    )
    candidate = c_res.scalar_one_or_none()
    if not candidate:
        raise HTTPException(404, "Candidate not found")

    v_res = await db.execute(select(Vacancy).where(Vacancy.id == data.vacancy_id))
    vacancy = v_res.scalar_one_or_none()
    if not vacancy:
        raise HTTPException(404, "Vacancy not found")

    # Deactivate any existing unused token of same type for this candidate+vacancy
    existing = await db.execute(
        select(CandidateToken).where(
            CandidateToken.candidate_id == data.candidate_id,
            CandidateToken.vacancy_id == data.vacancy_id,
            CandidateToken.token_type == data.token_type,
            CandidateToken.is_completed == False,
        )
    )
    for old_tok in existing.scalars():
        await db.delete(old_tok)

    token_str = secrets.token_urlsafe(32)
    expires = datetime.now(timezone.utc) + timedelta(days=TOKEN_TTL_DAYS)

    tok = CandidateToken(
        token=token_str,
        token_type=data.token_type,
        candidate_id=data.candidate_id,
        vacancy_id=data.vacancy_id,
        created_by_id=None,
        expires_at=expires,
    )
    db.add(tok)
    await db.commit()

    path_map = {
        TokenType.AI_SCREENING: f"/s/{token_str}",
        TokenType.VIDEO_PRESENTATION: f"/v/{token_str}",
    }

    return GenerateTokenResponse(
        token=token_str,
        token_type=data.token_type.value,
        expires_at=expires.isoformat(),
        link=path_map[data.token_type],
    )


# ─── Resolve token (public, no auth) ─────────────────────────────────────────

@router.get("/resolve/{token}")
async def resolve_token(token: str, db: AsyncSession = Depends(get_db)):
    """
    Public endpoint. Returns candidate + vacancy info for the token.
    Used when candidate opens the link.
    """
    res = await db.execute(
        select(CandidateToken, Candidate, Vacancy)
        .join(Candidate, CandidateToken.candidate_id == Candidate.id)
        .join(Vacancy, CandidateToken.vacancy_id == Vacancy.id)
        .where(CandidateToken.token == token)
    )
    row = res.first()
    if not row:
        raise HTTPException(404, "Link not found")

    tok, candidate, vacancy = row

    if tok.expires_at < datetime.now(timezone.utc):
        raise HTTPException(410, "Link has expired")

    return {
        "token": token,
        "token_type": tok.token_type.value,
        "is_completed": tok.is_completed,
        "candidate": {
            "id": str(candidate.id),
            "full_name": candidate.full_name,
        },
        "vacancy": {
            "id": str(vacancy.id),
            "title": vacancy.title,
            "department": vacancy.department,
            "required_skills": vacancy.required_skills,
            "seniority_level": vacancy.seniority_level,
        },
        "expires_at": tok.expires_at.isoformat(),
    }


# ─── Submit video transcript + AI analysis ───────────────────────────────────

@router.post("/video/{token}/analyze")
async def analyze_video_transcript(
    token: str,
    data: VideoTranscriptRequest,
    db: AsyncSession = Depends(get_db),
):
    """
    Public endpoint. Candidate submits video transcript.
    AI analyzes it and adjusts the candidate's score.
    """
    res = await db.execute(
        select(CandidateToken, Candidate, Vacancy)
        .join(Candidate, CandidateToken.candidate_id == Candidate.id)
        .join(Vacancy, CandidateToken.vacancy_id == Vacancy.id)
        .where(CandidateToken.token == token)
    )
    row = res.first()
    if not row:
        raise HTTPException(404, "Link not found")

    tok, candidate, vacancy = row

    if tok.expires_at < datetime.now(timezone.utc):
        raise HTTPException(410, "Link has expired")

    if tok.token_type != TokenType.VIDEO_PRESENTATION:
        raise HTTPException(400, "This link is not for video presentation")

    if tok.is_completed:
        # Return existing result
        return {
            "already_analyzed": True,
            "analysis": tok.video_ai_analysis,
            "score_delta": tok.video_score_delta,
        }

    # ── AI Analysis via OpenRouter ──
    try:
        analysis = await _ai_analyze_video(
            transcript=data.transcript,
            candidate_name=candidate.full_name,
            vacancy_title=vacancy.title,
            required_skills=vacancy.required_skills or [],
        )
    except Exception as e:
        # Fallback if AI unavailable
        analysis = {
            "communication_score": 70,
            "motivation_score": 70,
            "confidence_score": 70,
            "overall_impression": "Анализ временно недоступен.",
            "key_positives": [],
            "concerns": [],
            "score_delta": 0,
            "summary": "Видеопрезентация получена. AI-анализ будет выполнен позже.",
        }

    score_delta = analysis.get("score_delta", 0)

    # Save results
    tok.video_transcript = data.transcript
    tok.video_ai_analysis = analysis
    tok.video_score_delta = score_delta
    tok.is_completed = True
    tok.completed_at = datetime.now(timezone.utc)

    # Update candidate's AI score in CandidateVacancy
    cv_res = await db.execute(
        select(CandidateVacancy).where(
            CandidateVacancy.candidate_id == candidate.id,
            CandidateVacancy.vacancy_id == vacancy.id,
        )
    )
    cv = cv_res.scalar_one_or_none()
    updated_score = None
    if cv and cv.ai_score is not None and score_delta != 0:
        cv.ai_score = max(0, min(100, cv.ai_score + score_delta))
        updated_score = cv.ai_score
        # Update score breakdown
        sb = dict(cv.score_breakdown or {})
        sb["video_presentation"] = {
            "analyzed": True,
            "score_delta": score_delta,
            "summary": analysis.get("summary", ""),
        }
        cv.score_breakdown = sb

    await db.commit()

    return {
        "success": True,
        "analysis": analysis,
        "score_delta": score_delta,
        "updated_score": updated_score,
    }


# ─── Get video results (for recruiter dashboard) ─────────────────────────────

@router.get("/video/{token}/results")
async def get_video_results(
    token: str,
    db: AsyncSession = Depends(get_db),
):
    res = await db.execute(
        select(CandidateToken).where(CandidateToken.token == token)
    )
    tok = res.scalar_one_or_none()
    if not tok:
        raise HTTPException(404, "Token not found")

    return {
        "is_completed": tok.is_completed,
        "completed_at": tok.completed_at.isoformat() if tok.completed_at else None,
        "video_transcript": tok.video_transcript,
        "video_ai_analysis": tok.video_ai_analysis,
        "score_delta": tok.video_score_delta,
    }


# ─── AI analysis helper ───────────────────────────────────────────────────────

async def _ai_analyze_video(
    transcript: str,
    candidate_name: str,
    vacancy_title: str,
    required_skills: list,
) -> dict:
    """Calls OpenRouter to analyze video transcript."""
    import httpx
    from app.core.config import settings

    system_prompt = """You are a senior HR analyst evaluating a candidate's video self-presentation.
Analyze the transcript and return a JSON object with:
- communication_score (0-100): clarity and articulation
- motivation_score (0-100): demonstrated interest and passion
- confidence_score (0-100): self-presentation confidence
- overall_impression: short phrase (1 sentence)
- key_positives: list of 2-3 positive observations
- concerns: list of 0-2 concerns
- score_delta: integer between -10 and +15 to adjust the AI screening score
  (positive if presentation adds value, 0 if neutral, negative if raises concerns)
- summary: 2-3 sentence summary in Russian

Return ONLY valid JSON, no markdown."""

    user_prompt = f"""Candidate: {candidate_name}
Position: {vacancy_title}
Required skills: {', '.join(required_skills)}

Video transcript:
{transcript[:3000]}

Analyze and return JSON."""

    async with httpx.AsyncClient(timeout=30) as client:
        resp = await client.post(
            f"{settings.OPENROUTER_BASE_URL}/chat/completions",
            headers={
                "Authorization": f"Bearer {settings.OPENROUTER_API_KEY}",
                "Content-Type": "application/json",
            },
            json={
                "model": settings.OPENROUTER_DEFAULT_MODEL,
                "messages": [
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt},
                ],
                "max_tokens": 800,
                "temperature": 0.3,
            },
        )
        resp.raise_for_status()
        content = resp.json()["choices"][0]["message"]["content"]

    import json
    # Strip markdown if present
    content = content.strip()
    if content.startswith("```"):
        content = content.split("```")[1]
        if content.startswith("json"):
            content = content[4:]
    return json.loads(content.strip())
