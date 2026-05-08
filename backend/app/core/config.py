import secrets

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    DATABASE_URL: str = "postgresql://postgres:postgres@localhost:5432/crypto_sentiment"

    # JWT — varsayılan değer her sunucu başlatmasında rastgele üretilir.
    # Üretimde JWT_SECRET env değişkeni mutlaka ayarlanmalıdır.
    JWT_SECRET: str = secrets.token_hex(32)
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRE_MINUTES: int = 60

    # CORS — virgülle ayrılmış origin listesi
    ALLOWED_ORIGINS: str = "http://localhost:3000,http://127.0.0.1:3000,http://localhost:8080,http://127.0.0.1:8080"

    API_KEY: str = ""

    # Celery + Redis
    CELERY_BROKER_URL: str = "redis://localhost:6379/0"
    CELERY_RESULT_BACKEND: str = "redis://localhost:6379/0"

    # SMTP E-posta
    SMTP_HOST: str = "smtp.gmail.com"
    SMTP_PORT: int = 587
    SMTP_USERNAME: str = ""
    SMTP_PASSWORD: str = ""
    SMTP_FROM_EMAIL: str = ""
    SMTP_ENABLED: bool = False

    # Firebase Cloud Messaging
    FCM_ENABLED: bool = False
    FCM_CREDENTIALS_JSON: str = ""

    # HuggingFace (FINBERT_MODE=api iken gerekli)
    HUGGINGFACE_API_KEY: str = ""

    @property
    def allowed_origins_list(self) -> list[str]:
        return [o.strip() for o in self.ALLOWED_ORIGINS.split(",") if o.strip()]

    model_config = {"env_file": ".env", "extra": "ignore"}


settings = Settings()
