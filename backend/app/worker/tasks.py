import logging

from app.core.database import SessionLocal
from app.services.price_fetcher import run_price_pipeline
from app.services.sentiment_pipeline import run_sentiment_pipeline
from app.worker.celery_app import celery_app

logger = logging.getLogger(__name__)


@celery_app.task(name="app.worker.tasks.fetch_prices_task")
def fetch_prices_task() -> dict:
    """Her saat başı Binance'den kripto fiyatlarını çeker ve DB'ye kaydeder."""
    logger.info("fetch_prices_task basliyor")
    stats = run_price_pipeline()
    logger.info("fetch_prices_task tamamlandi: %s", stats)
    return stats


@celery_app.task(name="app.worker.tasks.run_sentiment_task")
def run_sentiment_task() -> dict:
    """Her saat 5. dakikada haberleri toplar, FinBERT analizi yapar, sentiment_logs'a kaydeder."""
    logger.info("run_sentiment_task basliyor")
    db = SessionLocal()
    try:
        stats = run_sentiment_pipeline(db)
        logger.info("run_sentiment_task tamamlandi: %s", stats)
        return stats
    finally:
        db.close()


@celery_app.task(name="app.worker.tasks.run_full_pipeline_task")
def run_full_pipeline_task() -> dict:
    """Fiyat + duygu pipeline'larini sirayla calistirir. Manuel tetikleme icin."""
    logger.info("run_full_pipeline_task basliyor")
    price_stats = run_price_pipeline()

    db = SessionLocal()
    try:
        sentiment_stats = run_sentiment_pipeline(db)
    finally:
        db.close()

    result = {"prices": price_stats, "sentiment": sentiment_stats}
    logger.info("run_full_pipeline_task tamamlandi: %s", result)
    return result
