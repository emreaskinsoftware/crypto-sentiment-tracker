import logging
from datetime import datetime, timezone

from sqlalchemy.orm import Session

from app.core.database import SessionLocal
from app.models.asset import Asset
from app.models.sentiment_log import SentimentLog
from app.services.finbert_analyzer import analyze_sentiment
from app.services.news_fetcher import NewsItem, fetch_all_news

logger = logging.getLogger(__name__)


def analyze_and_save(item: NewsItem, db: Session) -> bool:
    """Analyze sentiment for a single news item and persist to sentiment_logs. Returns True on success."""
    try:
        asset = db.query(Asset).filter(Asset.symbol == item.symbol).first()
        if not asset:
            logger.debug("No asset for symbol %s, skipping", item.symbol)
            return False

        score = analyze_sentiment(item.title)

        log = SentimentLog(
            asset_id=asset.id,
            score=score,
            source=item.source,
            headline=item.title,
            url=item.url or None,
            analyzed_at=datetime.now(timezone.utc),
        )
        db.add(log)
        db.commit()
        logger.debug("Saved sentiment %.4f for [%s] '%s'", score, item.symbol, item.title[:60])
        return True
    except Exception as exc:
        logger.error("Failed to process '%s': %s", item.title[:60], exc)
        db.rollback()
        return False


def run_sentiment_pipeline(db: Session | None = None) -> dict:
    """
    Full pipeline: fetch news -> FinBERT analysis -> save to sentiment_logs.

    Returns stats dict: fetched, with_symbol, saved, failed.
    Pass an existing Session for testing; omit to create and auto-close one.
    """
    close_db = db is None
    if db is None:
        db = SessionLocal()

    try:
        news_items = fetch_all_news()
        with_symbol = [item for item in news_items if item.symbol]

        stats = {
            "fetched": len(news_items),
            "with_symbol": len(with_symbol),
            "saved": 0,
            "failed": 0,
        }

        for item in with_symbol:
            if analyze_and_save(item, db):
                stats["saved"] += 1
            else:
                stats["failed"] += 1

        logger.info(
            "Sentiment pipeline done — fetched=%d, with_symbol=%d, saved=%d, failed=%d",
            stats["fetched"], stats["with_symbol"], stats["saved"], stats["failed"],
        )
        return stats
    finally:
        if close_db:
            db.close()
