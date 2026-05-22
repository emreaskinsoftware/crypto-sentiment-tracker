# Crypto Sentiment Tracker

Gerçek zamanlı kripto para **duygu analizi** uygulaması. Binance'den canlı fiyat çeker, RSS + Reddit'ten haber toplar, **FinBERT** NLP modeliyle haberleri −1.0/+1.0 sentiment skoruna dönüştürür ve web + mobil arayüzlerle kullanıcıya sunar.

---

## Teknoloji Stack

| Katman | Teknoloji |
|---|---|
| Backend | Python 3.11 · FastAPI · Uvicorn |
| ORM / Veritabanı | SQLAlchemy 2.0 · PostgreSQL (prod) · SQLite (test) |
| NLP | ProsusAI/finbert · HuggingFace Transformers · PyTorch (CPU) |
| Auth | JWT · python-jose · passlib bcrypt |
| Rate Limiting | slowapi (IP bazlı, endpoint başına limit) |
| Görev Kuyruğu | Celery 5 + Redis · 15 dak. aralık |
| Web Frontend | Next.js 15 · React 19 · Tailwind CSS · Recharts |
| Mobil | Flutter 3 · fl_chart · Firebase Messaging |
| Bildirimler | SMTP (Gmail) · Firebase FCM push |
| Konteyner | Docker + Docker Compose |

---

## Monorepo Yapısı

```
crypto-sentiment-tracker/
├── backend/
│   ├── app/
│   │   ├── api/          # FastAPI router'ları (auth, assets, alerts, watchlist,
│   │   │                 #   dashboard, pipeline, devices)
│   │   ├── core/         # config, database, security, limiter
│   │   ├── models/       # SQLAlchemy modelleri
│   │   ├── schemas/      # Pydantic şemaları
│   │   ├── services/     # iş mantığı servisleri
│   │   └── worker/       # Celery app + 15 dak. beat takvimi
│   ├── tests/            # 473 pytest testi
│   ├── Dockerfile
│   ├── run_scheduler.py  # Bağımsız veri toplama scheduler (Redis gerektirmez)
│   ├── run_live_pipeline.py
│   └── start_scheduler.bat
├── frontend-web/
│   ├── Dockerfile
│   └── src/
├── frontend-mobile/
├── docker-compose.yml    # Tek komutla tam stack
└── README.md
```

---

## Hızlı Başlangıç

### Docker ile (Önerilen)

```bash
# İlk kez — image'lar derlenir (~5-10 dk, FinBERT CPU ~400 MB)
docker compose up --build

# Sonraki başlatmalar
docker compose up -d
```

Servisler:

| Servis | Adres |
|---|---|
| Web Frontend | http://localhost:3000 |
| Backend API | http://localhost:8000 |
| API Dökümantasyon | http://localhost:8000/docs |
| PostgreSQL | localhost:5433 |
| Redis | localhost:6379 |

### Manuel Kurulum

**Gereksinimler:** Python 3.11+, Node.js 20+, Flutter 3.x, Docker

```bash
# 1. PostgreSQL (Docker)
docker run -d --name crypto_db \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=crypto123 \
  -e POSTGRES_DB=crypto_sentiment \
  -p 5433:5432 postgres:15-alpine

# 2. Backend
cd backend
python -m venv venv && venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env   # düzenle
uvicorn app.main:app --reload --port 8000

# 3. Veri toplama (Redis gerektirmez)
python run_scheduler.py              # her 15 dakika
python run_scheduler.py --interval 30
python run_scheduler.py --once       # tek seferlik
# Veya: start_scheduler.bat dosyasına çift tıkla (Windows)

# 4. Web Frontend
cd frontend-web
npm install
# .env.local → NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1
npm run dev    # http://localhost:3000

# 5. Mobil
cd frontend-mobile
flutter pub get
flutter run -d chrome --web-port 8080
```

### Celery (İsteğe Bağlı — Redis ile)

```bash
docker run -d -p 6379:6379 redis:7-alpine
celery -A app.worker.celery_app worker --loglevel=info
celery -A app.worker.celery_app beat --loglevel=info
```

Takvim: XX:00/15/30/45 fiyat · XX:02/17/32/47 sentiment · XX:05/20/35/50 alarmlar

---

## API Endpoints

```
POST  /api/v1/auth/register
POST  /api/v1/auth/login
POST  /api/v1/auth/refresh
GET   /api/v1/auth/me

GET   /api/v1/assets/
GET   /api/v1/assets/live-prices
GET   /api/v1/assets/{id}
GET   /api/v1/assets/{symbol}/sentiment-summary
GET   /api/v1/assets/{symbol}/chart-data?timeframe=24h|7d|30d
GET   /api/v1/assets/{symbol}/correlation
GET   /api/v1/assets/{id}/price-history
GET   /api/v1/assets/{id}/sentiment
GET   /api/v1/assets/{id}/sentiment-sources
POST  /api/v1/assets/add                          (JWT)

GET   /api/v1/dashboard/summary
GET   /api/v1/dashboard/top-movers

POST  /api/v1/pipeline/trigger                    (JWT · 15 dak. cooldown)
GET   /api/v1/pipeline/status

GET   /api/v1/watchlist/                          (JWT)
GET   /api/v1/watchlist/mood                      (JWT)
POST  /api/v1/watchlist/                          (JWT)
DELETE /api/v1/watchlist/{symbol}                 (JWT)

GET   /api/v1/alerts/                             (JWT)
POST  /api/v1/alerts/                             (JWT)
PATCH /api/v1/alerts/{id}                         (JWT)
DELETE /api/v1/alerts/{id}                        (JWT)
GET   /api/v1/alerts/notifications                (JWT)
POST  /api/v1/alerts/notifications/read           (JWT)

POST  /api/v1/devices/fcm-token                   (JWT)
DELETE /api/v1/devices/fcm-token                  (JWT)
```

### Rate Limiting (slowapi · IP bazlı)

| Endpoint | Limit |
|---|---|
| `POST /auth/login` | 10/dakika |
| `POST /auth/register` | 5/dakika |
| `POST /pipeline/trigger` | 5/dakika |
| `GET /assets/live-prices`, chart, history | 30/dakika |
| `POST /watchlist/`, alerts | 20/dakika |
| Diğer GET endpoint'leri | 60/dakika |

---

## Veritabanı Modelleri

```
users           — id, email, hashed_password, full_name, is_active, fcm_token
assets          — id, symbol, name, current_price, market_cap, volume_24h, change_24h
price_history   — id, asset_id, price, volume, market_cap, recorded_at
sentiment_logs  — id, asset_id, score(−1…+1), source, headline, url, analyzed_at
alerts          — id, user_id, asset_id, condition_type, threshold, is_active, last_triggered_at
alert_triggers  — id, alert_id, triggered_at, condition_type, threshold, actual_value, is_read
watchlists      — id, user_id, asset_id, added_at
```

---

## İzlenen Kripto Paralar (20 adet)

`BTC · ETH · BNB · SOL · XRP · ADA · DOGE · AVAX · DOT · MATIC · LINK · LTC · ATOM · NEAR · ARB · OP · TON · SHIB · UNI · FTM`

---

## Ortam Değişkenleri (`backend/.env`)

```env
DATABASE_URL=postgresql://postgres:crypto123@localhost:5433/crypto_sentiment
JWT_SECRET=degistir-cok-gizli-anahtar
JWT_ALGORITHM=HS256
JWT_EXPIRE_MINUTES=60
JWT_REFRESH_EXPIRE_DAYS=7

CELERY_BROKER_URL=redis://localhost:6379/0
CELERY_RESULT_BACKEND=redis://localhost:6379/0

SMTP_ENABLED=False
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USERNAME=ornek@gmail.com
SMTP_PASSWORD=gmail-app-sifresi
SMTP_FROM_EMAIL=ornek@gmail.com

FCM_ENABLED=False
FCM_CREDENTIALS_JSON={"type":"service_account",...}
```

> Docker Compose kullanırken `DATABASE_URL`, `CELERY_BROKER_URL` ve `CELERY_RESULT_BACKEND` otomatik override edilir — ayrıca düzenleme gerekmez.

---

## Testler

```bash
cd backend
venv\Scripts\python.exe -m pytest tests/ -q
# Beklenen: 473 passed
```

Test kapsamı:

| Dosya | Test | Kapsam |
|---|---|---|
| `test_new_endpoints.py` | 75 | correlation, sentiment-sources, portfolio mood, notifications, pipeline |
| `test_week8.py` | 44 | Auth, Assets, Alerts CRUD, Watchlist, Dashboard |
| `test_week11.py` | 31 | FCM · E2E entegrasyon · yanıt süresi |
| `test_week10.py` | 36 | Alert checker · SMTP |
| `test_week7.py` | 33 | Celery tasks · beat takvimi |
| `test_week6.py` | 23 | Sentiment pipeline |
| `test_week5.py` | 27 | Price fetcher · news fetcher · FinBERT |
| Diğerleri | 204 | Auth, API endpoints, entegrasyon, veri çekme |

---

## Docker Durdurma

```bash
# Servisleri durdur (veriler korunur)
docker compose down

# Her şeyi sil (veritabanı ve FinBERT cache dahil)
docker compose down -v
```

---

## Güvenlik

- `backend/.env` gitignore'da — commit edilmez
- `google-services.json` gitignore'da — Firebase Console'dan indirilir
- `frontend-web/.env.local` gitignore'da
- Şifreler bcrypt ile hashlenir
- JWT access token 60 dk · refresh token 7 gün
- Pipeline trigger endpoint 15 dakika cooldown + 5/dk rate limit
- Rate limiter tüm endpoint'lerde aktif (IP bazlı)
- FCM_CREDENTIALS_JSON tek satır JSON olmalı

---

## Veri Akışı

```
Binance API ──► price_fetcher.py ──► assets + price_history
RSS/Reddit  ──► news_fetcher.py ──► NewsItem[]
                                         │
                           finbert_analyzer.py ──► score: −1.0…+1.0
                                         │
                           sentiment_pipeline.py ──► sentiment_logs
                                         │
                           alert_checker.py ──► SMTP e-posta + FCM push
                                         │
FastAPI /api/v1/* ──────────────────────► Next.js / Flutter
         │
    POST /pipeline/trigger (JWT) ──► BackgroundTask ──► fiyat + sentiment
```

---

## Bilinen Kısıtlamalar

| Konu | Durum |
|---|---|
| FinBERT modeli | ~500 MB, Docker volume'a cache'lenir — bir kez indirilir |
| Celery/Redis | Opsiyonel — `run_scheduler.py` Redis olmadan çalışır |
| FCM push bildirimi | Gerçek Android cihaz + `google-services.json` gerekir |
| iOS push | Apple Developer hesabı gerektiği için kapsam dışı |
| Flutter mobile Docker | Flutter SDK çok büyük — `flutter run` ile yerel çalıştırın |
