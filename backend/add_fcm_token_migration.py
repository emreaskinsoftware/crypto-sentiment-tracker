"""
Migration: users tablosuna fcm_token kolonu ekler (PostgreSQL).
Çalıştır: python add_fcm_token_migration.py
"""
from sqlalchemy import text
from app.core.database import engine


def run() -> None:
    with engine.connect() as conn:
        result = conn.execute(text("""
            SELECT column_name FROM information_schema.columns
            WHERE table_name = 'users' AND column_name = 'fcm_token'
        """))
        if not result.fetchone():
            conn.execute(text("ALTER TABLE users ADD COLUMN fcm_token VARCHAR(500)"))
            conn.commit()
            print("fcm_token kolonu eklendi.")
        else:
            print("fcm_token zaten mevcut, atlanıyor.")


if __name__ == "__main__":
    run()
