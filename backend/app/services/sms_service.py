"""
app/services/sms_service.py
---------------------------
All Twilio interactions isolated here.
Never call Twilio directly from endpoints or other services.
Toggle TWILIO_ENABLED in .env to switch between mock and real SMS.
"""
import structlog
from app.core.config import settings

log = structlog.get_logger(__name__)

_client = None


def get_twilio_client():
    global _client
    if _client is None:
        from twilio.rest import Client
        _client = Client(settings.TWILIO_ACCOUNT_SID, settings.TWILIO_AUTH_TOKEN)
    return _client


async def send_sms(to_phone: str, message: str) -> tuple[bool, str | None]:
    if not settings.is_production:
        import uuid
        mock_sid = f"mock-{uuid.uuid4().hex[:8]}"
        print(f"\n📱 SMS TO {to_phone}:\n{message}\n")
        log.info("sms_mock", to=to_phone)
        return True, mock_sid

    # Real Twilio
    try:
        from twilio.base.exceptions import TwilioRestException
        client = get_twilio_client()
        msg = client.messages.create(
            body=message,
            from_=settings.TWILIO_PHONE_NUMBER,
            to=to_phone,
        )
        log.info("sms_sent", to=to_phone, sid=msg.sid)
        return True, msg.sid
    except Exception as e:
        log.error("sms_failed", to=to_phone, error=str(e))
        return False, str(e)


# ── Message Templates ────────────────────────────────────────────────────────

def msg_welcome(business_name: str, stamp_goal: int, card_url: str) -> str:
    return (
        f"👋 Welcome to {business_name}'s loyalty program!\n"
        f"You've earned your 1st stamp. Collect {stamp_goal} for a free reward.\n"
        f"Your card: {card_url}"
    )


def msg_welcome_back(business_name: str, stamp_goal: int, card_url: str) -> str:
    return (
        f"👋 Welcome back to {business_name}!\n"
        f"Your new loyalty card is ready. Collect {stamp_goal} stamps for a free reward.\n"
        f"Your card: {card_url}"
    )


def msg_stamp_added(
    business_name: str,
    current: int,
    goal: int,
    card_url: str,
) -> str:
    remaining = goal - current
    if remaining > 0:
        return (
            f"☕ {current}/{goal} stamps at {business_name}!\n"
            f"{remaining} more until your free reward.\n"
            f"View card: {card_url}"
        )
    return msg_reward_ready(business_name, card_url)


def msg_reward_ready(business_name: str, card_url: str) -> str:
    return (
        f"🎉 You've completed your {business_name} loyalty card!\n"
        f"Show your card at the counter to claim your free reward.\n"
        f"Card: {card_url}"
    )


def msg_reward_redeemed(business_name: str, stamp_goal: int, card_url: str) -> str:
    return (
        f"✅ Reward redeemed at {business_name}! Enjoy!\n"
        f"A new card has started — collect {stamp_goal} stamps for your next reward.\n"
        f"New card: {card_url}"
    )