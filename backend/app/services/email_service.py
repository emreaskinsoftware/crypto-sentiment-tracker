import logging
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

from app.core.config import settings

logger = logging.getLogger(__name__)


def _build_alert_email(
    full_name: str,
    asset_symbol: str,
    condition_type: str,
    threshold: float,
    current_value: float,
    current_price: float,
) -> tuple[str, str]:
    """HTML ve düz metin e-posta içeriği oluşturur. (subject, html_body) döner."""
    condition_labels = {
        "sentiment_below": f"Sentiment skoru {threshold:.2f} altına düştü",
        "sentiment_above": f"Sentiment skoru {threshold:.2f} üzerine çıktı",
        "price_below":     f"Fiyat ${threshold:,.2f} altına düştü",
        "price_above":     f"Fiyat ${threshold:,.2f} üzerine çıktı",
    }
    condition_text = condition_labels.get(condition_type, f"{condition_type} {threshold}")
    is_sentiment = "sentiment" in condition_type
    value_label = "Güncel Sentiment Skoru" if is_sentiment else "Güncel Fiyat"
    value_str = f"{current_value:+.4f}" if is_sentiment else f"${current_value:,.2f}"

    subject = f"[CryptoSentiment] {asset_symbol} Alarm Tetiklendi"

    html = f"""
<!DOCTYPE html>
<html>
<body style="font-family: Arial, sans-serif; background:#f5f5f5; margin:0; padding:20px;">
  <div style="max-width:520px; margin:auto; background:#fff; border-radius:12px; overflow:hidden; box-shadow:0 2px 8px rgba(0,0,0,0.08);">
    <div style="background:#10B981; padding:24px 28px;">
      <h2 style="color:#fff; margin:0; font-size:20px;">Alarm Tetiklendi</h2>
      <p style="color:rgba(255,255,255,0.85); margin:6px 0 0; font-size:13px;">
        CryptoSentiment Tracker
      </p>
    </div>
    <div style="padding:28px;">
      <p style="color:#374151; font-size:15px; margin:0 0 20px;">
        Merhaba <strong>{full_name}</strong>,
      </p>
      <div style="background:#F0FDF4; border:1px solid #BBF7D0; border-radius:8px; padding:16px 20px; margin-bottom:20px;">
        <p style="margin:0; color:#064E3B; font-size:14px; font-weight:700;">
          {asset_symbol} — {condition_text}
        </p>
      </div>
      <table style="width:100%; border-collapse:collapse; font-size:14px; color:#374151;">
        <tr>
          <td style="padding:8px 0; border-bottom:1px solid #F3F4F6; color:#6B7280;">Varlık</td>
          <td style="padding:8px 0; border-bottom:1px solid #F3F4F6; font-weight:700; text-align:right;">{asset_symbol}</td>
        </tr>
        <tr>
          <td style="padding:8px 0; border-bottom:1px solid #F3F4F6; color:#6B7280;">Alarm Koşulu</td>
          <td style="padding:8px 0; border-bottom:1px solid #F3F4F6; font-weight:700; text-align:right;">{condition_text}</td>
        </tr>
        <tr>
          <td style="padding:8px 0; border-bottom:1px solid #F3F4F6; color:#6B7280;">{value_label}</td>
          <td style="padding:8px 0; border-bottom:1px solid #F3F4F6; font-weight:700; text-align:right;">{value_str}</td>
        </tr>
        <tr>
          <td style="padding:8px 0; color:#6B7280;">Güncel Fiyat</td>
          <td style="padding:8px 0; font-weight:700; text-align:right;">${current_price:,.2f}</td>
        </tr>
      </table>
      <p style="margin:24px 0 0; color:#9CA3AF; font-size:12px;">
        Bu e-posta otomatik olarak gönderilmiştir. Alarm ayarlarınızı değiştirmek için
        uygulamayı ziyaret edin.
      </p>
    </div>
  </div>
</body>
</html>
"""
    return subject, html


def send_alert_email(
    to_email: str,
    full_name: str,
    asset_symbol: str,
    condition_type: str,
    threshold: float,
    current_value: float,
    current_price: float,
) -> bool:
    """
    SMTP üzerinden alarm e-postası gönderir.
    SMTP_ENABLED=False iken sadece log basar, gerçek e-posta göndermez.
    Returns True on success.
    """
    subject, html_body = _build_alert_email(
        full_name, asset_symbol, condition_type, threshold, current_value, current_price
    )

    if not settings.SMTP_ENABLED:
        logger.info(
            "[SMTP disabled] E-posta simülasyonu: to=%s subject=%s", to_email, subject
        )
        return True

    if not settings.SMTP_USERNAME or not settings.SMTP_PASSWORD:
        logger.warning("SMTP kimlik bilgileri eksik, e-posta gönderilemiyor.")
        return False

    try:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"] = settings.SMTP_FROM_EMAIL or settings.SMTP_USERNAME
        msg["To"] = to_email
        msg.attach(MIMEText(html_body, "html", "utf-8"))

        with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT, timeout=10) as server:
            server.starttls()
            server.login(settings.SMTP_USERNAME, settings.SMTP_PASSWORD)
            server.sendmail(msg["From"], [to_email], msg.as_string())

        logger.info("E-posta gönderildi: to=%s subject=%s", to_email, subject)
        return True
    except Exception as exc:
        logger.error("E-posta gönderilemedi: to=%s hata=%s", to_email, exc)
        return False
