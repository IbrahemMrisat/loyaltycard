"""
app/models/all_models.py
------------------------
All ORM models in one file for clarity at MVP stage.
Split into separate files when the team grows.
"""
import uuid
import enum
from datetime import datetime

from sqlalchemy import (
    Boolean, Enum, ForeignKey, Integer, String, Text, UniqueConstraint
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin, UUIDMixin


# ── Enums ─────────────────────────────────────────────────────────────────────

class UserRole(str, enum.Enum):
    admin = "admin"
    business_owner = "business_owner"
    admin_staff = "admin_staff"      
    staff = "staff"


class BusinessStatus(str, enum.Enum):
    pending = "pending"         # awaiting admin approval
    active = "active"
    suspended = "suspended"


class TransactionType(str, enum.Enum):
    stamp = "stamp"
    redeem = "redeem"


class TransactionMethod(str, enum.Enum):
    qr_scan = "qr_scan"
    manual = "manual"           # reserved for future phone-based flow


class SmsStatus(str, enum.Enum):
    queued = "queued"
    sent = "sent"
    delivered = "delivered"
    failed = "failed"
    opted_out = "opted_out"


# ── Admin / Business Users ─────────────────────────────────────────────────────

class User(Base, UUIDMixin, TimestampMixin):
    """
    Platform users: admins and business owners/staff.
    Customers are NOT users — they're identified by phone number only.
    """
    __tablename__ = "users"

    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False, index=True)
    hashed_password: Mapped[str] = mapped_column(String(255), nullable=False)
    role: Mapped[UserRole] = mapped_column(Enum(UserRole), nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    # Only set for business_owner / staff roles
    business_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("businesses.id", ondelete="SET NULL"), nullable=True, index=True
    )

    business: Mapped["Business | None"] = relationship("Business", back_populates="users")


# ── Business ──────────────────────────────────────────────────────────────────

class Business(Base, UUIDMixin, TimestampMixin):
    """
    One row per SMB. Each has one loyalty program in MVP.
    """
    __tablename__ = "businesses"

    name: Mapped[str] = mapped_column(String(255), nullable=False)
    phone: Mapped[str] = mapped_column(String(20), nullable=False)
    email: Mapped[str] = mapped_column(String(255), nullable=False, unique=True)
    logo_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    category: Mapped[str] = mapped_column(String(50), default="other", nullable=False)
    status: Mapped[BusinessStatus] = mapped_column(
        Enum(BusinessStatus), default=BusinessStatus.pending, nullable=False, index=True
    )

    # Loyalty program config (flat in MVP — one program per business)
    stamp_goal: Mapped[int] = mapped_column(Integer, default=6, nullable=False)
    reward_description: Mapped[str] = mapped_column(String(500), nullable=False)

    users: Mapped[list["User"]] = relationship("User", back_populates="business")
    loyalty_cards: Mapped[list["LoyaltyCard"]] = relationship("LoyaltyCard", back_populates="business")


# ── Customer ──────────────────────────────────────────────────────────────────

class Customer(Base, UUIDMixin, TimestampMixin):
    """
    End users. Identified by phone number — no password, no login.
    """
    __tablename__ = "customers"

    phone: Mapped[str] = mapped_column(String(20), unique=True, nullable=False, index=True)
    name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    sms_opted_out: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    loyalty_cards: Mapped[list["LoyaltyCard"]] = relationship("LoyaltyCard", back_populates="customer")


# ── Loyalty Card ──────────────────────────────────────────────────────────────

class LoyaltyCard(Base, UUIDMixin, TimestampMixin):
    """
    One card per (customer, business) pair.
    The qr_token is a signed secret — scanned by business to add stamps.
    """
    __tablename__ = "loyalty_cards"
    __table_args__ = (
        UniqueConstraint("customer_id", "business_id", name="uq_card_customer_business"),
    )

    customer_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("customers.id", ondelete="CASCADE"), nullable=False, index=True
    )
    business_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("businesses.id", ondelete="CASCADE"), nullable=False, index=True
    )

    stamp_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    total_stamps_ever: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    total_redeemed: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

    # Signed token embedded in QR code URL
    qr_token: Mapped[str] = mapped_column(String(500), unique=True, nullable=False, index=True)

    customer: Mapped["Customer"] = relationship("Customer", back_populates="loyalty_cards")
    business: Mapped["Business"] = relationship("Business", back_populates="loyalty_cards")
    transactions: Mapped[list["Transaction"]] = relationship("Transaction", back_populates="card")


# ── Transaction ───────────────────────────────────────────────────────────────

class Transaction(Base, UUIDMixin, TimestampMixin):
    """
    Immutable audit log. Never update or delete rows here.
    This is the source of truth for analytics.
    """
    __tablename__ = "transactions"

    card_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("loyalty_cards.id", ondelete="CASCADE"), nullable=False, index=True
    )
    type: Mapped[TransactionType] = mapped_column(Enum(TransactionType), nullable=False)
    method: Mapped[TransactionMethod] = mapped_column(
        Enum(TransactionMethod), default=TransactionMethod.qr_scan, nullable=False
    )
    scanned_by_user_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    # Snapshot of stamp count AFTER this transaction (for history display)
    stamp_count_after: Mapped[int] = mapped_column(Integer, nullable=False)

    card: Mapped["LoyaltyCard"] = relationship("LoyaltyCard", back_populates="transactions")


# ── SMS Log ───────────────────────────────────────────────────────────────────

class SmsLog(Base, UUIDMixin, TimestampMixin):
    """
    Every outbound SMS recorded. Used for admin monitoring and Twilio
    webhook callbacks to update delivery status.
    """
    __tablename__ = "sms_logs"

    customer_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("customers.id", ondelete="CASCADE"), nullable=False, index=True
    )
    to_phone: Mapped[str] = mapped_column(String(20), nullable=False)
    message_body: Mapped[str] = mapped_column(Text, nullable=False)
    twilio_sid: Mapped[str | None] = mapped_column(String(64), nullable=True, unique=True)
    status: Mapped[SmsStatus] = mapped_column(
        Enum(SmsStatus), default=SmsStatus.queued, nullable=False
    )
