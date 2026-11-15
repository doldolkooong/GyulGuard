from datetime import UTC, datetime
from uuid import uuid4

from sqlalchemy import JSON, ForeignKey, LargeBinary
from sqlalchemy.orm import Mapped, mapped_column

from app.core.db import Base


def uid() -> str:
    return uuid4().hex


def now() -> str:
    return datetime.now(UTC).isoformat()


class Dataset(Base):
    __tablename__ = "datasets"
    id: Mapped[str] = mapped_column(primary_key=True, default=uid)
    name: Mapped[str]
    version: Mapped[str]
    source: Mapped[dict] = mapped_column(JSON)
    quality: Mapped[dict] = mapped_column(JSON)
    raw: Mapped[bytes] = mapped_column(LargeBinary)
    created: Mapped[str] = mapped_column(default=now)


class Column(Base):
    __tablename__ = "dataset_columns"
    id: Mapped[int] = mapped_column(primary_key=True)
    dataset_id: Mapped[str] = mapped_column(ForeignKey("datasets.id"), index=True)
    info: Mapped[dict] = mapped_column(JSON)


class Record(Base):
    __tablename__ = "citrus_records"
    id: Mapped[int] = mapped_column(primary_key=True)
    dataset_id: Mapped[str] = mapped_column(ForeignKey("datasets.id"), index=True)
    values: Mapped[dict] = mapped_column(JSON)


class Run(Base):
    __tablename__ = "analysis_runs"
    id: Mapped[str] = mapped_column(primary_key=True, default=uid)
    dataset_id: Mapped[str] = mapped_column(ForeignKey("datasets.id"))
    version: Mapped[str]
    params: Mapped[dict] = mapped_column(JSON)
    status: Mapped[str] = mapped_column(default="queued")
    error: Mapped[str | None]
    created: Mapped[str] = mapped_column(default=now)


class Entry(Base):
    __abstract__ = True
    id: Mapped[int] = mapped_column(primary_key=True)
    run_id: Mapped[str] = mapped_column(ForeignKey("analysis_runs.id"), index=True)
    payload: Mapped[dict] = mapped_column(JSON)


class Step(Entry):
    __tablename__ = "analysis_run_steps"


class ToolLog(Entry):
    __tablename__ = "tool_logs"


class Execution(Entry):
    __tablename__ = "agent_executions"


class Scenario(Entry):
    __tablename__ = "scenario_results"


class Optimization(Entry):
    __tablename__ = "optimization_results"


class Report(Base):
    __tablename__ = "reports"
    id: Mapped[str] = mapped_column(ForeignKey("analysis_runs.id"), primary_key=True)
    created: Mapped[str] = mapped_column(default=now)
    payload: Mapped[dict] = mapped_column(JSON)
