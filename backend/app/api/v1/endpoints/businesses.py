"""
app/api/v1/endpoints/businesses.py
-----------------------------------
Business self-service + customer enrollment.
"""
import uuid
from typing import Annotated

import structlog
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dependencies import BusinessOwner, CurrentUser, ManagerUser, OwnerOnly
from app.core.security import hash_password, sign_qr_token
from app.db.session import get_db
from app.models.all_models import (
    Business,
    BusinessStatus,
    Customer,
    LoyaltyCard,
    SmsLog,
    SmsStatus,
    Transaction,
    TransactionType,
    TransactionMethod,
    User,
    UserRole,
)
from app.schemas.all_schemas import (
    BusinessResponse,
    BusinessUpdate,
    BusinessCreate,
    BusinessAnalytics,
    CustomerCreate,
    CustomerResponse,
    LoyaltyCardResponse,
    OKResponse,
    StaffCreate,
    StaffResponse,
    TransactionResponse,
)
from app.services import qr_service, sms_service

log = structlog.get_logger(__name__)
router = APIRouter(prefix="/businesses", tags=["businesses"])


@router.post("", response_model=BusinessResponse, status_code=status.HTTP_201_CREATED)
async def register_business(
    payload: BusinessCreate,
    db: Annotated[AsyncSession, Depends(get_db)],
):
    existing = await db.execute(select(Business).where(Business.email == payload.email))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email already registered")

    business = Business(
        name=payload.name,
        phone=payload.phone,
        email=payload.email,
        stamp_goal=payload.stamp_goal,
        reward_description=payload.reward_description,
        status=BusinessStatus.pending,
    )
    db.add(business)
    await db.flush()

    owner = User(
        email=payload.email,
        hashed_password=hash_password(payload.owner_password),
        role=UserRole.business_owner,
        business_id=business.id,
    )
    db.add(owner)

    log.info("business_registered", business_id=str(business.id), name=business.name)
    return BusinessResponse.model_validate(business)


@router.get("/me", response_model=BusinessResponse)
async def get_my_business(
    current_user: BusinessOwner,
    db: Annotated[AsyncSession, Depends(get_db)],
):
    result = await db.execute(select(Business).where(Business.id == current_user.business_id))
    business = result.scalar_one_or_none()
    if not business:
        raise HTTPException(status_code=404, detail="Business not found")
    return BusinessResponse.model_validate(business)


@router.patch("/me", response_model=BusinessResponse)
async def update_my_business(
    payload: BusinessUpdate,
    current_user: OwnerOnly,
    db: Annotated[AsyncSession, Depends(get_db)],
):
    result = await db.execute(select(Business).where(Business.id == current_user.business_id))
    business = result.scalar_one_or_none()
    if not business:
        raise HTTPException(status_code=404, detail="Business not found")

    update_data = payload.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(business, field, value)

    return BusinessResponse.model_validate(business)


@router.post("/me/customers", response_model=LoyaltyCardResponse, status_code=201)
async def enroll_customer(
    payload: CustomerCreate,
    current_user: BusinessOwner,
    db: Annotated[AsyncSession, Depends(get_db)],
):
    business_result = await db.execute(
        select(Business).where(Business.id == current_user.business_id)
    )
    business = business_result.scalar_one()

    cust_result = await db.execute(
        select(Customer).where(Customer.phone == payload.phone)
    )
    customer = cust_result.scalar_one_or_none()

    if not customer:
        customer = Customer(phone=payload.phone, name=payload.name)
        db.add(customer)
        await db.flush()

    card_result = await db.execute(
        select(LoyaltyCard)
        .where(LoyaltyCard.customer_id == customer.id)
        .where(LoyaltyCard.business_id == business.id)
    )
    card = card_result.scalar_one_or_none()

    if card:
        return _build_card_response(card, business, customer)

    card = LoyaltyCard(
        customer_id=customer.id,
        business_id=business.id,
        stamp_count=0,
        qr_token=sign_qr_token(str(uuid.uuid4())),
    )
    db.add(card)
    await db.flush()
    card.qr_token = sign_qr_token(str(card.id))

    if not customer.sms_opted_out:
        card_url = qr_service.build_card_url(card.id)
        message = sms_service.msg_welcome(business.name, business.stamp_goal, card_url)
        success, sid = await sms_service.send_sms(customer.phone, message)
        db.add(SmsLog(
            customer_id=customer.id,
            to_phone=customer.phone,
            message_body=message,
            twilio_sid=sid if success else None,
            status=SmsStatus.sent if success else SmsStatus.failed,
        ))

    log.info("customer_enrolled", card_id=str(card.id), business_id=str(business.id))
    return _build_card_response(card, business, customer)


@router.get("/me/customers", response_model=list[LoyaltyCardResponse])
async def list_customers(
    current_user: BusinessOwner,
    db: Annotated[AsyncSession, Depends(get_db)],
    skip: int = 0,
    limit: int = 50,
):
    business_result = await db.execute(
        select(Business).where(Business.id == current_user.business_id)
    )
    business = business_result.scalar_one()

    result = await db.execute(
        select(LoyaltyCard)
        .where(LoyaltyCard.business_id == business.id)
        .order_by(LoyaltyCard.created_at.desc())
        .offset(skip)
        .limit(limit)
    )
    cards = result.scalars().all()

    enriched = []
    for card in cards:
        customer = await db.get(Customer, card.customer_id)
        enriched.append((card, customer))

    return [_build_card_response(card, business, customer) for card, customer in enriched]


@router.get("/me/analytics", response_model=BusinessAnalytics)
async def get_analytics(
    current_user: BusinessOwner,
    db: Annotated[AsyncSession, Depends(get_db)],
):
    bid = current_user.business_id

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
        total_stamps_issued=total_stamps or 0,
        total_redemptions=total_redeemed or 0,
        stamps_this_week=0,
        stamps_this_month=0,
        new_customers_this_month=0,
    )

@router.post("/me/staff", response_model=StaffResponse, status_code=201)
async def add_staff(
    payload: StaffCreate,
    current_user: ManagerUser,          # ← was BusinessOwner
    db: Annotated[AsyncSession, Depends(get_db)],
):
    existing = await db.scalar(select(User).where(User.email == payload.email))
    if existing:
        raise HTTPException(status_code=409, detail="Email already in use")

    # Admin staff can only create regular staff — not other admins
    if current_user.role == UserRole.admin_staff and payload.is_admin:
        raise HTTPException(
            status_code=403,
            detail="Admin staff cannot create other admin staff"
        )

    role = UserRole.admin_staff if payload.is_admin else UserRole.staff

    staff = User(
        email=payload.email,
        hashed_password=hash_password(payload.password),
        role=role,
        business_id=current_user.business_id,
    )
    db.add(staff)
    await db.flush()
    return StaffResponse.model_validate(staff)


@router.get("/me/staff", response_model=list[StaffResponse])
async def list_staff(
    current_user: ManagerUser,          # ← was BusinessOwner
    db: Annotated[AsyncSession, Depends(get_db)],
):
    result = await db.execute(
        select(User)
        .where(User.business_id == current_user.business_id)
        .where(User.role.in_([UserRole.staff, UserRole.admin_staff]))
        .order_by(User.created_at.desc())
    )
    return [StaffResponse.model_validate(u) for u in result.scalars().all()]


@router.delete("/me/staff/{user_id}", response_model=OKResponse)
async def deactivate_staff(
    user_id: uuid.UUID,
    current_user: ManagerUser,          # ← was BusinessOwner
    db: Annotated[AsyncSession, Depends(get_db)],
):
    result = await db.execute(
        select(User)
        .where(User.id == user_id)
        .where(User.business_id == current_user.business_id)
        .where(User.role.in_([UserRole.staff, UserRole.admin_staff]))
    )
    staff = result.scalar_one_or_none()
    if not staff:
        raise HTTPException(status_code=404, detail="Staff member not found")

    # Admin staff can't deactivate other admin staff
    if current_user.role == UserRole.admin_staff and staff.role == UserRole.admin_staff:
        raise HTTPException(
            status_code=403,
            detail="Admin staff cannot deactivate other admin staff"
        )

    staff.is_active = False
    log.info("staff_deactivated", user_id=str(user_id), by=str(current_user.id))
    return OKResponse(message="Staff member deactivated")

@router.patch("/me/staff/{user_id}/reactivate", response_model=StaffResponse)
async def reactivate_staff(
    user_id: uuid.UUID,
    current_user: ManagerUser,
    db: Annotated[AsyncSession, Depends(get_db)],
):
    result = await db.execute(
        select(User)
        .where(User.id == user_id)
        .where(User.business_id == current_user.business_id)
        .where(User.role.in_([UserRole.staff, UserRole.admin_staff]))
    )
    staff = result.scalar_one_or_none()
    if not staff:
        raise HTTPException(status_code=404, detail="Staff member not found")

    if staff.is_active:
        raise HTTPException(status_code=409, detail="Staff member is already active")

    # Only owner can reactivate admin staff
    if staff.role == UserRole.admin_staff and current_user.role != UserRole.business_owner:
        raise HTTPException(status_code=403, detail="Only the business owner can reactivate admin staff")

    staff.is_active = True
    log.info("staff_reactivated", user_id=str(user_id), by=str(current_user.id))
    return StaffResponse.model_validate(staff)

@router.patch("/me/staff/{user_id}/toggle-admin", response_model=StaffResponse)
async def toggle_admin(
    user_id: uuid.UUID,
    current_user: ManagerUser,
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """Promote regular staff to admin_staff or demote back."""
    result = await db.execute(
        select(User)
        .where(User.id == user_id)
        .where(User.business_id == current_user.business_id)
        .where(User.role.in_([UserRole.staff, UserRole.admin_staff]))
    )
    staff = result.scalar_one_or_none()
    if not staff:
        raise HTTPException(status_code=404, detail="Staff member not found")

    # Only owner can promote/demote admin staff
    if staff.role == UserRole.admin_staff and current_user.role != UserRole.business_owner:
        raise HTTPException(
            status_code=403,
            detail="Only the business owner can demote admin staff"
        )

    staff.role = UserRole.staff if staff.role == UserRole.admin_staff else UserRole.admin_staff
    log.info("staff_role_toggled", user_id=str(user_id), new_role=staff.role, by=str(current_user.id))
    return StaffResponse.model_validate(staff)

@router.get("/me/customers/{card_id}/history", response_model=list[TransactionResponse])
async def get_card_history(
    card_id: uuid.UUID,
    current_user: BusinessOwner,
    db: Annotated[AsyncSession, Depends(get_db)],
):
    card = await db.scalar(
        select(LoyaltyCard)
        .where(LoyaltyCard.id == card_id)
        .where(LoyaltyCard.business_id == current_user.business_id)
    )
    if not card:
        raise HTTPException(status_code=404, detail="Card not found")

    result = await db.execute(
        select(Transaction)
        .where(Transaction.card_id == card_id)
        .order_by(Transaction.created_at.desc())
        .limit(100)
    )
    return [TransactionResponse.model_validate(t) for t in result.scalars().all()]

@router.post("/{business_id}/enroll", response_model=LoyaltyCardResponse, status_code=201)
async def public_enroll(
    business_id: uuid.UUID,
    payload: CustomerCreate,
    db: Annotated[AsyncSession, Depends(get_db)],
):
    # 1. Find business — must be active
    business_result = await db.execute(
        select(Business)
        .where(Business.id == business_id)
        .where(Business.status == BusinessStatus.active)
    )
    business = business_result.scalar_one_or_none()
    if not business:
        raise HTTPException(status_code=404, detail="Business not found")

    # 2. Find or create customer — track if they're new
    cust_result = await db.execute(
        select(Customer).where(Customer.phone == payload.phone)
    )
    customer = cust_result.scalar_one_or_none()
    is_new_customer = customer is None

    if not customer:
        customer = Customer(phone=payload.phone, name=payload.name)
        db.add(customer)
        await db.flush()

    # 3. Check if already enrolled at this business
    card_result = await db.execute(
        select(LoyaltyCard)
        .where(LoyaltyCard.customer_id == customer.id)
        .where(LoyaltyCard.business_id == business.id)
    )
    existing_card = card_result.scalar_one_or_none()

    # 4. Returning customer — already has a card here
    is_returning = not is_new_customer and existing_card is not None
    if existing_card:
        return _build_card_response(existing_card, business, customer)

    # 5. Create new card
    card = LoyaltyCard(
        customer_id=customer.id,
        business_id=business.id,
        stamp_count=0,
        qr_token=sign_qr_token(str(uuid.uuid4())),
    )
    db.add(card)
    await db.flush()
    card.qr_token = sign_qr_token(str(card.id))

    # 6. Send SMS — welcome vs welcome back
    if not customer.sms_opted_out:
        card_url = qr_service.build_card_url(card.id)
        if is_returning:
            message = sms_service.msg_welcome_back(
                business.name, business.stamp_goal, card_url
            )
        else:
            message = sms_service.msg_welcome(
                business.name, business.stamp_goal, card_url
            )
        success, sid = await sms_service.send_sms(customer.phone, message)
        db.add(SmsLog(
            customer_id=customer.id,
            to_phone=customer.phone,
            message_body=message,
            twilio_sid=sid if success else None,
            status=SmsStatus.sent if success else SmsStatus.failed,
        ))

    log.info("customer_self_enrolled", card_id=str(card.id), business_id=str(business.id))
    return _build_card_response(card, business, customer)

@router.get("/{business_id}/enroll", response_model=BusinessResponse)
async def get_business_public(
    business_id: uuid.UUID,
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """
    Public endpoint — returns business info for the enrollment page.
    No auth needed.
    """
    result = await db.execute(
        select(Business)
        .where(Business.id == business_id)
        .where(Business.status == BusinessStatus.active)
    )
    business = result.scalar_one_or_none()
    if not business:
        raise HTTPException(status_code=404, detail="Business not found")
    return BusinessResponse.model_validate(business)

def _build_card_response(
    card: LoyaltyCard,
    business: Business,
    customer: Customer | None = None,
) -> LoyaltyCardResponse:
    return LoyaltyCardResponse(
        id=card.id,
        customer_id=card.customer_id,
        business_id=card.business_id,
        stamp_count=card.stamp_count,
        stamp_goal=business.stamp_goal,
        total_stamps_ever=card.total_stamps_ever,
        total_redeemed=card.total_redeemed,
        qr_url=qr_service.build_card_url(card.id),
        reward_ready=card.stamp_count >= business.stamp_goal,
        business_name=business.name,
        business_logo_url=business.logo_url,
        reward_description=business.reward_description,
        customer_phone=customer.phone if customer else None,
        customer_name=customer.name if customer else None,
        category=business.category,
    )