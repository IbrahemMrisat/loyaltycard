"""
app/core/dependencies.py
------------------------
FastAPI dependencies for authentication and authorization.
Role-based access control (RBAC) enforced at the route level.
"""
import uuid
from typing import Annotated

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.redis import is_token_blacklisted
from app.core.security import decode_token
from app.db.session import get_db
from app.models.all_models import Business, BusinessStatus, User, UserRole

bearer_scheme = HTTPBearer()


async def _get_current_user(
    credentials: Annotated[HTTPAuthorizationCredentials, Depends(bearer_scheme)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = decode_token(credentials.credentials)
        user_id: str = payload.get("sub")
        token_type: str = payload.get("type")
        jti: str = payload.get("jti")

        if user_id is None or token_type != "access" or jti is None:
            raise credentials_exception

        if await is_token_blacklisted(jti):
            raise credentials_exception

    except JWTError:
        raise credentials_exception

    result = await db.execute(select(User).where(User.id == uuid.UUID(user_id)))
    user = result.scalar_one_or_none()

    if user is None or not user.is_active:
        raise credentials_exception

    return user


async def require_admin(
    current_user: Annotated[User, Depends(_get_current_user)],
) -> User:
    """Platform admin only."""
    if current_user.role != UserRole.admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required"
        )
    return current_user


async def require_owner_only(
    current_user: Annotated[User, Depends(_get_current_user)],
) -> User:
    """Business owner only — not admin staff."""
    if current_user.role not in (UserRole.business_owner, UserRole.admin):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Business owner access required"
        )
    return current_user


async def require_business_owner(
    current_user: Annotated[User, Depends(_get_current_user)],
) -> User:
    """Business owner OR admin staff — most business endpoints."""
    if current_user.role not in (UserRole.business_owner, UserRole.admin_staff, UserRole.admin):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Business access required"
        )
    return current_user


async def require_manager(
    current_user: Annotated[User, Depends(_get_current_user)],
) -> User:
    """Owner or admin staff — can manage staff and view analytics."""
    allowed = (UserRole.business_owner, UserRole.admin_staff, UserRole.admin)
    if current_user.role not in allowed:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Manager access required"
        )
    return current_user


async def require_staff_or_above(
    current_user: Annotated[User, Depends(_get_current_user)],
) -> User:
    """All business users — staff, admin staff, owner."""
    allowed = (UserRole.staff, UserRole.admin_staff, UserRole.business_owner, UserRole.admin)
    if current_user.role not in allowed:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Staff access required"
        )
    return current_user


async def require_active_business(
    current_user: Annotated[User, Depends(require_staff_or_above)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> tuple[User, Business]:
    if not current_user.business_id:
        raise HTTPException(status_code=400, detail="User is not linked to a business")

    result = await db.execute(
        select(Business).where(Business.id == current_user.business_id)
    )
    business = result.scalar_one_or_none()

    if not business or business.status != BusinessStatus.active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Business account is not active",
        )
    return current_user, business


# ── Typed Annotations ─────────────────────────────────────────────────────────
CurrentUser = Annotated[User, Depends(_get_current_user)]
AdminUser = Annotated[User, Depends(require_admin)]
OwnerOnly = Annotated[User, Depends(require_owner_only)]
BusinessOwner = Annotated[User, Depends(require_business_owner)]
ManagerUser = Annotated[User, Depends(require_manager)]
ActiveBusinessUser = Annotated[tuple[User, Business], Depends(require_active_business)]