"""
Resume Parsing Service
Extracts structured candidate data from PDF/DOCX using AI.
"""
import io
from pathlib import Path
from typing import Optional
from pydantic import BaseModel, EmailStr, Field
import structlog

logger = structlog.get_logger()


# ─── Output Schema ────────────────────────────────────────────────────────────

class ExperienceItem(BaseModel):
    company: str
    role: str
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    description: Optional[str] = None
    technologies: list[str] = Field(default_factory=list)


class EducationItem(BaseModel):
    institution: str
    degree: Optional[str] = None
    field: Optional[str] = None
    graduation_year: Optional[int] = None


class ParsedResume(BaseModel):
    full_name: str
    email: Optional[str] = None
    phone: Optional[str] = None
    linkedin_url: Optional[str] = None
    github_url: Optional[str] = None
    location: Optional[str] = None
    summary: Optional[str] = None
    skills: list[str] = Field(default_factory=list)
    experience: list[ExperienceItem] = Field(default_factory=list)
    education: list[EducationItem] = Field(default_factory=list)
    languages: list[str] = Field(default_factory=list)
    certifications: list[str] = Field(default_factory=list)
    seniority: Optional[str] = None  # junior/mid/senior/staff/principal/lead
    years_of_experience: Optional[float] = None
    salary_expectation_min: Optional[int] = None
    salary_expectation_max: Optional[int] = None


PARSE_SYSTEM = """You are an expert resume parser. Extract all information from the resume text.
For seniority, infer from years of experience and job titles:
- junior: 0-2 years
- mid: 2-5 years
- senior: 5-10 years
- staff/lead: 10-15 years
- principal/director: 15+ years
Normalize all skills to standard names (e.g. "JS" → "JavaScript", "k8s" → "Kubernetes").
Return structured JSON only."""


class ResumeParserService:
    def __init__(self):
        from app.services.ai.openrouter import ai_service
        self.ai = ai_service

    def _extract_text_pdf(self, content: bytes) -> str:
        try:
            import PyPDF2
            reader = PyPDF2.PdfReader(io.BytesIO(content))
            return "\n".join(page.extract_text() or "" for page in reader.pages)
        except Exception as e:
            logger.error("PDF extraction failed", error=str(e))
            return ""

    def _extract_text_docx(self, content: bytes) -> str:
        try:
            from docx import Document
            doc = Document(io.BytesIO(content))
            return "\n".join(p.text for p in doc.paragraphs)
        except Exception as e:
            logger.error("DOCX extraction failed", error=str(e))
            return ""

    def extract_raw_text(self, content: bytes, file_type: str) -> str:
        if file_type.lower() == "pdf":
            return self._extract_text_pdf(content)
        elif file_type.lower() in ("docx", "doc"):
            return self._extract_text_docx(content)
        return content.decode("utf-8", errors="ignore")

    async def parse(self, raw_text: str) -> ParsedResume:
        messages = [{"role": "user", "content": f"Parse this resume:\n\n{raw_text[:6000]}"}]
        return await self.ai.complete_structured(
            messages=messages,
            schema=ParsedResume,
            system=PARSE_SYSTEM,
        )

    async def parse_file(self, content: bytes, file_type: str) -> tuple[str, ParsedResume]:
        raw_text = self.extract_raw_text(content, file_type)
        parsed = await self.parse(raw_text)
        return raw_text, parsed


resume_parser = ResumeParserService()
