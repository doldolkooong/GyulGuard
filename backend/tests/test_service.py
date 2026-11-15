from itertools import product

import pytest
from fastapi.testclient import TestClient

from app.core.db import DATA
from app.main import app
from app.schemas.contracts import Conditions
from app.tools.strategy import evaluate, optimize_shipment_plan


@pytest.fixture(scope="module")
def client():
    with TestClient(app) as c:
        yield c


@pytest.fixture
def params():
    return {
        "inventory_kg": 9,
        "expected_unit_price_now": 1400,
        "expected_unit_price_future": 1950,
        "storage_cost_per_day": 2,
        "shipping_cost_per_batch": 100,
        "max_storage_days": 4,
        "min_cash_needed": 1200,
        "risk_preference": "balanced",
    }


@pytest.mark.parametrize("enc", ["utf-8-sig", "cp949"])
def test_csv(enc, client):
    raw = "연도,지역,생산량(톤)\n2020,효돈,2\n2020,효돈,2\n2021,대정,\n".encode(enc)
    res = client.post("/api/datasets/upload", files={"file": ("upload.csv", raw)})
    assert res.status_code == 201
    ds = res.json()
    assert ds["quality"]["duplicates"] == 1
    assert ds["quality"]["columns"][-1]["missing"] == 1
    assert client.get("/api/analytics/regions", params={"dataset_id": ds["id"]}).json() == [
        {"label": "효돈", "value": 4}
    ]


@pytest.mark.parametrize("raw", [b"", b"year,region\n2022,S\n", b"production_t\n", b"brix,brix\n1,2"])
def test_bad_csv(raw, client):
    assert client.post("/api/datasets/upload", files={"file": ("d.csv", raw)}).status_code == 422


@pytest.mark.parametrize("risk", ["stable", "balanced", "aggressive"])
def test_solver_bruteforce(params, risk):
    p = Conditions(**{**params, "risk_preference": risk})
    result = optimize_shipment_plan(p)
    possible = []
    for a, b in product(range(10), repeat=2):
        c = 9 - a - b
        if c < 0:
            continue
        schedule = [{"day": d, "kg": q} for d, q in zip((0, 2, 4), (a, b, c)) if q]
        row = evaluate(p, {"schedule": schedule})
        if row["feasible"]:
            possible.append(row["score"])
    assert result["score"] == max(possible)


def test_price_and_cash(params):
    p = Conditions(**params)
    row = evaluate(p, {"schedule": [{"day": 0, "kg": 3}, {"day": 4, "kg": 6}]})
    assert row["gross"] == 15900 and row["shipping"] == 200 and row["storage"] == 48
    assert row["cash_today"] == 4100 and row["net"] == 15652


def test_impossible(params):
    p = Conditions(**{**params, "min_cash_needed": 20000})
    assert optimize_shipment_plan(p)["solver_status"] == "infeasible"


def test_bad_input(client, params):
    assert client.post("/api/agents/runs", json={**params, "inventory_kg": -1}).status_code == 422


def test_workflow(client, params):
    ds = next(d for d in client.get("/api/datasets").json() if d["name"] == "서귀포시 감귤 생산 정보")
    run = client.post("/api/agents/runs", json={**params, "dataset_id": ds["id"]})
    assert run.status_code == 202
    key = run.json()["id"]
    assert client.get("/api/agents/runs/" + key).json()["status"] == "completed"
    trace = client.get(f"/api/agents/runs/{key}/steps").json()
    assert len(trace["steps"]) == 7 and len(trace["tools"]) >= 10
    assert all(t["success"] and t["dataset_version"] == ds["version"] for t in trace["tools"])
    report = client.get("/api/reports/" + key).json()
    assert len(report["scenarios"]) == 5 and report["basis"] == "가정 기반 시뮬레이션"
    assert client.get(f"/api/reports/{key}/download").content.startswith(b"%PDF")
    assert "가정 기반" in client.get(f"/api/reports/{key}/download?format=csv").text


def test_official_data(client):
    ds = next(d for d in client.get("/api/datasets").json() if d["name"] == "서귀포시 감귤 생산 정보")
    info = client.get("/api/analytics/summary", params={"dataset_id": ds["id"]}).json()
    assert (info["rows"], info["regions"], info["latest"]) == (1155, 15, 2022)
    assert info["production_t"] == pytest.approx(404233.37)


def test_optional(client):
    for name, metric in [("quality", "quality"), ("shipment", "trends")]:
        raw = (DATA / "optional" / (name + ".csv")).read_bytes()
        ds = client.post("/api/datasets/upload", files={"file": (name + ".csv", raw)}).json()
        result = client.get("/api/analytics/" + metric, params={"dataset_id": ds["id"]}).json()
        if name == "quality":
            assert result["brix"]["count"] == 177 and result["brix"]["max"] == 13.86
        else:
            assert sum(r["value"] for r in result["shipment"]) == pytest.approx(1679.97)
