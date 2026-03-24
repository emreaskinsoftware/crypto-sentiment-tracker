from datetime import datetime

from pydantic import BaseModel


class AlertCreate(BaseModel):
    asset_symbol: str  # e.g., "BTC"
    condition: str  # "sentiment_drops_below", "sentiment_rises_above", "news_volume_increase"
    threshold: float


class AlertResponse(BaseModel):
    id: int
    user_id: int
    asset_id: int
    condition_type: str
    threshold: float
    is_active: bool
    last_triggered_at: datetime | None = None
    created_at: datetime

    model_config = {"from_attributes": True}
