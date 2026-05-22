"""
REST API Endpoint Testleri
Watchlist, Dashboard, Alert CRUD (GET/PATCH) endpoint'leri
"""
import unittest

from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.core.database import Base, get_db
from app.main import app

TEST_DB_URL = "sqlite:///./test_api_endpoints.db"
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
    """Testler baslamadan once override'i etkinlestir, semayı yenile ve seed ekle."""
    app.dependency_overrides[get_db] = _override_get_db
    Base.metadata.drop_all(bind=_engine)
    Base.metadata.create_all(bind=_engine)
    _seed_assets()


def _seed_assets():
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
    """Diger test dosyalarini etkilememek icin override'i sifirla."""
    app.dependency_overrides.clear()

# ---- Yardimci fonksiyonlar ----

_user_counter = [0]


def _register_and_login():
    _user_counter[0] += 1
    email = f"testuser{_user_counter[0]}@example.com"
    client.post("/api/v1/auth/register", json={
        "email": email, "password": "Test1234!", "full_name": "Test User"
    })
    resp = client.post("/api/v1/auth/login", json={"email": email, "password": "Test1234!"})
    return resp.json()["access_token"]


def _auth(token):
    return {"Authorization": f"Bearer {token}"}


# ---- Seed: BTC ve ETH asset'lerini olustur (yoksa) ----

def _ensure_assets():
    from app.models.asset import Asset
    db = _SessionLocal()
    try:
        for sym, name, price in [("BTC", "Bitcoin", 67000.0), ("ETH", "Ethereum", 3400.0)]:
            if not db.query(Asset).filter(Asset.symbol == sym).first():
                db.add(Asset(
                    symbol=sym, name=name, current_price=price,
                    market_cap=1e12, volume_24h=1e9, change_24h=2.5,
                ))
        db.commit()
    finally:
        db.close()


_ensure_assets()


# ===========================================================================
# Auth Endpoint Testleri
# ===========================================================================

class TestAuthEndpoints(unittest.TestCase):

    def test_register_returns_201(self):
        _user_counter[0] += 1
        resp = client.post("/api/v1/auth/register", json={
            "email": f"reg{_user_counter[0]}@example.com",
            "password": "Pass123!",
            "full_name": "Test",
        })
        self.assertEqual(resp.status_code, 201)

    def test_register_duplicate_email_returns_400(self):
        client.post("/api/v1/auth/register", json={
            "email": "dup@example.com", "password": "Pass123!", "full_name": "Dup"
        })
        resp = client.post("/api/v1/auth/register", json={
            "email": "dup@example.com", "password": "Pass123!", "full_name": "Dup"
        })
        self.assertEqual(resp.status_code, 400)

    def test_login_returns_token(self):
        client.post("/api/v1/auth/register", json={
            "email": "login_test@example.com", "password": "Pass123!", "full_name": "Test User"
        })
        resp = client.post("/api/v1/auth/login", json={
            "email": "login_test@example.com", "password": "Pass123!"
        })
        self.assertEqual(resp.status_code, 200)
        self.assertIn("access_token", resp.json())

    def test_login_wrong_password_returns_401(self):
        client.post("/api/v1/auth/register", json={
            "email": "wrong_pw@example.com", "password": "Pass123!", "full_name": "Test User"
        })
        resp = client.post("/api/v1/auth/login", json={
            "email": "wrong_pw@example.com", "password": "WrongPass!"
        })
        self.assertEqual(resp.status_code, 401)

    def test_get_me_with_valid_token(self):
        token = _register_and_login()
        resp = client.get("/api/v1/auth/me", headers=_auth(token))
        self.assertEqual(resp.status_code, 200)
        self.assertIn("email", resp.json())

    def test_get_me_without_token_returns_401(self):
        resp = client.get("/api/v1/auth/me")
        self.assertEqual(resp.status_code, 401)


# ===========================================================================
# Assets Endpoint Testleri
# ===========================================================================

class TestAssetsEndpoints(unittest.TestCase):

    def test_list_assets_returns_200(self):
        resp = client.get("/api/v1/assets/")
        self.assertEqual(resp.status_code, 200)
        self.assertIsInstance(resp.json(), list)

    def test_list_assets_contains_btc(self):
        resp = client.get("/api/v1/assets/")
        symbols = [a["symbol"] for a in resp.json()]
        self.assertIn("BTC", symbols)

    def test_get_asset_by_id(self):
        assets = client.get("/api/v1/assets/").json()
        btc_id = next(a["id"] for a in assets if a["symbol"] == "BTC")
        resp = client.get(f"/api/v1/assets/{btc_id}")
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.json()["symbol"], "BTC")

    def test_get_nonexistent_asset_returns_404(self):
        resp = client.get("/api/v1/assets/99999")
        self.assertEqual(resp.status_code, 404)

    def test_sentiment_summary_returns_200(self):
        resp = client.get("/api/v1/assets/BTC/sentiment-summary")
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertIn("symbol", data)
        self.assertIn("current_score", data)
        self.assertIn("status", data)

    def test_sentiment_summary_unknown_symbol_returns_404(self):
        resp = client.get("/api/v1/assets/UNKNOWN/sentiment-summary")
        self.assertEqual(resp.status_code, 404)

    def test_chart_data_returns_200(self):
        resp = client.get("/api/v1/assets/BTC/chart-data?timeframe=24h")
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertEqual(data["symbol"], "BTC")
        self.assertIn("data", data)


# ===========================================================================
# Alert Endpoint Testleri (Hafta 8: GET tek alarm + PATCH)
# ===========================================================================

class TestAlertEndpoints(unittest.TestCase):

    def setUp(self):
        self.token = _register_and_login()

    def _create_alert(self):
        return client.post("/api/v1/alerts/", headers=_auth(self.token), json={
            "asset_symbol": "BTC",
            "condition": "sentiment_below",
            "threshold": -0.5,
        })

    def test_create_alert_returns_201(self):
        resp = self._create_alert()
        self.assertEqual(resp.status_code, 201)

    def test_create_alert_response_fields(self):
        resp = self._create_alert()
        data = resp.json()
        self.assertIn("id", data)
        self.assertIn("is_active", data)
        self.assertIn("threshold", data)

    def test_list_alerts_returns_200(self):
        resp = client.get("/api/v1/alerts/", headers=_auth(self.token))
        self.assertEqual(resp.status_code, 200)
        self.assertIsInstance(resp.json(), list)

    def test_get_single_alert_returns_200(self):
        alert_id = self._create_alert().json()["id"]
        resp = client.get(f"/api/v1/alerts/{alert_id}", headers=_auth(self.token))
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.json()["id"], alert_id)

    def test_get_other_users_alert_returns_404(self):
        alert_id = self._create_alert().json()["id"]
        other_token = _register_and_login()
        resp = client.get(f"/api/v1/alerts/{alert_id}", headers=_auth(other_token))
        self.assertEqual(resp.status_code, 404)

    def test_patch_alert_threshold(self):
        alert_id = self._create_alert().json()["id"]
        resp = client.patch(
            f"/api/v1/alerts/{alert_id}",
            headers=_auth(self.token),
            json={"threshold": -0.8},
        )
        self.assertEqual(resp.status_code, 200)
        self.assertAlmostEqual(resp.json()["threshold"], -0.8)

    def test_patch_alert_toggle_inactive(self):
        alert_id = self._create_alert().json()["id"]
        resp = client.patch(
            f"/api/v1/alerts/{alert_id}",
            headers=_auth(self.token),
            json={"is_active": False},
        )
        self.assertEqual(resp.status_code, 200)
        self.assertFalse(resp.json()["is_active"])

    def test_patch_alert_toggle_back_active(self):
        alert_id = self._create_alert().json()["id"]
        client.patch(f"/api/v1/alerts/{alert_id}", headers=_auth(self.token), json={"is_active": False})
        resp = client.patch(f"/api/v1/alerts/{alert_id}", headers=_auth(self.token), json={"is_active": True})
        self.assertTrue(resp.json()["is_active"])

    def test_delete_alert_returns_204(self):
        alert_id = self._create_alert().json()["id"]
        resp = client.delete(f"/api/v1/alerts/{alert_id}", headers=_auth(self.token))
        self.assertEqual(resp.status_code, 204)

    def test_deleted_alert_not_found(self):
        alert_id = self._create_alert().json()["id"]
        client.delete(f"/api/v1/alerts/{alert_id}", headers=_auth(self.token))
        resp = client.get(f"/api/v1/alerts/{alert_id}", headers=_auth(self.token))
        self.assertEqual(resp.status_code, 404)

    def test_create_alert_unknown_asset_returns_404(self):
        resp = client.post("/api/v1/alerts/", headers=_auth(self.token), json={
            "asset_symbol": "UNKNOWN",
            "condition": "sentiment_below",
            "threshold": -0.5,
        })
        self.assertEqual(resp.status_code, 404)

    def test_alerts_require_auth(self):
        resp = client.get("/api/v1/alerts/")
        self.assertEqual(resp.status_code, 401)


# ===========================================================================
# Watchlist Endpoint Testleri
# ===========================================================================

class TestWatchlistEndpoints(unittest.TestCase):

    def setUp(self):
        self.token = _register_and_login()

    def test_get_empty_watchlist(self):
        resp = client.get("/api/v1/watchlist/", headers=_auth(self.token))
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.json(), [])

    def test_add_to_watchlist_returns_201(self):
        resp = client.post("/api/v1/watchlist/", headers=_auth(self.token),
                           json={"asset_symbol": "BTC"})
        self.assertEqual(resp.status_code, 201)

    def test_watchlist_contains_added_asset(self):
        client.post("/api/v1/watchlist/", headers=_auth(self.token), json={"asset_symbol": "BTC"})
        resp = client.get("/api/v1/watchlist/", headers=_auth(self.token))
        symbols = [item["asset"]["symbol"] for item in resp.json()]
        self.assertIn("BTC", symbols)

    def test_add_duplicate_returns_409(self):
        client.post("/api/v1/watchlist/", headers=_auth(self.token), json={"asset_symbol": "BTC"})
        resp = client.post("/api/v1/watchlist/", headers=_auth(self.token), json={"asset_symbol": "BTC"})
        self.assertEqual(resp.status_code, 409)

    def test_add_unknown_asset_returns_422(self):
        resp = client.post("/api/v1/watchlist/", headers=_auth(self.token),
                           json={"asset_symbol": "FAKECOIN"})
        self.assertEqual(resp.status_code, 422)

    def test_remove_from_watchlist_returns_204(self):
        client.post("/api/v1/watchlist/", headers=_auth(self.token), json={"asset_symbol": "BTC"})
        resp = client.delete("/api/v1/watchlist/BTC", headers=_auth(self.token))
        self.assertEqual(resp.status_code, 204)

    def test_watchlist_empty_after_remove(self):
        client.post("/api/v1/watchlist/", headers=_auth(self.token), json={"asset_symbol": "BTC"})
        client.delete("/api/v1/watchlist/BTC", headers=_auth(self.token))
        resp = client.get("/api/v1/watchlist/", headers=_auth(self.token))
        self.assertEqual(resp.json(), [])

    def test_watchlist_isolated_between_users(self):
        other_token = _register_and_login()
        client.post("/api/v1/watchlist/", headers=_auth(other_token), json={"asset_symbol": "ETH"})
        resp = client.get("/api/v1/watchlist/", headers=_auth(self.token))
        symbols = [item["asset"]["symbol"] for item in resp.json()]
        self.assertNotIn("ETH", symbols)

    def test_watchlist_requires_auth(self):
        resp = client.get("/api/v1/watchlist/")
        self.assertEqual(resp.status_code, 401)


# ===========================================================================
# Dashboard Endpoint Testleri
# ===========================================================================

class TestDashboardEndpoints(unittest.TestCase):

    def test_summary_returns_200(self):
        resp = client.get("/api/v1/dashboard/summary")
        self.assertEqual(resp.status_code, 200)

    def test_summary_has_required_fields(self):
        resp = client.get("/api/v1/dashboard/summary")
        data = resp.json()
        for field in ("total_assets", "total_market_cap", "avg_sentiment_score",
                      "bullish_count", "bearish_count", "neutral_count"):
            self.assertIn(field, data)

    def test_summary_total_assets_positive(self):
        resp = client.get("/api/v1/dashboard/summary")
        self.assertGreater(resp.json()["total_assets"], 0)

    def test_summary_market_cap_positive(self):
        resp = client.get("/api/v1/dashboard/summary")
        self.assertGreater(resp.json()["total_market_cap"], 0)

    def test_top_movers_returns_200(self):
        resp = client.get("/api/v1/dashboard/top-movers")
        self.assertEqual(resp.status_code, 200)

    def test_top_movers_has_gainers_and_losers(self):
        resp = client.get("/api/v1/dashboard/top-movers")
        data = resp.json()
        self.assertIn("gainers", data)
        self.assertIn("losers", data)

    def test_top_movers_limit_param(self):
        resp = client.get("/api/v1/dashboard/top-movers?limit=2")
        data = resp.json()
        self.assertLessEqual(len(data["gainers"]), 2)
        self.assertLessEqual(len(data["losers"]), 2)

    def test_top_movers_gainers_sorted_desc(self):
        resp = client.get("/api/v1/dashboard/top-movers")
        gainers = resp.json()["gainers"]
        if len(gainers) >= 2:
            self.assertGreaterEqual(gainers[0]["change_24h"], gainers[1]["change_24h"])

    def test_top_movers_losers_sorted_asc(self):
        resp = client.get("/api/v1/dashboard/top-movers")
        losers = resp.json()["losers"]
        if len(losers) >= 2:
            self.assertLessEqual(losers[0]["change_24h"], losers[1]["change_24h"])

    def test_dashboard_accessible_without_auth(self):
        resp = client.get("/api/v1/dashboard/summary")
        self.assertNotEqual(resp.status_code, 401)


if __name__ == "__main__":
    unittest.main()
