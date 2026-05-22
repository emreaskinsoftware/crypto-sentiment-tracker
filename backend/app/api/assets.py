from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from pydantic import BaseModel
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.core.database import get_db
from app.core.limiter import limiter
from app.models.asset import Asset
from app.models.price_history import PriceHistory
from app.models.sentiment_log import SentimentLog
from app.models.user import User
from app.schemas.asset import AssetResponse, ChartDataPoint, ChartDataResponse
from app.schemas.sentiment import SentimentLogResponse, SentimentSummaryResponse
from app.services.news_fetcher import register_symbol
from app.services.price_fetcher import fetch_price_for_any_symbol, fetch_all_prices

router = APIRouter(prefix="/assets", tags=["Assets"])

# Dashboard'da gösterilen sabit kripto listesi — kullanıcı değiştiremez
CURATED_SYMBOLS: list[str] = [
    "BTC", "ETH", "BNB", "SOL", "XRP",
    "ADA", "DOGE", "AVAX", "DOT", "MATIC",
    "LINK", "LTC", "ATOM", "NEAR", "ARB",
    "OP", "TON", "SHIB", "UNI", "FTM",
]


class LivePrice(BaseModel):
    symbol: str
    price: float
    change_24h: float


class AddAssetRequest(BaseModel):
    symbol: str


@router.get("/live-prices", response_model=list[LivePrice])
@limiter.limit("30/minute")
def get_live_prices(request: Request, db: Session = Depends(get_db)):
    """Binance'den anlık fiyat çeker (DB'ye yazmaz). Polling için kullanılır."""
    raw = fetch_all_prices()
    # Sadece DB'de kayıtlı asset'leri döndür
    db_symbols = {
        r[0] for r in db.query(Asset.symbol).filter(Asset.symbol.in_(list(raw.keys()))).all()
    }
    return [
        LivePrice(symbol=sym, price=data["price"], change_24h=data["change_24h"])
        for sym, data in raw.items()
        if sym in db_symbols
    ]


@router.get("/", response_model=list[AssetResponse])
@limiter.limit("60/minute")
def list_assets(request: Request, db: Session = Depends(get_db)):
    return (
        db.query(Asset)
        .filter(Asset.symbol.in_(CURATED_SYMBOLS))
        .order_by(Asset.market_cap.desc())
        .all()
    )


@router.post("/add", response_model=AssetResponse, status_code=201)
@limiter.limit("10/minute")
def add_asset(
    request: Request,
    payload: AddAssetRequest,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    """
    Yeni bir kripto para ekler. Binance'de USDT pair doğrulaması yapar,
    anlık fiyatı çeker ve DB'ye kaydeder. JWT gerektirir.
    """
    symbol = payload.symbol.upper().strip()
    if not symbol or len(symbol) > 10:
        raise HTTPException(status_code=422, detail="Geçersiz sembol.")

    existing = db.query(Asset).filter(Asset.symbol == symbol).first()
    if existing:
        return existing

    price_data = fetch_price_for_any_symbol(symbol)
    if price_data is None:
        raise HTTPException(
            status_code=422,
            detail=f"'{symbol}' Binance'de bulunamadı. Sembolün doğru olduğundan emin olun (ör: LINK, UNI, MATIC).",
        )

    asset = Asset(
        symbol=symbol,
        name=symbol,
        current_price=price_data["price"],
        volume_24h=price_data["volume"],
        market_cap=price_data.get("market_cap", 0.0),
        change_24h=price_data["change_24h"],
    )
    db.add(asset)
    db.commit()
    db.refresh(asset)

    register_symbol(symbol)
    return asset


@router.get("/{symbol}/sentiment-summary", response_model=SentimentSummaryResponse)
@limiter.limit("60/minute")
def get_sentiment_summary(request: Request, symbol: str, db: Session = Depends(get_db)):
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
@limiter.limit("30/minute")
def get_chart_data(request: Request, symbol: str, timeframe: str = "24h", db: Session = Depends(get_db)):
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
@limiter.limit("60/minute")
def get_asset(request: Request, asset_id: int, db: Session = Depends(get_db)):
    asset = db.query(Asset).filter(Asset.id == asset_id).first()
    if not asset:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Asset not found")
    return asset


@router.get("/{asset_id}/price-history")
@limiter.limit("30/minute")
def get_price_history(request: Request, asset_id: int, limit: int = Query(default=720, ge=1, le=1440), db: Session = Depends(get_db)):
    records = (
        db.query(PriceHistory)
        .filter(PriceHistory.asset_id == asset_id)
        .order_by(PriceHistory.recorded_at.desc())
        .limit(limit)
        .all()
    )
    return records


@router.get("/{asset_id}/sentiment", response_model=list[SentimentLogResponse])
@limiter.limit("30/minute")
def get_sentiment_logs(
    request: Request,
    asset_id: int,
    limit: int = Query(default=50, ge=1, le=500),
    source: str | None = Query(default=None, description="Kaynak filtresi: CoinDesk, Reddit, CoinTelegraph vb."),
    db: Session = Depends(get_db),
):
    q = db.query(SentimentLog).filter(SentimentLog.asset_id == asset_id)
    if source:
        q = q.filter(SentimentLog.source == source)
    return q.order_by(SentimentLog.analyzed_at.desc()).limit(limit).all()


@router.get("/{symbol}/correlation")
@limiter.limit("20/minute")
def get_correlation(request: Request, symbol: str, db: Session = Depends(get_db)):
    """
    Sentiment skoru ile sonraki fiyat değişimi arasındaki lag korelasyonunu hesaplar.
    Her lag için (1h, 2h, 4h, 8h, 12h, 24h) Pearson r döndürür.
    """
    asset = db.query(Asset).filter(Asset.symbol == symbol.upper()).first()
    if not asset:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Asset not found")

    sentiment_logs = (
        db.query(SentimentLog)
        .filter(SentimentLog.asset_id == asset.id)
        .order_by(SentimentLog.analyzed_at.asc())
        .all()
    )

    if len(sentiment_logs) < 3:
        return {
            "symbol": asset.symbol,
            "sufficient_data": False,
            "message": "Korelasyon için yeterli sentiment verisi yok (minimum 3 kayıt gerekli).",
            "sample_size": len(sentiment_logs),
            "lags": [],
            "best_lag": None,
        }

    price_records = (
        db.query(PriceHistory)
        .filter(PriceHistory.asset_id == asset.id)
        .order_by(PriceHistory.recorded_at.asc())
        .all()
    )

    if not price_records:
        return {
            "symbol": asset.symbol,
            "sufficient_data": False,
            "message": "Fiyat geçmişi bulunamadı.",
            "sample_size": 0,
            "lags": [],
            "best_lag": None,
        }

    # Hızlı fiyat arama için sıralı liste — bisect ile O(log n)
    price_times = [p.recorded_at.replace(tzinfo=timezone.utc) if p.recorded_at.tzinfo is None else p.recorded_at for p in price_records]
    price_values = [p.price for p in price_records]

    def find_closest_price(target: datetime, window_hours: float = 2.0) -> float | None:
        """Hedef zamana en yakın fiyatı döndürür (window_hours içindeyse)."""
        import bisect
        i = bisect.bisect_left(price_times, target)
        best_price = None
        best_diff = timedelta(hours=window_hours)
        for idx in [i - 1, i]:
            if 0 <= idx < len(price_times):
                diff = abs(price_times[idx] - target)
                if diff < best_diff:
                    best_diff = diff
                    best_price = price_values[idx]
        return best_price

    def pearson(x: list[float], y: list[float]) -> float | None:
        n = len(x)
        if n < 3:
            return None
        mx, my = sum(x) / n, sum(y) / n
        num = sum((xi - mx) * (yi - my) for xi, yi in zip(x, y))
        dx = sum((xi - mx) ** 2 for xi in x) ** 0.5
        dy = sum((yi - my) ** 2 for yi in y) ** 0.5
        if dx < 1e-10 or dy < 1e-10:
            return None
        return round(num / (dx * dy), 3)

    lag_hours_list = [1, 2, 4, 8, 12, 24]
    lag_results = []

    for lag in lag_hours_list:
        sentiments: list[float] = []
        price_changes: list[float] = []

        for log in sentiment_logs:
            t = log.analyzed_at.replace(tzinfo=timezone.utc) if log.analyzed_at.tzinfo is None else log.analyzed_at
            p0 = find_closest_price(t)
            p1 = find_closest_price(t + timedelta(hours=lag))
            if p0 is None or p1 is None or p0 == 0:
                continue
            sentiments.append(log.score)
            price_changes.append((p1 - p0) / p0 * 100)

        r = pearson(sentiments, price_changes)
        lag_results.append({
            "lag_hours": lag,
            "correlation": r,
            "sample_size": len(sentiments),
        })

    # En güçlü korelasyon (en az 3 örnek şartıyla)
    valid = [l for l in lag_results if l["correlation"] is not None and l["sample_size"] >= 3]
    best = max(valid, key=lambda l: abs(l["correlation"]), default=None)

    def interpretation(b: dict | None, sym: str) -> str:
        if b is None:
            return "Yeterli veri bulunamadı."
        r, lag = b["correlation"], b["lag_hours"]
        strength = "güçlü" if abs(r) >= 0.5 else "orta" if abs(r) >= 0.3 else "zayıf"
        direction = "yukarı taşıma" if r > 0 else "aşağı baskılama"
        return (
            f"{sym}'de yüksek sentiment, fiyatı {lag} saat sonra "
            f"{direction} eğiliminde ({strength} korelasyon, r={r:+.3f})"
        )

    return {
        "symbol": asset.symbol,
        "sufficient_data": True,
        "sample_size": len(sentiment_logs),
        "lags": lag_results,
        "best_lag": best,
        "interpretation": interpretation(best, asset.symbol),
    }


@router.get("/{asset_id}/sentiment-sources")
@limiter.limit("30/minute")
def get_sentiment_sources(request: Request, asset_id: int, db: Session = Depends(get_db)):
    """Bu asset için mevcut kaynaklar ve istatistikleri."""
    from sqlalchemy import func as sqlfunc
    rows = (
        db.query(
            SentimentLog.source,
            sqlfunc.count(SentimentLog.id).label("count"),
            sqlfunc.avg(SentimentLog.score).label("avg_score"),
        )
        .filter(SentimentLog.asset_id == asset_id)
        .group_by(SentimentLog.source)
        .order_by(sqlfunc.count(SentimentLog.id).desc())
        .all()
    )
    return [
        {"source": r.source, "count": r.count, "avg_score": round(float(r.avg_score), 3)}
        for r in rows
    ]
