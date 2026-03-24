from datetime import datetime

from pydantic import BaseModel


class AssetResponse(BaseModel):
    id: int
    symbol: str
    name: str
    current_price: float
    market_cap: float
    volume_24h: float
    change_24h: float
    last_updated: datetime

    model_config = {"from_attributes": True}


class ChartDataPoint(BaseModel):
    timestamp: datetime
    price: float
    sentiment_score: float | None = None


class ChartDataResponse(BaseModel):
    symbol: str
    timeframe: str
    data: list[ChartDataPoint]
