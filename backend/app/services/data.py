import csv
import hashlib
import io
import json

import numpy as np
import pandas as pd
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.db import DATA
from app.models.entities import Column, Dataset, Record

NUMERIC = ["production_t", "shipment_t", "brix", "area_ha", "farm_count"]
ALIASES = {
    "연도": "year",
    "년도": "year",
    "지역": "region",
    "품종": "variety",
    "생산량(톤)": "production_t",
    "출하량(톤)": "shipment_t",
    "당도": "brix",
    "등급": "grade",
}


def parse(raw: bytes) -> tuple[pd.DataFrame, dict]:
    for encoding in ("utf-8-sig", "cp949"):
        try:
            content = raw.decode(encoding)
            break
        except UnicodeDecodeError:
            continue
    else:
        raise ValueError("UTF-8 또는 CP949 CSV를 올려 주세요.")
    try:
        reader = csv.reader(io.StringIO(content), strict=True)
        header = next(reader)
        names = [ALIASES.get(key.strip(), key.strip()) for key in header]
        if len(names) > 64 or len(set(names)) != len(names) or "" in names:
            raise ValueError("열 이름 중복·공백 또는 열 수 초과")
        if any(row and len(row) != len(names) for row in reader):
            raise ValueError("행마다 열 수가 다릅니다.")
        frame = pd.read_csv(io.StringIO(content), dtype=str, names=names, header=0, index_col=False)
    except (StopIteration, csv.Error, pd.errors.ParserError, pd.errors.EmptyDataError) as exc:
        raise ValueError("CSV 구조를 읽을 수 없습니다.") from exc
    if frame.empty or len(frame) > 50000:
        raise ValueError("데이터 행은 1~50,000개여야 합니다.")
    if not set(names).intersection(["production_t", "shipment_t", "brix", "grade"]):
        raise ValueError("생산량(톤), 출하량(톤), 당도, 등급 중 한 열이 필요합니다.")
    frame = frame.replace(r"^\s*$", np.nan, regex=True)
    duplicate = int(frame.duplicated().sum())
    invalid = {}
    for key in set(names).intersection(NUMERIC + ["year"]):
        values = pd.to_numeric(frame[key].astype("string").str.replace(",", "", regex=False), errors="coerce")
        values = values.where(np.isfinite(values) & (values >= 0))
        if key == "year":
            values = values.where(values.between(1900, 2200) & (values % 1 == 0))
        invalid[key] = int((frame[key].notna() & values.isna()).sum())
        frame[key] = values
    years = frame["year"].dropna() if "year" in names else []
    return frame, {
        "rows": len(frame),
        "duplicates": duplicate,
        "encoding": encoding if raw.startswith(b"\xef\xbb\xbf") or encoding == "cp949" else "utf-8",
        "columns": [
            {"name": k, "dtype": str(frame[k].dtype), "missing": int(frame[k].isna().sum())} for k in names
        ],
        "invalid": invalid,
        "period": [int(min(years)), int(max(years))] if len(years) else [],
        "metrics": [k for k in NUMERIC + ["grade"] if k in names and frame[k].notna().any()],
    }


def ingest(db: Session, raw: bytes, name: str, source: dict) -> Dataset:
    frame, quality = parse(raw)
    item = Dataset(
        name=name, source=source, version=hashlib.sha256(raw).hexdigest(), quality=quality, raw=raw
    )
    db.add(item)
    db.flush()
    db.add_all(Column(dataset_id=item.id, info=c) for c in quality["columns"])
    records = json.loads(frame.to_json(orient="records", force_ascii=False))
    db.bulk_insert_mappings(Record, [{"dataset_id": item.id, "values": r} for r in records])
    return item


def seed(db: Session) -> None:
    for name, title, url, notes in [
        (
            "quality",
            "감귤 당도 실측",
            "https://www.data.go.kr/data/15077686/fileData.do",
            "2020년 11~12월 44개 지점의 177개 관측값 · °Bx",
        ),
        (
            "shipment",
            "신고소별 노지온주 출하량",
            "https://www.jejudatahub.net/data/view/data/855",
            "2022년 11월 25~26일 제주항·제주공항 노지온주 · 톤",
        ),
    ]:
        if not db.scalar(select(Dataset.id).where(Dataset.name == title).limit(1)):
            ingest(
                db,
                (DATA / "optional" / (name + ".csv")).read_bytes(),
                title,
                {"title": title, "url": url, "notes": notes},
            )
    if not db.scalar(select(Dataset.id).where(Dataset.name == "서귀포시 감귤 생산 정보").limit(1)):
        folder = DATA / "processed"
        source = json.loads((folder / "source.json").read_text(encoding="utf-8-sig"))
        ingest(db, (folder / "official.csv").read_bytes(), source["title"], source)
    db.commit()


def records(db: Session, dataset_id: str) -> pd.DataFrame:
    return pd.DataFrame(
        db.scalars(select(Record.values).where(Record.dataset_id == dataset_id).order_by(Record.id)).all()
    )
