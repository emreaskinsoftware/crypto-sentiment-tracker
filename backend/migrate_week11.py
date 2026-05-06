"""
Hafta 11 migration: users tablosuna fcm_token kolonu ekler.
Çalıştır: python migrate_week11.py
"""
from sqlalchemy import text
from app.core.database import engine


def run():
    with engine.connect() as conn:
        db_url = str(engine.url)
        is_sqlite = db_url.startswith("sqlite")

        if is_sqlite:
            # SQLite: sütunun olmadığını kontrol et
            result = conn.execute(text("PRAGMA table_info(users)"))
            cols = [row[1] for row in result]
            if "fcm_token" not in cols:
                conn.execute(text("ALTER TABLE users ADD COLUMN fcm_token VARCHAR(500)"))
                conn.commit()
                print("SQLite: fcm_token kolonu eklendi.")
            else:
                print("SQLite: fcm_token zaten mevcut.")
        else:
            # PostgreSQL
            result = conn.execute(text("""
                SELECT column_name FROM information_schema.columns
                WHERE table_name = 'users' AND column_name = 'fcm_token'
            """))
            if not result.fetchone():
                conn.execute(text("ALTER TABLE users ADD COLUMN fcm_token VARCHAR(500)"))
                conn.commit()
                print("PostgreSQL: fcm_token kolonu eklendi.")
            else:
                print("PostgreSQL: fcm_token zaten mevcut.")


if __name__ == "__main__":
    run()
