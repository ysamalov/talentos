"""
Background tasks: resume parsing, AI scoring, auto-screening.
"""
import asyncio
from app.workers.celery_app import celery_app
import structlog

logger = structlog.get_logger()


def run_async(coro):
    """Run async coroutine in sync Celery task."""
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    try:
        return loop.run_until_complete(coro)
    finally:
        loop.close()


@celery_app.task(bind=True, max_retries=3, name="app.workers.tasks.resume_tasks.parse_resume")
def parse_resume_task(self, resume_id: str):
    """Parse uploaded resume and store structured data."""
    async def _run():
        from app.db.session import AsyncSessionLocal
        from app.models.models import Resume
        from app.services.ai.resume_parser import resume_parser
        from app.services.ai.openrouter import ai_service
        from sqlalchemy import select
        import aiofiles
        from datetime import datetime, timezone

        async with AsyncSessionLocal() as db:
            result = await db.execute(select(Resume).where(Resume.id == resume_id))
            resume = result.scalar_one_or_none()
            if not resume:
                logger.error("Resume not found", resume_id=resume_id)
                return

            async with aiofiles.open(resume.file_path, "rb") as f:
                content = await f.read()

            raw_text, parsed = await resume_parser.parse_file(content, resume.file_type)
            embedding = await ai_service.embed(raw_text[:4000])

            resume.raw_text = raw_text
            resume.parsed_data = parsed.model_dump()
            resume.skills = parsed.skills
            resume.years_experience = parsed.years_of_experience
            resume.seniority = parsed.seniority
            resume.salary_expectation_min = parsed.salary_expectation_min
            resume.salary_expectation_max = parsed.salary_expectation_max
            resume.embedding = embedding
            resume.is_parsed = True
            resume.parsed_at = datetime.now(timezone.utc)

            # Update candidate from resume
            if resume.candidate:
                if parsed.phone and not resume.candidate.phone:
                    resume.candidate.phone = parsed.phone
                if parsed.linkedin_url and not resume.candidate.linkedin_url:
                    resume.candidate.linkedin_url = parsed.linkedin_url

            await db.commit()
            logger.info("Resume parsed successfully", resume_id=resume_id, skills=len(parsed.skills))

            # Trigger scoring for all active vacancies
            score_candidate_for_vacancies.delay(str(resume.candidate_id))

    try:
        run_async(_run())
    except Exception as exc:
        logger.error("Resume parsing failed", resume_id=resume_id, error=str(exc))
        raise self.retry(exc=exc, countdown=60)


@celery_app.task(bind=True, max_retries=2, name="app.workers.tasks.ai_tasks.score_candidate")
def score_candidate_for_vacancies(self, candidate_id: str):
    """Score candidate against all their active vacancy applications."""
    async def _run():
        from app.db.session import AsyncSessionLocal
        from app.models.models import Candidate, CandidateVacancy, Resume, Vacancy
        from app.services.ai.scoring import scoring_engine
        from sqlalchemy import select
        from sqlalchemy.orm import selectinload

        async with AsyncSessionLocal() as db:
            result = await db.execute(
                select(Candidate)
                .where(Candidate.id == candidate_id)
                .options(
                    selectinload(Candidate.vacancies).selectinload(CandidateVacancy.vacancy),
                    selectinload(Candidate.resumes),
                )
            )
            candidate = result.scalar_one_or_none()
            if not candidate:
                return

            primary_resume = next((r for r in candidate.resumes if r.is_primary and r.is_parsed), None)
            if not primary_resume:
                return

            for cv in candidate.vacancies:
                if cv.stage in ("rejected", "hired"):
                    continue
                vacancy = cv.vacancy
                score = await scoring_engine.score(
                    vacancy_data={
                        "title": vacancy.title,
                        "required_skills": vacancy.required_skills,
                        "seniority_level": vacancy.seniority_level,
                        "description": vacancy.description,
                        "salary_min": vacancy.salary_min,
                        "salary_max": vacancy.salary_max,
                    },
                    candidate_data=primary_resume.parsed_data,
                    vacancy_embedding=vacancy.embedding,
                    resume_embedding=primary_resume.embedding,
                )
                cv.ai_score = score.overall_score
                cv.score_breakdown = score.model_dump()

                # Auto-reject if below threshold
                if (vacancy.auto_reject_below_score and
                        score.overall_score < vacancy.auto_reject_below_score):
                    cv.stage = "rejected"
                    cv.rejection_reason = "AI screening: score below threshold"
                    send_rejection_email.delay(str(candidate.id), str(vacancy.id))

            await db.commit()
            logger.info("Scoring complete", candidate_id=candidate_id)

    try:
        run_async(_run())
    except Exception as exc:
        raise self.retry(exc=exc, countdown=30)


@celery_app.task(name="app.workers.tasks.ai_tasks.auto_screen_pending")
def auto_screen_pending():
    """Periodic task: auto-move AI-scored candidates to next stage."""
    logger.info("Running auto-screen sweep")


@celery_app.task(name="app.workers.tasks.email_tasks.send_rejection_email")
def send_rejection_email(candidate_id: str, vacancy_id: str):
    """Send automated rejection email."""
    logger.info("Sending rejection email", candidate_id=candidate_id, vacancy_id=vacancy_id)


@celery_app.task(name="app.workers.tasks.email_tasks.send_daily_digest")
def send_daily_digest():
    """Daily digest email to recruiters."""
    logger.info("Sending daily digest")
