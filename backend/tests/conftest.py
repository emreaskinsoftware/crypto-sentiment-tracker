import os

# PostgreSQL yerine SQLite kullanılır — app import edilmeden önce set edilmeli
os.environ["DATABASE_URL"] = "sqlite:///./test_crypto.db"

import pytest
from fastapi.testclient import TestClient

from app.core.database import Base, engine
from app.core.limiter import limiter
from app.main import app

# Testlerde tüm istekler aynı IP'den (testclient) gelir; limiter tüm suite'i bloklar
limiter.enabled = False


@pytest.fixture(scope="function")
def client():
    Base.metadata.create_all(bind=engine)
    with TestClient(app) as c:
        yield c
    Base.metadata.drop_all(bind=engine)
