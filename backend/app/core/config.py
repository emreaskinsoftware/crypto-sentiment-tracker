from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    DATABASE_URL: str = "postgresql://postgres:postgres@localhost:5432/crypto_sentiment"
    JWT_SECRET: str = "change-me-in-production"
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRE_MINUTES: int = 60
    API_KEY: str = ""
    # Hafta 7 — Celery + Redis
    CELERY_BROKER_URL: str = "redis://localhost:6379/0"
    CELERY_RESULT_BACKEND: str = "redis://localhost:6379/0"
    # Hafta 10 — SMTP E-posta
    SMTP_HOST: str = "smtp.gmail.com"
    SMTP_PORT: int = 587
    SMTP_USERNAME: str = ""
    SMTP_PASSWORD: str = ""
    SMTP_FROM_EMAIL: str = ""
    SMTP_ENABLED: bool = False
    # Hafta 11 — Firebase Cloud Messaging
    FCM_ENABLED: bool = False
    FCM_CREDENTIALS_JSON: str = ""

    model_config = {"env_file": ".env", "extra": "ignore"}


settings = Settings()
