"""
app/db/session.py
-----------------
Async SQLAlchemy engine + session factory.
Connection pooling configured for production workloads.
"""
from collections.abc import AsyncGenerator

from sqlalchemy.ext.asyncio import (
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)
from sqlalchemy.pool import NullPool

from app.core.config import settings

# NullPool in tests, standard pool in production
engine = create_async_engine(
    settings.DATABASE_URL,
    echo=settings.DEBUG,                    # logs SQL in dev only
    pool_size=settings.DATABASE_POOL_SIZE,
    max_overflow=settings.DATABASE_MAX_OVERFLOW,
    pool_pre_ping=True,                     # detects stale connections
    pool_recycle=3600,                      # recycle connections every hour
)

AsyncSessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,                 # prevents lazy-load errors after commit
    autocommit=False,
    autoflush=False,
)


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """
    FastAPI dependency — yields a session per request, always closes it.
    Usage:  db: AsyncSession = Depends(get_db)
    """
    async with AsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()
