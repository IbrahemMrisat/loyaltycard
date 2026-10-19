"""
app/services/wallet_service.py
-------------------------------
Google Wallet integration — creates and updates loyalty passes.
One loyalty CLASS per business, one loyalty OBJECT per customer card.
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
) -> str:
    """
    Create or update the loyalty class for this business.
    Returns the class ID.
    """
    class_id = _class_id(business_id)
    loyalty_class = {
        "id": class_id,
        "issuerName": "Loyally",
        "reviewStatus": "underReview",
        "programName": business_name,
        "programLogo": {
            "sourceUri": {
                "uri": logo_url or DEFAULT_LOGO,
            },
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
        # Class exists — skip patch to avoid reviewStatus conflicts with Google
        pass
        log.info("wallet_class_updated", class_id=class_id)
    except HttpError as e:
        if e.resp.status == 404:
            client.loyaltyclass().insert(body=loyalty_class).execute()
            log.info("wallet_class_created", class_id=class_id)
        else:
            raise
    return class_id


def build_loyalty_object(
    card_id: str,
    customer_phone: str,
    customer_name: str,
    business_id: str,
    business_name: str,
    stamp_count: int,
    stamp_goal: int,
    reward_description: str,
    qr_url: str,
) -> dict:
    """Build a loyalty object for a specific customer card."""
    object_id = f"{settings.GOOGLE_WALLET_ISSUER_ID}.card_{card_id.replace('-', '_')}"
    class_id = _class_id(business_id)

    return {
        "id": object_id,
        "classId": class_id,
        "accountId": customer_phone,
        "accountName": customer_name or customer_phone,
        "state": "active",
        "loyaltyPoints": {
            "balance": {
                "string": f"{stamp_count}/{stamp_goal}"
            },
            "label": "Stamps",
        },
        "barcode": {
            "type": "QR_CODE",
            "value": qr_url,
            "alternateText": "Show at counter",
        },
        "textModulesData": [
            {
                "id": "reward",
                "header": "Reward",
                "body": reward_description,
            },
            {
                "id": "progress",
                "header": "Progress",
                "body": f"{stamp_count} of {stamp_goal} stamps collected",
            },
        ],
    }


def generate_wallet_jwt(loyalty_object: dict) -> str:
    """Generate a signed JWT for the Save to Wallet button."""
    import jwt as pyjwt

    credentials_info = json.loads(settings.GOOGLE_WALLET_CREDENTIALS)

    claims = {
        "iss": credentials_info["client_email"],
        "aud": "google",
        "origins": ["https://loyaltycard-omega.vercel.app"],
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


async def create_or_update_pass(
    card_id: str,
    customer_phone: str,
    customer_name: str,
    business_id: str,
    business_name: str,
    logo_url: str | None,
    stamp_count: int,
    stamp_goal: int,
    reward_description: str,
    qr_url: str,
) -> str | None:
    """
    Creates a new pass or updates an existing one.
    Returns the 'Add to Wallet' JWT URL or None on failure.
    """
    try:
        client = get_wallet_client()

        # Ensure per-business class exists / is up to date
        ensure_loyalty_class(client, business_id, business_name, logo_url)

        object_id = f"{settings.GOOGLE_WALLET_ISSUER_ID}.card_{card_id.replace('-', '_')}"
        loyalty_object = build_loyalty_object(
            card_id=card_id,
            customer_phone=customer_phone,
            customer_name=customer_name,
            business_id=business_id,
            business_name=business_name,
            stamp_count=stamp_count,
            stamp_goal=stamp_goal,
            reward_description=reward_description,
            qr_url=qr_url,
        )

        try:
            client.loyaltyobject().get(resourceId=object_id).execute()
            # Object exists — patch only the fields that change
            client.loyaltyobject().patch(
                resourceId=object_id,
                body={
                    "loyaltyPoints": {
                        "balance": {"string": f"{stamp_count}/{stamp_goal}"},
                        "label": "Stamps",
                    },
                    "textModulesData": [
                        {
                            "id": "reward",
                            "header": "Reward",
                            "body": reward_description,
                        },
                        {
                            "id": "progress",
                            "header": "Progress",
                            "body": f"{stamp_count} of {stamp_goal} stamps collected",
                        },
                    ],
                },
            ).execute()
            log.info("wallet_pass_updated", card_id=card_id)
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