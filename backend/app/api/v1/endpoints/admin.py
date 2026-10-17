"""
app/api/v1/endpoints/admin.py
------------------------------
Platform admin operations. All routes require admin role.
"""
import uuid
from typing import Annotated

import structlog
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dependencies import AdminUser
from app.db.session import get_db
from app.models.all_models import Business, BusinessStatus, Customer, LoyaltyCard, SmsLog, User
from app.schemas.all_schemas import (
    BusinessAnalytics,
    BusinessResponse,
    BusinessStatusUpdate,
    OKResponse,
    PlatformAnalytics,
)

log = structlog.get_logger(__name__)
router = APIRouter(prefix="/admin", tags=["admin"])


# ── GET /admin/businesses ─────────────────────────────────────────────────────

@router.get("/businesses", response_model=list[BusinessResponse])
async def list_businesses(
    admin: AdminUser,
    db: Annotated[AsyncSession, Depends(get_db)],
    status_filter: str | None = None,
    skip: int = 0,
    limit: int = 100,
):
    query = select(Business)
    if status_filter:
        try:
            query = query.where(Business.status == BusinessStatus(status_filter))
        except ValueError:
            raise HTTPException(status_code=400, detail=f"Invalid status: {status_filter}")

    result = await db.execute(
        query.order_by(Business.created_at.desc()).offset(skip).limit(limit)
    )
    return [BusinessResponse.model_validate(b) for b in result.scalars().all()]


# ── PATCH /admin/businesses/{id}/status ──────────────────────────────────────

@router.patch("/businesses/{business_id}/status", response_model=BusinessResponse)
async def update_business_status(
    business_id: str,
    payload: BusinessStatusUpdate,
    admin: AdminUser,
    db: Annotated[AsyncSession, Depends(get_db)],
):
    try:
        bid = uuid.UUID(business_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid business ID")

    result = await db.execute(select(Business).where(Business.id == bid))
    business = result.scalar_one_or_none()

    if not business:
        raise HTTPException(status_code=404, detail="Business not found")

    old_status = business.status
    business.status = BusinessStatus(payload.status)

    log.info(
        "business_status_changed",
        business_id=str(bid),
        old=old_status.value,
        new=payload.status,
        by_admin=str(admin.id),
    )
    return BusinessResponse.model_validate(business)


# ── GET /admin/businesses/{id}/analytics ─────────────────────────────────────

@router.get("/businesses/{business_id}/analytics", response_model=BusinessAnalytics)
async def get_business_analytics(
    business_id: str,
    admin: AdminUser,
    db: Annotated[AsyncSession, Depends(get_db)],
):
    try:
        bid = uuid.UUID(business_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid business ID")

    business = await db.scalar(select(Business).where(Business.id == bid))
    if not business:
        raise HTTPException(status_code=404, detail="Business not found")

    total_customers = await db.scalar(
        select(func.count()).select_from(LoyaltyCard).where(LoyaltyCard.business_id == bid)
    )
    total_stamps = await db.scalar(
        select(func.sum(LoyaltyCard.total_stamps_ever)).where(LoyaltyCard.business_id == bid)
    )
    total_redeemed = await db.scalar(
        select(func.sum(LoyaltyCard.total_redeemed)).where(LoyaltyCard.business_id == bid)
    )

    return BusinessAnalytics(
        business_id=bid,
        total_customers=total_customers or 0,
        total_stamps_issued=int(total_stamps or 0),
        total_redemptions=int(total_redeemed or 0),
        stamps_this_week=0,
        stamps_this_month=0,
        new_customers_this_month=0,
    )


# ── GET /admin/analytics ──────────────────────────────────────────────────────

@router.get("/analytics", response_model=PlatformAnalytics)
async def platform_analytics(
    admin: AdminUser,
    db: Annotated[AsyncSession, Depends(get_db)],
):
    total_businesses = await db.scalar(select(func.count()).select_from(Business))
    active_businesses = await db.scalar(
        select(func.count()).select_from(Business).where(Business.status == BusinessStatus.active)
    )
    total_customers = await db.scalar(select(func.count()).select_from(Customer))
    total_stamps = await db.scalar(
        select(func.sum(LoyaltyCard.total_stamps_ever)).select_from(LoyaltyCard)
    )
    total_redeemed = await db.scalar(
        select(func.sum(LoyaltyCard.total_redeemed)).select_from(LoyaltyCard)
    )
    total_sms = await db.scalar(select(func.count()).select_from(SmsLog))

    return PlatformAnalytics(
        total_businesses=total_businesses or 0,
        active_businesses=active_businesses or 0,
        total_customers=total_customers or 0,
        total_stamps_issued=int(total_stamps or 0),
        total_redemptions=int(total_redeemed or 0),
        total_sms_sent=total_sms or 0,
    )


# ── GET /admin/sms-logs ───────────────────────────────────────────────────────

@router.get("/sms-logs")
async def list_sms_logs(
    admin: AdminUser,
    db: Annotated[AsyncSession, Depends(get_db)],
    skip: int = 0,
    limit: int = 100,
):
    result = await db.execute(
        select(SmsLog).order_by(SmsLog.created_at.desc()).offset(skip).limit(limit)
    )
    logs = result.scalars().all()
    return [
        {
            "id": str(l.id),
            "to_phone": l.to_phone,
            "status": l.status.value,
            "twilio_sid": l.twilio_sid,
            "created_at": l.created_at.isoformat(),
        }
        for l in logs
    ]