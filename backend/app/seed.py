"""
Seed script — Binance'den gercek anlik fiyatlar cekerek 30 gunluk gecmis uretir.
Grafik her zaman gercek fiyatla tutarli gorumur.
Run: python -m app.seed
"""

import random
import requests
from datetime import datetime, timedelta, timezone

from app.core.database import SessionLocal, engine, Base
from app.models.asset import Asset
from app.models.price_history import PriceHistory
from app.models.sentiment_log import SentimentLog

Base.metadata.create_all(bind=engine)

ASSETS = [
    {"symbol": "BTC",  "name": "Bitcoin",   "market_cap": 1.32e12, "volume": 28.5e9},
    {"symbol": "ETH",  "name": "Ethereum",  "market_cap": 415.6e9, "volume": 15.2e9},
    {"symbol": "SOL",  "name": "Solana",    "market_cap": 62.4e9,  "volume": 2.8e9},
    {"symbol": "ADA",  "name": "Cardano",   "market_cap": 15.8e9,  "volume": 520.0e6},
    {"symbol": "XRP",  "name": "Ripple",    "market_cap": 28.1e9,  "volume": 1.1e9},
    {"symbol": "DOGE", "name": "Dogecoin",  "market_cap": 11.6e9,  "volume": 680.0e6},
    {"symbol": "AVAX", "name": "Avalanche", "market_cap": 13.2e9,  "volume": 450.0e6},
    {"symbol": "DOT",  "name": "Polkadot",  "market_cap": 9.8e9,   "volume": 320.0e6},
]

BINANCE_PAIRS = {
    "BTC": "BTCUSDT", "ETH": "ETHUSDT", "SOL": "SOLUSDT",
    "ADA": "ADAUSDT", "XRP": "XRPUSDT", "DOGE": "DOGEUSDT",
    "AVAX": "AVAXUSDT", "DOT": "DOTUSDT",
}

NEWS_SOURCES = ["CoinDesk", "CoinTelegraph", "Reddit", "Bloomberg Crypto", "CryptoSlate"]

HEADLINES = {
    "BTC": [
        "Bitcoin ETF inflows reach record $1.2B in single day",
        "Institutional adoption of Bitcoin accelerates",
        "Bitcoin mining difficulty hits all-time high",
        "Major bank announces Bitcoin custody services",
        "Bitcoin whale accumulation signals bullish trend",
        "Bitcoin drops below key support level amid market sell-off",
        "Crypto winter fears resurface as BTC struggles",
        "Bitcoin hashrate reaches new all-time high",
        "Fed rate decision sends Bitcoin lower",
        "BlackRock Bitcoin ETF sees record outflows",
    ],
    "ETH": [
        "Ethereum Layer 2 solutions see massive growth",
        "ETH staking reaches 30 million coins milestone",
        "Ethereum gas fees drop to lowest in 2 years",
        "Vitalik proposes new scaling roadmap",
        "DeFi total value locked on Ethereum surpasses $100B",
        "Ethereum upgrade delayed, investors react negatively",
        "ETH falls 8% following broader market downturn",
        "Ethereum dev activity hits yearly high",
        "New ETH staking platform launches with 12% APY",
        "Ethereum dominance in DeFi sector grows",
    ],
    "SOL": [
        "Solana network processes 65,000 TPS in stress test",
        "Major NFT marketplace migrates to Solana",
        "Solana DeFi ecosystem grows 200% in Q1",
        "Solana faces brief network outage, recovers quickly",
        "New Solana phone launch boosts ecosystem adoption",
        "Solana validator count surpasses 2,000",
        "SOL price drops 12% after network congestion reports",
        "Solana gaming ecosystem sees surge in new projects",
    ],
    "ADA": [
        "Cardano Hydra upgrade shows promising scalability results",
        "Cardano smart contract activity surges 150%",
        "ADA staking rewards attract institutional investors",
        "Cardano announces partnership with African governments",
        "ADA price slumps amid broader altcoin selloff",
        "Cardano developer activity hits 3-month high",
    ],
    "XRP": [
        "Ripple wins key legal battle, XRP price surges",
        "XRP Ledger CBDC pilot program expands to 5 countries",
        "Ripple partners with major Asian bank for payments",
        "XRP faces renewed SEC scrutiny",
        "Ripple's ODL volume reaches record high",
        "XRP correction deepens as profit taking continues",
    ],
    "DOGE": [
        "Dogecoin integration with major payment processor announced",
        "DOGE community raises $2M for charitable causes",
        "Elon Musk tweet sends Dogecoin volume soaring",
        "Dogecoin transaction count hits monthly high",
        "DOGE drops 15% after meme coin hype fades",
        "New Dogecoin use case emerges in e-commerce",
    ],
    "AVAX": [
        "Avalanche subnet adoption grows among enterprises",
        "Major gaming studio launches on Avalanche blockchain",
        "AVAX price struggles amid broader market weakness",
        "Avalanche Foundation announces $100M ecosystem fund",
        "Avalanche TPS record broken in latest stress test",
    ],
    "DOT": [
        "Polkadot parachain auctions attract record participation",
        "DOT governance proposal introduces new staking mechanics",
        "Polkadot 2.0 roadmap unveiled, community reacts positively",
        "DOT price drops on low trading volume",
        "Polkadot cross-chain messaging hits milestone",
    ],
}

ASSET_SENTIMENT_BIAS = {
    "BTC": 0.15, "ETH": 0.10, "SOL": 0.05, "ADA": -0.05,
    "XRP": 0.20, "DOGE": 0.00, "AVAX": -0.10, "DOT": -0.05,
}


def _fetch_current_price(symbol: str) -> dict | None:
    """Binance'den gercek anlik fiyat cek."""
    pair = BINANCE_PAIRS.get(symbol)
    if not pair:
        return None
    try:
        resp = requests.get(
            "https://api.binance.com/api/v3/ticker/24hr",
            params={"symbol": pair},
            timeout=10,
        )
        if resp.status_code != 200:
            return None
        t = resp.json()
        return {
            "price": float(t["lastPrice"]),
            "volume": float(t["volume"]),
            "change_24h": float(t["priceChangePercent"]),
        }
    except Exception:
        return None


def _simulate_history(current_price: float, hours: int) -> list[float]:
    """
    Gercek fiyattan geriye dogru rastgele yuruyu — simdiki fiyat en sagda.
    Saatlik %0-0.8 arasinda degisim.
    """
    prices = [current_price]
    for _ in range(hours):
        prev = prices[-1] * (1 + random.uniform(-0.008, 0.008))
        prices.append(prev)
    prices.reverse()  # eskiden yeniye
    return prices


def seed_database():
    db = SessionLocal()
    try:
        existing = db.query(Asset).first()
        if existing:
            print("Fiyat ve sentiment gecmisi temizleniyor (kullanici verileri korunuyor)...")
            db.query(SentimentLog).delete()
            db.query(PriceHistory).delete()
            # Asset'ler, alerts ve watchlists silinmiyor — kullanici verisi
            db.commit()

        now = datetime.now(timezone.utc)
        DAYS = 30
        HOURS_TOTAL = DAYS * 24  # 720

        print("Binance'den gercek fiyatlar cekiliyor...")

        asset_objects: dict[str, Asset] = {}
        price_count = 0
        failed_symbols = []

        for a in ASSETS:
            symbol = a["symbol"]
            live = _fetch_current_price(symbol)

            if live:
                current_price = live["price"]
                volume_base = live["volume"]
                change_24h = live["change_24h"]
                print(f"  {symbol}: ${current_price:,.4f} (Binance canli)")
            else:
                # Fallback: onceki seed fiyatlari
                fallback = {
                    "BTC": 97000, "ETH": 1800, "SOL": 148, "ADA": 0.70,
                    "XRP": 2.30, "DOGE": 0.19, "AVAX": 20, "DOT": 4.0,
                }
                current_price = fallback.get(symbol, 1.0)
                volume_base = a["volume"]
                change_24h = 0.0
                failed_symbols.append(symbol)
                print(f"  {symbol}: ${current_price} (Binance'e ulasilamadi, fallback)")

            # Mevcutsa guncelle, yoksa olustur
            asset = db.query(Asset).filter(Asset.symbol == symbol).first()
            if asset:
                asset.current_price = current_price
                asset.volume_24h = volume_base
                asset.change_24h = change_24h
                asset.last_updated = now
            else:
                asset = Asset(
                    symbol=symbol,
                    name=a["name"],
                    current_price=current_price,
                    market_cap=a["market_cap"],
                    volume_24h=volume_base,
                    change_24h=change_24h,
                    last_updated=now,
                )
                db.add(asset)
            db.flush()
            asset_objects[symbol] = asset

            # 30 gunluk saatlik fiyat gecmisi uret (gercek fiyattan geriye)
            history = _simulate_history(current_price, HOURS_TOTAL)
            for i, price in enumerate(history):
                hours_ago = HOURS_TOTAL - i
                hour_of_day = (now - timedelta(hours=hours_ago)).hour
                vol_mult = 1.3 if 12 <= hour_of_day <= 20 else 0.8

                ph = PriceHistory(
                    asset_id=asset.id,
                    price=round(price, 6),
                    volume=round(volume_base * random.uniform(0.85, 1.15) * vol_mult, 2),
                    market_cap=a["market_cap"] * (price / current_price),
                    recorded_at=now - timedelta(hours=hours_ago),
                )
                db.add(ph)
                price_count += 1

        print(f"[OK] {len(ASSETS)} asset, {price_count} fiyat kaydi eklendi.")

        # Sentiment logları — 30 gune dagit
        sentiment_count = 0
        for symbol, headlines in HEADLINES.items():
            asset = asset_objects[symbol]
            bias = ASSET_SENTIMENT_BIAS.get(symbol, 0.0)
            for i, headline in enumerate(headlines):
                day_offset = int(DAYS * (i / len(headlines))) + random.randint(0, 2)
                day_offset = min(day_offset, DAYS - 1)
                score = round(
                    max(-1.0, min(1.0, bias * (1 - day_offset / DAYS) + random.uniform(-0.4, 0.4))),
                    3,
                )
                log = SentimentLog(
                    asset_id=asset.id,
                    score=score,
                    source=random.choice(NEWS_SOURCES),
                    headline=headline,
                    url=None,
                    analyzed_at=now - timedelta(
                        days=day_offset,
                        hours=random.randint(0, 23),
                        minutes=random.randint(0, 59),
                    ),
                )
                db.add(log)
                sentiment_count += 1

        db.commit()

        print(f"[OK] {sentiment_count} sentiment logu eklendi.")
        print("\nSeed tamamlandi!")
        print(f"  {len(ASSETS)} asset | {price_count} fiyat kaydi | {sentiment_count} sentiment logu")
        print(f"  Aralik: son {DAYS} gun — 24h / 7d / 30d grafikler calisir")
        if failed_symbols:
            print(f"  Binance'e ulasilamayan semboller (fallback kullanildi): {failed_symbols}")

    finally:
        db.close()


if __name__ == "__main__":
    seed_database()
