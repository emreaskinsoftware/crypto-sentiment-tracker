from datetime import datetime, timezone

from sqlalchemy import Boolean, DateTime, Float, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class AlertTrigger(Base):
    __tablename__ = "alert_triggers"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    alert_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("alerts.id", ondelete="CASCADE"), nullable=False, index=True
    )
    triggered_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False
    )
    condition_type: Mapped[str] = mapped_column(String(50), nullable=False)
    threshold: Mapped[float] = mapped_column(Float, nullable=False)
    actual_value: Mapped[float] = mapped_column(Float, nullable=False)
    is_read: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    alert: Mapped["Alert"] = relationship(back_populates="triggers")  # type: ignore[name-defined]

    def __repr__(self) -> str:
        return f"<AlertTrigger(alert_id={self.alert_id}, at={self.triggered_at})>"
