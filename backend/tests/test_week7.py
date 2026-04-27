"""
Hafta 7 — Celery + Redis Cron Job Testleri
Saatlik otomatik veri cekme ve duygu analizi gorevleri
"""
import unittest
from unittest.mock import MagicMock, patch

from celery.schedules import crontab

from app.worker.celery_app import celery_app
from app.worker.tasks import fetch_prices_task, run_full_pipeline_task, run_sentiment_task

# Testlerde Redis'e baglanmadan gorevleri senkron calistir
celery_app.conf.task_always_eager = True
celery_app.conf.task_eager_propagates = True


PRICE_STATS = {"fetched": 5, "saved": 5, "failed": 0}
SENTIMENT_STATS = {"fetched": 30, "with_symbol": 20, "saved": 18, "failed": 2}


class TestCeleryConfig(unittest.TestCase):

    def test_celery_app_name(self):
        self.assertEqual(celery_app.main, "crypto_sentiment")

    def test_timezone_is_utc(self):
        self.assertEqual(celery_app.conf.timezone, "UTC")

    def test_utc_enabled(self):
        self.assertTrue(celery_app.conf.enable_utc)

    def test_tasks_module_included(self):
        self.assertIn("app.worker.tasks", celery_app.conf.include)

    def test_broker_url_configured(self):
        self.assertIsNotNone(celery_app.conf.broker_url)
        self.assertIn("redis://", celery_app.conf.broker_url)

    def test_result_backend_configured(self):
        self.assertIsNotNone(celery_app.conf.result_backend)
        self.assertIn("redis://", celery_app.conf.result_backend)


class TestBeatSchedule(unittest.TestCase):

    def setUp(self):
        self.schedule = celery_app.conf.beat_schedule

    def test_fetch_prices_task_registered(self):
        self.assertIn("fetch-prices-hourly", self.schedule)

    def test_run_sentiment_task_registered(self):
        self.assertIn("run-sentiment-hourly", self.schedule)

    def test_fetch_prices_task_name_correct(self):
        entry = self.schedule["fetch-prices-hourly"]
        self.assertEqual(entry["task"], "app.worker.tasks.fetch_prices_task")

    def test_run_sentiment_task_name_correct(self):
        entry = self.schedule["run-sentiment-hourly"]
        self.assertEqual(entry["task"], "app.worker.tasks.run_sentiment_task")

    def test_fetch_prices_runs_at_minute_zero(self):
        schedule = self.schedule["fetch-prices-hourly"]["schedule"]
        self.assertIsInstance(schedule, crontab)
        self.assertEqual(int(schedule._orig_minute), 0)

    def test_sentiment_runs_at_minute_five(self):
        schedule = self.schedule["run-sentiment-hourly"]["schedule"]
        self.assertIsInstance(schedule, crontab)
        self.assertEqual(int(schedule._orig_minute), 5)

    def test_sentiment_runs_after_prices(self):
        """Duygu analizi fiyatlardan sonra (dakika 5) calisir."""
        price_minute = int(self.schedule["fetch-prices-hourly"]["schedule"]._orig_minute)
        sentiment_minute = int(self.schedule["run-sentiment-hourly"]["schedule"]._orig_minute)
        self.assertGreater(sentiment_minute, price_minute)

    def test_two_scheduled_tasks_exist(self):
        self.assertEqual(len(self.schedule), 2)


class TestFetchPricesTask(unittest.TestCase):

    def test_task_calls_run_price_pipeline(self):
        with patch("app.worker.tasks.run_price_pipeline", return_value=PRICE_STATS) as mock:
            fetch_prices_task.apply()
        mock.assert_called_once()

    def test_task_returns_price_stats(self):
        with patch("app.worker.tasks.run_price_pipeline", return_value=PRICE_STATS):
            result = fetch_prices_task.apply()
        self.assertEqual(result.result, PRICE_STATS)

    def test_task_result_has_fetched_key(self):
        with patch("app.worker.tasks.run_price_pipeline", return_value=PRICE_STATS):
            result = fetch_prices_task.apply()
        self.assertIn("fetched", result.result)

    def test_task_result_has_saved_key(self):
        with patch("app.worker.tasks.run_price_pipeline", return_value=PRICE_STATS):
            result = fetch_prices_task.apply()
        self.assertIn("saved", result.result)

    def test_task_result_has_failed_key(self):
        with patch("app.worker.tasks.run_price_pipeline", return_value=PRICE_STATS):
            result = fetch_prices_task.apply()
        self.assertIn("failed", result.result)

    def test_task_propagates_exception(self):
        with patch("app.worker.tasks.run_price_pipeline", side_effect=RuntimeError("network down")):
            with self.assertRaises(RuntimeError):
                fetch_prices_task.apply()

    def test_task_name_is_registered(self):
        self.assertEqual(fetch_prices_task.name, "app.worker.tasks.fetch_prices_task")


class TestRunSentimentTask(unittest.TestCase):

    def test_task_calls_run_sentiment_pipeline(self):
        mock_db = MagicMock()
        with patch("app.worker.tasks.SessionLocal", return_value=mock_db), \
             patch("app.worker.tasks.run_sentiment_pipeline", return_value=SENTIMENT_STATS) as mock_pipeline:
            run_sentiment_task.apply()
        mock_pipeline.assert_called_once_with(mock_db)

    def test_task_returns_sentiment_stats(self):
        mock_db = MagicMock()
        with patch("app.worker.tasks.SessionLocal", return_value=mock_db), \
             patch("app.worker.tasks.run_sentiment_pipeline", return_value=SENTIMENT_STATS):
            result = run_sentiment_task.apply()
        self.assertEqual(result.result, SENTIMENT_STATS)

    def test_task_closes_db_on_success(self):
        mock_db = MagicMock()
        with patch("app.worker.tasks.SessionLocal", return_value=mock_db), \
             patch("app.worker.tasks.run_sentiment_pipeline", return_value=SENTIMENT_STATS):
            run_sentiment_task.apply()
        mock_db.close.assert_called_once()

    def test_task_closes_db_on_exception(self):
        mock_db = MagicMock()
        with patch("app.worker.tasks.SessionLocal", return_value=mock_db), \
             patch("app.worker.tasks.run_sentiment_pipeline", side_effect=Exception("FinBERT error")):
            try:
                run_sentiment_task.apply()
            except Exception:
                pass
        mock_db.close.assert_called_once()

    def test_task_result_has_with_symbol_key(self):
        mock_db = MagicMock()
        with patch("app.worker.tasks.SessionLocal", return_value=mock_db), \
             patch("app.worker.tasks.run_sentiment_pipeline", return_value=SENTIMENT_STATS):
            result = run_sentiment_task.apply()
        self.assertIn("with_symbol", result.result)

    def test_task_name_is_registered(self):
        self.assertEqual(run_sentiment_task.name, "app.worker.tasks.run_sentiment_task")


class TestRunFullPipelineTask(unittest.TestCase):

    def test_task_calls_both_pipelines(self):
        mock_db = MagicMock()
        with patch("app.worker.tasks.run_price_pipeline", return_value=PRICE_STATS) as mock_price, \
             patch("app.worker.tasks.SessionLocal", return_value=mock_db), \
             patch("app.worker.tasks.run_sentiment_pipeline", return_value=SENTIMENT_STATS) as mock_sentiment:
            run_full_pipeline_task.apply()
        mock_price.assert_called_once()
        mock_sentiment.assert_called_once()

    def test_task_returns_combined_stats(self):
        mock_db = MagicMock()
        with patch("app.worker.tasks.run_price_pipeline", return_value=PRICE_STATS), \
             patch("app.worker.tasks.SessionLocal", return_value=mock_db), \
             patch("app.worker.tasks.run_sentiment_pipeline", return_value=SENTIMENT_STATS):
            result = run_full_pipeline_task.apply()
        self.assertEqual(result.result["prices"], PRICE_STATS)
        self.assertEqual(result.result["sentiment"], SENTIMENT_STATS)

    def test_task_result_has_prices_key(self):
        mock_db = MagicMock()
        with patch("app.worker.tasks.run_price_pipeline", return_value=PRICE_STATS), \
             patch("app.worker.tasks.SessionLocal", return_value=mock_db), \
             patch("app.worker.tasks.run_sentiment_pipeline", return_value=SENTIMENT_STATS):
            result = run_full_pipeline_task.apply()
        self.assertIn("prices", result.result)

    def test_task_result_has_sentiment_key(self):
        mock_db = MagicMock()
        with patch("app.worker.tasks.run_price_pipeline", return_value=PRICE_STATS), \
             patch("app.worker.tasks.SessionLocal", return_value=mock_db), \
             patch("app.worker.tasks.run_sentiment_pipeline", return_value=SENTIMENT_STATS):
            result = run_full_pipeline_task.apply()
        self.assertIn("sentiment", result.result)

    def test_task_closes_db_after_sentiment(self):
        mock_db = MagicMock()
        with patch("app.worker.tasks.run_price_pipeline", return_value=PRICE_STATS), \
             patch("app.worker.tasks.SessionLocal", return_value=mock_db), \
             patch("app.worker.tasks.run_sentiment_pipeline", return_value=SENTIMENT_STATS):
            run_full_pipeline_task.apply()
        mock_db.close.assert_called_once()

    def test_task_name_is_registered(self):
        self.assertEqual(run_full_pipeline_task.name, "app.worker.tasks.run_full_pipeline_task")


if __name__ == "__main__":
    unittest.main()
