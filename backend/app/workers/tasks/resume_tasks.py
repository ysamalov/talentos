"""
Resume parsing background tasks.
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
            from app.workers.tasks.ai_tasks import score_candidate_for_vacancies
            score_candidate_for_vacancies.delay(str(resume.candidate_id))

    try:
        run_async(_run())
    except Exception as exc:
        logger.error("Resume parsing failed", resume_id=resume_id, error=str(exc))
        raise self.retry(exc=exc, countdown=60)
