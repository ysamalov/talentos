from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
import uuid
import os
import aiofiles

from app.db.session import get_db
from app.models.models import Resume, Candidate, User
from app.api.v1.endpoints.auth import get_current_user
from app.core.config import settings

router = APIRouter()


@router.post("/upload")
async def upload_resume(
    file: UploadFile = File(...),
    candidate_id: uuid.UUID = Form(...),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    ext = file.filename.rsplit(".", 1)[-1].lower() if "." in file.filename else ""
    allowed = settings.get_allowed_extensions()
    if ext not in allowed:
        raise HTTPException(400, f"File type .{ext} not allowed. Allowed: {allowed}")

    content = await file.read()
    if len(content) > settings.MAX_UPLOAD_SIZE_MB * 1024 * 1024:
        raise HTTPException(400, f"File too large. Max {settings.MAX_UPLOAD_SIZE_MB}MB")

    result = await db.execute(
        select(Candidate).where(
            Candidate.id == candidate_id,
            Candidate.company_id == current_user.company_id,
        )
    )
    candidate = result.scalar_one_or_none()
    if not candidate:
        raise HTTPException(404, "Candidate not found")

    upload_path = os.path.join(settings.UPLOAD_DIR, "resumes", str(current_user.company_id))
    os.makedirs(upload_path, exist_ok=True)
    file_id = uuid.uuid4()
    file_path = os.path.join(upload_path, f"{file_id}.{ext}")

    async with aiofiles.open(file_path, "wb") as f:
        await f.write(content)

    existing = await db.execute(select(Resume).where(Resume.candidate_id == candidate_id))
    for r in existing.scalars():
        r.is_primary = False

    resume = Resume(
        candidate_id=candidate_id,
        file_path=file_path,
        file_name=file.filename,
        file_type=ext,
        file_size=len(content),
        is_primary=True,
    )
    db.add(resume)
    await db.commit()
    await db.refresh(resume)

    from app.workers.tasks import parse_resume_task
    parse_resume_task.delay(str(resume.id))

    return {
        "resume_id": str(resume.id),
        "file_name": resume.file_name,
        "status": "parsing_queued",
        "message": "Resume uploaded. AI parsing started in background.",
    }


@router.get("/{resume_id}/status")
async def get_resume_status(
    resume_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(select(Resume).where(Resume.id == resume_id))
    resume = result.scalar_one_or_none()
    if not resume:
        raise HTTPException(404, "Resume not found")
    return {
        "is_parsed": resume.is_parsed,
        "parsed_at": resume.parsed_at.isoformat() if resume.parsed_at else None,
        "parsed_data": resume.parsed_data if resume.is_parsed else None,
        "skills": resume.skills,
        "seniority": resume.seniority,
        "years_experience": resume.years_experience,
    }
