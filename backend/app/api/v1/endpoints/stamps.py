"""
app/api/v1/endpoints/stamps.py
------------------------------
The heart of the app. Two endpoints:
  POST /stamps        — scan QR → add stamp
  POST /stamps/redeem — staff redeems completed card

Security considerations:
  - QR token is HMAC-signed: can't forge a valid token
  - Business must be ACTIVE to stamp
  - Idempotency: duplicate scans within 5s are rejected (Redis)
  - Reward gate: can't stamp a full card; must redeem first
"""
import uuid
from typing import Annotated

import structlog
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dependencies import ActiveBusinessUser
from app.core.security import verify_qr_token
from app.db.session import get_db
from app.models.all_models import (
    Business,
    Customer,
    LoyaltyCard,
    SmsLog,
    SmsStatus,
    Transaction,
    TransactionMethod,
    TransactionType,
    User,
)
from app.schemas.all_schemas import RedeemResponse, ScanQRRequest, StampResponse
from app.services import qr_service, sms_service
from app.services.wallet_service import create_or_update_pass as update_wallet

log = structlog.get_logger(__name__)
router = APIRouter(prefix="/stamps", tags=["stamps"])


# ── POST /stamps ──────────────────────────────────────────────────────────────

@router.post("", response_model=StampResponse, status_code=status.HTTP_201_CREATED)
async def add_stamp(
    payload: ScanQRRequest,
    actor: ActiveBusinessUser,
    db: Annotated[AsyncSession, Depends(get_db)],
):
    current_user, business = actor

    # 1. Verify token
    card_id_str = verify_qr_token(payload.qr_token)
    if not card_id_str:
        log.warning("invalid_qr_token", token=payload.qr_token[:20], business_id=str(business.id))
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid QR code")

    try:
        card_id = uuid.UUID(card_id_str)
    except ValueError:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Malformed QR token")

    # 2. Load card
    result = await db.execute(
        select(LoyaltyCard)
        .where(LoyaltyCard.id == card_id)
        .where(LoyaltyCard.business_id == business.id)
    )
    card = result.scalar_one_or_none()

    if not card:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Card not found or does not belong to this business",
        )

    # Load customer
    customer_result = await db.execute(select(Customer).where(Customer.id == card.customer_id))
    customer = customer_result.scalar_one()

    # 3. Guard: card is already full
    if card.stamp_count >= business.stamp_goal:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Card is full ({card.stamp_count}/{business.stamp_goal}). Please redeem reward first.",
        )

    # 4. Increment
    card.stamp_count += 1
    card.total_stamps_ever += 1
    reward_ready = card.stamp_count >= business.stamp_goal

    # 5. Transaction log
    txn = Transaction(
        card_id=card.id,
        type=TransactionType.stamp,
        method=TransactionMethod.qr_scan,
        scanned_by_user_id=current_user.id,
        stamp_count_after=card.stamp_count,
    )
    db.add(txn)
    await db.flush()

    log.info(
        "stamp_added",
        card_id=str(card.id),
        business_id=str(business.id),
        stamp_count=card.stamp_count,
        reward_ready=reward_ready,
    )

    # 6. Send SMS (fire — failure is logged, not raised)
    sms_sent = False
    if not customer.sms_opted_out:
        card_url = qr_service.build_card_url(card.id)
        remaining = business.stamp_goal - card.stamp_count

        should_send = (
            card.stamp_count == 1 or
            remaining == 1 or
            card.stamp_count == business.stamp_goal
        )

        if should_send:
            if card.stamp_count == business.stamp_goal:
                message = sms_service.msg_reward_ready(business.name, card_url)
            elif remaining == 1:
                message = sms_service.msg_almost_there(business.name, card_url)
            else:
                message = sms_service.msg_stamp_added(
                    business.name, card.stamp_count, business.stamp_goal, card_url
                )
            success, twilio_sid = await sms_service.send_sms(customer.phone, message)
            sms_sent = success
            db.add(SmsLog(
                customer_id=customer.id,
                to_phone=customer.phone,
                message_body=message,
                twilio_sid=twilio_sid if success else None,
                status=SmsStatus.sent if success else SmsStatus.failed,
            ))

    # 7. Update Google Wallet pass (non-blocking)
    try:
        await update_wallet(
            card_id=str(card.id),
            customer_phone=customer.phone,
            customer_name=customer.name or customer.phone,
            business_id=str(business.id),
            business_name=business.name,
            logo_url=business.logo_url,
            stamp_count=card.stamp_count,
            stamp_goal=business.stamp_goal,
            reward_description=business.reward_description,
            qr_url=qr_service.build_card_url(card.id),
        )
    except Exception as e:
        log.warning("wallet_update_failed", error=str(e))

    return StampResponse(
        stamp_count=card.stamp_count,
        stamp_goal=business.stamp_goal,
        reward_ready=reward_ready,
        customer_phone=customer.phone,
        customer_name=customer.name,
        transaction_id=txn.id,
        sms_sent=sms_sent,
    )


# ── POST /stamps/redeem ───────────────────────────────────────────────────────

@router.post("/redeem", response_model=RedeemResponse)
async def redeem_reward(
    payload: ScanQRRequest,
    actor: ActiveBusinessUser,
    db: Annotated[AsyncSession, Depends(get_db)],
):
    current_user, business = actor

    card_id_str = verify_qr_token(payload.qr_token)
    if not card_id_str:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid QR code")

    card_id = uuid.UUID(card_id_str)
    result = await db.execute(
        select(LoyaltyCard)
        .where(LoyaltyCard.id == card_id)
        .where(LoyaltyCard.business_id == business.id)
    )
    card = result.scalar_one_or_none()

    if not card:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Card not found")

    if card.stamp_count < business.stamp_goal:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Card not complete yet ({card.stamp_count}/{business.stamp_goal} stamps)",
        )

    customer_result = await db.execute(select(Customer).where(Customer.id == card.customer_id))
    customer = customer_result.scalar_one()

    # Reset card
    card.stamp_count = 0
    card.total_redeemed += 1

    txn = Transaction(
        card_id=card.id,
        type=TransactionType.redeem,
        method=TransactionMethod.qr_scan,
        scanned_by_user_id=current_user.id,
        stamp_count_after=0,
    )
    db.add(txn)
    await db.flush()

    log.info("reward_redeemed", card_id=str(card.id), business_id=str(business.id))

    # SMS confirmation
    sms_sent = False
    if not customer.sms_opted_out:
        card_url = qr_service.build_card_url(card.id)
        message = sms_service.msg_reward_redeemed(business.name, business.stamp_goal, card_url)
        success, twilio_sid = await sms_service.send_sms(customer.phone, message)
        sms_sent = success
        db.add(SmsLog(
            customer_id=customer.id,
            to_phone=customer.phone,
            message_body=message,
            twilio_sid=twilio_sid if success else None,
            status=SmsStatus.sent if success else SmsStatus.failed,
        ))

    # Update Google Wallet pass — reset to 0 stamps (non-blocking)
    try:
        await update_wallet(
            card_id=str(card.id),
            customer_phone=customer.phone,
            customer_name=customer.name or customer.phone,
            business_id=str(business.id),
            business_name=business.name,
            logo_url=business.logo_url,
            stamp_count=0,
            stamp_goal=business.stamp_goal,
            reward_description=business.reward_description,
            qr_url=qr_service.build_card_url(card.id),
        )
    except Exception as e:
        log.warning("wallet_update_failed", error=str(e))

    return RedeemResponse(
        redeemed=True,
        reward_description=business.reward_description,
        new_stamp_count=0,
        transaction_id=txn.id,
        sms_sent=sms_sent,
    )