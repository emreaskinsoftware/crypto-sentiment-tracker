from datetime import datetime, timezone

from sqlalchemy import String, Float, DateTime
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class Asset(Base):
    __tablename__ = "assets"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    symbol: Mapped[str] = mapped_column(String(20), unique=True, index=True, nullable=False)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    current_price: Mapped[float] = mapped_column(Float, default=0.0)
    market_cap: Mapped[float] = mapped_column(Float, default=0.0)
    volume_24h: Mapped[float] = mapped_column(Float, default=0.0)
    change_24h: Mapped[float] = mapped_column(Float, default=0.0)
    last_updated: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )

    # Relationships
    price_history: Mapped[list["PriceHistory"]] = relationship(back_populates="asset", cascade="all, delete-orphan")  # type: ignore[name-defined]
    sentiment_logs: Mapped[list["SentimentLog"]] = relationship(back_populates="asset", cascade="all, delete-orphan")  # type: ignore[name-defined]
    alerts: Mapped[list["Alert"]] = relationship(back_populates="asset", cascade="all, delete-orphan")  # type: ignore[name-defined]

    def __repr__(self) -> str:
        return f"<Asset(id={self.id}, symbol={self.symbol})>"
