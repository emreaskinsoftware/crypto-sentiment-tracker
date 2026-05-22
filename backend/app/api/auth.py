from fastapi import APIRouter, Depends, HTTPException, Request, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.core.database import get_db
from app.core.limiter import limiter
from app.core.security import (
    hash_password, verify_password,
    create_access_token, create_refresh_token, decode_refresh_token,
)
from app.models.user import User
from app.schemas.user import UserCreate, UserLogin, UserResponse, TokenResponse

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
@limiter.limit("5/minute")
def register(request: Request, payload: UserCreate, db: Session = Depends(get_db)):
    existing = db.query(User).filter(User.email == payload.email).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered",
        )

    user = User(
        email=payload.email,
        hashed_password=hash_password(payload.password),
        full_name=payload.full_name,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@router.post("/login", response_model=TokenResponse)
@limiter.limit("10/minute")
def login(request: Request, payload: UserLogin, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == payload.email).first()

    # Her iki hata durumunda aynı mesaj (kullanıcı numaralandırmasını önle)
    if not user or not verify_password(payload.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is disabled",
        )

    payload = {"sub": str(user.id), "email": user.email}
    access_token = create_access_token(data=payload)
    refresh_token = create_refresh_token(data=payload)
    return TokenResponse(access_token=access_token, refresh_token=refresh_token)


class RefreshRequest(BaseModel):
    refresh_token: str


@router.post("/refresh", response_model=TokenResponse)
@limiter.limit("20/minute")
def refresh_token(request: Request, body: RefreshRequest, db: Session = Depends(get_db)):
    payload = decode_refresh_token(body.refresh_token)
    if payload is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired refresh token",
        )

    user_id = payload.get("sub")
    user = db.query(User).filter(User.id == int(user_id)).first()
    if user is None or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found or inactive",
        )

    new_payload = {"sub": str(user.id), "email": user.email}
    return TokenResponse(
        access_token=create_access_token(data=new_payload),
        refresh_token=create_refresh_token(data=new_payload),
    )


@router.get("/me", response_model=UserResponse)
@limiter.limit("60/minute")
def get_me(request: Request, current_user: User = Depends(get_current_user)):
    return current_user
