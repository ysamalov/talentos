from pydantic_settings import BaseSettings
from pydantic import field_validator
from typing import List
import secrets


class Settings(BaseSettings):
    APP_NAME: str = "TalentOS"
    APP_ENV: str = "development"
    DEBUG: bool = True
    API_V1_STR: str = "/api/v1"
    SECRET_KEY: str = secrets.token_urlsafe(32)

    # Database
    DATABASE_URL: str = "postgresql+asyncpg://talentos:talentos_secret@localhost:5432/talentos"
    DATABASE_POOL_SIZE: int = 20
    DATABASE_MAX_OVERFLOW: int = 40

    # Redis
    REDIS_URL: str = "redis://localhost:6379/0"

    # JWT
    JWT_SECRET_KEY: str = secrets.token_urlsafe(32)
    JWT_ALGORITHM: str = "HS256"
    JWT_ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    JWT_REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # OpenRouter
    OPENROUTER_API_KEY: str = ""
    OPENROUTER_BASE_URL: str = "https://openrouter.ai/api/v1"
    OPENROUTER_DEFAULT_MODEL: str = "anthropic/claude-3.5-sonnet"
    OPENROUTER_FALLBACK_MODEL: str = "openai/gpt-4o"
    OPENROUTER_EMBEDDING_MODEL: str = "openai/text-embedding-3-small"

    # File Storage
    UPLOAD_DIR: str = "./uploads"
    MAX_UPLOAD_SIZE_MB: int = 10
    # Stored as comma-separated string in .env: "pdf,docx"
    ALLOWED_EXTENSIONS: str = "pdf,docx"

    # CORS — stored as comma-separated string in .env
    BACKEND_CORS_ORIGINS: str = "http://localhost:3000,http://localhost:8000"

    # Email
    SMTP_HOST: str = "smtp.gmail.com"
    SMTP_PORT: int = 587
    SMTP_USER: str = ""
    SMTP_PASSWORD: str = ""
    EMAIL_FROM: str = "noreply@talentos.ai"

    # Rate limiting
    RATE_LIMIT_PER_MINUTE: int = 60

    def get_allowed_extensions(self) -> List[str]:
        return [x.strip() for x in self.ALLOWED_EXTENSIONS.split(",")]

    def get_cors_origins(self) -> List[str]:
        return [x.strip() for x in self.BACKEND_CORS_ORIGINS.split(",")]

    class Config:
        env_file = ".env"
        case_sensitive = True


settings = Settings()
