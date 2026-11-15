import os
from typing import Annotated, Literal

from fastapi import APIRouter, BackgroundTasks, Depends, File, HTTPException, Response, UploadFile
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.agents.workflow import execute
from app.core.db import database
from app.models.entities import Dataset, Execution, Report, Run, Step, ToolLog
from app.repositories.queries import get, resolve
from app.schemas.contracts import Conditions, DatasetInfo, RunView, Ticket
from app.schemas.results import Aggregate, QualityMetrics, SavedReport, StrategyReport, Summary, Trace, Trends
from app.services.data import ingest, records
from app.services.export import csv_report, pdf_report
from app.tools import analytics as a

router = APIRouter(prefix="/api")
DB = Annotated[Session, Depends(database)]


@router.get("/health")
def health(db: DB):
    db.execute(select(1))
    return {
        "status": "ok",
        "llm_provider": os.getenv("LLM_PROVIDER", "local"),
        "llm_model": os.getenv("LLM_MODEL", "gpt-4o-mini") if os.getenv("LLM_PROVIDER") == "openai" else None,
    }


@router.get("/datasets", response_model=list[DatasetInfo])
def datasets(db: DB):
    return db.scalars(select(Dataset).order_by(Dataset.created.desc())).all()


@router.post("/datasets/upload", response_model=DatasetInfo, status_code=201)
def upload(db: DB, file: Annotated[UploadFile, File()]):
    name = (file.filename or "").replace("\\", "/").split("/")[-1]
    raw = file.file.read(4 * 1024 * 1024 + 1)
    if not name.lower().endswith(".csv") or len(name) > 180:
        raise HTTPException(422, "CSV 파일명을 확인하세요.")
    if len(raw) > 4 * 1024 * 1024:
        raise HTTPException(413, "4 MiB 이하의 CSV를 선택하세요.")
    try:
        return ingest(db, raw, name, {"title": name, "url": "", "notes": "사용자 업로드"})
    except ValueError as exc:
        raise HTTPException(422, str(exc)) from exc


@router.get("/datasets/{key}")
def dataset(key: str, db: DB):
    item = get(db, Dataset, key)
    return {
        **DatasetInfo.model_validate(item, from_attributes=True).model_dump(),
        "preview": records(db, key).head(12).to_json(orient="records", force_ascii=False),
    }


@router.get("/datasets/{key}/quality")
def quality(key: str, db: DB):
    return get(db, Dataset, key).quality


@router.get("/analytics/{metric}", response_model=Summary | Trends | QualityMetrics | list[Aggregate])
def statistics(
    metric: Literal["summary", "regions", "trends", "quality"],
    db: DB,
    dataset_id: str | None = None,
    year: int | None = None,
    region: str | None = None,
    variety: str | None = None,
):
    frame = records(db, resolve(db, dataset_id).id)
    for key, value in (("year", year), ("region", region), ("variety", variety)):
        if value is not None:
            frame = frame[frame[key] == value] if key in frame else frame.iloc[0:0]
    return {
        "summary": a.summarize_citrus_data,
        "regions": a.analyze_production_by_region,
        "trends": a.analyze_shipment_trends,
        "quality": a.analyze_quality_metrics,
    }[metric](frame)


@router.post("/optimization/scenarios", response_model=Ticket, status_code=202)
@router.post("/agents/runs", response_model=Ticket, status_code=202)
def start(p: Conditions, db: DB, background: BackgroundTasks):
    ds = resolve(db, p.dataset_id)
    run = Run(dataset_id=ds.id, version=ds.version, params={**p.model_dump(), "dataset_id": ds.id})
    db.add(run)
    db.commit()
    background.add_task(execute, run.id)
    return {"id": run.id, "status": "queued"}


@router.get("/agents/runs", response_model=list[RunView])
def runs(db: DB):
    return db.scalars(select(Run).order_by(Run.created.desc()).limit(100)).all()


@router.get("/agents/runs/{key}", response_model=RunView)
def run(key: str, db: DB):
    return get(db, Run, key)


@router.get("/agents/runs/{key}/steps", response_model=Trace)
def steps(key: str, db: DB):
    get(db, Run, key)

    def details(model):
        return db.scalars(select(model.payload).where(model.run_id == key).order_by(model.id)).all()

    return {"steps": details(Step), "tools": details(ToolLog), "agents": details(Execution)}


@router.get("/reports", response_model=list[SavedReport])
def reports(db: DB):
    return [
        {
            "id": r.id,
            "created": r.created,
            "recommended": r.payload["recommended"],
            "basis": r.payload["basis"],
        }
        for r in db.scalars(select(Report).order_by(Report.created.desc()))
    ]


@router.get("/optimization/scenarios/{key}", response_model=StrategyReport, response_model_exclude_none=False)
@router.get("/reports/{key}", response_model=StrategyReport, response_model_exclude_none=False)
def report(key: str, db: DB):
    return get(db, Report, key).payload


@router.get("/reports/{key}/download")
def download(key: str, db: DB, format: Literal["pdf", "csv"] = "pdf"):
    payload = get(db, Report, key).payload
    data = pdf_report(payload) if format == "pdf" else csv_report(payload)
    return Response(
        data,
        media_type="application/pdf" if format == "pdf" else "text/csv",
        headers={"Content-Disposition": f'attachment; filename="gyulguard-{key}.{format}"'},
    )
