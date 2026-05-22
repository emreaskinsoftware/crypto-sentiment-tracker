from fastapi import APIRouter, Depends, Request, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.core.database import get_db
from app.core.limiter import limiter
from app.models.user import User

router = APIRouter(prefix="/devices", tags=["Devices"])


class FCMTokenRequest(BaseModel):
    fcm_token: str


class FCMTokenResponse(BaseModel):
    message: str


@router.post("/fcm-token", response_model=FCMTokenResponse, status_code=status.HTTP_200_OK)
@limiter.limit("10/minute")
def register_fcm_token(
    request: Request,
    payload: FCMTokenRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Kullanıcının Android FCM token'ını kaydeder (push bildirimi için)."""
    current_user.fcm_token = payload.fcm_token
    db.commit()
    return FCMTokenResponse(message="FCM token registered successfully")


@router.delete("/fcm-token", status_code=status.HTTP_204_NO_CONTENT)
@limiter.limit("10/minute")
def unregister_fcm_token(
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """FCM token'ı kaldırır (logout sırasında çağrılır)."""
    current_user.fcm_token = None
    db.commit()
