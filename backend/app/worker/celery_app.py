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

# 15 dakikalık veri toplama takvimi
celery_app.conf.beat_schedule = {
    # Her 15 dakikada bir (XX:00, XX:15, XX:30, XX:45) fiyat verisi çek
    "fetch-prices-15min": {
        "task": "app.worker.tasks.fetch_prices_task",
        "schedule": crontab(minute="0,15,30,45"),
    },
    # Her 15 dakikada bir, 2 dakika sonra duygu analizi yap — fiyatlardan sonra
    "run-sentiment-15min": {
        "task": "app.worker.tasks.run_sentiment_task",
        "schedule": crontab(minute="2,17,32,47"),
    },
    # Her 15 dakikada bir, 5 dakika sonra alarm koşullarını tara
    "check-alerts-15min": {
        "task": "app.worker.tasks.check_alerts_task",
        "schedule": crontab(minute="5,20,35,50"),
    },
}
