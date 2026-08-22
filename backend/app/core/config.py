"""
app/core/config.py
------------------
Single source of truth for all configuration.
Pydantic validates types and raises clear errors on startup if anything is missing.
"""
from functools import lru_cache
from typing import List
from pydantic import field_validator, PostgresDsn
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
    )

    # ── App ──────────────────────────────────────────────
    APP_ENV: str = "development"
    APP_NAME: str = "LoyaltyApp API"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = False
    SECRET_KEY: str
    ALLOWED_HOSTS: List[str] = ["localhost", "127.0.0.1","192.168.68.111"]

    # ── Database ─────────────────────────────────────────
    DATABASE_URL: str
    DATABASE_POOL_SIZE: int = 10
    DATABASE_MAX_OVERFLOW: int = 20

    # ── Redis ────────────────────────────────────────────
    REDIS_URL: str = "redis://localhost:6379/0"

    # ── JWT ──────────────────────────────────────────────
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60
    REFRESH_TOKEN_EXPIRE_DAYS: int = 30
    ALGORITHM: str = "HS256"

    # ── Twilio ───────────────────────────────────────────
    TWILIO_ACCOUNT_SID: str
    TWILIO_AUTH_TOKEN: str
    TWILIO_PHONE_NUMBER: str

    # ── QR ───────────────────────────────────────────────
    QR_BASE_URL: str
    QR_SECRET_KEY: str

    # ── Storage ──────────────────────────────────────────
    STORAGE_BUCKET_URL: str
    STORAGE_SERVICE_KEY: str

    # ── Rate Limiting ────────────────────────────────────
    RATE_LIMIT_PER_MINUTE: int = 60
    SCAN_RATE_LIMIT_PER_MINUTE: int = 30

    # ── Admin Bootstrap ──────────────────────────────────
    FIRST_ADMIN_EMAIL: str
    FIRST_ADMIN_PASSWORD: str

    @field_validator("APP_ENV")
    @classmethod
    def validate_env(cls, v: str) -> str:
        allowed = {"development", "staging", "production"}
        if v not in allowed:
            raise ValueError(f"APP_ENV must be one of {allowed}")
        return v

    @property
    def is_production(self) -> bool:
        return self.APP_ENV == "production"

    @property
    def database_url_sync(self) -> str:
        """Synchronous URL for Alembic migrations."""
        return self.DATABASE_URL.replace("+asyncpg", "+psycopg2")


@lru_cache
def get_settings() -> Settings:
    """
    Cached — instantiated once per process.
    Use as a FastAPI dependency: settings = Depends(get_settings)
    """
    return Settings()


settings = get_settings()
