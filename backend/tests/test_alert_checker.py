"""
Alarm Checker + SMTP E-posta Testleri
Arka planda çalışan alarm koşul tarayıcısı ve e-posta servisi
"""
import unittest
from datetime import datetime, timedelta, timezone
from unittest.mock import MagicMock, patch, call

from app.services.alert_checker import (
    _evaluate_condition,
    _is_in_cooldown,
    _get_latest_sentiment,
    check_alerts,
)
from app.services.email_service import _build_alert_email, send_alert_email
from app.worker.celery_app import celery_app
from app.worker.tasks import check_alerts_task

celery_app.conf.task_always_eager = True
celery_app.conf.task_eager_propagates = True

NOW = datetime(2026, 5, 6, 12, 0, 0, tzinfo=timezone.utc)


# ── Helpers ───────────────────────────────────────────────────────────────────

def _make_alert(condition_type="sentiment_below", threshold=-0.5,
                is_active=True, last_triggered_at=None, asset_id=1, user_id=1, alert_id=1):
    a = MagicMock()
    a.id = alert_id
    a.condition_type = condition_type
    a.threshold = threshold
    a.is_active = is_active
    a.last_triggered_at = last_triggered_at
    a.asset_id = asset_id
    a.user_id = user_id
    return a


def _make_asset(symbol="BTC", price=67000.0, asset_id=1):
    a = MagicMock()
    a.id = asset_id
    a.symbol = symbol
    a.current_price = price
    return a


def _make_user(email="test@example.com", full_name="Test User", user_id=1):
    u = MagicMock()
    u.id = user_id
    u.email = email
    u.full_name = full_name
    return u


def _make_db(alerts=None, asset=None, user=None, sentiment_score=None):
    db = MagicMock()
    # Alert query
    db.query.return_value.filter.return_value.all.return_value = alerts or []
    # Chained queries for asset/user/sentiment
    db.query.return_value.filter.return_value.first.side_effect = [
        asset,
        user,
    ]
    return db


# ===========================================================================
# _evaluate_condition Tests
# ===========================================================================

class TestEvaluateCondition(unittest.TestCase):

    def test_sentiment_below_triggered(self):
        alert = _make_alert("sentiment_below", threshold=-0.5)
        asset = _make_asset()
        self.assertTrue(_evaluate_condition(alert, asset, -0.7))

    def test_sentiment_below_not_triggered(self):
        alert = _make_alert("sentiment_below", threshold=-0.5)
        asset = _make_asset()
        self.assertFalse(_evaluate_condition(alert, asset, -0.3))

    def test_sentiment_below_equal_not_triggered(self):
        alert = _make_alert("sentiment_below", threshold=-0.5)
        asset = _make_asset()
        self.assertFalse(_evaluate_condition(alert, asset, -0.5))

    def test_sentiment_above_triggered(self):
        alert = _make_alert("sentiment_above", threshold=0.7)
        asset = _make_asset()
        self.assertTrue(_evaluate_condition(alert, asset, 0.9))

    def test_sentiment_above_not_triggered(self):
        alert = _make_alert("sentiment_above", threshold=0.7)
        asset = _make_asset()
        self.assertFalse(_evaluate_condition(alert, asset, 0.5))

    def test_price_below_triggered(self):
        alert = _make_alert("price_below", threshold=60000.0)
        asset = _make_asset(price=55000.0)
        self.assertTrue(_evaluate_condition(alert, asset, None))

    def test_price_above_triggered(self):
        alert = _make_alert("price_above", threshold=70000.0)
        asset = _make_asset(price=75000.0)
        self.assertTrue(_evaluate_condition(alert, asset, None))

    def test_price_above_not_triggered(self):
        alert = _make_alert("price_above", threshold=70000.0)
        asset = _make_asset(price=65000.0)
        self.assertFalse(_evaluate_condition(alert, asset, None))

    def test_sentiment_none_returns_false(self):
        alert = _make_alert("sentiment_below", threshold=-0.5)
        asset = _make_asset()
        self.assertFalse(_evaluate_condition(alert, asset, None))

    def test_unknown_condition_returns_false(self):
        alert = _make_alert("unknown_condition", threshold=0.0)
        asset = _make_asset()
        self.assertFalse(_evaluate_condition(alert, asset, 0.5))


# ===========================================================================
# _is_in_cooldown Tests
# ===========================================================================

class TestCooldown(unittest.TestCase):

    def test_never_triggered_not_in_cooldown(self):
        alert = _make_alert(last_triggered_at=None)
        self.assertFalse(_is_in_cooldown(alert, NOW))

    def test_triggered_55min_ago_in_cooldown(self):
        alert = _make_alert(last_triggered_at=NOW - timedelta(minutes=55))
        self.assertTrue(_is_in_cooldown(alert, NOW))

    def test_triggered_61min_ago_not_in_cooldown(self):
        alert = _make_alert(last_triggered_at=NOW - timedelta(minutes=61))
        self.assertFalse(_is_in_cooldown(alert, NOW))

    def test_triggered_exactly_1h_not_in_cooldown(self):
        alert = _make_alert(last_triggered_at=NOW - timedelta(hours=1))
        self.assertFalse(_is_in_cooldown(alert, NOW))


# ===========================================================================
# check_alerts Tests
# ===========================================================================

class TestCheckAlerts(unittest.TestCase):

    def _run_with_single_alert(self, alert, asset, user, sentiment_score,
                                email_success=True):
        db = MagicMock()
        # Active alerts query
        db.query.return_value.filter.return_value.all.return_value = [alert]

        # Queries for asset, sentiment, user (in order called in check_alerts)
        sentinel_log = MagicMock()
        sentinel_log.score = sentiment_score if sentiment_score is not None else 0.0

        def query_first_side_effect(*args, **kwargs):
            return asset

        db.query.return_value.filter.return_value.first.side_effect = [
            asset, sentinel_log if sentiment_score is not None else None, user
        ]

        with patch("app.services.alert_checker._get_latest_sentiment",
                   return_value=sentiment_score), \
             patch("app.services.alert_checker.send_alert_email",
                   return_value=email_success) as mock_email:
            stats = check_alerts(db)
        return stats, mock_email

    def test_alert_triggered_increments_triggered(self):
        alert = _make_alert("sentiment_below", threshold=-0.5)
        asset = _make_asset()
        user = _make_user()
        db = MagicMock()
        db.query.return_value.filter.return_value.all.return_value = [alert]
        db.query.return_value.filter.return_value.first.side_effect = [asset, user]

        with patch("app.services.alert_checker._get_latest_sentiment", return_value=-0.8), \
             patch("app.services.alert_checker.send_alert_email", return_value=True):
            stats = check_alerts(db)

        self.assertEqual(stats["triggered"], 1)
        self.assertEqual(stats["checked"], 1)

    def test_condition_not_met_no_email(self):
        alert = _make_alert("sentiment_below", threshold=-0.5)
        asset = _make_asset()
        db = MagicMock()
        db.query.return_value.filter.return_value.all.return_value = [alert]
        db.query.return_value.filter.return_value.first.return_value = asset

        with patch("app.services.alert_checker._get_latest_sentiment", return_value=-0.3), \
             patch("app.services.alert_checker.send_alert_email") as mock_email:
            stats = check_alerts(db)

        mock_email.assert_not_called()
        self.assertEqual(stats["triggered"], 0)

    def test_cooldown_skips_alert(self):
        alert = _make_alert(last_triggered_at=NOW - timedelta(minutes=30))
        db = MagicMock()
        db.query.return_value.filter.return_value.all.return_value = [alert]

        with patch("app.services.alert_checker.datetime") as mock_dt, \
             patch("app.services.alert_checker.send_alert_email") as mock_email:
            mock_dt.now.return_value = NOW
            stats = check_alerts(db)

        mock_email.assert_not_called()
        self.assertEqual(stats["skipped_cooldown"], 1)

    def test_email_failure_increments_failed(self):
        alert = _make_alert("sentiment_below", threshold=-0.5)
        asset = _make_asset()
        user = _make_user()
        db = MagicMock()
        db.query.return_value.filter.return_value.all.return_value = [alert]
        db.query.return_value.filter.return_value.first.side_effect = [asset, user]

        with patch("app.services.alert_checker._get_latest_sentiment", return_value=-0.9), \
             patch("app.services.alert_checker.send_alert_email", return_value=False):
            stats = check_alerts(db)

        self.assertEqual(stats["failed"], 1)
        self.assertEqual(stats["triggered"], 0)

    def test_triggered_alert_last_triggered_at_updated(self):
        alert = _make_alert("sentiment_below", threshold=-0.5)
        asset = _make_asset()
        user = _make_user()
        db = MagicMock()
        db.query.return_value.filter.return_value.all.return_value = [alert]
        db.query.return_value.filter.return_value.first.side_effect = [asset, user]

        with patch("app.services.alert_checker._get_latest_sentiment", return_value=-0.9), \
             patch("app.services.alert_checker.send_alert_email", return_value=True):
            check_alerts(db)

        self.assertIsNotNone(alert.last_triggered_at)
        db.commit.assert_called()

    def test_no_alerts_returns_zero_stats(self):
        db = MagicMock()
        db.query.return_value.filter.return_value.all.return_value = []
        stats = check_alerts(db)
        self.assertEqual(stats["checked"], 0)
        self.assertEqual(stats["triggered"], 0)

    def test_multiple_alerts_counted(self):
        alerts = [
            _make_alert("sentiment_below", threshold=-0.5, alert_id=1),
            _make_alert("price_above", threshold=80000.0, alert_id=2),
        ]
        asset = _make_asset(price=90000.0)
        user = _make_user()
        db = MagicMock()
        db.query.return_value.filter.return_value.all.return_value = alerts
        db.query.return_value.filter.return_value.first.side_effect = [
            asset, user, asset, user
        ]

        with patch("app.services.alert_checker._get_latest_sentiment",
                   side_effect=[-0.8, None]), \
             patch("app.services.alert_checker.send_alert_email", return_value=True):
            stats = check_alerts(db)

        self.assertEqual(stats["checked"], 2)
        self.assertEqual(stats["triggered"], 2)


# ===========================================================================
# email_service Tests
# ===========================================================================

class TestEmailService(unittest.TestCase):

    def test_build_email_subject_contains_symbol(self):
        subject, _ = _build_alert_email("Test", "BTC", "sentiment_below", -0.5, -0.7, 67000.0)
        self.assertIn("BTC", subject)

    def test_build_email_html_contains_username(self):
        _, html = _build_alert_email("Ahmet", "ETH", "sentiment_below", -0.5, -0.7, 3400.0)
        self.assertIn("Ahmet", html)

    def test_build_email_html_contains_symbol(self):
        _, html = _build_alert_email("Test", "SOL", "price_above", 200.0, 250.0, 250.0)
        self.assertIn("SOL", html)

    def test_build_email_all_condition_types(self):
        for ctype in ("sentiment_below", "sentiment_above", "price_below", "price_above"):
            subject, html = _build_alert_email("User", "BTC", ctype, 0.5, 0.6, 67000.0)
            self.assertTrue(len(subject) > 0)
            self.assertTrue(len(html) > 100)

    def test_send_email_smtp_disabled_returns_true(self):
        with patch("app.services.email_service.settings") as mock_settings:
            mock_settings.SMTP_ENABLED = False
            result = send_alert_email(
                "test@example.com", "Test", "BTC",
                "sentiment_below", -0.5, -0.7, 67000.0
            )
        self.assertTrue(result)

    def test_send_email_missing_credentials_returns_false(self):
        with patch("app.services.email_service.settings") as mock_settings:
            mock_settings.SMTP_ENABLED = True
            mock_settings.SMTP_USERNAME = ""
            mock_settings.SMTP_PASSWORD = ""
            result = send_alert_email(
                "test@example.com", "Test", "BTC",
                "sentiment_below", -0.5, -0.7, 67000.0
            )
        self.assertFalse(result)

    def test_send_email_smtp_error_returns_false(self):
        with patch("app.services.email_service.settings") as mock_settings, \
             patch("app.services.email_service.smtplib.SMTP") as mock_smtp:
            mock_settings.SMTP_ENABLED = True
            mock_settings.SMTP_USERNAME = "user@gmail.com"
            mock_settings.SMTP_PASSWORD = "password"
            mock_settings.SMTP_FROM_EMAIL = "user@gmail.com"
            mock_settings.SMTP_HOST = "smtp.gmail.com"
            mock_settings.SMTP_PORT = 587
            mock_smtp.return_value.__enter__.side_effect = Exception("connection refused")
            result = send_alert_email(
                "dest@example.com", "Test", "BTC",
                "sentiment_below", -0.5, -0.7, 67000.0
            )
        self.assertFalse(result)

    def test_send_email_smtp_success(self):
        with patch("app.services.email_service.settings") as mock_settings, \
             patch("app.services.email_service.smtplib.SMTP") as mock_smtp:
            mock_settings.SMTP_ENABLED = True
            mock_settings.SMTP_USERNAME = "user@gmail.com"
            mock_settings.SMTP_PASSWORD = "password"
            mock_settings.SMTP_FROM_EMAIL = "user@gmail.com"
            mock_settings.SMTP_HOST = "smtp.gmail.com"
            mock_settings.SMTP_PORT = 587
            mock_smtp.return_value.__enter__ = MagicMock(
                return_value=MagicMock(starttls=MagicMock(), login=MagicMock(),
                                       sendmail=MagicMock()))
            mock_smtp.return_value.__exit__ = MagicMock(return_value=False)
            result = send_alert_email(
                "dest@example.com", "Test", "BTC",
                "sentiment_below", -0.5, -0.7, 67000.0
            )
        self.assertTrue(result)


# ===========================================================================
# Celery Task + Beat Schedule Tests
# ===========================================================================

class TestCheckAlertsTask(unittest.TestCase):

    def test_task_registered(self):
        self.assertEqual(check_alerts_task.name, "app.worker.tasks.check_alerts_task")

    def test_task_calls_run_alert_checker(self):
        mock_db = MagicMock()
        with patch("app.worker.tasks.SessionLocal", return_value=mock_db), \
             patch("app.worker.tasks.run_alert_checker",
                   return_value={"checked": 3, "triggered": 1, "skipped_cooldown": 0, "failed": 0}) as mock_checker:
            result = check_alerts_task.apply()
        mock_checker.assert_called_once_with(mock_db)
        self.assertEqual(result.result["triggered"], 1)

    def test_task_closes_db(self):
        mock_db = MagicMock()
        with patch("app.worker.tasks.SessionLocal", return_value=mock_db), \
             patch("app.worker.tasks.run_alert_checker",
                   return_value={"checked": 0, "triggered": 0, "skipped_cooldown": 0, "failed": 0}):
            check_alerts_task.apply()
        mock_db.close.assert_called_once()

    def test_beat_schedule_has_check_alerts(self):
        schedule = celery_app.conf.beat_schedule
        self.assertIn("check-alerts-15min", schedule)

    def test_check_alerts_runs_at_minute_ten(self):
        from celery.schedules import crontab
        schedule = celery_app.conf.beat_schedule["check-alerts-15min"]["schedule"]
        self.assertIsInstance(schedule, crontab)
        self.assertIn("5", str(schedule._orig_minute))

    def test_check_alerts_runs_after_sentiment(self):
        schedule = celery_app.conf.beat_schedule
        self.assertNotEqual(
            str(schedule["run-sentiment-15min"]["schedule"]._orig_minute),
            str(schedule["check-alerts-15min"]["schedule"]._orig_minute)
        )

    def test_three_scheduled_tasks_exist(self):
        self.assertEqual(len(celery_app.conf.beat_schedule), 3)


if __name__ == "__main__":
    unittest.main()
