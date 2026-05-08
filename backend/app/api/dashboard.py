from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.asset import Asset
from app.models.sentiment_log import SentimentLog
from app.schemas.dashboard import DashboardSummary, TopMoversResponse

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])


@router.get("/summary", response_model=DashboardSummary)
def get_dashboard_summary(db: Session = Depends(get_db)):
    assets = db.query(Asset).all()
    if not assets:
        return DashboardSummary(
            total_assets=0,
            total_market_cap=0.0,
            avg_sentiment_score=0.0,
            bullish_count=0,
            bearish_count=0,
            neutral_count=0,
        )

    total_market_cap = sum(a.market_cap for a in assets)

    # Get latest sentiment score per asset
    sentiment_scores = []
    for asset in assets:
        latest = (
            db.query(SentimentLog)
            .filter(SentimentLog.asset_id == asset.id)
            .order_by(SentimentLog.analyzed_at.desc())
            .first()
        )
        if latest:
            sentiment_scores.append(latest.score)

    avg_sentiment = round(sum(sentiment_scores) / len(sentiment_scores), 4) if sentiment_scores else 0.0
    bullish = sum(1 for s in sentiment_scores if s >= 0.3)
    bearish = sum(1 for s in sentiment_scores if s <= -0.3)
    neutral = len(sentiment_scores) - bullish - bearish

    return DashboardSummary(
        total_assets=len(assets),
        total_market_cap=total_market_cap,
        avg_sentiment_score=avg_sentiment,
        bullish_count=bullish,
        bearish_count=bearish,
        neutral_count=neutral,
    )


@router.get("/top-movers", response_model=TopMoversResponse)
def get_top_movers(limit: int = Query(default=3, ge=1, le=20), db: Session = Depends(get_db)):
    gainers = (
        db.query(Asset)
        .order_by(Asset.change_24h.desc())
        .limit(limit)
        .all()
    )
    losers = (
        db.query(Asset)
        .order_by(Asset.change_24h.asc())
        .limit(limit)
        .all()
    )
    return TopMoversResponse(gainers=gainers, losers=losers)
