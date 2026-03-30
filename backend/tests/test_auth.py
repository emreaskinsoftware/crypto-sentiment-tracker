"""
Hafta 4 — JWT Auth Testleri
Başarı Ölçütleri (İş Paketi):
  - Register ve Login Postman/test istemcisinde 200/201 OK + JWT token döndürmeli
  - Şifreler veritabanında hash'li saklanmalı (response'da plain-text gözükmemeli)
  - JWT ile korunan /me endpoint'i token olmadan 403, geçersiz token ile 401 dönmeli
"""

REGISTER_URL = "/api/v1/auth/register"
LOGIN_URL = "/api/v1/auth/login"
ME_URL = "/api/v1/auth/me"

VALID_USER = {
    "email": "testuser@example.com",
    "password": "SecurePass123",
    "full_name": "Test Kullanıcı",
}


# ── REGISTER ──────────────────────────────────────────────────────────────────

def test_register_success(client):
    response = client.post(REGISTER_URL, json=VALID_USER)
    assert response.status_code == 201
    data = response.json()
    assert data["email"] == VALID_USER["email"]
    assert data["full_name"] == VALID_USER["full_name"]
    assert data["is_active"] is True
    assert "id" in data
    assert "created_at" in data


def test_register_password_not_in_response(client):
    """Şifre response'da asla görünmemeli (hash veya plain-text)"""
    response = client.post(REGISTER_URL, json=VALID_USER)
    assert response.status_code == 201
    body = response.json()
    assert "password" not in body
    assert "hashed_password" not in body


def test_register_duplicate_email(client):
    """Aynı e-posta ile iki kez kayıt 400 dönmeli"""
    client.post(REGISTER_URL, json=VALID_USER)
    response = client.post(REGISTER_URL, json=VALID_USER)
    assert response.status_code == 400
    assert "already registered" in response.json()["detail"]


def test_register_invalid_email_format(client):
    """Geçersiz e-posta formatı 422 (Unprocessable Entity) dönmeli"""
    response = client.post(REGISTER_URL, json={**VALID_USER, "email": "bozuk-email"})
    assert response.status_code == 422


# ── LOGIN ─────────────────────────────────────────────────────────────────────

def test_login_success_returns_jwt(client):
    """Başarılı login JWT token ve token_type='bearer' dönmeli"""
    client.post(REGISTER_URL, json=VALID_USER)
    response = client.post(LOGIN_URL, json={
        "email": VALID_USER["email"],
        "password": VALID_USER["password"],
    })
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"
    # JWT formatı: header.payload.signature
    assert len(data["access_token"].split(".")) == 3


def test_login_wrong_password(client):
    """Yanlış şifre 401 dönmeli"""
    client.post(REGISTER_URL, json=VALID_USER)
    response = client.post(LOGIN_URL, json={
        "email": VALID_USER["email"],
        "password": "YanlisParola!",
    })
    assert response.status_code == 401
    assert "Invalid" in response.json()["detail"]


def test_login_nonexistent_user(client):
    """Kayıtlı olmayan kullanıcı 401 dönmeli"""
    response = client.post(LOGIN_URL, json={
        "email": "yok@example.com",
        "password": "herhangi",
    })
    assert response.status_code == 401


# ── /ME (JWT Korumalı) ────────────────────────────────────────────────────────

def _get_token(client) -> str:
    client.post(REGISTER_URL, json=VALID_USER)
    resp = client.post(LOGIN_URL, json={
        "email": VALID_USER["email"],
        "password": VALID_USER["password"],
    })
    return resp.json()["access_token"]


def test_me_authenticated(client):
    """Geçerli JWT ile /me mevcut kullanıcıyı dönmeli"""
    token = _get_token(client)
    response = client.get(ME_URL, headers={"Authorization": f"Bearer {token}"})
    assert response.status_code == 200
    data = response.json()
    assert data["email"] == VALID_USER["email"]
    assert data["full_name"] == VALID_USER["full_name"]


def test_me_no_token(client):
    """Token olmadan /me 4xx (kimlik doğrulama hatası) dönmeli"""
    response = client.get(ME_URL)
    assert response.status_code in (401, 403)


def test_me_invalid_token(client):
    """Geçersiz/sahte token ile /me 401 dönmeli"""
    response = client.get(ME_URL, headers={"Authorization": "Bearer sahte.token.degeri"})
    assert response.status_code == 401


def test_me_malformed_bearer(client):
    """Bozuk Bearer formatı 4xx (kimlik doğrulama hatası) dönmeli"""
    response = client.get(ME_URL, headers={"Authorization": "Basic abc123"})
    assert response.status_code in (401, 403)
