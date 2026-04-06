"""
Hafta 5 — FinBERT NLP Duygu Analizi Servisi
Açık kaynaklı ProsusAI/finbert modelini HuggingFace Transformers üzerinden
projeye dahil eder.

Duygu skoru: -1.0 (çok negatif) ile +1.0 (çok pozitif) arasında.
Hesaplama: positive_prob - negative_prob

B Planı: Lokal RAM yetersizse HuggingFace Inference API (ücretsiz) kullanılır.
"""

from __future__ import annotations

import logging
import os
from typing import Any

logger = logging.getLogger(__name__)

# HuggingFace model adı
FINBERT_MODEL = "ProsusAI/finbert"

# Çalışma modu: "local" (varsayılan) veya "api" (B planı)
_INFERENCE_MODE: str = os.environ.get("FINBERT_MODE", "local")

# Lazy-loaded model nesneleri (ilk kullanımda yüklenir)
_pipeline: Any = None


def _load_pipeline() -> Any:
    """FinBERT pipeline'ını ilk kullanımda yükler (lazy loading)."""
    global _pipeline
    if _pipeline is not None:
        return _pipeline

    try:
        from transformers import pipeline as hf_pipeline
        logger.info("FinBERT modeli yükleniyor: %s", FINBERT_MODEL)
        _pipeline = hf_pipeline(
            task="text-classification",
            model=FINBERT_MODEL,
            top_k=None,  # Tüm etiket olasılıklarını döndür
        )
        logger.info("FinBERT modeli başarıyla yüklendi.")
    except ImportError:
        logger.error(
            "transformers kütüphanesi bulunamadı. "
            "`pip install transformers torch` ile kurun."
        )
        raise
    except Exception as exc:
        logger.error("FinBERT yüklenirken hata: %s", exc)
        raise

    return _pipeline


def _score_from_labels(label_probs: list[dict[str, Any]]) -> float:
    """
    FinBERT etiket olasılıklarından -1..+1 arası skor hesaplar.
    positive_prob - negative_prob formülü kullanılır.
    """
    probs: dict[str, float] = {
        item["label"].lower(): item["score"] for item in label_probs
    }
    positive = probs.get("positive", 0.0)
    negative = probs.get("negative", 0.0)
    return round(positive - negative, 4)


def _analyze_local(text: str) -> float:
    """Lokal FinBERT modeli ile duygu skoru hesaplar."""
    pipe = _load_pipeline()
    # Model max 512 token; uzun metinler kesilir
    truncated = text[:512]
    result = pipe(truncated)
    # result: [[{"label": "positive", "score": 0.9}, ...]]
    label_probs = result[0] if isinstance(result[0], list) else result
    return _score_from_labels(label_probs)


def _analyze_via_api(text: str) -> float:
    """
    B Planı: HuggingFace Inference API üzerinden duygu analizi.
    HUGGINGFACE_API_KEY ortam değişkeni gerektirir.
    """
    import requests

    api_key = os.environ.get("HUGGINGFACE_API_KEY", "")
    if not api_key:
        raise ValueError(
            "HUGGINGFACE_API_KEY ortam değişkeni tanımlı değil. "
            "https://huggingface.co/settings/tokens adresinden ücretsiz token alın."
        )

    url = f"https://api-inference.huggingface.co/models/{FINBERT_MODEL}"
    headers = {"Authorization": f"Bearer {api_key}"}
    payload = {"inputs": text[:512]}

    try:
        resp = requests.post(url, headers=headers, json=payload, timeout=30)
        resp.raise_for_status()
        result = resp.json()
        # API dönüş formatı: [[{"label": ..., "score": ...}, ...]]
        label_probs = result[0] if isinstance(result, list) and result else []
        return _score_from_labels(label_probs)
    except Exception as exc:
        logger.error("HuggingFace API hatası: %s", exc)
        raise


# ── Genel API ─────────────────────────────────────────────────────────────────

def analyze_sentiment(text: str) -> float:
    """
    Verilen metni FinBERT ile analiz eder ve -1.0..+1.0 arası skor döndürür.

    FINBERT_MODE=local  → lokal model (varsayılan)
    FINBERT_MODE=api    → HuggingFace Inference API (B planı)
    """
    if not text or not text.strip():
        return 0.0

    mode = os.environ.get("FINBERT_MODE", "local")
    try:
        if mode == "api":
            score = _analyze_via_api(text)
        else:
            score = _analyze_local(text)

        # -1..+1 aralığına sıkıştır
        score = max(-1.0, min(1.0, score))
        logger.debug("Duygu skoru: %.4f | Metin: %.60s...", score, text)
        return score

    except Exception as exc:
        logger.error("Duygu analizi başarısız: %s", exc)
        # Hata durumunda nötr skor döndür
        return 0.0


def analyze_batch(texts: list[str]) -> list[float]:
    """
    Birden fazla metin için toplu duygu analizi.
    Dönüş: her metne karşılık gelen skor listesi.
    """
    results: list[float] = []
    for text in texts:
        results.append(analyze_sentiment(text))
    return results


def get_label(score: float) -> str:
    """Skora göre insan okunabilir etiket döndürür."""
    if score > 0.15:
        return "positive"
    elif score < -0.15:
        return "negative"
    return "neutral"
