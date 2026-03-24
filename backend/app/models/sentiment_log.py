from datetime import datetime, timezone

from sqlalchemy import String, Float, Text, DateTime, ForeignKey, Integer
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class SentimentLog(Base):
    __tablename__ = "sentiment_logs"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    asset_id: Mapped[int] = mapped_column(Integer, ForeignKey("assets.id"), nullable=False, index=True)
    score: Mapped[float] = mapped_column(Float, nullable=False)  # -1.0 to +1.0
    source: Mapped[str] = mapped_column(String(100), nullable=False)  # e.g. "CoinDesk", "Reddit"
    headline: Mapped[str] = mapped_column(Text, nullable=False)
    url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    analyzed_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), index=True
    )

    # Relationships
    asset: Mapped["Asset"] = relationship(back_populates="sentiment_logs")  # type: ignore[name-defined]

    def __repr__(self) -> str:
        return f"<SentimentLog(asset_id={self.asset_id}, score={self.score}, source={self.source})>"
