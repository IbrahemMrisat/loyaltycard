"""
app/core/limiter.py
-------------------
Shared rate limiter instance.
Lives here (not in main.py) to avoid circular imports:
  main.py imports routers → routers import limiter → limiter must not import main.py
"""
from slowapi import Limiter
from slowapi.util import get_remote_address

from app.core.config import settings

limiter = Limiter(
    key_func=get_remote_address,
    default_limits=[f"{settings.RATE_LIMIT_PER_MINUTE}/minute"],
)
