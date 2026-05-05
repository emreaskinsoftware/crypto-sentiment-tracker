from datetime import datetime

from pydantic import BaseModel

from app.schemas.asset import AssetResponse


class WatchlistAddRequest(BaseModel):
    asset_symbol: str


class WatchlistItemResponse(BaseModel):
    id: int
    asset: AssetResponse
    added_at: datetime

    model_config = {"from_attributes": True}
