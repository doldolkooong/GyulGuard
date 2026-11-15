from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.entities import Dataset


def get(db: Session, model, key: str):
    item = db.get(model, key)
    if item is None:
        raise HTTPException(404, "항목을 찾을 수 없습니다.")
    return item


def resolve(db: Session, key: str | None) -> Dataset:
    if key:
        return get(db, Dataset, key)
    item = db.scalar(select(Dataset).order_by(Dataset.created.desc()).limit(1))
    if not item:
        raise HTTPException(404, "데이터셋이 없습니다.")
    return item
