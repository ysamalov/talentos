"""
Email notification background tasks.
"""
from app.workers.celery_app import celery_app
import structlog

logger = structlog.get_logger()


@celery_app.task(name="app.workers.tasks.email_tasks.send_rejection_email")
def send_rejection_email(candidate_id: str, vacancy_id: str):
    """Send automated rejection email."""
    logger.info("Sending rejection email", candidate_id=candidate_id, vacancy_id=vacancy_id)


@celery_app.task(name="app.workers.tasks.email_tasks.send_daily_digest")
def send_daily_digest():
    """Daily digest email to recruiters."""
    logger.info("Sending daily digest")
