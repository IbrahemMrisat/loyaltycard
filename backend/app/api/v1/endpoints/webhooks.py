"""
app/api/v1/endpoints/webhooks.py
---------------------------------
Twilio webhooks — delivery status updates and STOP opt-out handling.
These endpoints are called by Twilio servers, not our app.
"""
from typing import Annotated

import structlog
from fastapi import APIRouter, Depends, Form, HTTPException, Request, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from twilio.request_validator import RequestValidator

from app.core.config import settings
from app.db.session import get_db
from app.models.all_models import Customer, SmsLog, SmsStatus

log = structlog.get_logger(__name__)
router = APIRouter(prefix="/webhooks", tags=["webhooks"])


def _validate_twilio_signature(request: Request, body: dict) -> bool:
    """
    Twilio signs every webhook with HMAC-SHA1.
    ALWAYS validate this — otherwise anyone can hit your webhook and
    mark customers as opted out.
    """
    validator = RequestValidator(settings.TWILIO_AUTH_TOKEN)
    signature = request.headers.get("X-Twilio-Signature", "")
    url = str(request.url)
    return validator.validate(url, body, signature)


@router.post("/twilio/status")
async def sms_status_callback(
    request: Request,
    db: Annotated[AsyncSession, Depends(get_db)],
    MessageSid: str = Form(...),
    MessageStatus: str = Form(...),
):
    """
    Twilio calls this when delivery status changes (sent → delivered | failed).
    Set this URL in your Twilio console as the Status Callback URL.
    """
    form_data = dict(await request.form())
    if not _validate_twilio_signature(request, form_data):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Invalid Twilio signature")

    status_map = {
        "delivered": SmsStatus.delivered,
        "failed": SmsStatus.failed,
        "undelivered": SmsStatus.failed,
        "sent": SmsStatus.sent,
    }
    new_status = status_map.get(MessageStatus.lower())

    if new_status:
        result = await db.execute(select(SmsLog).where(SmsLog.twilio_sid == MessageSid))
        sms_log = result.scalar_one_or_none()
        if sms_log:
            sms_log.status = new_status
            log.info("sms_status_updated", sid=MessageSid, status=MessageStatus)

    return {"ok": True}


@router.post("/twilio/inbound")
async def sms_inbound(
    request: Request,
    db: Annotated[AsyncSession, Depends(get_db)],
    From: str = Form(...),
    Body: str = Form(...),
):
    """
    Handles inbound SMS. Primarily for STOP / UNSTOP opt-out.
    Twilio auto-handles STOP at the carrier level, but we mirror it
    in our DB so we don't attempt to send to opted-out customers.
    """
    form_data = dict(await request.form())
    if not _validate_twilio_signature(request, form_data):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Invalid Twilio signature")

    keyword = Body.strip().upper()
    result = await db.execute(select(Customer).where(Customer.phone == From))
    customer = result.scalar_one_or_none()

    if customer:
        if keyword in ("STOP", "STOPALL", "UNSUBSCRIBE", "CANCEL", "END", "QUIT"):
            customer.sms_opted_out = True
            log.info("customer_opted_out", phone=From)
        elif keyword in ("START", "UNSTOP", "YES"):
            customer.sms_opted_out = False
            log.info("customer_opted_in", phone=From)

    # Return empty TwiML — no reply needed (Twilio handles STOP replies)
    return {"ok": True}
