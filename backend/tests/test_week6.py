"""
Hafta 6 — Sentiment Pipeline Tests
Haber metinleri -> FinBERT -> sentiment_logs tablosuna kayit
"""
import unittest
from datetime import datetime
from unittest.mock import MagicMock, call, patch

from app.services.news_fetcher import NewsItem
from app.services.sentiment_pipeline import analyze_and_save, run_sentiment_pipeline


def _make_item(symbol="BTC", title="Bitcoin surges to new ATH", url="https://coindesk.com/1", source="CoinDesk"):
    return NewsItem(title=title, url=url, source=source, symbol=symbol)


def _make_db(asset_id=1):
    """Return a mock Session where asset lookup succeeds by default."""
    db = MagicMock()
    asset = MagicMock()
    asset.id = asset_id
    db.query.return_value.filter.return_value.first.return_value = asset
    return db


class TestAnalyzeAndSave(unittest.TestCase):

    def test_returns_true_on_success(self):
        db = _make_db()
        with patch("app.services.sentiment_pipeline.analyze_sentiment", return_value=0.75):
            result = analyze_and_save(_make_item(), db)
        self.assertTrue(result)

    def test_commits_to_db_on_success(self):
        db = _make_db()
        with patch("app.services.sentiment_pipeline.analyze_sentiment", return_value=0.5):
            analyze_and_save(_make_item(), db)
        db.add.assert_called_once()
        db.commit.assert_called_once()

    def test_returns_false_when_asset_not_found(self):
        db = MagicMock()
        db.query.return_value.filter.return_value.first.return_value = None
        with patch("app.services.sentiment_pipeline.analyze_sentiment", return_value=0.5):
            result = analyze_and_save(_make_item(), db)
        self.assertFalse(result)
        db.add.assert_not_called()

    def test_does_not_commit_when_asset_not_found(self):
        db = MagicMock()
        db.query.return_value.filter.return_value.first.return_value = None
        with patch("app.services.sentiment_pipeline.analyze_sentiment", return_value=0.5):
            analyze_and_save(_make_item(), db)
        db.commit.assert_not_called()

    def test_saved_log_has_correct_score(self):
        db = _make_db()
        saved = []
        db.add.side_effect = saved.append

        with patch("app.services.sentiment_pipeline.analyze_sentiment", return_value=-0.42):
            analyze_and_save(_make_item(), db)

        self.assertEqual(len(saved), 1)
        self.assertAlmostEqual(saved[0].score, -0.42)

    def test_saved_log_headline_matches_title(self):
        db = _make_db()
        saved = []
        db.add.side_effect = saved.append

        item = _make_item(title="ETH breaks $3000 barrier")
        with patch("app.services.sentiment_pipeline.analyze_sentiment", return_value=0.6):
            analyze_and_save(item, db)

        self.assertEqual(saved[0].headline, "ETH breaks $3000 barrier")

    def test_saved_log_source_and_url(self):
        db = _make_db()
        saved = []
        db.add.side_effect = saved.append

        item = _make_item(source="CoinTelegraph", url="https://cointelegraph.com/news/1")
        with patch("app.services.sentiment_pipeline.analyze_sentiment", return_value=0.3):
            analyze_and_save(item, db)

        self.assertEqual(saved[0].source, "CoinTelegraph")
        self.assertEqual(saved[0].url, "https://cointelegraph.com/news/1")

    def test_saved_log_analyzed_at_is_datetime(self):
        db = _make_db()
        saved = []
        db.add.side_effect = saved.append

        with patch("app.services.sentiment_pipeline.analyze_sentiment", return_value=0.1):
            analyze_and_save(_make_item(), db)

        self.assertIsInstance(saved[0].analyzed_at, datetime)

    def test_saved_log_asset_id_matches(self):
        db = _make_db(asset_id=42)
        saved = []
        db.add.side_effect = saved.append

        with patch("app.services.sentiment_pipeline.analyze_sentiment", return_value=0.0):
            analyze_and_save(_make_item(), db)

        self.assertEqual(saved[0].asset_id, 42)

    def test_rollback_called_on_commit_exception(self):
        db = _make_db()
        db.commit.side_effect = Exception("DB timeout")

        with patch("app.services.sentiment_pipeline.analyze_sentiment", return_value=0.5):
            result = analyze_and_save(_make_item(), db)

        self.assertFalse(result)
        db.rollback.assert_called_once()

    def test_returns_false_on_analyze_exception(self):
        db = _make_db()

        with patch("app.services.sentiment_pipeline.analyze_sentiment", side_effect=RuntimeError("model error")):
            result = analyze_and_save(_make_item(), db)

        self.assertFalse(result)
        db.rollback.assert_called_once()

    def test_negative_score_saved_correctly(self):
        db = _make_db()
        saved = []
        db.add.side_effect = saved.append

        with patch("app.services.sentiment_pipeline.analyze_sentiment", return_value=-1.0):
            analyze_and_save(_make_item(), db)

        self.assertAlmostEqual(saved[0].score, -1.0)

    def test_neutral_score_saved_correctly(self):
        db = _make_db()
        saved = []
        db.add.side_effect = saved.append

        with patch("app.services.sentiment_pipeline.analyze_sentiment", return_value=0.0):
            analyze_and_save(_make_item(), db)

        self.assertAlmostEqual(saved[0].score, 0.0)


class TestRunSentimentPipeline(unittest.TestCase):

    def test_stats_dict_has_required_keys(self):
        db = _make_db()
        with patch("app.services.sentiment_pipeline.fetch_all_news", return_value=[]):
            stats = run_sentiment_pipeline(db)
        for key in ("fetched", "with_symbol", "saved", "failed"):
            self.assertIn(key, stats)

    def test_empty_news_returns_zero_stats(self):
        db = _make_db()
        with patch("app.services.sentiment_pipeline.fetch_all_news", return_value=[]):
            stats = run_sentiment_pipeline(db)
        self.assertEqual(stats["fetched"], 0)
        self.assertEqual(stats["with_symbol"], 0)
        self.assertEqual(stats["saved"], 0)
        self.assertEqual(stats["failed"], 0)

    def test_all_items_with_symbol_saved(self):
        db = _make_db()
        news = [_make_item(sym) for sym in ["BTC", "ETH", "SOL"]]
        with patch("app.services.sentiment_pipeline.fetch_all_news", return_value=news), \
             patch("app.services.sentiment_pipeline.analyze_sentiment", return_value=0.5):
            stats = run_sentiment_pipeline(db)
        self.assertEqual(stats["fetched"], 3)
        self.assertEqual(stats["with_symbol"], 3)
        self.assertEqual(stats["saved"], 3)
        self.assertEqual(stats["failed"], 0)

    def test_items_without_symbol_skipped(self):
        db = _make_db()
        news = [
            _make_item("BTC"),
            NewsItem(title="General market news", url="http://x.com", source="CoinDesk", symbol=None),
            _make_item("ETH"),
        ]
        with patch("app.services.sentiment_pipeline.fetch_all_news", return_value=news), \
             patch("app.services.sentiment_pipeline.analyze_sentiment", return_value=0.3):
            stats = run_sentiment_pipeline(db)
        self.assertEqual(stats["fetched"], 3)
        self.assertEqual(stats["with_symbol"], 2)
        self.assertEqual(stats["saved"], 2)

    def test_failed_saves_counted_correctly(self):
        db = _make_db()
        db.commit.side_effect = Exception("DB failure")
        news = [_make_item(sym) for sym in ["BTC", "ETH"]]
        with patch("app.services.sentiment_pipeline.fetch_all_news", return_value=news), \
             patch("app.services.sentiment_pipeline.analyze_sentiment", return_value=0.2):
            stats = run_sentiment_pipeline(db)
        self.assertEqual(stats["failed"], 2)
        self.assertEqual(stats["saved"], 0)

    def test_partial_failure_counted(self):
        """First item succeeds, second fails, third succeeds."""
        db = _make_db()
        call_count = [0]
        original_commit = db.commit

        def conditional_commit():
            call_count[0] += 1
            if call_count[0] == 2:
                raise Exception("intermittent error")

        db.commit.side_effect = conditional_commit
        news = [_make_item(sym) for sym in ["BTC", "ETH", "SOL"]]

        with patch("app.services.sentiment_pipeline.fetch_all_news", return_value=news), \
             patch("app.services.sentiment_pipeline.analyze_sentiment", return_value=0.4):
            stats = run_sentiment_pipeline(db)

        self.assertEqual(stats["saved"], 2)
        self.assertEqual(stats["failed"], 1)

    def test_score_range_all_within_bounds(self):
        db = _make_db()
        saved_scores = []

        def capture_add(log):
            saved_scores.append(log.score)

        db.add.side_effect = capture_add
        news = [_make_item(sym) for sym in ["BTC", "ETH", "BNB", "SOL", "XRP"]]
        sentiments = [0.9, -0.8, 0.1, -0.3, 0.6]

        with patch("app.services.sentiment_pipeline.fetch_all_news", return_value=news), \
             patch("app.services.sentiment_pipeline.analyze_sentiment", side_effect=sentiments):
            run_sentiment_pipeline(db)

        for score in saved_scores:
            self.assertGreaterEqual(score, -1.0)
            self.assertLessEqual(score, 1.0)

    def test_analyze_sentiment_called_per_item(self):
        db = _make_db()
        news = [_make_item("BTC", "BTC up"), _make_item("ETH", "ETH down")]

        with patch("app.services.sentiment_pipeline.fetch_all_news", return_value=news), \
             patch("app.services.sentiment_pipeline.analyze_sentiment", return_value=0.0) as mock_analyze:
            run_sentiment_pipeline(db)

        self.assertEqual(mock_analyze.call_count, 2)

    def test_analyze_sentiment_receives_headline_text(self):
        db = _make_db()
        news = [_make_item("BTC", "Bitcoin ATH incoming")]

        with patch("app.services.sentiment_pipeline.fetch_all_news", return_value=news), \
             patch("app.services.sentiment_pipeline.analyze_sentiment", return_value=0.7) as mock_analyze:
            run_sentiment_pipeline(db)

        mock_analyze.assert_called_once_with("Bitcoin ATH incoming")

    def test_db_commit_called_for_each_saved_item(self):
        db = _make_db()
        news = [_make_item(sym) for sym in ["BTC", "ETH", "SOL"]]

        with patch("app.services.sentiment_pipeline.fetch_all_news", return_value=news), \
             patch("app.services.sentiment_pipeline.analyze_sentiment", return_value=0.5):
            run_sentiment_pipeline(db)

        self.assertEqual(db.commit.call_count, 3)


if __name__ == "__main__":
    unittest.main()
