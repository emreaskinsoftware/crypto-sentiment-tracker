"""
Hafta 5 — Veri Toplama ve Yapay Zeka Testleri
Başarı Ölçütleri (İş Paketi):
  - Binance API'den kripto fiyat/hacim verisi çekilebilmeli
  - RSS ve Reddit kaynaklarından haber toplanabilmeli
  - FinBERT duygu skoru -1.0 ile +1.0 arasında olmalı
  - Metinlerin %95'inden fazlası NLP modelinden hatasız geçmeli
"""

from __future__ import annotations

import os
from datetime import datetime, timezone
from unittest.mock import MagicMock, patch

import pytest

# ── Price Fetcher Testleri ────────────────────────────────────────────────────

class TestPriceFetcher:
    """price_fetcher.py için birim testler."""

    def test_binance_pairs_coverage(self):
        """Tüm takip edilen sembollerin Binance pair tablosunda olması gerekir."""
        from app.services.price_fetcher import BINANCE_PAIRS, TRACKED_SYMBOLS
        for symbol in TRACKED_SYMBOLS:
            assert symbol in BINANCE_PAIRS, f"{symbol} Binance pair tablosunda yok"

    def test_fetch_price_for_symbol_success(self):
        """Başarılı Binance ticker yanıtı doğru dict yapısı döndürmeli."""
        mock_response = MagicMock()
        mock_response.raise_for_status.return_value = None
        mock_response.json.return_value = {
            "lastPrice": "65000.50",
            "volume": "12345.67",
            "priceChangePercent": "2.34",
        }

        with patch("app.services.price_fetcher.requests.get", return_value=mock_response):
            from app.services.price_fetcher import fetch_price_for_symbol
            result = fetch_price_for_symbol("BTC")

        assert result is not None
        assert result["price"] == pytest.approx(65000.50)
        assert result["volume"] == pytest.approx(12345.67)
        assert result["change_24h"] == pytest.approx(2.34)
        assert "market_cap" in result

    def test_fetch_price_unknown_symbol_returns_none(self):
        """Bilinmeyen sembol None döndürmeli."""
        from app.services.price_fetcher import fetch_price_for_symbol
        result = fetch_price_for_symbol("UNKNOWN_XYZ")
        assert result is None

    def test_fetch_price_network_error_returns_none(self):
        """Ağ hatasında None döndürmeli (uygulama çökmemeli)."""
        import requests as req

        with patch("app.services.price_fetcher.requests.get", side_effect=req.ConnectionError("timeout")):
            from app.services.price_fetcher import fetch_price_for_symbol
            result = fetch_price_for_symbol("BTC")

        assert result is None

    def test_fetch_all_prices_returns_dict(self):
        """fetch_all_prices sembol→dict eşlemesi döndürmeli."""
        mock_response = MagicMock()
        mock_response.raise_for_status.return_value = None
        mock_response.json.return_value = {
            "lastPrice": "3500.00",
            "volume": "50000.00",
            "priceChangePercent": "-1.5",
        }

        with patch("app.services.price_fetcher.requests.get", return_value=mock_response):
            from app.services.price_fetcher import fetch_all_prices
            results = fetch_all_prices()

        assert isinstance(results, dict)
        assert len(results) > 0
        for symbol, data in results.items():
            assert "price" in data
            assert "volume" in data

    def test_save_price_to_db(self):
        """Fiyat verisi veritabanına kaydedilmeli, PriceHistory objesi dönmeli."""
        os.environ["DATABASE_URL"] = "sqlite:///./test_crypto.db"

        from sqlalchemy import create_engine
        from sqlalchemy.orm import sessionmaker
        from app.core.database import Base
        from app.services.price_fetcher import save_price_to_db
        from app.models.price_history import PriceHistory

        engine = create_engine("sqlite:///./test_w5_price.db")
        Base.metadata.create_all(bind=engine)
        Session = sessionmaker(bind=engine)
        db = Session()

        try:
            price_data = {"price": 65000.0, "volume": 10000.0, "market_cap": 0.0, "change_24h": 1.5}
            record = save_price_to_db(db, "BTC", price_data)

            assert record is not None
            assert isinstance(record, PriceHistory)
            assert record.price == pytest.approx(65000.0)
            assert record.volume == pytest.approx(10000.0)
        finally:
            db.close()
            Base.metadata.drop_all(bind=engine)

    def test_run_price_pipeline_stats(self):
        """Pipeline istatistikleri fetched/saved/failed anahtarlarını içermeli."""
        os.environ["DATABASE_URL"] = "sqlite:///./test_crypto.db"

        from sqlalchemy import create_engine
        from sqlalchemy.orm import sessionmaker
        from app.core.database import Base
        from app.services.price_fetcher import run_price_pipeline

        engine = create_engine("sqlite:///./test_w5_pipeline.db")
        Base.metadata.create_all(bind=engine)
        Session = sessionmaker(bind=engine)
        db = Session()

        mock_response = MagicMock()
        mock_response.raise_for_status.return_value = None
        mock_response.json.return_value = {
            "lastPrice": "100.0",
            "volume": "500.0",
            "priceChangePercent": "0.5",
        }

        try:
            with patch("app.services.price_fetcher.requests.get", return_value=mock_response):
                stats = run_price_pipeline(db)

            assert "fetched" in stats
            assert "saved" in stats
            assert "failed" in stats
            assert stats["saved"] + stats["failed"] == stats["fetched"]
        finally:
            db.close()
            Base.metadata.drop_all(bind=engine)


# ── News Fetcher Testleri ─────────────────────────────────────────────────────

class TestNewsFetcher:
    """news_fetcher.py için birim testler."""

    RSS_SAMPLE = b"""<?xml version="1.0"?>
    <rss version="2.0">
      <channel>
        <title>CoinDesk</title>
        <item>
          <title>Bitcoin surges past $65,000 as institutional demand rises</title>
          <link>https://example.com/btc-surge</link>
          <pubDate>Mon, 07 Apr 2025 10:00:00 +0000</pubDate>
        </item>
        <item>
          <title>Ethereum upgrade scheduled for next month</title>
          <link>https://example.com/eth-upgrade</link>
          <pubDate>Mon, 07 Apr 2025 09:00:00 +0000</pubDate>
        </item>
        <item>
          <title>General crypto market update</title>
          <link>https://example.com/general</link>
          <pubDate>Mon, 07 Apr 2025 08:00:00 +0000</pubDate>
        </item>
      </channel>
    </rss>"""

    def test_rss_parsing_returns_news_items(self):
        """RSS yanıtı doğru şekilde ayrıştırılmalı ve NewsItem listesi dönmeli."""
        mock_response = MagicMock()
        mock_response.raise_for_status.return_value = None
        mock_response.content = self.RSS_SAMPLE

        with patch("app.services.news_fetcher.requests.get", return_value=mock_response):
            from app.services.news_fetcher import _fetch_rss
            items = _fetch_rss({"name": "CoinDesk", "url": "https://fake-rss.com"})

        assert len(items) == 3
        assert all(item.title for item in items)
        assert all(item.source == "CoinDesk" for item in items)

    def test_symbol_assignment_btc(self):
        """Bitcoin içeren başlığa BTC sembolü atanmalı."""
        from app.services.news_fetcher import NewsItem, _assign_symbol
        item = NewsItem(
            title="Bitcoin reaches new all-time high",
            url="https://example.com",
            source="Test",
        )
        result = _assign_symbol(item)
        assert result.symbol == "BTC"

    def test_symbol_assignment_eth(self):
        """Ethereum içeren başlığa ETH sembolü atanmalı."""
        from app.services.news_fetcher import NewsItem, _assign_symbol
        item = NewsItem(
            title="Ethereum merge reduces energy consumption",
            url="https://example.com",
            source="Test",
        )
        result = _assign_symbol(item)
        assert result.symbol == "ETH"

    def test_symbol_assignment_unknown(self):
        """İlgisiz başlıkta sembol None kalmalı."""
        from app.services.news_fetcher import NewsItem, _assign_symbol
        item = NewsItem(
            title="Stock market sees gains today",
            url="https://example.com",
            source="Test",
        )
        result = _assign_symbol(item)
        assert result.symbol is None

    def test_rss_network_error_returns_empty_list(self):
        """RSS ağ hatası uygulama çökmeden boş liste döndürmeli."""
        import requests as req
        with patch("app.services.news_fetcher.requests.get", side_effect=req.ConnectionError("timeout")):
            from app.services.news_fetcher import _fetch_rss
            items = _fetch_rss({"name": "CoinDesk", "url": "https://fake-rss.com"})
        assert items == []

    def test_reddit_parsing_returns_items(self):
        """Reddit JSON yanıtı doğru şekilde ayrıştırılmalı."""
        mock_reddit_data = {
            "data": {
                "children": [
                    {
                        "data": {
                            "title": "Bitcoin ETF sees record inflows",
                            "permalink": "/r/CryptoCurrency/comments/abc/",
                            "created_utc": 1712400000,
                        }
                    },
                    {
                        "data": {
                            "title": "Why Ethereum is the future of DeFi",
                            "permalink": "/r/CryptoCurrency/comments/def/",
                            "created_utc": 1712396400,
                        }
                    },
                ]
            }
        }
        mock_response = MagicMock()
        mock_response.raise_for_status.return_value = None
        mock_response.json.return_value = mock_reddit_data

        with patch("app.services.news_fetcher.requests.get", return_value=mock_response):
            from app.services.news_fetcher import _fetch_reddit
            items = _fetch_reddit("CryptoCurrency")

        assert len(items) == 2
        assert items[0].source == "Reddit/r/CryptoCurrency"
        assert items[0].published_at is not None

    def test_fetch_all_news_only_crypto_items(self):
        """fetch_all_news yalnızca kripto sembolü eşleşen haberleri döndürmeli."""
        from app.services.news_fetcher import NewsItem

        crypto_item = NewsItem(title="BTC hits $70k", url="u1", source="S1", symbol="BTC")
        irrelevant_item = NewsItem(title="Gold rises", url="u2", source="S1", symbol=None)

        with patch("app.services.news_fetcher.fetch_rss_news", return_value=[crypto_item, irrelevant_item]):
            with patch("app.services.news_fetcher.fetch_reddit_news", return_value=[]):
                from app.services.news_fetcher import fetch_all_news
                results = fetch_all_news()

        assert all(item.symbol is not None for item in results)
        assert len(results) == 1

    def test_fetch_news_for_symbol_filter(self):
        """fetch_news_for_symbol yalnızca istenen sembol haberlerini döndürmeli."""
        from app.services.news_fetcher import NewsItem

        btc_item = NewsItem(title="Bitcoin rally", url="u1", source="S", symbol="BTC")
        eth_item = NewsItem(title="Ethereum dip", url="u2", source="S", symbol="ETH")

        with patch("app.services.news_fetcher.fetch_all_news", return_value=[btc_item, eth_item]):
            from app.services.news_fetcher import fetch_news_for_symbol
            btc_results = fetch_news_for_symbol("BTC")

        assert all(item.symbol == "BTC" for item in btc_results)
        assert len(btc_results) == 1


# ── FinBERT Analyzer Testleri ─────────────────────────────────────────────────

class TestFinbertAnalyzer:
    """finbert_analyzer.py için birim testler."""

    def test_score_range_positive_text(self):
        """Pozitif metin için skor 0.0 ile 1.0 arasında olmalı."""
        mock_pipeline = MagicMock()
        mock_pipeline.return_value = [[
            {"label": "positive", "score": 0.92},
            {"label": "negative", "score": 0.03},
            {"label": "neutral", "score": 0.05},
        ]]

        with patch("app.services.finbert_analyzer._load_pipeline", return_value=mock_pipeline):
            from app.services.finbert_analyzer import analyze_sentiment
            score = analyze_sentiment("Bitcoin surges to all-time high as investors gain confidence")

        assert -1.0 <= score <= 1.0
        assert score > 0

    def test_score_range_negative_text(self):
        """Negatif metin için skor -1.0 ile 0.0 arasında olmalı."""
        mock_pipeline = MagicMock()
        mock_pipeline.return_value = [[
            {"label": "positive", "score": 0.02},
            {"label": "negative", "score": 0.91},
            {"label": "neutral", "score": 0.07},
        ]]

        with patch("app.services.finbert_analyzer._load_pipeline", return_value=mock_pipeline):
            from app.services.finbert_analyzer import analyze_sentiment
            score = analyze_sentiment("Bitcoin crashes 30% amid market panic and liquidations")

        assert -1.0 <= score <= 1.0
        assert score < 0

    def test_score_range_neutral_text(self):
        """Nötr metin için skor -0.15 ile 0.15 arasında olmalı."""
        mock_pipeline = MagicMock()
        mock_pipeline.return_value = [[
            {"label": "positive", "score": 0.30},
            {"label": "negative", "score": 0.28},
            {"label": "neutral", "score": 0.42},
        ]]

        with patch("app.services.finbert_analyzer._load_pipeline", return_value=mock_pipeline):
            from app.services.finbert_analyzer import analyze_sentiment
            score = analyze_sentiment("Bitcoin traded sideways today with low volatility")

        assert -1.0 <= score <= 1.0
        assert abs(score) < 0.15

    def test_empty_string_returns_neutral(self):
        """Boş metin için 0.0 (nötr) döndürmeli."""
        from app.services.finbert_analyzer import analyze_sentiment
        assert analyze_sentiment("") == 0.0
        assert analyze_sentiment("   ") == 0.0

    def test_score_formula_positive_minus_negative(self):
        """Skor formülü: positive_prob - negative_prob."""
        from app.services.finbert_analyzer import _score_from_labels
        labels = [
            {"label": "positive", "score": 0.80},
            {"label": "negative", "score": 0.10},
            {"label": "neutral", "score": 0.10},
        ]
        score = _score_from_labels(labels)
        assert score == pytest.approx(0.70, abs=0.0001)

    def test_score_clamped_to_minus_one_plus_one(self):
        """Skor her zaman -1.0 ile +1.0 arasında sıkıştırılmalı."""
        mock_pipeline = MagicMock()
        mock_pipeline.return_value = [[
            {"label": "positive", "score": 1.0},
            {"label": "negative", "score": 0.0},
            {"label": "neutral", "score": 0.0},
        ]]

        with patch("app.services.finbert_analyzer._load_pipeline", return_value=mock_pipeline):
            from app.services.finbert_analyzer import analyze_sentiment
            score = analyze_sentiment("Extreme positive news")

        assert score <= 1.0
        assert score >= -1.0

    def test_model_error_returns_zero(self):
        """Model yükleme hatasında 0.0 döndürmeli (uygulama çökmemeli)."""
        with patch("app.services.finbert_analyzer._load_pipeline", side_effect=RuntimeError("GPU error")):
            from app.services.finbert_analyzer import analyze_sentiment
            score = analyze_sentiment("Any text here")
        assert score == 0.0

    def test_get_label_positive(self):
        """Pozitif skor 'positive' etiketi döndürmeli."""
        from app.services.finbert_analyzer import get_label
        assert get_label(0.5) == "positive"
        assert get_label(0.16) == "positive"

    def test_get_label_negative(self):
        """Negatif skor 'negative' etiketi döndürmeli."""
        from app.services.finbert_analyzer import get_label
        assert get_label(-0.5) == "negative"
        assert get_label(-0.16) == "negative"

    def test_get_label_neutral(self):
        """Sınır değerleri 'neutral' etiketi döndürmeli."""
        from app.services.finbert_analyzer import get_label
        assert get_label(0.0) == "neutral"
        assert get_label(0.10) == "neutral"
        assert get_label(-0.10) == "neutral"

    def test_analyze_batch_returns_list(self):
        """analyze_batch her metin için bir skor döndürmeli."""
        mock_pipeline = MagicMock()
        mock_pipeline.return_value = [[
            {"label": "positive", "score": 0.7},
            {"label": "negative", "score": 0.1},
            {"label": "neutral", "score": 0.2},
        ]]

        texts = [
            "Bitcoin is going up",
            "Ethereum is crashing",
            "Market is stable today",
        ]

        with patch("app.services.finbert_analyzer._load_pipeline", return_value=mock_pipeline):
            from app.services.finbert_analyzer import analyze_batch
            scores = analyze_batch(texts)

        assert len(scores) == len(texts)
        assert all(-1.0 <= s <= 1.0 for s in scores)

    def test_batch_95_percent_success_rate(self):
        """
        Başarı Ölçütü: Metinlerin %95'ten fazlası hatasız analiz edilmeli.
        Mock ile 100 metin test edilir, en fazla 4 hata tolere edilir.
        """
        call_count = 0
        fail_indices = {3, 17, 45}  # %3 hata oranı simüle edilir

        def mock_pipeline_call(text):
            nonlocal call_count
            call_count += 1
            if call_count in fail_indices:
                raise RuntimeError("Simulated model error")
            return [[
                {"label": "positive", "score": 0.6},
                {"label": "negative", "score": 0.2},
                {"label": "neutral", "score": 0.2},
            ]]

        mock_pipe = MagicMock(side_effect=mock_pipeline_call)

        success_count = 0
        fail_count = 0
        texts = [f"Crypto news headline number {i}" for i in range(100)]

        with patch("app.services.finbert_analyzer._load_pipeline", return_value=mock_pipe):
            from app.services.finbert_analyzer import analyze_sentiment
            for text in texts:
                score = analyze_sentiment(text)
                # 0.0 hatayı temsil edebilir; ancak model çökmemeli
                if score != 0.0 or text == "":
                    success_count += 1
                else:
                    fail_count += 1

        # %95 başarı ölçütü
        success_rate = success_count / len(texts)
        assert success_rate >= 0.95, f"Başarı oranı %95'in altında: {success_rate:.1%}"
