"""데이터셋 종류별 KPI와 차트 집계 방식 검증."""

from pathlib import Path

import pandas as pd
import pytest

from app.tools.analytics import (
    analyze_production_by_region,
    analyze_shipment_trends,
    summarize_citrus_data,
)

ROOT = Path(__file__).resolve().parents[2]


def test_production_kpi_and_trend():
    frame = pd.read_csv(ROOT / "data/processed/official.csv")
    summary = summarize_citrus_data(frame)
    trends = analyze_shipment_trends(frame)

    assert summary["rows"] == 1155
    assert summary["latest"] == 2022
    assert summary["production_t"] == pytest.approx(404233.37)
    assert len(trends["production"]) == 11


def test_shipment_totals_by_port_and_day():
    frame = pd.read_csv(ROOT / "data/optional/shipment.csv")
    summary = summarize_citrus_data(frame)
    ports = analyze_production_by_region(frame)
    trends = analyze_shipment_trends(frame)

    assert summary["shipment_t"] == pytest.approx(1679.97)
    assert summary["ports"] == 2
    assert summary["dates"] == 2
    assert summary["production_t"] is None
    assert {row["label"] for row in ports} == {"제주항", "제주공항"}
    assert sum(row["value"] for row in ports) == pytest.approx(1679.97)
    assert sum(row["value"] for row in trends["shipment"]) == pytest.approx(1679.97)


def test_quality_means_not_sums():
    frame = pd.read_csv(ROOT / "data/optional/quality.csv")
    summary = summarize_citrus_data(frame)
    regions = analyze_production_by_region(frame)
    weeks = analyze_shipment_trends(frame)["brix_week"]

    assert summary["rows"] == 177
    assert summary["regions"] == 18
    assert summary["avg_brix"] == pytest.approx(round(frame.brix.mean(), 2))
    assert summary["max_brix"] == pytest.approx(round(frame.brix.max(), 2))
    assert summary["production_t"] is None
    assert len(weeks) == frame.week.nunique()
    assert all(row["value"] < 20 for row in regions)
    for row in regions:
        expected = frame.loc[frame.region == row["label"], "brix"].mean()
        assert row["value"] == pytest.approx(expected, abs=0.011)


def test_empty_dataset_gracefully():
    frame = pd.DataFrame({"region": ["A"], "brix": [float("nan")]})
    assert analyze_production_by_region(frame) == []
    assert analyze_shipment_trends(frame)["brix_week"] == []
    assert summarize_citrus_data(frame)["avg_brix"] is None


def test_shipment_all_four_panels_use_actual_records():
    frame = pd.read_csv(ROOT / "data/optional/shipment.csv")
    trends = analyze_shipment_trends(frame)
    assert len(trends["shipment"]) == 2
    assert len(trends["shipment_share"]) == 2
    assert sum(row["value"] for row in trends["shipment_share"]) == pytest.approx(100, abs=0.02)
    assert len(trends["shipment_by_port_date"]) == 4
    assert sum(row["value"] for row in trends["shipment_by_port_date"]) == pytest.approx(1679.97)


def test_quality_all_four_panels_use_real_brix_values():
    frame = pd.read_csv(ROOT / "data/optional/quality.csv")
    trends = analyze_shipment_trends(frame)
    assert len(trends["brix_week"]) == 5
    assert len(trends["brix_city"]) == 2
    assert sum(row["value"] for row in trends["brix_distribution"]) == 177
    assert all(row["value"] < 20 for row in trends["brix_city"])


def test_production_area_uses_hectares():
    frame = pd.read_csv(ROOT / "data/processed/official.csv")
    trends = analyze_shipment_trends(frame)
    assert len(trends["area_region"]) == frame.region.nunique()
    assert sum(row["value"] for row in trends["area_region"]) == pytest.approx(frame.area_ha.sum(), abs=0.2)


def test_new_aggregates_work_with_missing_columns():
    frame = pd.DataFrame({"region": ["A"], "brix": [12.3]})
    trends = analyze_shipment_trends(frame)
    assert trends["shipment_share"] == []
    assert trends["shipment_by_port_date"] == []
    assert trends["brix_city"] == []
    assert sum(row["value"] for row in trends["brix_distribution"]) == 1
