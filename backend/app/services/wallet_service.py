"""
app/services/wallet_service.py
-------------------------------
Google Wallet integration — creates and updates loyalty passes.
One loyalty CLASS per business (name, logo, bg color), one loyalty OBJECT per customer card.
"""
import json
import time
import traceback
import structlog
from google.oauth2 import service_account
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError

from app.core.config import settings

log = structlog.get_logger(__name__)

SCOPES = ["https://www.googleapis.com/auth/wallet_object.issuer"]

DEFAULT_LOGO = "https://via.placeholder.com/300x300.png"
DEFAULT_BG_COLOR = "#F97316"  # Orange fallback


def get_wallet_client():
    """Build authenticated Google Wallet API client."""
    credentials_info = json.loads(settings.GOOGLE_WALLET_CREDENTIALS)
    credentials = service_account.Credentials.from_service_account_info(
        credentials_info,
        scopes=SCOPES,
    )
    return build("walletobjects", "v1", credentials=credentials)


def _class_id(business_id: str) -> str:
    """Deterministic class ID for a given business."""
    safe = str(business_id).replace("-", "_")
    return f"{settings.GOOGLE_WALLET_ISSUER_ID}.business_{safe}"


def ensure_loyalty_class(
    client,
    business_id: str,
    business_name: str,
    logo_url: str | None = None,
    bg_color: str | None = None,
) -> str:
    """
    Create the loyalty class for this business if it doesn't exist.
    If it exists, patch updatable fields (logo, bg color) — but NOT reviewStatus.
    Returns the class ID.
    """
    class_id = _class_id(business_id)
    resolved_logo = logo_url or DEFAULT_LOGO
    resolved_bg = bg_color or DEFAULT_BG_COLOR

    insert_body = {
        "id": class_id,
        "issuerName": "Loyally",
        "reviewStatus": "underReview",
        "programName": business_name,
        "hexBackgroundColor": resolved_bg,
        "programLogo": {
            "sourceUri": {"uri": resolved_logo},
            "contentDescription": {
                "defaultValue": {
                    "language": "en-US",
                    "value": f"{business_name} Logo",
                }
            },
        },
    }

    # Patch body — reviewStatus is read-only via API, cannot be patched
    patch_body = {
        "reviewStatus": "approved",
        "programName": business_name,
        "hexBackgroundColor": resolved_bg,
        "programLogo": {
            "sourceUri": {"uri": resolved_logo},
            "contentDescription": {
                "defaultValue": {
                    "language": "en-US",
                    "value": f"{business_name} Logo",
                }
            },
        },
    }

    try:
        client.loyaltyclass().get(resourceId=class_id).execute()
        # Class exists — patch safe fields only (never include reviewStatus in patch)
        try:
            client.loyaltyclass().patch(resourceId=class_id, body=patch_body).execute()
            log.info("wallet_class_updated", class_id=class_id)
        except HttpError as patch_err:
            # Log but don't fail — card still works with old class fields
            log.warning("wallet_class_patch_failed", class_id=class_id, error=str(patch_err))
    except HttpError as e:
        if e.resp.status == 404:
            client.loyaltyclass().insert(body=insert_body).execute()
            log.info("wallet_class_created", class_id=class_id)
        else:
            raise
    return class_id


def _reward_ready_modules(reward_description: str, stamp_goal: int) -> list:
    """Text modules shown when the card is full and reward is claimable."""
    return [
        {
            "id": "reward",
            "header": "🎁 Reward Ready to Claim!",
            "body": reward_description,
        },
        {
            "id": "progress",
            "header": "Status",
            "body": f"You've collected all {stamp_goal} stamps — show this to the cashier!",
        },
    ]


def _in_progress_modules(reward_description: str, stamp_count: int, stamp_goal: int) -> list:
    """Text modules shown while the customer is collecting stamps."""
    remaining = stamp_goal - stamp_count
    return [
        {
            "id": "reward",
            "header": "Your Reward",
            "body": reward_description,
        },
        {
            "id": "progress",
            "header": "Progress",
            "body": (
                f"{stamp_count} of {stamp_goal} stamps collected — "
                f"{remaining} more to go!"
            ),
        },
    ]


def build_loyalty_object(
    card_id: str,
    customer_phone: str,
    customer_name: str,
    business_id: str,
    stamp_count: int,
    stamp_goal: int,
    reward_description: str,
    qr_url: str,
) -> dict:
    """Build a loyalty object for a specific customer card."""
    object_id = f"{settings.GOOGLE_WALLET_ISSUER_ID}.card_{card_id.replace('-', '_')}"
    class_id = _class_id(business_id)
    reward_ready = stamp_count >= stamp_goal

    return {
        "id": object_id,
        "classId": class_id,
        "accountId": customer_phone,
        "accountName": customer_name or customer_phone,
        "state": "active",
        "loyaltyPoints": {
            "balance": {"string": f"{stamp_count}/{stamp_goal}"},
            "label": "🎁 Reward Ready!" if reward_ready else "Stamps",
        },
        "barcode": {
            "type": "QR_CODE",
            "value": qr_url,
            "alternateText": "Show at counter",
        },
        "textModulesData": (
            _reward_ready_modules(reward_description, stamp_goal)
            if reward_ready
            else _in_progress_modules(reward_description, stamp_count, stamp_goal)
        ),
    }


def generate_wallet_jwt(loyalty_object: dict) -> str:
    """Generate a signed JWT for the Save to Wallet button."""
    import jwt as pyjwt

    credentials_info = json.loads(settings.GOOGLE_WALLET_CREDENTIALS)

    claims = {
        "iss": credentials_info["client_email"],
        "aud": "google",
        "origins": ["https://app.loyal-ly.com"],
        "iat": int(time.time()),
        "typ": "savetowallet",
        "payload": {
            "loyaltyObjects": [loyalty_object]
        },
    }

    return pyjwt.encode(
        claims,
        credentials_info["private_key"],
        algorithm="RS256",
    )


def expire_wallet_object(card_id: str) -> bool:
    """
    Expire an existing wallet object so it gets recreated fresh on next save.
    Useful after a class moves from underReview → approved to remove test watermark.
    Returns True if expired, False if not found.
    """
    client = get_wallet_client()
    object_id = f"{settings.GOOGLE_WALLET_ISSUER_ID}.card_{card_id.replace('-', '_')}"
    try:
        client.loyaltyobject().get(resourceId=object_id).execute()
        client.loyaltyobject().patch(
            resourceId=object_id,
            body={"state": "expired"},
        ).execute()
        log.info("wallet_object_expired", card_id=card_id)
        return True
    except HttpError as e:
        if e.resp.status == 404:
            return False
        raise


async def create_or_update_pass(
    card_id: str,
    customer_phone: str,
    customer_name: str,
    business_id: str,
    business_name: str,
    logo_url: str | None,
    bg_color: str | None = None,
    stamp_count: int = 0,
    stamp_goal: int = 10,
    reward_description: str = "",
    qr_url: str = "",
) -> str | None:
    """
    Creates a new pass or updates an existing one.
    Returns the 'Add to Wallet' JWT URL or None on failure.
    """
    try:
        client = get_wallet_client()

        # Ensure per-business class exists and is up to date (logo, bg color)
        ensure_loyalty_class(client, business_id, business_name, logo_url, bg_color)

        object_id = f"{settings.GOOGLE_WALLET_ISSUER_ID}.card_{card_id.replace('-', '_')}"
        reward_ready = stamp_count >= stamp_goal

        loyalty_object = build_loyalty_object(
            card_id=card_id,
            customer_phone=customer_phone,
            customer_name=customer_name,
            business_id=business_id,
            stamp_count=stamp_count,
            stamp_goal=stamp_goal,
            reward_description=reward_description,
            qr_url=qr_url,
        )

        patch_body = {
            "classId": _class_id(business_id),
            "loyaltyPoints": {
                "balance": {"string": f"{stamp_count}/{stamp_goal}"},
                "label": "🎁 Reward Ready!" if reward_ready else "Stamps",
            },
            "textModulesData": (
                _reward_ready_modules(reward_description, stamp_goal)
                if reward_ready
                else _in_progress_modules(reward_description, stamp_count, stamp_goal)
            ),
        }

        try:
            client.loyaltyobject().get(resourceId=object_id).execute()
            client.loyaltyobject().patch(
                resourceId=object_id,
                body=patch_body,
            ).execute()
            log.info("wallet_pass_updated", card_id=card_id, reward_ready=reward_ready)
        except HttpError as e:
            if e.resp.status == 404:
                client.loyaltyobject().insert(body=loyalty_object).execute()
                log.info("wallet_pass_created", card_id=card_id)
            else:
                raise Exception(f"HttpError {e.resp.status}: {e.content}")

        wallet_jwt = generate_wallet_jwt(loyalty_object)
        return f"https://pay.google.com/gp/v/save/{wallet_jwt}"

    except Exception as e:
        raise Exception(f"Wallet service error: {str(e)} | {traceback.format_exc()}")