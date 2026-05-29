"""
All database models in one place for clarity.
Split into individual files in production.
"""
import uuid
from datetime import datetime, timezone
from enum import Enum as PyEnum
from typing import Optional, List

from sqlalchemy import (
    String, Text, Integer, Float, Boolean, DateTime, ForeignKey,
    JSON, Enum, UniqueConstraint, Index
)
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID, ARRAY
from pgvector.sqlalchemy import Vector

from app.db.session import Base


def utcnow():
    return datetime.now(timezone.utc)


# ─── Enums ───────────────────────────────────────────────────────────────────

class UserRole(str, PyEnum):
    ADMIN = "admin"
    RECRUITER = "recruiter"
    HIRING_MANAGER = "hiring_manager"
    VIEWER = "viewer"


class VacancyStatus(str, PyEnum):
    DRAFT = "draft"
    OPEN = "open"
    PAUSED = "paused"
    CLOSED = "closed"
    FILLED = "filled"


class CandidateStage(str, PyEnum):
    APPLIED = "applied"
    AI_SCREENING = "ai_screening"
    HR_REVIEW = "hr_review"
    INTERVIEW = "interview"
    TECHNICAL_INTERVIEW = "technical_interview"
    OFFER = "offer"
    HIRED = "hired"
    REJECTED = "rejected"


class InterviewType(str, PyEnum):
    HR = "hr"
    TECHNICAL = "technical"
    BEHAVIORAL = "behavioral"
    FINAL = "final"


# ─── Company ──────────────────────────────────────────────────────────────────

class Company(Base):
    __tablename__ = "companies"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    domain: Mapped[Optional[str]] = mapped_column(String(255), unique=True)
    logo_url: Mapped[Optional[str]] = mapped_column(String(512))
    industry: Mapped[Optional[str]] = mapped_column(String(100))
    size: Mapped[Optional[str]] = mapped_column(String(50))
    settings: Mapped[dict] = mapped_column(JSON, default=dict)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, onupdate=utcnow)

    users: Mapped[List["User"]] = relationship("User", back_populates="company")
    vacancies: Mapped[List["Vacancy"]] = relationship("Vacancy", back_populates="company")


# ─── User ─────────────────────────────────────────────────────────────────────

class User(Base):
    __tablename__ = "users"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    company_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("companies.id", ondelete="CASCADE"))
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False, index=True)
    hashed_password: Mapped[str] = mapped_column(String(255), nullable=False)
    full_name: Mapped[str] = mapped_column(String(255), nullable=False)
    role: Mapped[UserRole] = mapped_column(Enum(UserRole), default=UserRole.RECRUITER)
    avatar_url: Mapped[Optional[str]] = mapped_column(String(512))
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    is_verified: Mapped[bool] = mapped_column(Boolean, default=False)
    last_login: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, onupdate=utcnow)

    company: Mapped["Company"] = relationship("Company", back_populates="users")
    vacancies: Mapped[List["Vacancy"]] = relationship("Vacancy", back_populates="created_by")


# ─── Vacancy ──────────────────────────────────────────────────────────────────

class Vacancy(Base):
    __tablename__ = "vacancies"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    company_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("companies.id", ondelete="CASCADE"))
    created_by_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"))
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    department: Mapped[Optional[str]] = mapped_column(String(100))
    location: Mapped[Optional[str]] = mapped_column(String(255))
    remote_policy: Mapped[Optional[str]] = mapped_column(String(50))  # onsite/hybrid/remote
    employment_type: Mapped[Optional[str]] = mapped_column(String(50))  # full-time/contract
    seniority_level: Mapped[Optional[str]] = mapped_column(String(50))
    salary_min: Mapped[Optional[int]] = mapped_column(Integer)
    salary_max: Mapped[Optional[int]] = mapped_column(Integer)
    salary_currency: Mapped[str] = mapped_column(String(10), default="USD")
    description: Mapped[Optional[str]] = mapped_column(Text)
    requirements: Mapped[Optional[str]] = mapped_column(Text)
    responsibilities: Mapped[Optional[str]] = mapped_column(Text)
    required_skills: Mapped[List[str]] = mapped_column(JSON, default=list)
    nice_to_have_skills: Mapped[List[str]] = mapped_column(JSON, default=list)
    status: Mapped[VacancyStatus] = mapped_column(Enum(VacancyStatus), default=VacancyStatus.OPEN)
    ai_screening_enabled: Mapped[bool] = mapped_column(Boolean, default=True)
    auto_reject_below_score: Mapped[Optional[int]] = mapped_column(Integer, default=40)
    embedding: Mapped[Optional[List[float]]] = mapped_column(Vector(1536))
    meta: Mapped[dict] = mapped_column(JSON, default=dict)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, onupdate=utcnow)
    closed_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))

    company: Mapped["Company"] = relationship("Company", back_populates="vacancies")
    created_by: Mapped["User"] = relationship("User", back_populates="vacancies")
    candidates: Mapped[List["CandidateVacancy"]] = relationship("CandidateVacancy", back_populates="vacancy")

    __table_args__ = (
        Index("ix_vacancies_company_status", "company_id", "status"),
        Index("ix_vacancies_embedding", "embedding", postgresql_using="ivfflat",
              postgresql_with={"lists": 100}),
    )


# ─── Candidate ────────────────────────────────────────────────────────────────

class Candidate(Base):
    __tablename__ = "candidates"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    company_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("companies.id", ondelete="CASCADE"))
    full_name: Mapped[str] = mapped_column(String(255), nullable=False)
    email: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    phone: Mapped[Optional[str]] = mapped_column(String(50))
    linkedin_url: Mapped[Optional[str]] = mapped_column(String(512))
    github_url: Mapped[Optional[str]] = mapped_column(String(512))
    portfolio_url: Mapped[Optional[str]] = mapped_column(String(512))
    location: Mapped[Optional[str]] = mapped_column(String(255))
    avatar_url: Mapped[Optional[str]] = mapped_column(String(512))
    source: Mapped[Optional[str]] = mapped_column(String(100))  # linkedin, referral, etc
    tags: Mapped[List[str]] = mapped_column(JSON, default=list)
    notes: Mapped[Optional[str]] = mapped_column(Text)
    is_blacklisted: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, onupdate=utcnow)

    resumes: Mapped[List["Resume"]] = relationship("Resume", back_populates="candidate")
    vacancies: Mapped[List["CandidateVacancy"]] = relationship("CandidateVacancy", back_populates="candidate")
    interview_sessions: Mapped[List["InterviewSession"]] = relationship("InterviewSession", back_populates="candidate")

    __table_args__ = (
        UniqueConstraint("company_id", "email", name="uq_candidate_company_email"),
    )


# ─── Resume ───────────────────────────────────────────────────────────────────

class Resume(Base):
    __tablename__ = "resumes"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    candidate_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("candidates.id", ondelete="CASCADE"))
    file_path: Mapped[str] = mapped_column(String(512), nullable=False)
    file_name: Mapped[str] = mapped_column(String(255), nullable=False)
    file_type: Mapped[str] = mapped_column(String(20), nullable=False)  # pdf/docx
    file_size: Mapped[int] = mapped_column(Integer)
    raw_text: Mapped[Optional[str]] = mapped_column(Text)

    # AI-parsed structured data
    parsed_data: Mapped[dict] = mapped_column(JSON, default=dict)
    # {
    #   full_name, email, phone, linkedin, skills[], experience[],
    #   education[], languages[], seniority, salary_expectation,
    #   summary, years_of_experience
    # }

    skills: Mapped[List[str]] = mapped_column(JSON, default=list)
    years_experience: Mapped[Optional[float]] = mapped_column(Float)
    seniority: Mapped[Optional[str]] = mapped_column(String(50))
    salary_expectation_min: Mapped[Optional[int]] = mapped_column(Integer)
    salary_expectation_max: Mapped[Optional[int]] = mapped_column(Integer)
    embedding: Mapped[Optional[List[float]]] = mapped_column(Vector(1536))
    is_parsed: Mapped[bool] = mapped_column(Boolean, default=False)
    parsed_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    is_primary: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)

    candidate: Mapped["Candidate"] = relationship("Candidate", back_populates="resumes")

    __table_args__ = (
        Index("ix_resumes_embedding", "embedding", postgresql_using="ivfflat",
              postgresql_with={"lists": 100}),
    )


# ─── CandidateVacancy (Pipeline) ──────────────────────────────────────────────

class CandidateVacancy(Base):
    __tablename__ = "candidate_vacancies"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    candidate_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("candidates.id", ondelete="CASCADE"))
    vacancy_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("vacancies.id", ondelete="CASCADE"))
    stage: Mapped[CandidateStage] = mapped_column(Enum(CandidateStage), default=CandidateStage.APPLIED)
    ai_score: Mapped[Optional[int]] = mapped_column(Integer)
    score_breakdown: Mapped[dict] = mapped_column(JSON, default=dict)
    # {skill_match, experience_relevance, culture_fit, strengths[], risks[], missing_skills[], recommendation}
    recruiter_rating: Mapped[Optional[int]] = mapped_column(Integer)
    rejection_reason: Mapped[Optional[str]] = mapped_column(String(255))
    rejection_sent: Mapped[bool] = mapped_column(Boolean, default=False)
    offer_salary: Mapped[Optional[int]] = mapped_column(Integer)
    applied_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    stage_updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    hired_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))

    candidate: Mapped["Candidate"] = relationship("Candidate", back_populates="vacancies")
    vacancy: Mapped["Vacancy"] = relationship("Vacancy", back_populates="candidates")
    activity_log: Mapped[List["ActivityLog"]] = relationship("ActivityLog", back_populates="candidate_vacancy")

    __table_args__ = (
        UniqueConstraint("candidate_id", "vacancy_id", name="uq_candidate_vacancy"),
        Index("ix_cv_vacancy_stage", "vacancy_id", "stage"),
    )


# ─── InterviewSession ─────────────────────────────────────────────────────────

class InterviewSession(Base):
    __tablename__ = "interview_sessions"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    candidate_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("candidates.id", ondelete="CASCADE"))
    vacancy_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("vacancies.id", ondelete="CASCADE"))
    interview_type: Mapped[InterviewType] = mapped_column(Enum(InterviewType), default=InterviewType.HR)
    is_ai_session: Mapped[bool] = mapped_column(Boolean, default=True)
    interviewer_id: Mapped[Optional[uuid.UUID]] = mapped_column(ForeignKey("users.id"))
    scheduled_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    started_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    ended_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    messages: Mapped[List[dict]] = mapped_column(JSON, default=list)
    # [{role: user/assistant, content: str, timestamp: str}]
    questions: Mapped[List[dict]] = mapped_column(JSON, default=list)
    ai_summary: Mapped[Optional[str]] = mapped_column(Text)
    ai_score: Mapped[Optional[int]] = mapped_column(Integer)
    score_breakdown: Mapped[dict] = mapped_column(JSON, default=dict)
    status: Mapped[str] = mapped_column(String(50), default="scheduled")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)

    candidate: Mapped["Candidate"] = relationship("Candidate", back_populates="interview_sessions")


# ─── ActivityLog ──────────────────────────────────────────────────────────────

class ActivityLog(Base):
    __tablename__ = "activity_logs"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    candidate_vacancy_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("candidate_vacancies.id", ondelete="CASCADE"))
    user_id: Mapped[Optional[uuid.UUID]] = mapped_column(ForeignKey("users.id"))
    action: Mapped[str] = mapped_column(String(100), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text)
    meta: Mapped[dict] = mapped_column(JSON, default=dict)
    is_ai_action: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)

    candidate_vacancy: Mapped["CandidateVacancy"] = relationship("CandidateVacancy", back_populates="activity_log")


# ─── OnboardingPlan ───────────────────────────────────────────────────────────

class OnboardingPlan(Base):
    __tablename__ = "onboarding_plans"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    candidate_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("candidates.id", ondelete="CASCADE"))
    vacancy_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("vacancies.id"))
    start_date: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    checklist: Mapped[List[dict]] = mapped_column(JSON, default=list)
    # [{title, description, due_day, category, completed}]
    goals_30: Mapped[Optional[str]] = mapped_column(Text)
    goals_60: Mapped[Optional[str]] = mapped_column(Text)
    goals_90: Mapped[Optional[str]] = mapped_column(Text)
    buddy_id: Mapped[Optional[uuid.UUID]] = mapped_column(ForeignKey("users.id"))
    manager_id: Mapped[Optional[uuid.UUID]] = mapped_column(ForeignKey("users.id"))
    is_ai_generated: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, onupdate=utcnow)


# ─── IDPlan (Individual Development Plan) ────────────────────────────────────

class IDPlan(Base):
    __tablename__ = "idp_plans"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    candidate_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("candidates.id", ondelete="CASCADE"))
    vacancy_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("vacancies.id"))
    current_role: Mapped[Optional[str]] = mapped_column(String(255))
    target_role: Mapped[Optional[str]] = mapped_column(String(255))
    timeline_months: Mapped[Optional[int]] = mapped_column(Integer)
    roadmap: Mapped[List[dict]] = mapped_column(JSON, default=list)
    # [{title, description, status, duration_months, resources[]}]
    skills_to_develop: Mapped[List[str]] = mapped_column(JSON, default=list)
    recommended_courses: Mapped[List[dict]] = mapped_column(JSON, default=list)
    promotion_probability: Mapped[Optional[float]] = mapped_column(Float)
    is_ai_generated: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, onupdate=utcnow)


# ─── CandidateToken (temporary links) ────────────────────────────────────────

class TokenType(str, PyEnum):
    AI_SCREENING = "ai_screening"
    VIDEO_PRESENTATION = "video_presentation"


class CandidateToken(Base):
    __tablename__ = "candidate_tokens"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    token: Mapped[str] = mapped_column(String(128), unique=True, nullable=False, index=True)
    token_type: Mapped[TokenType] = mapped_column(Enum(TokenType), nullable=False)
    candidate_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("candidates.id", ondelete="CASCADE"))
    vacancy_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("vacancies.id", ondelete="CASCADE"))
    created_by_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"))
    # Video presentation results (stored after submission)
    video_transcript: Mapped[Optional[str]] = mapped_column(Text)
    video_ai_analysis: Mapped[dict] = mapped_column(JSON, default=dict)
    video_score_delta: Mapped[Optional[int]] = mapped_column(Integer)  # score adjustment after video
    is_completed: Mapped[bool] = mapped_column(Boolean, default=False)
    completed_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)

    candidate: Mapped["Candidate"] = relationship("Candidate")
    vacancy: Mapped["Vacancy"] = relationship("Vacancy")
