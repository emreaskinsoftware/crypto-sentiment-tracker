from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.database import Base, engine
from app.api.auth import router as auth_router
from app.api.assets import router as assets_router
from app.api.alerts import router as alerts_router

# Create all tables on startup
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Crypto Sentiment Tracker API",
    description="Real-time cryptocurrency sentiment analysis API powered by FinBERT",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

# CORS - allow frontend origins
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routers
app.include_router(auth_router, prefix="/api/v1")
app.include_router(assets_router, prefix="/api/v1")
app.include_router(alerts_router, prefix="/api/v1")


@app.get("/")
def health_check():
    return {"status": "ok", "message": "Crypto Sentiment Tracker API is running"}


@app.get("/api/v1/health")
def api_health():
    return {"status": "ok", "version": "1.0.0"}
