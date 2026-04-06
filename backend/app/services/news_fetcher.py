"""
Hafta 5 — Kripto Haber ve Metin Toplama Servisi
Finansal haber sitelerinin RSS akışlarından ve Reddit API'sinden
ilgili kripto paralar hakkındaki güncel metinleri toplar.

Kaynaklar:
  1. CoinDesk RSS (ücretsiz, resmi)
  2. CoinTelegraph RSS (ücretsiz, resmi)
  3. Reddit API — r/CryptoCurrency ve r/Bitcoin (ücretsiz, JSON endpoint)

B Planı: Reddit API engellenirse yalnızca RSS kaynakları kullanılır.
"""

from __future__ import annotations

import logging
import time
import xml.etree.ElementTree as ET
from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Any

import requests

logger = logging.getLogger(__name__)

# ── Veri yapısı ──────────────────────────────────────────────────────────────

@dataclass
class NewsItem:
    title: str
    url: str
    source: str
    published_at: datetime | None = None
    symbol: str | None = None  # hangi kripto ile ilgili


# ── RSS Kaynakları ────────────────────────────────────────────────────────────

RSS_SOURCES: list[dict[str, str]] = [
    {
        "name": "CoinDesk",
        "url": "https://www.coindesk.com/arc/outboundfeeds/rss/",
    },
    {
        "name": "CoinTelegraph",
        "url": "https://cointelegraph.com/rss",
    },
    {
        "name": "CryptoNews",
        "url": "https://cryptonews.com/news/feed/",
    },
]

# Kripto anahtar kelimeleri: sembol → arama terimleri
SYMBOL_KEYWORDS: dict[str, list[str]] = {
    "BTC": ["bitcoin", "btc"],
    "ETH": ["ethereum", "eth", "ether"],
    "BNB": ["binance coin", "bnb"],
    "SOL": ["solana", "sol"],
    "XRP": ["ripple", "xrp"],
}

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (compatible; CryptoSentimentBot/1.0; "
        "+https://github.com/emreaskinsoftware/crypto-sentiment-tracker)"
    )
}


def _fetch_rss(source: dict[str, str]) -> list[NewsItem]:
    """Tek bir RSS kaynağını çeker ve NewsItem listesine dönüştürür."""
    items: list[NewsItem] = []
    try:
        resp = requests.get(source["url"], headers=HEADERS, timeout=15)
        resp.raise_for_status()
        root = ET.fromstring(resp.content)

        # RSS 2.0: /rss/channel/item veya Atom: /feed/entry
        entries = root.findall(".//item") or root.findall(
            ".//{http://www.w3.org/2005/Atom}entry"
        )

        for entry in entries:
            # NOTE: ElementTree elements without subelements evaluate as False
            # so explicit None checks are required (not 'or' operator)
            title_el = entry.find("title")
            if title_el is None:
                title_el = entry.find("{http://www.w3.org/2005/Atom}title")

            link_el = entry.find("link")
            if link_el is None:
                link_el = entry.find("{http://www.w3.org/2005/Atom}link")

            pub_el = entry.find("pubDate")
            if pub_el is None:
                pub_el = entry.find("{http://www.w3.org/2005/Atom}published")

            title = title_el.text.strip() if title_el is not None and title_el.text else ""
            url = ""
            if link_el is not None:
                url = link_el.text or link_el.get("href", "")
                if url:
                    url = url.strip()

            pub_date: datetime | None = None
            if pub_el is not None and pub_el.text:
                try:
                    from email.utils import parsedate_to_datetime
                    pub_date = parsedate_to_datetime(pub_el.text.strip())
                except Exception:
                    try:
                        pub_date = datetime.fromisoformat(
                            pub_el.text.strip().replace("Z", "+00:00")
                        )
                    except Exception:
                        pub_date = None

            if title:
                items.append(
                    NewsItem(
                        title=title,
                        url=url,
                        source=source["name"],
                        published_at=pub_date,
                    )
                )
    except Exception as exc:
        logger.error("RSS çekme hatası (%s): %s", source["name"], exc)

    logger.info("RSS '%s': %d haber çekildi", source["name"], len(items))
    return items


def _fetch_reddit(subreddit: str = "CryptoCurrency", limit: int = 25) -> list[NewsItem]:
    """
    Reddit'in ücretsiz JSON API'sini kullanarak subreddit postları çeker.
    Auth gerektirmez; .json suffix'i yeterlidir.
    """
    url = f"https://www.reddit.com/r/{subreddit}/hot.json"
    items: list[NewsItem] = []
    try:
        resp = requests.get(
            url,
            headers=HEADERS,
            params={"limit": limit},
            timeout=15,
        )
        resp.raise_for_status()
        data: dict[str, Any] = resp.json()
        posts = data.get("data", {}).get("children", [])

        for post in posts:
            pd = post.get("data", {})
            title = pd.get("title", "").strip()
            permalink = pd.get("permalink", "")
            post_url = f"https://www.reddit.com{permalink}" if permalink else ""
            created = pd.get("created_utc")
            pub_date: datetime | None = None
            if created:
                pub_date = datetime.fromtimestamp(float(created), tz=timezone.utc)

            if title:
                items.append(
                    NewsItem(
                        title=title,
                        url=post_url,
                        source=f"Reddit/r/{subreddit}",
                        published_at=pub_date,
                    )
                )
        logger.info("Reddit r/%s: %d post çekildi", subreddit, len(items))
    except Exception as exc:
        logger.error("Reddit çekme hatası (r/%s): %s", subreddit, exc)

    return items


# ── Sembol eşleştirme ─────────────────────────────────────────────────────────

def _assign_symbol(item: NewsItem) -> NewsItem:
    """Başlığa göre haber öğesine kripto sembolü atar."""
    title_lower = item.title.lower()
    for symbol, keywords in SYMBOL_KEYWORDS.items():
        if any(kw in title_lower for kw in keywords):
            item.symbol = symbol
            break
    return item


# ── Ana fonksiyonlar ──────────────────────────────────────────────────────────

def fetch_rss_news() -> list[NewsItem]:
    """Tüm RSS kaynaklarından haber çeker ve sembol atar."""
    all_items: list[NewsItem] = []
    for source in RSS_SOURCES:
        all_items.extend(_fetch_rss(source))
        time.sleep(0.5)  # Rate limiting
    return [_assign_symbol(item) for item in all_items]


def fetch_reddit_news(subreddits: list[str] | None = None) -> list[NewsItem]:
    """Reddit'ten haber çeker ve sembol atar."""
    if subreddits is None:
        subreddits = ["CryptoCurrency", "Bitcoin", "ethereum"]

    all_items: list[NewsItem] = []
    for sub in subreddits:
        all_items.extend(_fetch_reddit(sub))
        time.sleep(1.0)  # Reddit rate limiting
    return [_assign_symbol(item) for item in all_items]


def fetch_all_news() -> list[NewsItem]:
    """
    Tüm kaynaklardan (RSS + Reddit) haber çeker, yalnızca
    kripto sembolü eşleşen haberleri döndürür.
    """
    rss_items = fetch_rss_news()
    reddit_items = fetch_reddit_news()
    all_items = rss_items + reddit_items

    crypto_items = [item for item in all_items if item.symbol is not None]
    logger.info(
        "Toplam haber: %d | Kripto ilgili: %d",
        len(all_items),
        len(crypto_items),
    )
    return crypto_items


def fetch_news_for_symbol(symbol: str) -> list[NewsItem]:
    """Belirli bir sembol için filtrelenmiş haber listesi döndürür."""
    all_items = fetch_all_news()
    return [item for item in all_items if item.symbol == symbol.upper()]
