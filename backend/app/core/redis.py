"""
app/core/redis.py
-----------------
Redis client singleton + token blacklist helpers.
"""
import redis.asyncio as aioredis

from app.core.config import settings

_redis: aioredis.Redis | None = None


async def get_redis() -> aioredis.Redis:
    global _redis
    if _redis is None:
        _redis = aioredis.from_url(
            settings.REDIS_URL,
            encoding="utf-8",
            decode_responses=True,
        )
    return _redis


async def blacklist_token(jti: str, ttl_seconds: int) -> None:
    r = await get_redis()
    await r.setex(f"blacklist:{jti}", ttl_seconds, "1")


async def is_token_blacklisted(jti: str) -> bool:
    r = await get_redis()
    return await r.exists(f"blacklist:{jti}") == 1