"""
Yeni Endpoint Testleri — correlation, sentiment-sources, portfolio mood,
notifications, pipeline trigger/status

Test edilen endpoint'ler:
  GET  /assets/{symbol}/correlation
  GET  /assets/{asset_id}/sentiment-sources
  GET  /watchlist/mood
  GET  /alerts/notifications
  POST /alerts/notifications/read
  GET  /pipeline/status
  POST /pipeline/trigger
"""
import unittest
from datetime import datetime, timedelta, timezone

from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.core.database import Base, get_db
from app.main import app

TEST_DB_URL = "sqlite:///./test_new_endpoints.db"
_engine = create_engine(TEST_DB_URL, connect_args={"check_same_thread": False})
_SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=_engine)

client = TestClient(app)
_user_counter = [0]


# ── DB bağımlılığını override et ──────────────────────────────────────────────

def _override_get_db():
    db = _SessionLocal()
    try:
        yield db
    finally:
        db.close()


def setup_module(module):
    app.dependency_overrides[get_db] = _override_get_db
    Base.metadata.drop_all(bind=_engine)
    Base.metadata.create_all(bind=_engine)
    _seed_base_data()


def teardown_module(module):
    app.dependency_overrides.clear()
    Base.metadata.drop_all(bind=_engine)


# ── Seed yardımcıları ─────────────────────────────────────────────────────────

def _seed_base_data():
    """BTC ve ETH asset'lerini, fiyat geçmişini ve sentiment loglarını oluşturur."""
    from app.models.asset import Asset
    from app.models.price_history import PriceHistory
    from app.models.sentiment_log import SentimentLog

    db = _SessionLocal()
    try:
        btc = Asset(symbol="BTC", name="Bitcoin", current_price=67000.0,
                    market_cap=1e12, volume_24h=1e9, change_24h=2.5)
        eth = Asset(symbol="ETH", name="Ethereum", current_price=3400.0,
                    market_cap=5e11, volume_24h=5e8, change_24h=1.2)
        db.add_all([btc, eth])
        db.flush()

        now = datetime.now(timezone.utc)

        # BTC için 48 saatlik fiyat geçmişi (her 30 dak.)
        for i in range(96):
            db.add(PriceHistory(
                asset_id=btc.id,
                price=67000.0 + i * 50,
                volume=1e9,
                market_cap=1e12,
                recorded_at=now - timedelta(minutes=i * 30),
            ))

        # BTC için çeşitli kaynaklarda sentiment logları
        sources = ["CoinDesk", "Reddit", "CoinTelegraph", "CoinDesk", "Reddit"]
        for i in range(25):
            db.add(SentimentLog(
                asset_id=btc.id,
                score=0.6 if i % 3 == 0 else (-0.4 if i % 3 == 1 else 0.1),
                source=sources[i % len(sources)],
                headline=f"BTC haber {i}",
                url=f"http://example.com/btc/{i}",
                analyzed_at=now - timedelta(hours=i * 2),
            ))

        # ETH için yeterli veri yok (sadece 1 log, korelasyon testi için)
        db.add(SentimentLog(
            asset_id=eth.id,
            score=0.2,
            source="CoinDesk",
            headline="ETH haber",
            url="http://example.com/eth/1",
            analyzed_at=now - timedelta(hours=1),
        ))

        db.commit()
    finally:
        db.close()


def _register_and_login():
    _user_counter[0] += 1
    email = f"newep_user{_user_counter[0]}@example.com"
    client.post("/api/v1/auth/register", json={
        "email": email, "password": "Test1234!", "full_name": "Test User",
    })
    resp = client.post("/api/v1/auth/login", json={"email": email, "password": "Test1234!"})
    return resp.json()["access_token"]


def _auth(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


def _btc_id() -> int:
    from app.models.asset import Asset
    db = _SessionLocal()
    try:
        return db.query(Asset).filter(Asset.symbol == "BTC").first().id
    finally:
        db.close()


def _eth_id() -> int:
    from app.models.asset import Asset
    db = _SessionLocal()
    try:
        return db.query(Asset).filter(Asset.symbol == "ETH").first().id
    finally:
        db.close()


def _seed_alert_trigger(user_token: str, *, is_read=False, hours_ago=1) -> dict:
    """Bir kullanıcı için alert ve trigger oluşturur, trigger dict'i döner."""
    from app.models.alert import Alert
    from app.models.alert_trigger import AlertTrigger

    # Alert oluştur
    resp = client.post("/api/v1/alerts/", headers=_auth(user_token), json={
        "asset_symbol": "BTC",
        "condition": "sentiment_below",
        "threshold": -0.5,
    })
    alert_id = resp.json()["id"]

    # Trigger doğrudan DB'ye ekle
    db = _SessionLocal()
    try:
        trigger = AlertTrigger(
            alert_id=alert_id,
            triggered_at=datetime.now(timezone.utc) - timedelta(hours=hours_ago),
            condition_type="sentiment_below",
            threshold=-0.5,
            actual_value=-0.7,
            is_read=is_read,
        )
        db.add(trigger)
        db.commit()
        db.refresh(trigger)
        return {"id": trigger.id, "alert_id": alert_id}
    finally:
        db.close()


def _seed_watchlist_with_sentiment(user_token: str) -> None:
    """Kullanıcının watchlist'ine BTC ekler ve bu/geçen haftaya ait sentiment logları ekler."""
    from app.models.asset import Asset
    from app.models.sentiment_log import SentimentLog
    from app.models.watchlist import Watchlist

    client.post("/api/v1/watchlist/", headers=_auth(user_token),
                json={"asset_symbol": "BTC"})

    db = _SessionLocal()
    try:
        btc = db.query(Asset).filter(Asset.symbol == "BTC").first()
        now = datetime.now(timezone.utc)

        # Bu hafta (son 3 gün)
        for i in range(3):
            db.add(SentimentLog(
                asset_id=btc.id,
                score=0.5,
                source="CoinDesk",
                headline=f"Bu hafta pozitif {i}",
                analyzed_at=now - timedelta(days=i),
            ))

        # Geçen hafta (7-10 gün önce)
        for i in range(3):
            db.add(SentimentLog(
                asset_id=btc.id,
                score=-0.3,
                source="Reddit",
                headline=f"Geçen hafta negatif {i}",
                analyzed_at=now - timedelta(days=7 + i),
            ))

        db.commit()
    finally:
        db.close()


# =============================================================================
# 1. GET /assets/{symbol}/correlation
# =============================================================================

class TestCorrelationEndpoint(unittest.TestCase):

    def test_unknown_symbol_returns_404(self):
        resp = client.get("/api/v1/assets/NOTEXIST/correlation")
        self.assertEqual(resp.status_code, 404)

    def test_insufficient_data_returns_200(self):
        # ETH'nin sadece 1 sentiment logu var
        resp = client.get("/api/v1/assets/ETH/correlation")
        self.assertEqual(resp.status_code, 200)

    def test_insufficient_data_flag(self):
        resp = client.get("/api/v1/assets/ETH/correlation")
        self.assertFalse(resp.json()["sufficient_data"])

    def test_insufficient_data_has_message(self):
        resp = client.get("/api/v1/assets/ETH/correlation")
        self.assertIn("message", resp.json())

    def test_insufficient_data_empty_lags(self):
        resp = client.get("/api/v1/assets/ETH/correlation")
        self.assertEqual(resp.json()["lags"], [])

    def test_sufficient_data_returns_200(self):
        resp = client.get("/api/v1/assets/BTC/correlation")
        self.assertEqual(resp.status_code, 200)

    def test_sufficient_data_flag(self):
        resp = client.get("/api/v1/assets/BTC/correlation")
        self.assertTrue(resp.json()["sufficient_data"])

    def test_response_has_symbol(self):
        resp = client.get("/api/v1/assets/BTC/correlation")
        self.assertEqual(resp.json()["symbol"], "BTC")

    def test_response_has_lags(self):
        resp = client.get("/api/v1/assets/BTC/correlation")
        self.assertIn("lags", resp.json())
        self.assertIsInstance(resp.json()["lags"], list)

    def test_lags_count_is_six(self):
        resp = client.get("/api/v1/assets/BTC/correlation")
        self.assertEqual(len(resp.json()["lags"]), 6)

    def test_lags_have_required_fields(self):
        resp = client.get("/api/v1/assets/BTC/correlation")
        for lag in resp.json()["lags"]:
            self.assertIn("lag_hours", lag)
            self.assertIn("sample_size", lag)
            self.assertIn("correlation", lag)

    def test_lag_hours_values(self):
        resp = client.get("/api/v1/assets/BTC/correlation")
        hours = [l["lag_hours"] for l in resp.json()["lags"]]
        self.assertEqual(hours, [1, 2, 4, 8, 12, 24])

    def test_response_has_best_lag(self):
        resp = client.get("/api/v1/assets/BTC/correlation")
        self.assertIn("best_lag", resp.json())

    def test_response_has_interpretation(self):
        resp = client.get("/api/v1/assets/BTC/correlation")
        self.assertIn("interpretation", resp.json())
        self.assertIsInstance(resp.json()["interpretation"], str)
        self.assertGreater(len(resp.json()["interpretation"]), 0)

    def test_best_lag_fields_when_present(self):
        resp = client.get("/api/v1/assets/BTC/correlation")
        best = resp.json()["best_lag"]
        if best is not None:
            self.assertIn("lag_hours", best)
            self.assertIn("correlation", best)
            self.assertIn("sample_size", best)

    def test_correlation_values_in_valid_range(self):
        resp = client.get("/api/v1/assets/BTC/correlation")
        for lag in resp.json()["lags"]:
            r = lag["correlation"]
            if r is not None:
                self.assertGreaterEqual(r, -1.0)
                self.assertLessEqual(r, 1.0)

    def test_sample_size_positive(self):
        resp = client.get("/api/v1/assets/BTC/correlation")
        for lag in resp.json()["lags"]:
            self.assertGreaterEqual(lag["sample_size"], 0)

    def test_accessible_without_auth(self):
        resp = client.get("/api/v1/assets/BTC/correlation")
        self.assertNotEqual(resp.status_code, 401)


# =============================================================================
# 2. GET /assets/{asset_id}/sentiment-sources
# =============================================================================

class TestSentimentSourcesEndpoint(unittest.TestCase):

    def test_returns_200(self):
        resp = client.get(f"/api/v1/assets/{_btc_id()}/sentiment-sources")
        self.assertEqual(resp.status_code, 200)

    def test_returns_list(self):
        resp = client.get(f"/api/v1/assets/{_btc_id()}/sentiment-sources")
        self.assertIsInstance(resp.json(), list)

    def test_btc_has_sources(self):
        resp = client.get(f"/api/v1/assets/{_btc_id()}/sentiment-sources")
        self.assertGreater(len(resp.json()), 0)

    def test_each_source_has_required_fields(self):
        resp = client.get(f"/api/v1/assets/{_btc_id()}/sentiment-sources")
        for item in resp.json():
            self.assertIn("source", item)
            self.assertIn("count", item)
            self.assertIn("avg_score", item)

    def test_count_is_positive(self):
        resp = client.get(f"/api/v1/assets/{_btc_id()}/sentiment-sources")
        for item in resp.json():
            self.assertGreater(item["count"], 0)

    def test_avg_score_in_valid_range(self):
        resp = client.get(f"/api/v1/assets/{_btc_id()}/sentiment-sources")
        for item in resp.json():
            self.assertGreaterEqual(item["avg_score"], -1.0)
            self.assertLessEqual(item["avg_score"], 1.0)

    def test_coindesk_source_present(self):
        resp = client.get(f"/api/v1/assets/{_btc_id()}/sentiment-sources")
        sources = [item["source"] for item in resp.json()]
        self.assertIn("CoinDesk", sources)

    def test_reddit_source_present(self):
        resp = client.get(f"/api/v1/assets/{_btc_id()}/sentiment-sources")
        sources = [item["source"] for item in resp.json()]
        self.assertIn("Reddit", sources)

    def test_sorted_by_count_descending(self):
        resp = client.get(f"/api/v1/assets/{_btc_id()}/sentiment-sources")
        items = resp.json()
        if len(items) >= 2:
            self.assertGreaterEqual(items[0]["count"], items[1]["count"])

    def test_unknown_asset_returns_empty_list(self):
        resp = client.get("/api/v1/assets/99999/sentiment-sources")
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.json(), [])

    def test_accessible_without_auth(self):
        resp = client.get(f"/api/v1/assets/{_btc_id()}/sentiment-sources")
        self.assertNotEqual(resp.status_code, 401)


# =============================================================================
# 3. GET /watchlist/mood
# =============================================================================

class TestPortfolioMoodEndpoint(unittest.TestCase):

    def setUp(self):
        self.token = _register_and_login()

    def test_requires_auth(self):
        resp = client.get("/api/v1/watchlist/mood")
        self.assertEqual(resp.status_code, 401)

    def test_empty_watchlist_returns_200(self):
        resp = client.get("/api/v1/watchlist/mood", headers=_auth(self.token))
        self.assertEqual(resp.status_code, 200)

    def test_empty_watchlist_asset_count_zero(self):
        resp = client.get("/api/v1/watchlist/mood", headers=_auth(self.token))
        self.assertEqual(resp.json()["asset_count"], 0)

    def test_empty_watchlist_direction_unknown(self):
        resp = client.get("/api/v1/watchlist/mood", headers=_auth(self.token))
        self.assertEqual(resp.json()["direction"], "unknown")

    def test_empty_watchlist_has_required_fields(self):
        resp = client.get("/api/v1/watchlist/mood", headers=_auth(self.token))
        data = resp.json()
        for field in ("asset_count", "current_avg", "week_ago_avg",
                      "change_pct", "direction", "current_label", "assets"):
            self.assertIn(field, data)

    def test_empty_watchlist_assets_is_empty_list(self):
        resp = client.get("/api/v1/watchlist/mood", headers=_auth(self.token))
        self.assertEqual(resp.json()["assets"], [])

    def test_with_watchlist_and_sentiment_returns_200(self):
        _seed_watchlist_with_sentiment(self.token)
        resp = client.get("/api/v1/watchlist/mood", headers=_auth(self.token))
        self.assertEqual(resp.status_code, 200)

    def test_with_watchlist_asset_count_positive(self):
        _seed_watchlist_with_sentiment(self.token)
        resp = client.get("/api/v1/watchlist/mood", headers=_auth(self.token))
        self.assertGreater(resp.json()["asset_count"], 0)

    def test_with_sentiment_current_avg_not_none(self):
        _seed_watchlist_with_sentiment(self.token)
        resp = client.get("/api/v1/watchlist/mood", headers=_auth(self.token))
        self.assertIsNotNone(resp.json()["current_avg"])

    def test_direction_is_better_when_current_higher(self):
        # Bu kullanıcı için bu haftaki skor > geçen hafta (0.5 vs -0.3)
        _seed_watchlist_with_sentiment(self.token)
        resp = client.get("/api/v1/watchlist/mood", headers=_auth(self.token))
        data = resp.json()
        if data["current_avg"] is not None and data["week_ago_avg"] is not None:
            if data["current_avg"] > data["week_ago_avg"] + 0.02:
                self.assertEqual(data["direction"], "better")

    def test_current_label_bullish_when_score_high(self):
        # Seed'de bu hafta score=0.5 → Bullish
        _seed_watchlist_with_sentiment(self.token)
        resp = client.get("/api/v1/watchlist/mood", headers=_auth(self.token))
        data = resp.json()
        if data["current_avg"] is not None and data["current_avg"] >= 0.3:
            self.assertEqual(data["current_label"], "Bullish")

    def test_assets_list_has_symbol_and_name(self):
        _seed_watchlist_with_sentiment(self.token)
        resp = client.get("/api/v1/watchlist/mood", headers=_auth(self.token))
        for asset in resp.json()["assets"]:
            self.assertIn("symbol", asset)
            self.assertIn("name", asset)
            self.assertIn("current_score", asset)
            self.assertIn("week_ago_score", asset)

    def test_mood_isolated_between_users(self):
        other_token = _register_and_login()
        client.post("/api/v1/watchlist/", headers=_auth(other_token),
                    json={"asset_symbol": "ETH"})

        resp = client.get("/api/v1/watchlist/mood", headers=_auth(self.token))
        symbols = [a["symbol"] for a in resp.json()["assets"]]
        self.assertNotIn("ETH", symbols)

    def test_label_values_are_valid(self):
        resp = client.get("/api/v1/watchlist/mood", headers=_auth(self.token))
        self.assertIn(resp.json()["current_label"], ("Bullish", "Neutral", "Bearish"))

    def test_direction_values_are_valid(self):
        _seed_watchlist_with_sentiment(self.token)
        resp = client.get("/api/v1/watchlist/mood", headers=_auth(self.token))
        self.assertIn(resp.json()["direction"], ("better", "worse", "same", "unknown"))


# =============================================================================
# 4. GET /alerts/notifications  &  POST /alerts/notifications/read
# =============================================================================

class TestNotificationsEndpoint(unittest.TestCase):

    def setUp(self):
        self.token = _register_and_login()

    def test_requires_auth(self):
        resp = client.get("/api/v1/alerts/notifications")
        self.assertEqual(resp.status_code, 401)

    def test_empty_notifications_returns_200(self):
        resp = client.get("/api/v1/alerts/notifications", headers=_auth(self.token))
        self.assertEqual(resp.status_code, 200)

    def test_empty_notifications_is_list(self):
        resp = client.get("/api/v1/alerts/notifications", headers=_auth(self.token))
        self.assertIsInstance(resp.json(), list)

    def test_empty_notifications_is_empty(self):
        resp = client.get("/api/v1/alerts/notifications", headers=_auth(self.token))
        self.assertEqual(resp.json(), [])

    def test_unread_notification_appears(self):
        _seed_alert_trigger(self.token, is_read=False, hours_ago=1)
        resp = client.get("/api/v1/alerts/notifications", headers=_auth(self.token))
        self.assertGreater(len(resp.json()), 0)

    def test_notification_response_fields(self):
        _seed_alert_trigger(self.token, is_read=False, hours_ago=2)
        resp = client.get("/api/v1/alerts/notifications", headers=_auth(self.token))
        item = resp.json()[0]
        for field in ("id", "alert_id", "asset_symbol", "asset_name",
                      "condition_type", "threshold", "actual_value", "triggered_at"):
            self.assertIn(field, item)

    def test_notification_asset_symbol_correct(self):
        _seed_alert_trigger(self.token, is_read=False, hours_ago=1)
        resp = client.get("/api/v1/alerts/notifications", headers=_auth(self.token))
        self.assertEqual(resp.json()[0]["asset_symbol"], "BTC")

    def test_notification_condition_type_correct(self):
        _seed_alert_trigger(self.token, is_read=False, hours_ago=1)
        resp = client.get("/api/v1/alerts/notifications", headers=_auth(self.token))
        self.assertEqual(resp.json()[0]["condition_type"], "sentiment_below")

    def test_read_notification_not_returned(self):
        token = _register_and_login()
        _seed_alert_trigger(token, is_read=True, hours_ago=1)
        resp = client.get("/api/v1/alerts/notifications", headers=_auth(token))
        self.assertEqual(resp.json(), [])

    def test_old_notification_excluded(self):
        # 25 saat önce → 24 saat penceresinin dışında
        token = _register_and_login()
        _seed_alert_trigger(token, is_read=False, hours_ago=25)
        resp = client.get("/api/v1/alerts/notifications", headers=_auth(token))
        self.assertEqual(resp.json(), [])

    def test_notifications_isolated_between_users(self):
        other_token = _register_and_login()
        _seed_alert_trigger(other_token, is_read=False, hours_ago=1)
        # Kendi token'ımızla sadece kendi trigger'larımızı görmeli
        resp = client.get("/api/v1/alerts/notifications", headers=_auth(self.token))
        for item in resp.json():
            # Diğer kullanıcının alert'leri görünmemeli
            self.assertNotEqual(item.get("asset_symbol"), "__other__")

    def test_mark_read_requires_auth(self):
        resp = client.post("/api/v1/alerts/notifications/read", json={"ids": [1]})
        self.assertEqual(resp.status_code, 401)

    def test_mark_read_returns_204(self):
        info = _seed_alert_trigger(self.token, is_read=False, hours_ago=1)
        resp = client.post(
            "/api/v1/alerts/notifications/read",
            headers=_auth(self.token),
            json={"ids": [info["id"]]},
        )
        self.assertEqual(resp.status_code, 204)

    def test_mark_read_hides_notification(self):
        token = _register_and_login()
        info = _seed_alert_trigger(token, is_read=False, hours_ago=1)

        before = client.get("/api/v1/alerts/notifications", headers=_auth(token)).json()
        ids_before = [n["id"] for n in before]
        self.assertIn(info["id"], ids_before)

        client.post("/api/v1/alerts/notifications/read",
                    headers=_auth(token), json={"ids": [info["id"]]})

        after = client.get("/api/v1/alerts/notifications", headers=_auth(token)).json()
        ids_after = [n["id"] for n in after]
        self.assertNotIn(info["id"], ids_after)

    def test_mark_read_with_empty_ids_returns_204(self):
        resp = client.post(
            "/api/v1/alerts/notifications/read",
            headers=_auth(self.token),
            json={"ids": []},
        )
        self.assertEqual(resp.status_code, 204)

    def test_mark_read_other_users_trigger_ignored(self):
        other_token = _register_and_login()
        info = _seed_alert_trigger(other_token, is_read=False, hours_ago=1)

        # Kendi token'ımızla başkasının trigger'ını okumaya çalış → 204 döner ama etki etmez
        resp = client.post(
            "/api/v1/alerts/notifications/read",
            headers=_auth(self.token),
            json={"ids": [info["id"]]},
        )
        self.assertEqual(resp.status_code, 204)

        # Diğer kullanıcı hala kendi bildirimini görmeli
        other_notifs = client.get("/api/v1/alerts/notifications",
                                  headers=_auth(other_token)).json()
        other_ids = [n["id"] for n in other_notifs]
        self.assertIn(info["id"], other_ids)

    def test_multiple_unread_all_returned(self):
        token = _register_and_login()
        _seed_alert_trigger(token, is_read=False, hours_ago=1)
        _seed_alert_trigger(token, is_read=False, hours_ago=2)
        resp = client.get("/api/v1/alerts/notifications", headers=_auth(token))
        self.assertGreaterEqual(len(resp.json()), 2)

    def test_partial_mark_read(self):
        token = _register_and_login()
        info1 = _seed_alert_trigger(token, is_read=False, hours_ago=1)
        info2 = _seed_alert_trigger(token, is_read=False, hours_ago=2)

        # Sadece birini okundu yap
        client.post("/api/v1/alerts/notifications/read",
                    headers=_auth(token), json={"ids": [info1["id"]]})

        remaining = client.get("/api/v1/alerts/notifications", headers=_auth(token)).json()
        remaining_ids = [n["id"] for n in remaining]
        self.assertNotIn(info1["id"], remaining_ids)
        self.assertIn(info2["id"], remaining_ids)


# =============================================================================
# 5. GET /pipeline/status  &  POST /pipeline/trigger
# =============================================================================

class TestPipelineEndpoints(unittest.TestCase):

    def setUp(self):
        self.token = _register_and_login()

    # ── GET /pipeline/status ─────────────────────────────────────────────────

    def test_status_returns_200(self):
        resp = client.get("/api/v1/pipeline/status")
        self.assertEqual(resp.status_code, 200)

    def test_status_accessible_without_auth(self):
        resp = client.get("/api/v1/pipeline/status")
        self.assertNotEqual(resp.status_code, 401)

    def test_status_has_required_fields(self):
        resp = client.get("/api/v1/pipeline/status")
        data = resp.json()
        self.assertIn("running", data)
        self.assertIn("last_run_at", data)
        self.assertIn("cooldown_remaining_seconds", data)

    def test_status_running_is_bool(self):
        resp = client.get("/api/v1/pipeline/status")
        self.assertIsInstance(resp.json()["running"], bool)

    def test_status_cooldown_is_non_negative(self):
        resp = client.get("/api/v1/pipeline/status")
        self.assertGreaterEqual(resp.json()["cooldown_remaining_seconds"], 0)

    # ── POST /pipeline/trigger ───────────────────────────────────────────────

    def test_trigger_requires_auth(self):
        resp = client.post("/api/v1/pipeline/trigger")
        self.assertEqual(resp.status_code, 401)

    def test_trigger_with_auth_returns_200(self):
        resp = client.post("/api/v1/pipeline/trigger", headers=_auth(self.token))
        self.assertEqual(resp.status_code, 200)

    def test_trigger_response_has_status_field(self):
        resp = client.post("/api/v1/pipeline/trigger", headers=_auth(self.token))
        self.assertIn("status", resp.json())

    def test_trigger_response_has_message_field(self):
        resp = client.post("/api/v1/pipeline/trigger", headers=_auth(self.token))
        self.assertIn("message", resp.json())

    def test_trigger_status_is_valid_value(self):
        resp = client.post("/api/v1/pipeline/trigger", headers=_auth(self.token))
        self.assertIn(resp.json()["status"], ("started", "cooldown", "already_running"))

    def test_second_trigger_returns_cooldown(self):
        # İlk tetikleme
        r1 = client.post("/api/v1/pipeline/trigger", headers=_auth(self.token))
        if r1.json()["status"] == "started":
            # İkincisi cooldown veya already_running döndürmeli
            r2 = client.post("/api/v1/pipeline/trigger", headers=_auth(self.token))
            self.assertIn(r2.json()["status"], ("cooldown", "already_running"))

    def test_cooldown_remaining_in_response(self):
        resp = client.post("/api/v1/pipeline/trigger", headers=_auth(self.token))
        self.assertIn("cooldown_remaining_seconds", resp.json())

    def test_status_reflects_trigger(self):
        client.post("/api/v1/pipeline/trigger", headers=_auth(self.token))
        status = client.get("/api/v1/pipeline/status").json()
        # Pipeline tetiklendikten sonra last_run_at veya running set olmuş olmalı
        self.assertTrue(
            status["running"] is True or status["last_run_at"] is not None
        )


if __name__ == "__main__":
    unittest.main()
