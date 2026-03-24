from datetime import datetime

from pydantic import BaseModel


class SentimentLogResponse(BaseModel):
    id: int
    asset_id: int
    score: float
    source: str
    headline: str
    url: str | None = None
    analyzed_at: datetime

    model_config = {"from_attributes": True}


class SentimentSummaryResponse(BaseModel):
    symbol: str
    current_score: float
    status: str  # "Positive", "Negative", "Neutral"
    news_count_last_hour: int
