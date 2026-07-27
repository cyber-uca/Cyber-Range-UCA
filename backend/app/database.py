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
from sqlalchemy import create_engine, inspect, text
from sqlalchemy.orm import declarative_base, sessionmaker

# Load .env from the backend root (one level above this file's package).
# .env.local overrides .env for machine-specific dev settings (gitignored).
_backend_root = Path(__file__).resolve().parent.parent
load_dotenv(_backend_root / ".env")
load_dotenv(_backend_root / ".env.local", override=True)

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


def ensure_schema_upgrades():
    """
    Base.metadata.create_all() only creates missing tables, not missing columns
    on tables that already exist. Add any new columns here so upgrades apply to
    an existing platform.db / MySQL schema without a full migration tool.
    """
    insp = inspect(engine)
    if "environments" not in insp.get_table_names():
        return
    cols = [c["name"] for c in insp.get_columns("environments")]
    if "last_heartbeat" not in cols:
        with engine.begin() as conn:
            conn.execute(text("ALTER TABLE environments ADD COLUMN last_heartbeat DATETIME"))
        print("[database] Added environments.last_heartbeat column")


def test_connection():
    """Call this to verify the DB is reachable at startup."""
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        print(f"[database] Connected to: {DATABASE_URL.split('@')[-1]}")
    except Exception as e:
        print(f"[database] Connection failed: {e}")
        raise
