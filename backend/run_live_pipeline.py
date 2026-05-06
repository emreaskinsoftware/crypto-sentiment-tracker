"""
Canli Veri Pipeline — Gercek fiyatlar + haberler + FinBERT analizi
Calistir: python run_live_pipeline.py
"""
import io
import sys
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")

from app.core.database import SessionLocal
from app.services.price_fetcher import fetch_all_prices, save_price_to_db
from app.services.news_fetcher import fetch_all_news
from app.services.sentiment_pipeline import analyze_and_save

SEP = "=" * 60


def run():
    db = SessionLocal()
    try:
        # ── 1. FIYATLAR ──────────────────────────────────────────────
        print(f"\n{SEP}")
        print("ADIM 1/3 — Binance'den canli fiyatlar cekiliyor...")
        print(SEP)

        prices = fetch_all_prices()
        price_saved = 0
        for symbol, data in prices.items():
            try:
                save_price_to_db(db, symbol, data)
                price_saved += 1
                change_str = f"{data['change_24h']:+.2f}%"
                print(f"  [OK] {symbol:<5} ${data['price']:>12,.4f}  {change_str}")
            except Exception as e:
                print(f"  [HATA] {symbol}: {e}")
                db.rollback()

        print(f"\n  --> {price_saved}/{len(prices)} fiyat guncellendi")

        # ── 2. HABERLER ───────────────────────────────────────────────
        print(f"\n{SEP}")
        print("ADIM 2/3 — RSS + Reddit haberleri cekiliyor...")
        print(SEP)

        news_items = fetch_all_news()
        with_symbol = [n for n in news_items if n.symbol]
        print(f"  Toplam: {len(news_items)} haber | Kripto ilgili: {len(with_symbol)}")

        symbol_counts = {}
        for item in with_symbol:
            symbol_counts[item.symbol] = symbol_counts.get(item.symbol, 0) + 1
        for sym, count in sorted(symbol_counts.items(), key=lambda x: -x[1]):
            print(f"  {sym:<5}: {count} haber")

        # ── 3. FINBERT ANALIZI ────────────────────────────────────────
        print(f"\n{SEP}")
        print("ADIM 3/3 — FinBERT duygu analizi yapiliyor...")
        print("  (Ilk calistirmada model yukleniyor, 10-30 saniye surebilir)")
        print(SEP)

        saved = 0
        failed = 0
        for i, item in enumerate(with_symbol, 1):
            success = analyze_and_save(item, db)
            if success:
                saved += 1
            else:
                failed += 1
            if i % 5 == 0 or i == len(with_symbol):
                print(f"  [{i}/{len(with_symbol)}] Analiz ediliyor...", end="\r")

        print(f"\n  --> {saved} sentiment logu kaydedildi | {failed} basarisiz")

        # ── OZET ──────────────────────────────────────────────────────
        print(f"\n{SEP}")
        print("PIPELINE TAMAMLANDI")
        print(SEP)

        # DB'deki guncel durumu goster
        from app.models.asset import Asset
        from app.models.sentiment_log import SentimentLog
        from sqlalchemy import func

        assets = db.query(Asset).order_by(Asset.market_cap.desc()).all()
        print(f"\n{'Sembol':<6} {'Fiyat':>14} {'24h':>8}  Sentiment")
        print("-" * 48)
        for asset in assets:
            latest = (
                db.query(SentimentLog)
                .filter(SentimentLog.asset_id == asset.id)
                .order_by(SentimentLog.analyzed_at.desc())
                .first()
            )
            score = f"{latest.score:+.2f}" if latest else "  N/A"
            label = "Positive" if latest and latest.score >= 0.3 else \
                    "Negative" if latest and latest.score <= -0.3 else "Neutral"
            print(f"{asset.symbol:<6} ${asset.current_price:>12,.4f}  {asset.change_24h:>+6.2f}%  {score} ({label})")

        log_count = db.query(func.count(SentimentLog.id)).scalar()
        print(f"\nToplam sentiment logu: {log_count}")
        print("\n[OK] Uygulama sayfasini yenileyince gercek veriler gorunecek!")

    finally:
        db.close()


if __name__ == "__main__":
    run()
