import logging
from datetime import datetime, timezone
from threading import Lock

from fastapi import APIRouter, BackgroundTasks, Depends, Request

from app.api.deps import get_current_user
from app.core.database import SessionLocal
from app.core.limiter import limiter
from app.models.user import User
from app.services.price_fetcher import run_price_pipeline
from app.services.sentiment_pipeline import run_sentiment_pipeline
from pydantic import BaseModel

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/pipeline", tags=["pipeline"])

COOLDOWN_SECONDS = 15 * 60  # 15 dakika

_lock = Lock()
_state: dict = {
    "running": False,
    "last_run_at": None,  # datetime | None
}


class PipelineStatusResponse(BaseModel):
    running: bool
    last_run_at: str | None
    cooldown_remaining_seconds: int


class TriggerResponse(BaseModel):
    status: str  # "started" | "cooldown" | "already_running"
    cooldown_remaining_seconds: int = 0
    message: str


def _run_full_pipeline() -> None:
    db = SessionLocal()
    try:
        run_price_pipeline(db)
        run_sentiment_pipeline(db)
        logger.info("Manuel pipeline tamamlandi")
    except Exception as exc:
        logger.error("Manuel pipeline hatasi: %s", exc)
    finally:
        db.close()
        with _lock:
            _state["running"] = False
            _state["last_run_at"] = datetime.now(timezone.utc)


@router.post("/trigger", response_model=TriggerResponse)
@limiter.limit("5/minute")
def trigger_pipeline(
    request: Request,
    background_tasks: BackgroundTasks,
    _: User = Depends(get_current_user),
) -> TriggerResponse:
    with _lock:
        if _state["running"]:
            return TriggerResponse(
                status="already_running",
                message="Pipeline zaten çalışıyor, lütfen bekleyin.",
            )

        last_run: datetime | None = _state["last_run_at"]
        if last_run is not None:
            elapsed = (datetime.now(timezone.utc) - last_run).total_seconds()
            remaining = int(COOLDOWN_SECONDS - elapsed)
            if remaining > 0:
                mins, secs = divmod(remaining, 60)
                return TriggerResponse(
                    status="cooldown",
                    cooldown_remaining_seconds=remaining,
                    message=f"{mins}dk {secs}sn sonra tekrar yenileyebilirsiniz.",
                )

        _state["running"] = True

    background_tasks.add_task(_run_full_pipeline)
    return TriggerResponse(
        status="started",
        message="Pipeline başlatıldı. Duygu analizi 30-60 saniye sürebilir.",
    )


@router.get("/status", response_model=PipelineStatusResponse)
@limiter.limit("60/minute")
def get_pipeline_status(request: Request) -> PipelineStatusResponse:
    with _lock:
        running = _state["running"]
        last_run: datetime | None = _state["last_run_at"]

    cooldown_remaining = 0
    if last_run is not None and not running:
        elapsed = (datetime.now(timezone.utc) - last_run).total_seconds()
        cooldown_remaining = max(0, int(COOLDOWN_SECONDS - elapsed))

    return PipelineStatusResponse(
        running=running,
        last_run_at=last_run.isoformat() if last_run else None,
        cooldown_remaining_seconds=cooldown_remaining,
    )
