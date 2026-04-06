"""
Hafta 5 — Kripto Fiyat ve Hacim Verisi Çekme Servisi
Binance REST API (ücretsiz, auth gerektirmez) üzerinden saatlik OHLCV verisi çeker
ve price_history tablosuna kaydeder.
B Planı: ccxt kütüphanesi Binance'e erişemezse doğrudan Binance public REST API kullanılır.
"""

from __future__ import annotations

import logging
from datetime import datetime, timezone
from typing import Any

import requests
from sqlalchemy.orm import Session

from app.models.asset import Asset
from app.models.price_history import PriceHistory

logger = logging.getLogger(__name__)

# İzlenen kripto semboller (Binance formatı)
TRACKED_SYMBOLS: list[str] = ["BTC", "ETH", "BNB", "SOL", "XRP"]
BINANCE_BASE_URL = "https://api.binance.com/api/v3"

# Binance sembol eşleştirmesi: uygulama sembolü → Binance pair
BINANCE_PAIRS: dict[str, str] = {
    "BTC": "BTCUSDT",
    "ETH": "ETHUSDT",
    "BNB": "BNBUSDT",
    "SOL": "SOLUSDT",
    "XRP": "XRPUSDT",
}


def _get_binance_ticker(symbol: str) -> dict[str, Any] | None:
    """Binance'den anlık fiyat ve 24 saatlik istatistik çeker."""
    pair = BINANCE_PAIRS.get(symbol.upper())
    if not pair:
        logger.warning("Bilinmeyen sembol: %s", symbol)
        return None

    try:
        resp = requests.get(
            f"{BINANCE_BASE_URL}/ticker/24hr",
            params={"symbol": pair},
            timeout=10,
        )
        resp.raise_for_status()
        return resp.json()
    except requests.RequestException as exc:
        logger.error("Binance ticker hatası (%s): %s", symbol, exc)
        return None


def _get_binance_kline(symbol: str, interval: str = "1h", limit: int = 1) -> list[list] | None:
    """Binance'den OHLCV (kline) verisi çeker. Varsayılan: son 1 saatlik mum."""
    pair = BINANCE_PAIRS.get(symbol.upper())
    if not pair:
        return None

    try:
        resp = requests.get(
            f"{BINANCE_BASE_URL}/klines",
            params={"symbol": pair, "interval": interval, "limit": limit},
            timeout=10,
        )
        resp.raise_for_status()
        return resp.json()
    except requests.RequestException as exc:
        logger.error("Binance kline hatası (%s): %s", symbol, exc)
        return None


def fetch_price_for_symbol(symbol: str) -> dict[str, float] | None:
    """
    Tek bir sembol için anlık fiyat ve hacim bilgisini döndürür.
    Dönüş: {"price": float, "volume": float, "market_cap": float, "change_24h": float}
    """
    ticker = _get_binance_ticker(symbol)
    if not ticker:
        return None

    return {
        "price": float(ticker.get("lastPrice", 0)),
        "volume": float(ticker.get("volume", 0)),
        "market_cap": 0.0,  # Binance public API market cap sağlamaz
        "change_24h": float(ticker.get("priceChangePercent", 0)),
    }


def fetch_all_prices() -> dict[str, dict[str, float]]:
    """
    Tüm izlenen semboller için fiyat verilerini çeker.
    Dönüş: {"BTC": {"price": ..., "volume": ..., ...}, ...}
    """
    results: dict[str, dict[str, float]] = {}
    for symbol in TRACKED_SYMBOLS:
        data = fetch_price_for_symbol(symbol)
        if data:
            results[symbol] = data
            logger.info("Fiyat çekildi: %s = $%.2f", symbol, data["price"])
    return results


def save_price_to_db(db: Session, symbol: str, price_data: dict[str, float]) -> PriceHistory | None:
    """
    Tek bir sembolün fiyat verisini veritabanına kaydeder.
    Asset yoksa oluşturur.
    """
    asset = db.query(Asset).filter(Asset.symbol == symbol.upper()).first()
    if not asset:
        asset = Asset(
            symbol=symbol.upper(),
            name=symbol.upper(),
            current_price=price_data["price"],
            volume_24h=price_data["volume"],
            change_24h=price_data["change_24h"],
        )
        db.add(asset)
        db.flush()
        logger.info("Yeni asset oluşturuldu: %s", symbol)
    else:
        asset.current_price = price_data["price"]
        asset.volume_24h = price_data["volume"]
        asset.change_24h = price_data["change_24h"]
        asset.last_updated = datetime.now(timezone.utc)

    record = PriceHistory(
        asset_id=asset.id,
        price=price_data["price"],
        volume=price_data["volume"],
        market_cap=price_data.get("market_cap", 0.0),
        recorded_at=datetime.now(timezone.utc),
    )
    db.add(record)
    db.commit()
    db.refresh(record)
    logger.info("Fiyat kaydedildi: %s id=%d", symbol, record.id)
    return record


def run_price_pipeline(db: Session) -> dict[str, int]:
    """
    Tüm semboller için fiyat çekme + kaydetme pipeline'ını çalıştırır.
    Dönüş: {"fetched": N, "saved": N, "failed": N}
    """
    prices = fetch_all_prices()
    saved = 0
    failed = 0

    for symbol, data in prices.items():
        try:
            save_price_to_db(db, symbol, data)
            saved += 1
        except Exception as exc:
            logger.error("Kaydetme hatası (%s): %s", symbol, exc)
            db.rollback()
            failed += 1

    return {"fetched": len(prices), "saved": saved, "failed": failed}
