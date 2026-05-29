"""
Celery Workers — async task processing for AI operations.
"""
from celery import Celery
from app.core.config import settings

celery_app = Celery(
    "talentos",
    broker=settings.REDIS_URL,
    backend=settings.REDIS_URL,
    include=[
        "app.workers.tasks.resume_tasks",
        "app.workers.tasks.ai_tasks",
        "app.workers.tasks.email_tasks",
    ],
)

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
    task_routes={
        "app.workers.tasks.resume_tasks.*": {"queue": "resume_parsing"},
        "app.workers.tasks.ai_tasks.*": {"queue": "ai_tasks"},
        "app.workers.tasks.email_tasks.*": {"queue": "email_tasks"},
    },
    task_soft_time_limit=120,
    task_time_limit=180,
    worker_prefetch_multiplier=1,
    task_acks_late=True,
    beat_schedule={
        "auto-screen-pending-candidates": {
            "task": "app.workers.tasks.ai_tasks.auto_screen_pending",
            "schedule": 300.0,  # every 5 minutes
        },
        "send-daily-digest": {
            "task": "app.workers.tasks.email_tasks.send_daily_digest",
            "schedule": 86400.0,  # daily
        },
    },
)
