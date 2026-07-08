"""
Database engine + session setup.

Reads connection details from .env in the backend root.
Supports MySQL (default) and SQLite (fallback for quick local dev).

To use MySQL:
  1. Open MySQL Workbench and create a schema named 'cyberrange'
  2. Edit backend/.env — set DB_USER, DB_PASSWORD (and DB_HOST/DB_PORT if needed)
  3. Restart the backend — tables are created automatically on startup
  4. Run: python -m app.seed   (populates demo data)
"""
import os
from pathlib import Path
from dotenv import load_dotenv
from sqlalchemy import create_engine, text
from sqlalchemy.orm import declarative_base, sessionmaker

# Load .env from the backend root (one level above this file's package)
_env_path = Path(__file__).resolve().parent.parent / ".env"
load_dotenv(_env_path)

def _build_url() -> str:
    """Build DATABASE_URL from individual .env vars, or fall back to SQLite."""
    explicit = os.getenv("DATABASE_URL", "")
    # If an explicit full URL is set (and not the template literal), use it directly
    if explicit and not explicit.startswith("mysql+pymysql://${"):
        return explicit

    host     = os.getenv("DB_HOST", "localhost")
    port     = os.getenv("DB_PORT", "3306")
    name     = os.getenv("DB_NAME", "cyberrange")
    user     = os.getenv("DB_USER", "root")
    password = os.getenv("DB_PASSWORD", "")

    if password:
        from urllib.parse import quote_plus
        return f"mysql+pymysql://{user}:{quote_plus(password)}@{host}:{port}/{name}?charset=utf8mb4"
    # No password configured — fall back to SQLite so dev still works
    print("[database] DB_PASSWORD not set — falling back to SQLite (platform.db)")
    return "sqlite:///./platform.db"

DATABASE_URL = _build_url()

connect_args = {"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {}
engine = create_engine(
    DATABASE_URL,
    connect_args=connect_args,
    pool_pre_ping=True,   # auto-reconnect on stale connections
    pool_recycle=1800,    # recycle connections every 30 min
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def test_connection():
    """Call this to verify the DB is reachable at startup."""
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        print(f"[database] Connected to: {DATABASE_URL.split('@')[-1]}")
    except Exception as e:
        print(f"[database] Connection failed: {e}")
        raise
