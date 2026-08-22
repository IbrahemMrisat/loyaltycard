"""
app/schemas/all_schemas.py
--------------------------
Pydantic v2 schemas — strict separation between API contracts and ORM models.
Never return ORM objects directly from endpoints.
"""
import uuid
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, EmailStr, Field, field_validator
import re


# ── Shared ────────────────────────────────────────────────────────────────────

class OKResponse(BaseModel):
    ok: bool = True
    message: str = "success"


# ── Auth ──────────────────────────────────────────────────────────────────────

class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8)


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    role: str


class RefreshRequest(BaseModel):
    refresh_token: str


# ── Business ──────────────────────────────────────────────────────────────────

class BusinessCreate(BaseModel):
    name: str = Field(min_length=2, max_length=255)
    phone: str = Field(min_length=7, max_length=20)
    email: EmailStr
    stamp_goal: int = Field(default=6, ge=2, le=50)
    reward_description: str = Field(min_length=5, max_length=500)
    owner_password: str = Field(min_length=8)
    category: str = Field(default="other", max_length=50)

    @field_validator("phone")
    @classmethod
    def validate_phone(cls, v: str) -> str:
        cleaned = re.sub(r"[\s\-\(\)]", "", v)
        if not re.match(r"^\+?[1-9]\d{6,14}$", cleaned):
            raise ValueError("Invalid phone number format")
        return cleaned


class BusinessUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=2, max_length=255)
    phone: Optional[str] = None
    stamp_goal: Optional[int] = Field(None, ge=2, le=50)
    reward_description: Optional[str] = Field(None, min_length=5, max_length=500)
    logo_url: Optional[str] = None
    category: Optional[str] = Field(None, max_length=50)


class BusinessResponse(BaseModel):
    id: uuid.UUID
    name: str
    phone: str
    email: str
    logo_url: Optional[str]
    status: str
    stamp_goal: int
    reward_description: str
    category: str
    created_at: datetime

    model_config = {"from_attributes": True}


class BusinessStatusUpdate(BaseModel):
    status: str = Field(pattern="^(active|suspended|pending)$")


# ── Customer ──────────────────────────────────────────────────────────────────

class CustomerCreate(BaseModel):
    phone: str = Field(min_length=7, max_length=20)
    name: Optional[str] = Field(None, max_length=255)

    @field_validator("phone")
    @classmethod
    def validate_phone(cls, v: str) -> str:
        cleaned = re.sub(r"[\s\-\(\)]", "", v)
        if not re.match(r"^\+?[1-9]\d{6,14}$", cleaned):
            raise ValueError("Invalid phone number format")
        return cleaned


class CustomerResponse(BaseModel):
    id: uuid.UUID
    phone: str
    name: Optional[str]
    sms_opted_out: bool
    created_at: datetime

    model_config = {"from_attributes": True}


# ── Loyalty Card ──────────────────────────────────────────────────────────────

class LoyaltyCardResponse(BaseModel):
    id: uuid.UUID
    customer_id: uuid.UUID
    business_id: uuid.UUID
    stamp_count: int
    stamp_goal: int
    total_stamps_ever: int
    total_redeemed: int
    qr_url: str
    reward_ready: bool
    business_name: str
    business_logo_url: Optional[str]
    reward_description: str
    customer_phone: Optional[str] = None
    customer_name: Optional[str] = None
    category: str = "other"

    model_config = {"from_attributes": True}


# ── Stamp (the core action) ───────────────────────────────────────────────────

class ScanQRRequest(BaseModel):
    """
    Posted by business app after scanning customer QR.
    qr_token is extracted from the QR code URL.
    """
    qr_token: str = Field(min_length=10)


class StampResponse(BaseModel):
    stamp_count: int
    stamp_goal: int
    reward_ready: bool
    customer_phone: str             # so staff can confirm they got right customer
    customer_name: Optional[str]
    transaction_id: uuid.UUID
    sms_sent: bool


class RedeemResponse(BaseModel):
    redeemed: bool
    reward_description: str
    new_stamp_count: int
    transaction_id: uuid.UUID
    sms_sent: bool


# ── Transaction History ───────────────────────────────────────────────────────

class TransactionResponse(BaseModel):
    id: uuid.UUID
    type: str
    method: str
    stamp_count_after: int
    created_at: datetime

    model_config = {"from_attributes": True}


# ── Analytics ─────────────────────────────────────────────────────────────────

class BusinessAnalytics(BaseModel):
    business_id: uuid.UUID
    total_customers: int
    total_stamps_issued: int
    total_redemptions: int
    stamps_this_week: int
    stamps_this_month: int
    new_customers_this_month: int


class PlatformAnalytics(BaseModel):
    total_businesses: int
    active_businesses: int
    total_customers: int
    total_stamps_issued: int
    total_redemptions: int
    total_sms_sent: int


# ── Staff ─────────────────────────────────────────────────────────────────────

class StaffCreate(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8)
    is_admin: bool = False              # ← new, default False


class StaffResponse(BaseModel):
    id: uuid.UUID
    email: str
    role: str
    is_active: bool
    created_at: datetime

    model_config = {"from_attributes": True}
