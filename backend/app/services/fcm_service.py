import json
import logging

from app.core.config import settings

logger = logging.getLogger(__name__)

_firebase_initialized = False


def _init_firebase():
    global _firebase_initialized
    if _firebase_initialized:
        return True
    try:
        import firebase_admin
        from firebase_admin import credentials

        if not firebase_admin._apps:
            cred_data = json.loads(settings.FCM_CREDENTIALS_JSON)
            cred = credentials.Certificate(cred_data)
            firebase_admin.initialize_app(cred)
        _firebase_initialized = True
        return True
    except Exception as exc:
        logger.error("Firebase başlatılamadı: %s", exc)
        return False


def send_push_notification(
    fcm_token: str,
    title: str,
    body: str,
    data: dict | None = None,
) -> bool:
    """
    Android cihaza FCM push bildirimi gönderir.
    FCM_ENABLED=False iken sadece log basar.
    Returns True on success.
    """
    if not fcm_token:
        return False

    if not settings.FCM_ENABLED:
        logger.info(
            "[FCM disabled] Push simülasyonu: title=%s body=%s token=%.20s…",
            title, body, fcm_token,
        )
        return True

    if not settings.FCM_CREDENTIALS_JSON:
        logger.warning("FCM kimlik bilgileri (FCM_CREDENTIALS_JSON) eksik.")
        return False

    if not _init_firebase():
        return False

    try:
        from firebase_admin import messaging

        message = messaging.Message(
            notification=messaging.Notification(title=title, body=body),
            data={k: str(v) for k, v in (data or {}).items()},
            token=fcm_token,
            android=messaging.AndroidConfig(priority="high"),
        )
        response = messaging.send(message)
        logger.info("FCM push gönderildi: %s", response)
        return True
    except Exception as exc:
        logger.error("FCM push gönderilemedi: %s", exc)
        return False


def send_alert_push(
    fcm_token: str,
    asset_symbol: str,
    condition_type: str,
    threshold: float,
    current_value: float,
) -> bool:
    """Alarm tetiklendiğinde standart formatlı push bildirimi gönderir."""
    labels = {
        "sentiment_below": f"Sentiment {threshold:.2f} altına düştü",
        "sentiment_above": f"Sentiment {threshold:.2f} üzerine çıktı",
        "price_below":     f"Fiyat ${threshold:,.0f} altına düştü",
        "price_above":     f"Fiyat ${threshold:,.0f} üzerine çıktı",
    }
    condition_text = labels.get(condition_type, f"{condition_type} {threshold}")
    is_sentiment = "sentiment" in condition_type
    value_str = (
        f"{current_value:+.2f}" if is_sentiment else f"${current_value:,.2f}"
    )

    return send_push_notification(
        fcm_token=fcm_token,
        title=f"🚨 {asset_symbol} Alarm Tetiklendi",
        body=f"{condition_text} — Güncel: {value_str}",
        data={
            "asset_symbol": asset_symbol,
            "condition_type": condition_type,
            "threshold": str(threshold),
            "current_value": str(current_value),
        },
    )
