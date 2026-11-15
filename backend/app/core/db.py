import os
from pathlib import Path

from sqlalchemy import create_engine, event
from sqlalchemy.orm import DeclarativeBase, sessionmaker

ROOT = Path(__file__).resolve().parents[3]
DATA = Path(os.getenv("DATA_DIR", ROOT / "data"))
URL = os.getenv("DATABASE_URL", "sqlite:///./gyulguard.db")
engine = create_engine(
    URL, connect_args={"check_same_thread": False, "timeout": 30} if URL.startswith("sqlite") else {}
)
if URL.startswith("sqlite"):

    @event.listens_for(engine, "connect")
    def configure_sqlite(connection, _):
        connection.execute("PRAGMA foreign_keys=ON")
        connection.execute("PRAGMA journal_mode=WAL")


class Base(DeclarativeBase):
    pass


SessionLocal = sessionmaker(engine, expire_on_commit=False)


def database():
    with SessionLocal() as session:
        try:
            yield session
            session.commit()
        except Exception:
            session.rollback()
            raise
