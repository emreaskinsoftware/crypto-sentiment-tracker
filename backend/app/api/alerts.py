from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, Request, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.limiter import limiter
from app.api.deps import get_current_user
from app.models.alert import Alert
from app.models.alert_trigger import AlertTrigger
from app.models.asset import Asset
from app.models.user import User
from app.schemas.alert import AlertCreate, AlertResponse, AlertUpdate

router = APIRouter(prefix="/alerts", tags=["Alerts"])


class NotificationResponse(BaseModel):
    id: int
    alert_id: int
    asset_symbol: str
    asset_name: str
    condition_type: str
    threshold: float
    actual_value: float
    triggered_at: datetime

    model_config = {"from_attributes": True}


class MarkReadRequest(BaseModel):
    ids: list[int]


@router.get("/notifications", response_model=list[NotificationResponse])
@limiter.limit("60/minute")
def get_notifications(
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Kullanıcının okunmamış alarm bildirimlerini döndürür (son 24 saat)."""
    since = datetime.now(timezone.utc) - timedelta(hours=24)
    triggers = (
        db.query(AlertTrigger)
        .join(Alert, Alert.id == AlertTrigger.alert_id)
        .filter(
            Alert.user_id == current_user.id,
            AlertTrigger.is_read == False,  # noqa: E712
            AlertTrigger.triggered_at >= since,
        )
        .order_by(AlertTrigger.triggered_at.desc())
        .all()
    )
    result = []
    for t in triggers:
        asset = db.query(Asset).filter(Asset.id == t.alert.asset_id).first()
        result.append(NotificationResponse(
            id=t.id,
            alert_id=t.alert_id,
            asset_symbol=asset.symbol if asset else "?",
            asset_name=asset.name if asset else "?",
            condition_type=t.condition_type,
            threshold=t.threshold,
            actual_value=t.actual_value,
            triggered_at=t.triggered_at,
        ))
    return result


@router.post("/notifications/read", status_code=status.HTTP_204_NO_CONTENT)
@limiter.limit("30/minute")
def mark_notifications_read(
    request: Request,
    payload: MarkReadRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Belirtilen trigger ID'lerini okundu olarak işaretle."""
    db.query(AlertTrigger).filter(
        AlertTrigger.id.in_(payload.ids),
        AlertTrigger.alert.has(Alert.user_id == current_user.id),
    ).update({"is_read": True}, synchronize_session=False)
    db.commit()


@router.get("/", response_model=list[AlertResponse])
@limiter.limit("60/minute")
def list_alerts(
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return db.query(Alert).filter(Alert.user_id == current_user.id).all()


@router.post("/", response_model=AlertResponse, status_code=status.HTTP_201_CREATED)
@limiter.limit("20/minute")
def create_alert(
    request: Request,
    payload: AlertCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    # Resolve asset by symbol
    asset = db.query(Asset).filter(Asset.symbol == payload.asset_symbol.upper()).first()
    if not asset:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Asset with symbol '{payload.asset_symbol}' not found",
        )

    alert = Alert(
        user_id=current_user.id,
        asset_id=asset.id,
        condition_type=payload.condition,
        threshold=payload.threshold,
    )
    db.add(alert)
    db.commit()
    db.refresh(alert)
    return alert


@router.get("/{alert_id}", response_model=AlertResponse)
@limiter.limit("60/minute")
def get_alert(
    request: Request,
    alert_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    alert = (
        db.query(Alert)
        .filter(Alert.id == alert_id, Alert.user_id == current_user.id)
        .first()
    )
    if not alert:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Alert not found")
    return alert


@router.patch("/{alert_id}", response_model=AlertResponse)
@limiter.limit("30/minute")
def update_alert(
    request: Request,
    alert_id: int,
    payload: AlertUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    alert = (
        db.query(Alert)
        .filter(Alert.id == alert_id, Alert.user_id == current_user.id)
        .first()
    )
    if not alert:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Alert not found")

    if payload.is_active is not None:
        alert.is_active = payload.is_active
    if payload.threshold is not None:
        alert.threshold = payload.threshold

    db.commit()
    db.refresh(alert)
    return alert


@router.delete("/{alert_id}", status_code=status.HTTP_204_NO_CONTENT)
@limiter.limit("30/minute")
def delete_alert(
    request: Request,
    alert_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    alert = (
        db.query(Alert)
        .filter(Alert.id == alert_id, Alert.user_id == current_user.id)
        .first()
    )
    if not alert:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Alert not found")
    db.delete(alert)
    db.commit()
