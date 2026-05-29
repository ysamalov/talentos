from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.db.session import get_db
from app.models.models import Company, User
from app.api.v1.endpoints.auth import get_current_user

router = APIRouter()


@router.get("/me")
async def get_my_company(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(select(Company).where(Company.id == current_user.company_id))
    company = result.scalar_one_or_none()
    if not company:
        return {}
    return {
        "id": str(company.id),
        "name": company.name,
        "domain": company.domain,
        "industry": company.industry,
        "size": company.size,
    }
