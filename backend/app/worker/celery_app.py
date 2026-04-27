from celery import Celery
from celery.schedules import crontab

from app.core.config import settings

celery_app = Celery(
    "crypto_sentiment",
    broker=settings.CELERY_BROKER_URL,
    backend=settings.CELERY_RESULT_BACKEND,
    include=["app.worker.tasks"],
)

celery_app.conf.timezone = "UTC"
celery_app.conf.enable_utc = True

# Saatlik Cron Job takvimi
celery_app.conf.beat_schedule = {
    # Her saat başı (XX:00) fiyat verisi çek
    "fetch-prices-hourly": {
        "task": "app.worker.tasks.fetch_prices_task",
        "schedule": crontab(minute=0),
    },
    # Her saat 5. dakikada (XX:05) duygu analizi yap — fiyatlardan sonra
    "run-sentiment-hourly": {
        "task": "app.worker.tasks.run_sentiment_task",
        "schedule": crontab(minute=5),
    },
}
