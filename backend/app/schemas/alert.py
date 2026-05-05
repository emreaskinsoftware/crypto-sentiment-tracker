from datetime import datetime

from pydantic import BaseModel


class AlertCreate(BaseModel):
    asset_symbol: str  # e.g., "BTC"
    condition: str  # "sentiment_below", "sentiment_above", "price_below", "price_above"
    threshold: float


class AlertUpdate(BaseModel):
    is_active: bool | None = None
    threshold: float | None = None


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
