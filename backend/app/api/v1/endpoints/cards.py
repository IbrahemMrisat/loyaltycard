"""
app/api/v1/endpoints/cards.py
------------------------------
Public endpoints for customers to view their card.
No JWT — authenticated via the signed QR token in the URL.
This is what the SMS link points to.
"""
from fastapi import APIRouter, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Annotated
from fastapi import Depends
import uuid

from app.core.security import verify_qr_token
from app.db.session import get_db
from app.models.all_models import Business, Customer, LoyaltyCard, Transaction
from app.schemas.all_schemas import LoyaltyCardResponse, TransactionResponse
from app.services.qr_service import build_card_url
from app.services.wallet_service import create_or_update_pass
from app.models.all_models import Business, Customer

router = APIRouter(prefix="/cards", tags=["cards"])


@router.get("/{qr_token}", response_model=LoyaltyCardResponse)
async def get_card_by_token(
    qr_token: str,
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """
    Public endpoint — no auth header needed.
    The signed token in the URL IS the credential.
    Called when customer opens their SMS link.
    """
    card_id_str = verify_qr_token(qr_token)
    if not card_id_str:
        raise HTTPException(status_code=404, detail="Card not found")

    import uuid
    try:
        card_id = uuid.UUID(card_id_str)
    except ValueError:
        raise HTTPException(status_code=404, detail="Card not found")

    result = await db.execute(select(LoyaltyCard).where(LoyaltyCard.id == card_id))
    card = result.scalar_one_or_none()
    if not card:
        raise HTTPException(status_code=404, detail="Card not found")

    business_result = await db.execute(select(Business).where(Business.id == card.business_id))
    business = business_result.scalar_one()

    return LoyaltyCardResponse(
        id=card.id,
        customer_id=card.customer_id,
        business_id=card.business_id,
        stamp_count=card.stamp_count,
        stamp_goal=business.stamp_goal,
        total_stamps_ever=card.total_stamps_ever,
        total_redeemed=card.total_redeemed,
        qr_url=build_card_url(card.id),
        reward_ready=card.stamp_count >= business.stamp_goal,
        business_name=business.name,
        business_logo_url=business.logo_url,
        reward_description=business.reward_description,
    )


@router.get("/{qr_token}/history", response_model=list[TransactionResponse])
async def get_card_history(
    qr_token: str,
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """Customer views their own stamp history."""
    card_id_str = verify_qr_token(qr_token)
    if not card_id_str:
        raise HTTPException(status_code=404, detail="Card not found")

    import uuid
    card_id = uuid.UUID(card_id_str)

    result = await db.execute(
        select(Transaction)
        .where(Transaction.card_id == card_id)
        .order_by(Transaction.created_at.desc())
        .limit(50)
    )
    return [TransactionResponse.model_validate(t) for t in result.scalars().all()]


@router.get("/{qr_token}/wallet")
async def get_wallet_pass(
    qr_token: str,
    db: Annotated[AsyncSession, Depends(get_db)],
    ):
    card_id_str = verify_qr_token(qr_token)
    if not card_id_str:
        raise HTTPException(status_code=404, detail="Card not found")

    card_id = uuid.UUID(card_id_str)

    result = await db.execute(select(LoyaltyCard).where(LoyaltyCard.id == card_id))
    card = result.scalar_one_or_none()
    if not card:
        raise HTTPException(status_code=404, detail="Card not found")

    business = await db.get(Business, card.business_id)
    customer = await db.get(Customer, card.customer_id)

    from app.services.qr_service import build_card_url
    from app.services.wallet_service import create_or_update_pass
    import traceback

    qr_url = build_card_url(card.id)

    try:
        wallet_url = await create_or_update_pass(
            card_id=str(card.id),
            customer_phone=customer.phone,
            customer_name=customer.name or customer.phone,
            business_id=str(business.id),
            business_name=business.name,
            logo_url=business.logo_url,
            stamp_count=card.stamp_count,
            stamp_goal=business.stamp_goal,
            reward_description=business.reward_description,
            qr_url=qr_url,
        )
        if not wallet_url:
            raise HTTPException(status_code=500, detail="wallet_url is None")
        return {"wallet_url": wallet_url}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error: {str(e)} | {traceback.format_exc()}"
        )