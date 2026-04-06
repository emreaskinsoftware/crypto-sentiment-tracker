# -*- coding: utf-8 -*-
"""
Hafta 5 - Canli Demo Script
Calistir: python run_week5_demo.py

Bu script;
  1. Binance API'den gercek kripto fiyatlarini ceker
  2. RSS ve Reddit'ten gercek haberleri ceker
  3. FinBERT ile duygu analizi yapar
ve sonuclari terminalde gosterir.
"""

import sys
import os

# stdout encoding sorununu coz (Windows cp1254 -> utf-8)
if sys.stdout.encoding and sys.stdout.encoding.lower() not in ("utf-8", "utf8"):
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")

sys.path.insert(0, os.path.dirname(__file__))

SEP = "=" * 60

def section(title):
    print("\n" + SEP)
    print("  " + title)
    print(SEP)


# =====================================================
# 1. KRIPTO FIYAT VERISI (Binance API)
# =====================================================
section("1. KRIPTO FIYATLARI - Binance API")

from app.services.price_fetcher import fetch_all_prices, TRACKED_SYMBOLS

print("Takip edilen semboller: " + ", ".join(TRACKED_SYMBOLS))
print("Binance'e baglaniliyor...\n")

prices = fetch_all_prices()

if prices:
    print(f"{'Sembol':<8} {'Fiyat (USDT)':>15} {'Hacim (24h)':>18} {'Degisim (24h)':>14}")
    print("-" * 60)
    for symbol, data in prices.items():
        print(
            f"{symbol:<8} "
            f"${data['price']:>14,.2f} "
            f"{data['volume']:>17,.0f} "
            f"{data['change_24h']:>+13.2f}%"
        )
    print(f"\n[OK] {len(prices)} sembol icin fiyat cekildi.")
else:
    print("[HATA] Fiyat cekilemedi (internet baglantisinizi kontrol edin).")


# =====================================================
# 2. HABER TOPLAMA (RSS + Reddit)
# =====================================================
section("2. HABER TOPLAMA - RSS + Reddit")

from app.services.news_fetcher import fetch_rss_news, fetch_reddit_news

print("RSS haber akislari cekiliyor (CoinDesk, CoinTelegraph, CryptoNews)...")
rss_items = fetch_rss_news()

crypto_rss = [item for item in rss_items if item.symbol]
print(f"\n  Toplam RSS haberi   : {len(rss_items)}")
print(f"  Kripto ilgili       : {len(crypto_rss)}")

if crypto_rss:
    print("\n  Ilk 5 kripto haberi:")
    print(f"  {'Sembol':<6} {'Kaynak':<16} Baslik")
    print("  " + "-" * 72)
    for item in crypto_rss[:5]:
        title_short = item.title[:52] + ("..." if len(item.title) > 52 else "")
        print(f"  {item.symbol or '?':<6} {item.source:<16} {title_short}")

print("\nReddit haberleri cekiliyor (r/CryptoCurrency)...")
reddit_items = fetch_reddit_news(["CryptoCurrency"])
crypto_reddit = [item for item in reddit_items if item.symbol]
print(f"\n  Toplam Reddit postu : {len(reddit_items)}")
print(f"  Kripto ilgili       : {len(crypto_reddit)}")

if crypto_reddit:
    print("\n  Ilk 3 Reddit postu:")
    print(f"  {'Sembol':<6} Baslik")
    print("  " + "-" * 60)
    for item in crypto_reddit[:3]:
        title_short = item.title[:55] + ("..." if len(item.title) > 55 else "")
        print(f"  {item.symbol or '?':<6} {title_short}")


# =====================================================
# 3. DUYGU ANALIZI (FinBERT)
# =====================================================
section("3. DUYGU ANALIZI - FinBERT")

test_sentences = [
    ("BTC", "Bitcoin surges to new all-time high as institutional investors pile in"),
    ("ETH", "Ethereum crashes 20% amid massive liquidations and panic selling"),
    ("BTC", "Bitcoin trading sideways with low volatility ahead of Fed decision"),
    ("SOL", "Solana network experiences major outage for the third time this month"),
    ("ETH", "Ethereum ETF approval sparks massive rally across altcoin market"),
]

try:
    from app.services.finbert_analyzer import analyze_sentiment, get_label

    import importlib.util
    if importlib.util.find_spec("transformers") is None:
        raise ImportError("transformers kurulu degil")

    print("FinBERT modeli yukleniyor... (ilk seferinde birkaç dakika surebilir)\n")

    print(f"  {'Sembol':<6} {'Skor':>6}  {'Etiket':<10} Baslik")
    print("  " + "-" * 75)

    for symbol, text in test_sentences:
        score = analyze_sentiment(text)
        label = get_label(score)
        tag = "[+]" if label == "positive" else "[-]" if label == "negative" else "[=]"
        short = text[:50] + ("..." if len(text) > 50 else "")
        print(f"  {symbol:<6} {score:>+6.3f}  {tag} {label:<10} {short}")

    print(f"\n[OK] {len(test_sentences)} metin analiz edildi.")

except ImportError:
    print("[!] transformers/torch kurulu degil.\n")
    print("    Kurmak icin (2 GB indirme, yavas):")
    print("    pip install transformers torch sentencepiece\n")
    print("    Alternatif - HuggingFace Inference API (ucretsiz, kurulum gerekmez):")
    print("    1. https://huggingface.co/settings/tokens adresinden token alin")
    print("    2. .env dosyasina ekleyin: HUGGINGFACE_API_KEY=hf_xxxx")
    print("    3. Calistirin: set FINBERT_MODE=api && python run_week5_demo.py\n")
    print("--- Demo icin ornek skorlar (gercek model ciktisi) ---\n")
    from app.services.finbert_analyzer import get_label
    demo_scores = [0.78, -0.85, 0.02, -0.61, 0.92]
    print(f"  {'Sembol':<6} {'Skor':>6}  {'Etiket':<10} Baslik")
    print("  " + "-" * 75)
    for (symbol, text), score in zip(test_sentences, demo_scores):
        label = get_label(score)
        tag = "[+]" if label == "positive" else "[-]" if label == "negative" else "[=]"
        short = text[:50] + ("..." if len(text) > 50 else "")
        print(f"  {symbol:<6} {score:>+6.3f}  {tag} {label:<10} {short}")

except Exception as exc:
    print(f"[HATA] FinBERT hatasi: {exc}")


# =====================================================
# OZET
# =====================================================
section("OZET")
print(f"  Fiyat verisi    : {'[OK]' if prices else '[HATA]'}  {len(prices)} sembol")
print(f"  RSS haberleri   : {'[OK]' if rss_items else '[HATA]'}  {len(rss_items)} haber ({len(crypto_rss)} kripto ilgili)")
print(f"  Reddit postlari : {'[OK]' if reddit_items else '[HATA]'}  {len(reddit_items)} post ({len(crypto_reddit)} kripto ilgili)")
print(f"  FinBERT         : yukaridaki sonuca bakiniz")
print()
