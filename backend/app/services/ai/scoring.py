"""
AI Scoring Engine
Matches candidate profile against vacancy requirements.
Uses both semantic embedding similarity and structured AI analysis.
"""
import numpy as np
from typing import Optional
from pydantic import BaseModel, Field
import structlog

logger = structlog.get_logger()


# ─── Output Schema ────────────────────────────────────────────────────────────

class ScoreBreakdown(BaseModel):
    overall_score: int = Field(ge=0, le=100, description="Overall fit score 0-100")
    skill_match_percent: int = Field(ge=0, le=100)
    experience_relevance: int = Field(ge=0, le=100)
    culture_fit: int = Field(ge=0, le=100)
    seniority_match: int = Field(ge=0, le=100)
    recommendation: str  # "Strong Yes" | "Yes" | "Maybe" | "No"
    strengths: list[str] = Field(default_factory=list, max_length=5)
    risks: list[str] = Field(default_factory=list, max_length=3)
    missing_skills: list[str] = Field(default_factory=list)
    matching_skills: list[str] = Field(default_factory=list)
    salary_fit: bool = True
    summary: str


SCORING_SYSTEM = """You are a senior talent acquisition specialist.
Evaluate how well a candidate matches a job vacancy.
Be objective, data-driven, and brutally honest about gaps.
Score each dimension 0-100. Overall score is a weighted average:
- skill_match: 35%
- experience_relevance: 30%
- seniority_match: 20%
- culture_fit: 15%

Recommendation thresholds:
- 85+: "Strong Yes"
- 70-84: "Yes"
- 50-69: "Maybe"
- <50: "No"

Return valid JSON only."""


class ScoringEngine:
    def __init__(self):
        from app.services.ai.openrouter import ai_service
        self.ai = ai_service

    def cosine_similarity(self, a: list[float], b: list[float]) -> float:
        va, vb = np.array(a), np.array(b)
        denom = np.linalg.norm(va) * np.linalg.norm(vb)
        return float(np.dot(va, vb) / denom) if denom > 0 else 0.0

    async def score(
        self,
        vacancy_data: dict,
        candidate_data: dict,
        vacancy_embedding: Optional[list[float]] = None,
        resume_embedding: Optional[list[float]] = None,
    ) -> ScoreBreakdown:
        # Semantic similarity boost
        semantic_score = 0
        if vacancy_embedding and resume_embedding:
            semantic_score = self.cosine_similarity(vacancy_embedding, resume_embedding)
            semantic_score = min(100, int(semantic_score * 120))  # Scale 0-1 → 0-100

        prompt = f"""
Vacancy: {vacancy_data}

Candidate Resume Data: {candidate_data}

Semantic similarity score (0-100): {semantic_score}

Use the semantic score as a hint but apply your own judgment.
Score this candidate for the vacancy."""

        result = await self.ai.complete_structured(
            messages=[{"role": "user", "content": prompt}],
            schema=ScoreBreakdown,
            system=SCORING_SYSTEM,
        )

        # Blend semantic score into overall
        if semantic_score > 0:
            result.overall_score = int(result.overall_score * 0.8 + semantic_score * 0.2)

        return result

    async def generate_interview_questions(
        self,
        vacancy: dict,
        candidate: dict,
        question_types: list[str] = None,
        count_per_type: int = 3,
    ) -> dict[str, list[str]]:
        types = question_types or ["hr", "technical", "behavioral"]
        prompt = f"""
Generate interview questions for this candidate applying to this role.

Vacancy: {vacancy}
Candidate: {candidate}

Generate {count_per_type} questions for each of these types: {types}
Make them specific to the candidate's background and the role requirements.
For technical questions, match the seniority level.

Return JSON: {{"hr": [...], "technical": [...], "behavioral": [...]}}"""

        raw = await self.ai.complete(
            messages=[{"role": "user", "content": prompt}],
            system="You are an expert interviewer. Generate insightful, role-specific questions. Return JSON only.",
            temperature=0.7,
        )
        import json
        try:
            raw = raw.strip().lstrip("```json").rstrip("```").strip()
            return json.loads(raw)
        except Exception:
            return {t: [] for t in types}


scoring_engine = ScoringEngine()
