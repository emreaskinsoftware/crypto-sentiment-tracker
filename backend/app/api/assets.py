from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.asset import Asset
from app.models.price_history import PriceHistory
from app.models.sentiment_log import SentimentLog
from app.schemas.asset import AssetResponse, ChartDataPoint, ChartDataResponse
from app.schemas.sentiment import SentimentLogResponse, SentimentSummaryResponse

router = APIRouter(prefix="/assets", tags=["Assets"])


@router.get("/", response_model=list[AssetResponse])
def list_assets(db: Session = Depends(get_db)):
    return db.query(Asset).order_by(Asset.market_cap.desc()).all()


@router.get("/{symbol}/sentiment-summary", response_model=SentimentSummaryResponse)
def get_sentiment_summary(symbol: str, db: Session = Depends(get_db)):
    asset = db.query(Asset).filter(Asset.symbol == symbol.upper()).first()
    if not asset:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Asset not found")

    one_hour_ago = datetime.now(timezone.utc) - timedelta(hours=1)

    # Get latest sentiment score
    latest_log = (
        db.query(SentimentLog)
        .filter(SentimentLog.asset_id == asset.id)
        .order_by(SentimentLog.analyzed_at.desc())
        .first()
    )
    current_score = latest_log.score if latest_log else 0.0

    # Count news in last hour
    news_count = (
        db.query(func.count(SentimentLog.id))
        .filter(
            SentimentLog.asset_id == asset.id,
            SentimentLog.analyzed_at >= one_hour_ago,
        )
        .scalar()
    )

    # Determine status
    if current_score >= 0.3:
        sentiment_status = "Positive"
    elif current_score <= -0.3:
        sentiment_status = "Negative"
    else:
        sentiment_status = "Neutral"

    return SentimentSummaryResponse(
        symbol=asset.symbol,
        current_score=round(current_score, 2),
        status=sentiment_status,
        news_count_last_hour=news_count,
    )


@router.get("/{symbol}/chart-data", response_model=ChartDataResponse)
def get_chart_data(symbol: str, timeframe: str = "24h", db: Session = Depends(get_db)):
    asset = db.query(Asset).filter(Asset.symbol == symbol.upper()).first()
    if not asset:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Asset not found")

    # Parse timeframe
    now = datetime.now(timezone.utc)
    if timeframe == "7d":
        since = now - timedelta(days=7)
    elif timeframe == "30d":
        since = now - timedelta(days=30)
    else:  # default 24h
        since = now - timedelta(hours=24)

    # Get price history
    prices = (
        db.query(PriceHistory)
        .filter(PriceHistory.asset_id == asset.id, PriceHistory.recorded_at >= since)
        .order_by(PriceHistory.recorded_at.asc())
        .all()
    )

    # Get sentiment logs for the same period
    sentiments = (
        db.query(SentimentLog)
        .filter(SentimentLog.asset_id == asset.id, SentimentLog.analyzed_at >= since)
        .order_by(SentimentLog.analyzed_at.asc())
        .all()
    )

    # Build chart data points - match sentiments to closest price timestamp
    data_points = []
    for price_record in prices:
        closest_sentiment = None
        min_diff = timedelta(hours=2)  # max 2h window
        for s in sentiments:
            diff = abs(price_record.recorded_at - s.analyzed_at)
            if diff < min_diff:
                min_diff = diff
                closest_sentiment = s

        data_points.append(
            ChartDataPoint(
                timestamp=price_record.recorded_at,
                price=price_record.price,
                sentiment_score=closest_sentiment.score if closest_sentiment else None,
            )
        )

    return ChartDataResponse(
        symbol=asset.symbol,
        timeframe=timeframe,
        data=data_points,
    )


@router.get("/{asset_id}", response_model=AssetResponse)
def get_asset(asset_id: int, db: Session = Depends(get_db)):
    asset = db.query(Asset).filter(Asset.id == asset_id).first()
    if not asset:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Asset not found")
    return asset


@router.get("/{asset_id}/price-history")
def get_price_history(asset_id: int, limit: int = 720, db: Session = Depends(get_db)):
    records = (
        db.query(PriceHistory)
        .filter(PriceHistory.asset_id == asset_id)
        .order_by(PriceHistory.recorded_at.desc())
        .limit(limit)
        .all()
    )
    return records


@router.get("/{asset_id}/sentiment", response_model=list[SentimentLogResponse])
def get_sentiment_logs(asset_id: int, limit: int = 50, db: Session = Depends(get_db)):
    logs = (
        db.query(SentimentLog)
        .filter(SentimentLog.asset_id == asset_id)
        .order_by(SentimentLog.analyzed_at.desc())
        .limit(limit)
        .all()
    )
    return logs
