"""
app/services/qr_service.py
--------------------------
Generates QR code images for loyalty cards.
QR encodes a signed URL — no sensitive data in the QR itself.
"""
import io
import uuid

import qrcode
from qrcode.image.pil import PilImage

from app.core.config import settings
from app.core.security import sign_qr_token


def build_card_url(card_id: uuid.UUID) -> str:
    """
    Signed URL embedded in customer QR.
    Format: https://yourapp.com/card/{card_id}.{hmac_signature}
    Business app hits POST /stamps with this token.
    """
    token = sign_qr_token(str(card_id))
    return f"{settings.QR_BASE_URL}/{token}"


def generate_qr_image(card_id: uuid.UUID) -> bytes:
    """
    Returns PNG bytes of the QR code.
    Caller stores in cloud storage and returns the URL.
    """
    url = build_card_url(card_id)
    qr = qrcode.QRCode(
        version=1,
        error_correction=qrcode.constants.ERROR_CORRECT_H,  # 30% damage tolerance
        box_size=10,
        border=4,
    )
    qr.add_data(url)
    qr.make(fit=True)

    img: PilImage = qr.make_image(fill_color="black", back_color="white")
    buffer = io.BytesIO()
    img.save(buffer, format="PNG")
    return buffer.getvalue()
