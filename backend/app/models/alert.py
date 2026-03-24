from datetime import datetime, timezone

from sqlalchemy import String, Float, Boolean, DateTime, ForeignKey, Integer
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class Alert(Base):
    __tablename__ = "alerts"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    asset_id: Mapped[int] = mapped_column(Integer, ForeignKey("assets.id"), nullable=False, index=True)
    condition_type: Mapped[str] = mapped_column(
        String(50), nullable=False
    )  # "sentiment_below", "sentiment_above", "price_below", "price_above"
    threshold: Mapped[float] = mapped_column(Float, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    last_triggered_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )

    # Relationships
    user: Mapped["User"] = relationship(back_populates="alerts")  # type: ignore[name-defined]
    asset: Mapped["Asset"] = relationship(back_populates="alerts")  # type: ignore[name-defined]

    def __repr__(self) -> str:
        return f"<Alert(user_id={self.user_id}, asset_id={self.asset_id}, type={self.condition_type})>"
