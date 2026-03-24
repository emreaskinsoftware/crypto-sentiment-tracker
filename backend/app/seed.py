"""
Seed script to populate the database with initial crypto assets and sample data.
Run: python -m app.seed
"""

import random
from datetime import datetime, timedelta, timezone

from app.core.database import SessionLocal, engine, Base
from app.models.asset import Asset
from app.models.price_history import PriceHistory
from app.models.sentiment_log import SentimentLog

# Ensure tables exist
Base.metadata.create_all(bind=engine)

ASSETS = [
    {"symbol": "BTC", "name": "Bitcoin", "price": 67234.50, "market_cap": 1.32e12, "volume": 28.5e9, "change": 2.34},
    {"symbol": "ETH", "name": "Ethereum", "price": 3456.78, "market_cap": 415.6e9, "volume": 15.2e9, "change": 1.12},
    {"symbol": "SOL", "name": "Solana", "price": 142.35, "market_cap": 62.4e9, "volume": 2.8e9, "change": -0.87},
    {"symbol": "ADA", "name": "Cardano", "price": 0.45, "market_cap": 15.8e9, "volume": 520.0e6, "change": 3.21},
    {"symbol": "XRP", "name": "Ripple", "price": 0.52, "market_cap": 28.1e9, "volume": 1.1e9, "change": -1.45},
    {"symbol": "DOGE", "name": "Dogecoin", "price": 0.082, "market_cap": 11.6e9, "volume": 680.0e6, "change": 5.67},
    {"symbol": "AVAX", "name": "Avalanche", "price": 35.20, "market_cap": 13.2e9, "volume": 450.0e6, "change": -2.10},
    {"symbol": "DOT", "name": "Polkadot", "price": 7.15, "market_cap": 9.8e9, "volume": 320.0e6, "change": 0.45},
]

NEWS_SOURCES = ["CoinDesk", "CoinTelegraph", "Reddit", "Twitter/X", "Bloomberg Crypto", "CryptoSlate"]

HEADLINES = {
    "BTC": [
        "Bitcoin ETF inflows reach record $1.2B in single day",
        "Institutional adoption of Bitcoin accelerates in Q1 2024",
        "Bitcoin mining difficulty hits all-time high",
        "Major bank announces Bitcoin custody services",
        "Bitcoin whale accumulation signals bullish trend",
    ],
    "ETH": [
        "Ethereum Layer 2 solutions see massive growth",
        "ETH staking reaches 30 million coins milestone",
        "Ethereum gas fees drop to lowest in 2 years",
        "Vitalik proposes new scaling roadmap for Ethereum",
        "DeFi total value locked on Ethereum surpasses $100B",
    ],
    "SOL": [
        "Solana network processes 65,000 TPS in stress test",
        "Major NFT marketplace migrates to Solana",
        "Solana DeFi ecosystem grows 200% in Q1",
        "Solana faces brief network outage, recovers quickly",
        "New Solana phone launch boosts ecosystem adoption",
    ],
    "ADA": [
        "Cardano Hydra upgrade shows promising scalability results",
        "Cardano smart contract activity surges 150%",
        "ADA staking rewards attract institutional investors",
    ],
    "XRP": [
        "Ripple wins key legal battle, XRP price surges",
        "XRP Ledger CBDC pilot program expands to 5 countries",
        "Ripple partners with major Asian bank for cross-border payments",
    ],
    "DOGE": [
        "Dogecoin integration with major payment processor announced",
        "DOGE community raises $2M for charitable causes",
        "Elon Musk tweet sends Dogecoin volume soaring",
    ],
    "AVAX": [
        "Avalanche subnet adoption grows among enterprises",
        "Major gaming studio launches on Avalanche blockchain",
    ],
    "DOT": [
        "Polkadot parachain auctions attract record participation",
        "DOT governance proposal introduces new staking mechanics",
    ],
}


def seed_database():
    db = SessionLocal()
    try:
        # Check if already seeded
        existing = db.query(Asset).first()
        if existing:
            print("Database already has data. Clearing and re-seeding...")
            db.query(SentimentLog).delete()
            db.query(PriceHistory).delete()
            db.query(Asset).delete()
            db.commit()

        now = datetime.now(timezone.utc)

        # Insert assets
        asset_objects = {}
        for a in ASSETS:
            asset = Asset(
                symbol=a["symbol"],
                name=a["name"],
                current_price=a["price"],
                market_cap=a["market_cap"],
                volume_24h=a["volume"],
                change_24h=a["change"],
                last_updated=now,
            )
            db.add(asset)
            db.flush()
            asset_objects[a["symbol"]] = asset
        print(f"Inserted {len(ASSETS)} assets.")

        # Generate price history (24h of hourly data for each asset)
        price_count = 0
        for a in ASSETS:
            asset = asset_objects[a["symbol"]]
            base_price = a["price"]
            for hours_ago in range(24, -1, -1):
                # Random walk around base price
                noise = random.uniform(-0.03, 0.03)
                price = base_price * (1 + noise * (hours_ago / 24))
                volume = a["volume"] * random.uniform(0.8, 1.2)

                ph = PriceHistory(
                    asset_id=asset.id,
                    price=round(price, 4),
                    volume=round(volume, 2),
                    market_cap=a["market_cap"] * (price / base_price),
                    recorded_at=now - timedelta(hours=hours_ago),
                )
                db.add(ph)
                price_count += 1
        print(f"Inserted {price_count} price history records.")

        # Generate sentiment logs
        sentiment_count = 0
        for symbol, headlines in HEADLINES.items():
            asset = asset_objects[symbol]
            for i, headline in enumerate(headlines):
                score = random.uniform(-0.8, 0.9)
                source = random.choice(NEWS_SOURCES)
                hours_ago = random.randint(0, 23)

                log = SentimentLog(
                    asset_id=asset.id,
                    score=round(score, 2),
                    source=source,
                    headline=headline,
                    url=None,
                    analyzed_at=now - timedelta(hours=hours_ago, minutes=random.randint(0, 59)),
                )
                db.add(log)
                sentiment_count += 1
        print(f"Inserted {sentiment_count} sentiment logs.")

        db.commit()
        print("\nSeed completed successfully!")
        print(f"Total: {len(ASSETS)} assets, {price_count} price records, {sentiment_count} sentiment logs")

    finally:
        db.close()


if __name__ == "__main__":
    seed_database()
