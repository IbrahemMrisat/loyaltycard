"""
app/core/security.py
--------------------
All cryptographic operations live here — never scattered across the codebase.
"""
import hashlib
import hmac
import uuid
from datetime import datetime, timedelta, timezone
from typing import Any, Optional

import bcrypt as _bcrypt
from jose import JWTError, jwt

from app.core.config import settings


def hash_password(password: str) -> str:
    return _bcrypt.hashpw(password.encode("utf-8"), _bcrypt.gensalt()).decode("utf-8")


def verify_password(plain: str, hashed: str) -> bool:
    return _bcrypt.checkpw(
        plain.encode("utf-8"),
        hashed.encode("utf-8") if isinstance(hashed, str) else hashed,
    )


def create_access_token(
    subject: str,
    role: str,
    extra_claims: Optional[dict] = None,
) -> str:
    now = datetime.now(timezone.utc)
    expire = now + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    payload = {
        "sub": subject,
        "role": role,
        "iat": now,
        "exp": expire,
        "type": "access",
        "jti": str(uuid.uuid4()),
    }
    if extra_claims:
        payload.update(extra_claims)
    return jwt.encode(payload, settings.SECRET_KEY, algorithm=settings.ALGORITHM)


def create_refresh_token(subject: str, role: str) -> str:
    now = datetime.now(timezone.utc)
    expire = now + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
    payload = {
        "sub": subject,
        "role": role,
        "iat": now,
        "exp": expire,
        "type": "refresh",
        "jti": str(uuid.uuid4()),
    }
    return jwt.encode(payload, settings.SECRET_KEY, algorithm=settings.ALGORITHM)


def decode_token(token: str) -> dict[str, Any]:
    return jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])


def sign_qr_token(card_id: str) -> str:
    sig = hmac.new(
        settings.QR_SECRET_KEY.encode(),
        card_id.encode(),
        hashlib.sha256,
    ).hexdigest()
    return f"{card_id}.{sig}"


def verify_qr_token(token: str) -> Optional[str]:
    try:
        card_id, sig = token.rsplit(".", 1)
    except ValueError:
        return None
    expected = hmac.new(
        settings.QR_SECRET_KEY.encode(),
        card_id.encode(),
        hashlib.sha256,
    ).hexdigest()
    if hmac.compare_digest(sig, expected):
        return card_id
    return None