import logging
from datetime import datetime, timedelta, timezone

from sqlalchemy.orm import Session

from app.core.database import SessionLocal
from app.models.alert import Alert
from app.models.asset import Asset
from app.models.sentiment_log import SentimentLog
from app.models.user import User
from app.services.email_service import send_alert_email

logger = logging.getLogger(__name__)

# Aynı alarm 1 saatten önce tekrar tetiklenmez
RETRIGGER_COOLDOWN = timedelta(hours=1)


def _get_latest_sentiment(db: Session, asset_id: int) -> float | None:
    log = (
        db.query(SentimentLog)
        .filter(SentimentLog.asset_id == asset_id)
        .order_by(SentimentLog.analyzed_at.desc())
        .first()
    )
    return log.score if log else None


def _evaluate_condition(alert: Alert, asset: Asset, sentiment_score: float | None) -> bool:
    """Alarm koşulunun karşılanıp karşılanmadığını kontrol eder."""
    t = alert.threshold
    match alert.condition_type:
        case "sentiment_below":
            return sentiment_score is not None and sentiment_score < t
        case "sentiment_above":
            return sentiment_score is not None and sentiment_score > t
        case "price_below":
            return asset.current_price < t
        case "price_above":
            return asset.current_price > t
        case _:
            logger.warning("Bilinmeyen koşul tipi: %s", alert.condition_type)
            return False


def _is_in_cooldown(alert: Alert, now: datetime) -> bool:
    """Son tetiklenme 1 saatten yakın ise True döner (tekrar tetikleme engeli)."""
    if alert.last_triggered_at is None:
        return False
    return (now - alert.last_triggered_at) < RETRIGGER_COOLDOWN


def check_alerts(db: Session) -> dict:
    """
    Aktif tüm alarmları tarar, koşul karşılandıysa e-posta gönderir.
    Returns: {checked, triggered, skipped_cooldown, failed}
    """
    now = datetime.now(timezone.utc)
    active_alerts = (
        db.query(Alert)
        .filter(Alert.is_active == True)  # noqa: E712
        .all()
    )

    stats = {"checked": 0, "triggered": 0, "skipped_cooldown": 0, "failed": 0}

    for alert in active_alerts:
        stats["checked"] += 1

        # Soğuma süresi kontrolü
        if _is_in_cooldown(alert, now):
            stats["skipped_cooldown"] += 1
            continue

        asset = db.query(Asset).filter(Asset.id == alert.asset_id).first()
        if not asset:
            continue

        sentiment_score = _get_latest_sentiment(db, alert.asset_id)
        current_value = sentiment_score if "sentiment" in alert.condition_type else asset.current_price

        if not _evaluate_condition(alert, asset, sentiment_score):
            continue

        # Koşul karşılandı — e-posta gönder
        user = db.query(User).filter(User.id == alert.user_id).first()
        if not user:
            continue

        success = send_alert_email(
            to_email=user.email,
            full_name=user.full_name,
            asset_symbol=asset.symbol,
            condition_type=alert.condition_type,
            threshold=alert.threshold,
            current_value=current_value if current_value is not None else 0.0,
            current_price=asset.current_price,
        )

        if success:
            alert.last_triggered_at = now
            db.commit()
            stats["triggered"] += 1
            logger.info(
                "Alarm tetiklendi: alert_id=%d asset=%s kosul=%s esik=%.4f",
                alert.id, asset.symbol, alert.condition_type, alert.threshold,
            )
        else:
            stats["failed"] += 1

    logger.info("Alarm tarama tamamlandi: %s", stats)
    return stats


def run_alert_checker(db: Session | None = None) -> dict:
    """Oturum yönetimini otomatik yapan sarmalayıcı (Celery task için)."""
    close_db = db is None
    if db is None:
        db = SessionLocal()
    try:
        return check_alerts(db)
    finally:
        if close_db:
            db.close()
