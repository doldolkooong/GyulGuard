import os
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import update

from app.core.db import Base, SessionLocal, engine
from app.models.entities import Run
from app.routers.api import router
from app.services.data import seed


@asynccontextmanager
async def lifespan(_):
    if engine.dialect.name == "sqlite":
        Base.metadata.create_all(engine)
    with SessionLocal() as db:
        db.execute(
            update(Run)
            .where(Run.status.in_(["queued", "running"]))
            .values(
                status="failed", error="서버 재시작으로 분석이 중단되었습니다. 같은 조건으로 다시 실행하세요."
            )
        )
        seed(db)
    yield


app = FastAPI(title="귤지킴이", version="1.0", lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=os.getenv("CORS_ORIGINS", "http://localhost:5173").split(","),
    allow_methods=["GET", "POST"],
    allow_headers=["Content-Type"],
)
app.include_router(router)

from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from app.core.db import ROOT

web = ROOT / "frontend" / "dist"
if (web / "index.html").is_file():

    @app.get("/Pretendard.woff2", include_in_schema=False)
    def typeface():
        return FileResponse(web / "Pretendard.woff2")

    app.mount("/assets", StaticFiles(directory=web / "assets"), name="assets")

    @app.get("/mascot.svg", include_in_schema=False)
    def mascot():
        return FileResponse(web / "mascot.svg")

    @app.get("/orchard.svg", include_in_schema=False)
    def orchard():
        return FileResponse(web / "orchard.svg")

    @app.get("/", include_in_schema=False)
    @app.get("/data", include_in_schema=False)
    @app.get("/analytics", include_in_schema=False)
    @app.get("/agent", include_in_schema=False)
    @app.get("/scenarios", include_in_schema=False)
    @app.get("/reports", include_in_schema=False)
    @app.get("/audit", include_in_schema=False)
    def frontend():
        return FileResponse(web / "index.html")
