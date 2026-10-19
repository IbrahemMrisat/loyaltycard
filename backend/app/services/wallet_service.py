"""
app/services/wallet_service.py
-------------------------------
Google Wallet integration — creates and updates loyalty passes.
"""
import json
import time
import uuid

import google.auth
import google.auth.transport.requests
from google.oauth2 import service_account
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError

import structlog

from app.core.config import settings

log = structlog.get_logger(__name__)

SCOPES = ["https://www.googleapis.com/auth/wallet_object.issuer"]


def get_wallet_client():
    """Build authenticated Google Wallet API client."""
    credentials_info = json.loads(settings.GOOGLE_WALLET_CREDENTIALS)
    credentials = service_account.Credentials.from_service_account_info(
        credentials_info,
        scopes=SCOPES,
    )
    return build("walletobjects", "v1", credentials=credentials)


def build_loyalty_class():
    """Define the loyalty card class template."""
    return {
        "id": settings.GOOGLE_WALLET_CLASS_ID,
        "issuerName": "Loyally",
        "reviewStatus": "underReview",
        "programName": "Loyalty Card",
        "programLogo": {
            "sourceUri": {
                "uri": "https://loyaltycard-omega.vercel.app/logo.png"
            },
            "contentDescription": {
                "defaultValue": {
                    "language": "en-US",
                    "value": "Loyally Logo"
                }
            }
        },
        "rewardsTier": "base",
        "rewardsTierLabel": "Member",
    }


def build_loyalty_object(
    card_id: str,
    customer_phone: str,
    customer_name: str,
    business_name: str,
    stamp_count: int,
    stamp_goal: int,
    reward_description: str,
    qr_url: str,
) -> dict:
    """Build a loyalty object for a specific customer card."""
    object_id = f"{settings.GOOGLE_WALLET_ISSUER_ID}.card_{card_id.replace('-', '_')}"

    return {
        "id": object_id,
        "classId": settings.GOOGLE_WALLET_CLASS_ID,
        "accountId": customer_phone,
        "accountName": customer_name or customer_phone,
        "state": "active",
        "loyaltyPoints": {
            "balance": {
                "string": f"{stamp_count}/{stamp_goal}"
            },
            "label": "Stamps"
        },
        "barcode": {
            "type": "QR_CODE",
            "value": qr_url,
            "alternateText": "Show at counter"
        },
        "textModulesData": [
            {
                "id": "business",
                "header": business_name,
                "body": reward_description,
            },
            {
                "id": "progress",
                "header": "Progress",
                "body": f"{stamp_count} of {stamp_goal} stamps collected",
            }
        ],
        "linksModuleData": {
            "uris": [
                {
                    "uri": qr_url,
                    "description": "View your loyalty card",
                    "id": "card_link"
                }
            ]
        }
    }


async def create_or_update_pass(
    card_id: str,
    customer_phone: str,
    customer_name: str,
    business_name: str,
    stamp_count: int,
    stamp_goal: int,
    reward_description: str,
    qr_url: str,
) -> str | None:
    """
    Creates a new pass or updates existing one.
    Returns the 'Add to Wallet' JWT URL or None on failure.
    """
    try:
        client = get_wallet_client()
        object_id = f"{settings.GOOGLE_WALLET_ISSUER_ID}.card_{card_id.replace('-', '_')}"
        loyalty_object = build_loyalty_object(
            card_id, customer_phone, customer_name,
            business_name, stamp_count, stamp_goal,
            reward_description, qr_url
        )

        # Try to get existing object
        try:
            client.loyaltyobject().get(resourceId=object_id).execute()
            # Object exists — update it
            client.loyaltyobject().patch(
                resourceId=object_id,
                body=loyalty_object
            ).execute()
            log.info("wallet_pass_updated", card_id=card_id)
        except HttpError as e:
            if e.resp.status == 404:
                # Object doesn't exist — create it
                client.loyaltyobject().insert(body=loyalty_object).execute()
                log.info("wallet_pass_created", card_id=card_id)
            else:
                raise

        # Generate JWT for "Add to Wallet" button
        wallet_jwt = generate_wallet_jwt(loyalty_object)
        return f"https://pay.google.com/gp/v/save/{wallet_jwt}"

    except Exception as e:
        import traceback
        log.error("wallet_error", error=str(e), card_id=card_id)
        print(f"WALLET ERROR FULL: {traceback.format_exc()}")
        return None


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
        }
    }

    return pyjwt.encode(
        claims,
        credentials_info["private_key"],
        algorithm="RS256"
    )