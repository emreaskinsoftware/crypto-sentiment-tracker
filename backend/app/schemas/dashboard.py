from pydantic import BaseModel

from app.schemas.asset import AssetResponse


class DashboardSummary(BaseModel):
    total_assets: int
    total_market_cap: float
    avg_sentiment_score: float
    bullish_count: int
    bearish_count: int
    neutral_count: int


class TopMoversResponse(BaseModel):
    gainers: list[AssetResponse]
    losers: list[AssetResponse]
