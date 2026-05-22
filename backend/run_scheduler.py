"""
Bağımsız Veri Toplama Scheduler — Redis/Celery gerektirmez.

Her INTERVAL_MINUTES dakikada bir tam pipeline çalıştırır:
  1. Binance'den canlı fiyatlar
  2. RSS + Reddit haberleri → FinBERT duygu analizi
  3. Alarm koşullarını tara

Başlatma:
    python run_scheduler.py              # Varsayılan: 15 dakika
    python run_scheduler.py --interval 30
    python run_scheduler.py --once       # Sadece bir kez çalıştır
"""

import argparse
import io
import logging
import signal
import sys
import time
from datetime import datetime, timezone

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")

# ── Loglama ayarı ─────────────────────────────────────────────────────────────
logging.basicConfig(
    level=logging.WARNING,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    datefmt="%H:%M:%S",
)
logger = logging.getLogger("scheduler")
logger.setLevel(logging.INFO)

SEP = "=" * 62
THIN = "-" * 62

_running = True


def _signal_handler(sig, frame):
    global _running
    print(f"\n\n[!] Durdurma sinyali alındı. Mevcut çalışma tamamlandıktan sonra çıkılacak...")
    _running = False


signal.signal(signal.SIGINT, _signal_handler)
signal.signal(signal.SIGTERM, _signal_handler)


def _now() -> str:
    return datetime.now().strftime("%Y-%m-%d %H:%M:%S")


def run_once() -> dict:
    """Tam pipeline'ı bir kez çalıştırır. İstatistik sözlüğü döner."""
    from app.core.database import SessionLocal
    from app.services.price_fetcher import run_price_pipeline
    from app.services.sentiment_pipeline import run_sentiment_pipeline
    from app.services.alert_checker import run_alert_checker

    stats = {"prices": {}, "sentiment": {}, "alerts": {}, "errors": []}

    # ── 1. FİYATLAR ───────────────────────────────────────────────────────────
    print(f"\n  [1/3] Fiyatlar çekiliyor... ", end="", flush=True)
    t0 = time.time()
    try:
        stats["prices"] = run_price_pipeline()
        elapsed = time.time() - t0
        p = stats["prices"]
        print(f"✓  {p.get('saved',0)}/{p.get('fetched',0)} kaydedildi  ({elapsed:.1f}s)")
    except Exception as exc:
        elapsed = time.time() - t0
        print(f"✗  HATA: {exc}  ({elapsed:.1f}s)")
        stats["errors"].append(f"prices: {exc}")
        logger.exception("Fiyat pipeline hatası")

    # ── 2. DUYGU ANALİZİ ──────────────────────────────────────────────────────
    print(f"  [2/3] Haberler + FinBERT analizi... ", end="", flush=True)
    t0 = time.time()
    db = SessionLocal()
    try:
        stats["sentiment"] = run_sentiment_pipeline(db)
        elapsed = time.time() - t0
        s = stats["sentiment"]
        print(
            f"✓  {s.get('saved',0)} log kaydedildi  "
            f"({s.get('fetched',0)} haber, {s.get('with_symbol',0)} eşleşti)  ({elapsed:.1f}s)"
        )
    except Exception as exc:
        elapsed = time.time() - t0
        print(f"✗  HATA: {exc}  ({elapsed:.1f}s)")
        stats["errors"].append(f"sentiment: {exc}")
        logger.exception("Sentiment pipeline hatası")
    finally:
        db.close()

    # ── 3. ALARMLAR ───────────────────────────────────────────────────────────
    print(f"  [3/3] Alarm koşulları taranıyor... ", end="", flush=True)
    t0 = time.time()
    db = SessionLocal()
    try:
        stats["alerts"] = run_alert_checker(db)
        elapsed = time.time() - t0
        a = stats["alerts"]
        triggered = a.get("triggered", 0) if isinstance(a, dict) else 0
        print(f"✓  {triggered} alarm tetiklendi  ({elapsed:.1f}s)")
    except Exception as exc:
        elapsed = time.time() - t0
        print(f"✗  HATA: {exc}  ({elapsed:.1f}s)")
        stats["errors"].append(f"alerts: {exc}")
        logger.exception("Alarm checker hatası")
    finally:
        db.close()

    return stats


def _print_db_summary():
    """Veritabanındaki mevcut özet istatistikleri gösterir."""
    try:
        from app.core.database import SessionLocal
        from app.models.asset import Asset
        from app.models.price_history import PriceHistory
        from app.models.sentiment_log import SentimentLog
        from sqlalchemy import func

        db = SessionLocal()
        try:
            price_count = db.query(func.count(PriceHistory.id)).scalar()
            sentiment_count = db.query(func.count(SentimentLog.id)).scalar()
            asset_count = db.query(func.count(Asset.id)).scalar()

            print(f"\n  Veritabanı Özeti:")
            print(f"    Varlık (asset) : {asset_count}")
            print(f"    Fiyat kaydı    : {price_count:,}")
            print(f"    Sentiment logu : {sentiment_count:,}")
        finally:
            db.close()
    except Exception as exc:
        logger.warning("DB özeti alınamadı: %s", exc)


def main():
    parser = argparse.ArgumentParser(description="Kripto Sentiment Veri Toplama Scheduler")
    parser.add_argument(
        "--interval", type=int, default=15,
        help="Pipeline çalıştırma aralığı (dakika, varsayılan: 15)"
    )
    parser.add_argument(
        "--once", action="store_true",
        help="Sadece bir kez çalıştır ve çık"
    )
    args = parser.parse_args()

    interval_sec = args.interval * 60

    print(SEP)
    print("  Kripto Sentiment — Veri Toplama Scheduler")
    print(SEP)

    if args.once:
        print(f"  Mod     : Tek seferlik")
    else:
        print(f"  Mod     : Sürekli (her {args.interval} dakika)")
        print(f"  Çıkmak için Ctrl+C")

    print(f"  Başlangıç: {_now()}")
    print(THIN)

    run_count = 0

    while _running:
        run_count += 1
        print(f"\n{SEP}")
        print(f"  Çalışma #{run_count}  —  {_now()}")
        print(SEP)

        t_start = time.time()
        stats = run_once()
        total_elapsed = time.time() - t_start

        if stats["errors"]:
            print(f"\n  [!] {len(stats['errors'])} hata oluştu:")
            for err in stats["errors"]:
                print(f"      • {err}")

        _print_db_summary()

        print(f"\n  Toplam süre: {total_elapsed:.1f}s")
        print(THIN)

        if args.once or not _running:
            break

        next_run = datetime.now().strftime("%H:%M:%S")
        wait_min = args.interval
        print(f"  Sonraki çalışma: {wait_min} dakika sonra  (Ctrl+C ile dur)")

        # Bekleme süresi boyunca sinyal kontrolü için küçük parçalara böl
        deadline = time.time() + interval_sec
        while _running and time.time() < deadline:
            remaining = deadline - time.time()
            time.sleep(min(5.0, remaining))

    print(f"\n{SEP}")
    print(f"  Scheduler durduruldu — Toplam çalışma: {run_count}")
    print(f"  {_now()}")
    print(SEP)


if __name__ == "__main__":
    main()
