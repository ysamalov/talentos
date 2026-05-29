from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
import structlog
import os

from app.core.config import settings
from app.db.session import init_db

logger = structlog.get_logger()


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Starting TalentOS API")
    await init_db()
    os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
    yield
    logger.info("Shutting down TalentOS API")


limiter = Limiter(key_func=get_remote_address)

app = FastAPI(
    title="TalentOS API",
    description="AI-powered Recruitment Platform API",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.get_cors_origins(),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount static files for uploads
os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=settings.UPLOAD_DIR), name="uploads")

# Routers
from app.api.v1.endpoints import auth, companies, vacancies, candidates, resumes, screening, analytics, onboarding, tokens

app.include_router(auth.router, prefix=f"{settings.API_V1_STR}/auth", tags=["auth"])
app.include_router(companies.router, prefix=f"{settings.API_V1_STR}/companies", tags=["companies"])
app.include_router(vacancies.router, prefix=f"{settings.API_V1_STR}/vacancies", tags=["vacancies"])
app.include_router(candidates.router, prefix=f"{settings.API_V1_STR}/candidates", tags=["candidates"])
app.include_router(resumes.router, prefix=f"{settings.API_V1_STR}/resumes", tags=["resumes"])
app.include_router(screening.router, prefix=f"{settings.API_V1_STR}/screening", tags=["screening"])
app.include_router(analytics.router, prefix=f"{settings.API_V1_STR}/analytics", tags=["analytics"])
app.include_router(onboarding.router, prefix=f"{settings.API_V1_STR}/onboarding", tags=["onboarding"])
app.include_router(tokens.router, prefix=f"{settings.API_V1_STR}/tokens", tags=["tokens"])


@app.get("/health")
async def health():
    return {"status": "ok", "service": "TalentOS API"}


from app.api.v1.endpoints.ws import router as ws_router
app.include_router(ws_router, tags=["websocket"])
