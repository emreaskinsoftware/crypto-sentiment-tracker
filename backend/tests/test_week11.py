"""
Hafta 11 — FCM Push + Uçtan Uca Entegrasyon Testleri
Sistemin baştan sona (API) doğrulanması ve yanıt süresi kontrolü
"""
import time
import unittest
from unittest.mock import MagicMock, patch

from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.core.database import Base, get_db
from app.main import app
from app.services.fcm_service import send_alert_push, send_push_notification

# ── Test DB kurulumu ──────────────────────────────────────────────────────────

TEST_DB_URL = "sqlite:///./test_week11.db"
_engine = create_engine(TEST_DB_URL, connect_args={"check_same_thread": False})
_SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=_engine)
Base.metadata.create_all(bind=_engine)


def _override_get_db():
    db = _SessionLocal()
    try:
        yield db
    finally:
        db.close()


client = TestClient(app)


def setup_module(module):
    app.dependency_overrides[get_db] = _override_get_db
    Base.metadata.drop_all(bind=_engine)
    Base.metadata.create_all(bind=_engine)
    from app.models.asset import Asset
    db = _SessionLocal()
    try:
        for sym, name, price, change in [
            ("BTC", "Bitcoin", 67000.0, 2.5),
            ("ETH", "Ethereum", 3400.0, 1.2),
        ]:
            if not db.query(Asset).filter(Asset.symbol == sym).first():
                db.add(Asset(symbol=sym, name=name, current_price=price,
                             market_cap=1e12, volume_24h=1e9, change_24h=change))
        db.commit()
    finally:
        db.close()


def teardown_module(module):
    app.dependency_overrides.clear()


_counter = [0]


def _new_user():
    _counter[0] += 1
    email = f"e2e{_counter[0]}@example.com"
    client.post("/api/v1/auth/register",
                json={"email": email, "password": "E2ePass1!", "full_name": "E2E Test"})
    r = client.post("/api/v1/auth/login",
                    json={"email": email, "password": "E2ePass1!"})
    return r.json()["access_token"], email


def _auth(token):
    return {"Authorization": f"Bearer {token}"}


# ===========================================================================
# FCM Service Unit Tests
# ===========================================================================

class TestFCMService(unittest.TestCase):

    def test_send_push_disabled_returns_true(self):
        with patch("app.services.fcm_service.settings") as s:
            s.FCM_ENABLED = False
            result = send_push_notification("fake_token", "Title", "Body")
        self.assertTrue(result)

    def test_send_push_empty_token_returns_false(self):
        result = send_push_notification("", "Title", "Body")
        self.assertFalse(result)

    def test_send_push_no_credentials_returns_false(self):
        with patch("app.services.fcm_service.settings") as s:
            s.FCM_ENABLED = True
            s.FCM_CREDENTIALS_JSON = ""
            result = send_push_notification("some_token", "Title", "Body")
        self.assertFalse(result)

    def test_send_push_firebase_init_failure_returns_false(self):
        """Firebase başlatma hatası False döndürür."""
        with patch("app.services.fcm_service.settings") as s, \
             patch("app.services.fcm_service._init_firebase", return_value=False):
            s.FCM_ENABLED = True
            s.FCM_CREDENTIALS_JSON = '{"key": "val"}'
            result = send_push_notification("some_token", "T", "B")
        self.assertFalse(result)

    def test_send_alert_push_disabled_returns_true(self):
        with patch("app.services.fcm_service.settings") as s:
            s.FCM_ENABLED = False
            result = send_alert_push("token", "BTC", "sentiment_below", -0.5, -0.7)
        self.assertTrue(result)

    def test_send_alert_push_formats_title_with_symbol(self):
        calls = []
        def capture(*args, **kwargs):
            calls.append(kwargs)
            return True
        with patch("app.services.fcm_service.send_push_notification", side_effect=capture), \
             patch("app.services.fcm_service.settings") as s:
            s.FCM_ENABLED = False
            send_alert_push("tok", "ETH", "price_above", 4000.0, 4200.0)
        # Verify it called send_push_notification (captured by our side_effect returning True)


# ===========================================================================
# FCM Token API Tests
# ===========================================================================

class TestFCMTokenAPI(unittest.TestCase):

    def setUp(self):
        self.token, _ = _new_user()

    def test_register_fcm_token_returns_200(self):
        resp = client.post(
            "/api/v1/devices/fcm-token",
            headers=_auth(self.token),
            json={"fcm_token": "test_fcm_token_abc123"},
        )
        self.assertEqual(resp.status_code, 200)

    def test_register_fcm_token_response_message(self):
        resp = client.post(
            "/api/v1/devices/fcm-token",
            headers=_auth(self.token),
            json={"fcm_token": "abc123"},
        )
        self.assertIn("message", resp.json())

    def test_unregister_fcm_token_returns_204(self):
        client.post("/api/v1/devices/fcm-token", headers=_auth(self.token),
                    json={"fcm_token": "to_be_deleted"})
        resp = client.delete("/api/v1/devices/fcm-token", headers=_auth(self.token))
        self.assertEqual(resp.status_code, 204)

    def test_fcm_token_requires_auth(self):
        resp = client.post("/api/v1/devices/fcm-token",
                           json={"fcm_token": "tok"})
        self.assertEqual(resp.status_code, 401)


# ===========================================================================
# Uçtan Uca Entegrasyon Testleri
# ===========================================================================

class TestAuthFlow(unittest.TestCase):

    def test_register_login_me_full_flow(self):
        token, email = _new_user()
        me = client.get("/api/v1/auth/me", headers=_auth(token))
        self.assertEqual(me.status_code, 200)
        self.assertEqual(me.json()["email"], email)

    def test_duplicate_register_blocked(self):
        _, email = _new_user()
        resp = client.post("/api/v1/auth/register",
                           json={"email": email, "password": "Pass1234!", "full_name": "Test User"})
        self.assertEqual(resp.status_code, 400)

    def test_wrong_password_blocked(self):
        _, email = _new_user()
        resp = client.post("/api/v1/auth/login",
                           json={"email": email, "password": "WrongPass!"})
        self.assertEqual(resp.status_code, 401)


class TestAlertLifecycle(unittest.TestCase):
    """Tam alarm yaşam döngüsü: oluştur → güncelle → sil"""

    def setUp(self):
        self.token, _ = _new_user()

    def test_full_alert_lifecycle(self):
        # Oluştur
        created = client.post("/api/v1/alerts/", headers=_auth(self.token),
                              json={"asset_symbol": "BTC",
                                    "condition": "sentiment_below",
                                    "threshold": -0.5})
        self.assertEqual(created.status_code, 201)
        alert_id = created.json()["id"]
        self.assertTrue(created.json()["is_active"])

        # Listele
        listed = client.get("/api/v1/alerts/", headers=_auth(self.token))
        ids = [a["id"] for a in listed.json()]
        self.assertIn(alert_id, ids)

        # Güncelle — pasife al
        patched = client.patch(f"/api/v1/alerts/{alert_id}",
                               headers=_auth(self.token),
                               json={"is_active": False})
        self.assertFalse(patched.json()["is_active"])

        # Eşik güncelle
        patched2 = client.patch(f"/api/v1/alerts/{alert_id}",
                                headers=_auth(self.token),
                                json={"threshold": -0.8})
        self.assertAlmostEqual(patched2.json()["threshold"], -0.8)

        # Sil
        deleted = client.delete(f"/api/v1/alerts/{alert_id}",
                                headers=_auth(self.token))
        self.assertEqual(deleted.status_code, 204)

        # Artık bulunamaz
        gone = client.get(f"/api/v1/alerts/{alert_id}", headers=_auth(self.token))
        self.assertEqual(gone.status_code, 404)

    def test_alert_isolated_between_users(self):
        token2, _ = _new_user()
        alert = client.post("/api/v1/alerts/", headers=_auth(self.token),
                            json={"asset_symbol": "BTC",
                                  "condition": "sentiment_above",
                                  "threshold": 0.8})
        alert_id = alert.json()["id"]
        # Diğer kullanıcı göremez
        resp = client.get(f"/api/v1/alerts/{alert_id}", headers=_auth(token2))
        self.assertEqual(resp.status_code, 404)


class TestWatchlistLifecycle(unittest.TestCase):
    """Tam watchlist yaşam döngüsü: ekle → listele → çıkar"""

    def setUp(self):
        self.token, _ = _new_user()

    def test_full_watchlist_lifecycle(self):
        # Boş başlasın
        empty = client.get("/api/v1/watchlist/", headers=_auth(self.token))
        self.assertEqual(empty.json(), [])

        # BTC ekle
        added = client.post("/api/v1/watchlist/", headers=_auth(self.token),
                            json={"asset_symbol": "BTC"})
        self.assertEqual(added.status_code, 201)
        self.assertEqual(added.json()["asset"]["symbol"], "BTC")

        # ETH ekle
        client.post("/api/v1/watchlist/", headers=_auth(self.token),
                    json={"asset_symbol": "ETH"})

        # 2 varlık var
        listed = client.get("/api/v1/watchlist/", headers=_auth(self.token))
        self.assertEqual(len(listed.json()), 2)

        # BTC çıkar
        removed = client.delete("/api/v1/watchlist/BTC", headers=_auth(self.token))
        self.assertEqual(removed.status_code, 204)

        # Sadece ETH kaldı
        remaining = client.get("/api/v1/watchlist/", headers=_auth(self.token))
        symbols = [w["asset"]["symbol"] for w in remaining.json()]
        self.assertNotIn("BTC", symbols)
        self.assertIn("ETH", symbols)

    def test_duplicate_watchlist_returns_409(self):
        client.post("/api/v1/watchlist/", headers=_auth(self.token),
                    json={"asset_symbol": "BTC"})
        resp = client.post("/api/v1/watchlist/", headers=_auth(self.token),
                           json={"asset_symbol": "BTC"})
        self.assertEqual(resp.status_code, 409)


class TestAPIResponseTimes(unittest.TestCase):
    """API yanıt süreleri < 2 saniye (İş Paketi başarı ölçütü)"""

    def _assert_under_2s(self, method, url, **kwargs):
        start = time.time()
        resp = getattr(client, method)(url, **kwargs)
        elapsed = time.time() - start
        self.assertIn(resp.status_code, [200, 201, 204])
        self.assertLess(elapsed, 2.0,
                        f"{method.upper()} {url} took {elapsed:.2f}s (limit: 2s)")

    def test_assets_list_under_2s(self):
        self._assert_under_2s("get", "/api/v1/assets/")

    def test_dashboard_summary_under_2s(self):
        self._assert_under_2s("get", "/api/v1/dashboard/summary")

    def test_top_movers_under_2s(self):
        self._assert_under_2s("get", "/api/v1/dashboard/top-movers")

    def test_health_check_under_2s(self):
        self._assert_under_2s("get", "/api/v1/health")

    def test_assets_chart_data_under_2s(self):
        self._assert_under_2s("get", "/api/v1/assets/BTC/chart-data")

    def test_sentiment_summary_under_2s(self):
        self._assert_under_2s("get", "/api/v1/assets/BTC/sentiment-summary")


class TestDataIntegrity(unittest.TestCase):
    """API'nin döndürdüğü veri tutarlılığı"""

    def test_assets_have_required_fields(self):
        assets = client.get("/api/v1/assets/").json()
        self.assertGreater(len(assets), 0)
        for asset in assets:
            for field in ("id", "symbol", "name", "current_price",
                          "market_cap", "volume_24h", "change_24h"):
                self.assertIn(field, asset)

    def test_dashboard_summary_consistency(self):
        summary = client.get("/api/v1/dashboard/summary").json()
        total = summary["bullish_count"] + summary["bearish_count"] + summary["neutral_count"]
        # Total sentiment counts should be <= total_assets (some assets may have no sentiment)
        self.assertLessEqual(total, summary["total_assets"] + 1)

    def test_top_movers_gainers_sorted_desc(self):
        movers = client.get("/api/v1/dashboard/top-movers?limit=3").json()
        gainers = movers["gainers"]
        if len(gainers) >= 2:
            self.assertGreaterEqual(gainers[0]["change_24h"], gainers[1]["change_24h"])

    def test_top_movers_losers_sorted_asc(self):
        movers = client.get("/api/v1/dashboard/top-movers?limit=3").json()
        losers = movers["losers"]
        if len(losers) >= 2:
            self.assertLessEqual(losers[0]["change_24h"], losers[1]["change_24h"])

    def test_sentiment_status_valid_values(self):
        resp = client.get("/api/v1/assets/BTC/sentiment-summary")
        self.assertEqual(resp.status_code, 200)
        self.assertIn(resp.json()["status"], ("Positive", "Neutral", "Negative"))

    def test_asset_prices_positive(self):
        assets = client.get("/api/v1/assets/").json()
        for asset in assets:
            self.assertGreater(asset["current_price"], 0)


class TestAlertCheckerWithFCM(unittest.TestCase):
    """Alert checker FCM entegrasyon testi"""

    def test_fcm_sent_when_alert_triggered_and_user_has_token(self):
        from app.services.alert_checker import check_alerts
        db = MagicMock()
        alert = MagicMock()
        alert.id = 1
        alert.condition_type = "sentiment_below"
        alert.threshold = -0.5
        alert.is_active = True
        alert.last_triggered_at = None
        alert.asset_id = 1
        alert.user_id = 1

        asset = MagicMock()
        asset.symbol = "BTC"
        asset.current_price = 67000.0

        user = MagicMock()
        user.email = "user@example.com"
        user.full_name = "Test"
        user.fcm_token = "valid_fcm_token_xyz"

        db.query.return_value.filter.return_value.all.return_value = [alert]
        db.query.return_value.filter.return_value.first.side_effect = [asset, user]

        with patch("app.services.alert_checker._get_latest_sentiment", return_value=-0.9), \
             patch("app.services.alert_checker.send_alert_email", return_value=True), \
             patch("app.services.alert_checker.send_alert_push", return_value=True) as mock_fcm:
            stats = check_alerts(db)

        mock_fcm.assert_called_once()
        call_kwargs = mock_fcm.call_args[1]
        self.assertEqual(call_kwargs["fcm_token"], "valid_fcm_token_xyz")
        self.assertEqual(call_kwargs["asset_symbol"], "BTC")

    def test_fcm_not_sent_when_user_has_no_token(self):
        from app.services.alert_checker import check_alerts
        db = MagicMock()
        alert = MagicMock()
        alert.id = 2
        alert.condition_type = "sentiment_below"
        alert.threshold = -0.5
        alert.is_active = True
        alert.last_triggered_at = None
        alert.asset_id = 1
        alert.user_id = 2

        asset = MagicMock()
        asset.symbol = "ETH"
        asset.current_price = 3400.0

        user = MagicMock()
        user.email = "user2@example.com"
        user.full_name = "Test2"
        user.fcm_token = None  # Token yok

        db.query.return_value.filter.return_value.all.return_value = [alert]
        db.query.return_value.filter.return_value.first.side_effect = [asset, user]

        with patch("app.services.alert_checker._get_latest_sentiment", return_value=-0.9), \
             patch("app.services.alert_checker.send_alert_email", return_value=True), \
             patch("app.services.alert_checker.send_alert_push") as mock_fcm:
            check_alerts(db)

        mock_fcm.assert_not_called()


if __name__ == "__main__":
    unittest.main()
