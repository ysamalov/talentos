"""
AI Screening Chatbot Service
Conducts autonomous candidate screening conversations.
"""
from typing import Optional
from pydantic import BaseModel, Field
import structlog

logger = structlog.get_logger()


class ScreeningSummary(BaseModel):
    overall_impression: str
    key_strengths: list[str] = Field(default_factory=list)
    concerns: list[str] = Field(default_factory=list)
    culture_signals: list[str] = Field(default_factory=list)
    recommended_next_step: str  # "proceed" | "hold" | "reject"
    updated_score: int = Field(ge=0, le=100)
    salary_discussed: bool = False
    salary_stated: Optional[int] = None
    availability: Optional[str] = None
    summary_text: str


SCREENING_SYSTEM = """You are an AI recruiter conducting a candidate screening interview.
Be professional, warm, and conversational. Ask one question at a time.
Your goals:
1. Assess technical fit for the role
2. Gauge motivation and cultural alignment
3. Clarify salary expectations and availability
4. Identify any red flags

Keep responses concise (2-4 sentences max per message).
After getting a good answer, acknowledge it briefly then move to the next topic.
Topics to cover in order: background/experience → technical depth → motivation → salary → availability → close.

Never ask about age, family status, nationality, religion, or other protected characteristics."""


class ScreeningChatService:
    def __init__(self):
        from app.services.ai.openrouter import ai_service
        self.ai = ai_service

    def _build_context(self, vacancy: dict, candidate: dict) -> str:
        return f"""
You are screening {candidate.get('full_name', 'the candidate')} for the role: {vacancy.get('title', 'the position')}.

Role requirements:
- Required skills: {', '.join(vacancy.get('required_skills', []))}
- Seniority: {vacancy.get('seniority_level', 'Not specified')}
- Location: {vacancy.get('location', 'Remote')}
- Salary range: ${vacancy.get('salary_min', 'N/A')} - ${vacancy.get('salary_max', 'N/A')}

Candidate's background:
- Skills: {', '.join(candidate.get('skills', []))}
- Experience: {candidate.get('years_experience', 'Unknown')} years
- Current seniority: {candidate.get('seniority', 'Unknown')}

{SCREENING_SYSTEM}"""

    async def get_opening_message(self, vacancy: dict, candidate: dict) -> str:
        system = self._build_context(vacancy, candidate)
        messages = [{"role": "user", "content": "[START SCREENING - Send opening message]"}]
        return await self.ai.complete(messages, system=system, temperature=0.5, max_tokens=200)

    async def respond(
        self,
        vacancy: dict,
        candidate: dict,
        conversation_history: list[dict],
        user_message: str,
    ) -> str:
        system = self._build_context(vacancy, candidate)
        messages = conversation_history + [{"role": "user", "content": user_message}]
        return await self.ai.complete(messages, system=system, temperature=0.4, max_tokens=300)

    async def generate_summary(
        self,
        vacancy: dict,
        candidate: dict,
        conversation_history: list[dict],
    ) -> ScreeningSummary:
        transcript = "\n".join(
            f"{m['role'].upper()}: {m['content']}" for m in conversation_history
        )
        messages = [{
            "role": "user",
            "content": f"Summarize this screening conversation:\n\nVacancy: {vacancy['title']}\nCandidate: {candidate.get('full_name')}\n\nTranscript:\n{transcript}"
        }]
        return await self.ai.complete_structured(
            messages=messages,
            schema=ScreeningSummary,
            system="You are an expert recruiter. Analyze this screening interview and provide a structured assessment. Be objective and specific. Return JSON only.",
        )


class OnboardingService:
    def __init__(self):
        from app.services.ai.openrouter import ai_service
        self.ai = ai_service

    async def generate_plan(self, vacancy: dict, candidate: dict) -> dict:
        prompt = f"""
Generate a comprehensive onboarding plan for a new hire.

Role: {vacancy.get('title')}
Department: {vacancy.get('department')}
Candidate background: {candidate.get('skills', [])} skills, {candidate.get('seniority')} level

Generate:
1. Week 1 checklist (8-10 items with categories: HR/IT/Culture/Strategy/Training)
2. 30-day goals (Learn phase)
3. 60-day goals (Contribute phase)
4. 90-day goals (Lead/Own phase)

Return JSON: {{
  "checklist": [{{"title": str, "description": str, "due_day": int, "category": str}}],
  "goals_30": str,
  "goals_60": str,
  "goals_90": str
}}"""
        import json
        raw = await self.ai.complete(
            messages=[{"role": "user", "content": prompt}],
            system="You are an expert HR professional creating onboarding plans. Return JSON only.",
            temperature=0.6,
        )
        raw = raw.strip().lstrip("```json").rstrip("```").strip()
        return json.loads(raw)


class IDPService:
    def __init__(self):
        from app.services.ai.openrouter import ai_service
        self.ai = ai_service

    async def generate_plan(self, candidate: dict, current_role: str, target_role: str) -> dict:
        prompt = f"""
Create an Individual Development Plan (IDP) for an employee.

Employee: {candidate.get('full_name')}
Current skills: {candidate.get('skills', [])}
Current role: {current_role}
Target role: {target_role}
Experience: {candidate.get('years_experience', 0)} years

Generate a realistic growth roadmap with:
- 3-5 milestones/phases
- Skills to develop (list 6-8)
- Recommended courses/certifications
- Estimated timeline in months
- Promotion probability (0.0-1.0)

Return JSON: {{
  "timeline_months": int,
  "roadmap": [{{"title": str, "description": str, "status": "future", "duration_months": int, "resources": [str]}}],
  "skills_to_develop": [str],
  "recommended_courses": [{{"name": str, "provider": str, "url": str}}],
  "promotion_probability": float
}}"""
        import json
        raw = await self.ai.complete(
            messages=[{"role": "user", "content": prompt}],
            system="You are a career development expert. Create actionable, realistic IDPs. Return JSON only.",
            temperature=0.5,
        )
        raw = raw.strip().lstrip("```json").rstrip("```").strip()
        return json.loads(raw)


screening_service = ScreeningChatService()
onboarding_service = OnboardingService()
idp_service = IDPService()
