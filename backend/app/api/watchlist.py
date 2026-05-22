from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, Request, status
from pydantic import BaseModel
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.core.database import get_db
from app.core.limiter import limiter
from app.models.asset import Asset
from app.models.sentiment_log import SentimentLog
from app.models.user import User
from app.models.watchlist import Watchlist
from app.schemas.watchlist import WatchlistAddRequest, WatchlistItemResponse
from app.services.news_fetcher import register_symbol
from app.services.price_fetcher import fetch_price_for_any_symbol

router = APIRouter(prefix="/watchlist", tags=["Watchlist"])


class AssetMood(BaseModel):
    symbol: str
    name: str
    current_score: float | None
    week_ago_score: float | None


class PortfolioMoodResponse(BaseModel):
    asset_count: int
    current_avg: float | None       # Bu haftanın ortalaması
    week_ago_avg: float | None      # Geçen haftanın ortalaması
    change_pct: float | None        # Yüzde değişim (None = karşılaştırma verisi yok)
    direction: str                  # "better" | "worse" | "same" | "unknown"
    current_label: str              # "Bullish" | "Neutral" | "Bearish"
    assets: list[AssetMood]


def _latest_score(db: Session, asset_id: int, before: datetime, after: datetime) -> float | None:
    """Belirtilen zaman aralığındaki en son sentiment skorunu döndürür."""
    log = (
        db.query(SentimentLog)
        .filter(
            SentimentLog.asset_id == asset_id,
            SentimentLog.analyzed_at >= after,
            SentimentLog.analyzed_at < before,
        )
        .order_by(SentimentLog.analyzed_at.desc())
        .first()
    )
    return round(log.score, 3) if log else None


@router.get("/mood", response_model=PortfolioMoodResponse)
@limiter.limit("30/minute")
def get_portfolio_mood(
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Watchlist'teki varlıkların ortalama sentiment ve geçen haftayla karşılaştırması."""
    entries = db.query(Watchlist).filter(Watchlist.user_id == current_user.id).all()
    if not entries:
        return PortfolioMoodResponse(
            asset_count=0,
            current_avg=None, week_ago_avg=None,
            change_pct=None, direction="unknown",
            current_label="Neutral", assets=[],
        )

    now = datetime.now(timezone.utc)
    week_start = now - timedelta(days=7)    # 7 gün öncesi
    two_weeks = now - timedelta(days=14)    # 14 gün öncesi

    asset_moods: list[AssetMood] = []
    current_scores: list[float] = []
    week_ago_scores: list[float] = []

    for entry in entries:
        asset = db.query(Asset).filter(Asset.id == entry.asset_id).first()
        if not asset:
            continue

        # Bu hafta: son 7 gün içindeki en son skor
        cur = _latest_score(db, asset.id, before=now, after=week_start)
        # Geçen hafta: 7-14 gün arası en son skor
        prev = _latest_score(db, asset.id, before=week_start, after=two_weeks)

        asset_moods.append(AssetMood(
            symbol=asset.symbol,
            name=asset.name,
            current_score=cur,
            week_ago_score=prev,
        ))

        if cur is not None:
            current_scores.append(cur)
        if prev is not None:
            week_ago_scores.append(prev)

    current_avg = round(sum(current_scores) / len(current_scores), 3) if current_scores else None
    week_ago_avg = round(sum(week_ago_scores) / len(week_ago_scores), 3) if week_ago_scores else None

    # Yüzde değişim ve yön
    change_pct: float | None = None
    direction = "unknown"
    if current_avg is not None and week_ago_avg is not None:
        if abs(week_ago_avg) < 0.001:
            change_pct = 0.0
            direction = "same"
        else:
            change_pct = round(((current_avg - week_ago_avg) / abs(week_ago_avg)) * 100, 1)
            if change_pct > 2:
                direction = "better"
            elif change_pct < -2:
                direction = "worse"
            else:
                direction = "same"

    # Etiket
    score_for_label = current_avg if current_avg is not None else 0.0
    if score_for_label >= 0.3:
        label = "Bullish"
    elif score_for_label <= -0.3:
        label = "Bearish"
    else:
        label = "Neutral"

    return PortfolioMoodResponse(
        asset_count=len(entries),
        current_avg=current_avg,
        week_ago_avg=week_ago_avg,
        change_pct=change_pct,
        direction=direction,
        current_label=label,
        assets=sorted(asset_moods, key=lambda a: a.current_score or 0, reverse=True),
    )


@router.get("/", response_model=list[WatchlistItemResponse])
@limiter.limit("60/minute")
def get_watchlist(
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return db.query(Watchlist).filter(Watchlist.user_id == current_user.id).all()


@router.post("/", response_model=WatchlistItemResponse, status_code=status.HTTP_201_CREATED)
@limiter.limit("20/minute")
def add_to_watchlist(
    request: Request,
    payload: WatchlistAddRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    symbol = payload.asset_symbol.upper().strip()
    asset = db.query(Asset).filter(Asset.symbol == symbol).first()

    if not asset:
        price_data = fetch_price_for_any_symbol(symbol)
        if price_data is None:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=(
                    f"'{symbol}' Binance'de bulunamadı. "
                    "Kripto para sembolünü kontrol edin (ör: LINK, INJ, ARB). "
                    "USDT/USDC/BUSD gibi stablecoin semboller desteklenmez."
                ),
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
        db.flush()
        register_symbol(symbol)

    entry = Watchlist(user_id=current_user.id, asset_id=asset.id)
    db.add(entry)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"{symbol} zaten watchlist'inizde.",
        )
    db.refresh(entry)
    db.refresh(entry.asset)  # commit sonrası expired olan asset'i DB'den taze çek
    return entry


@router.delete("/{asset_symbol}", status_code=status.HTTP_204_NO_CONTENT)
@limiter.limit("30/minute")
def remove_from_watchlist(
    request: Request,
    asset_symbol: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    asset = db.query(Asset).filter(Asset.symbol == asset_symbol.upper()).first()
    if not asset:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Asset not found")

    entry = (
        db.query(Watchlist)
        .filter(Watchlist.user_id == current_user.id, Watchlist.asset_id == asset.id)
        .first()
    )
    if not entry:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Asset not in watchlist")

    db.delete(entry)
    db.commit()
