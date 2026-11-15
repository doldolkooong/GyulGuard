import pytest

from app.schemas.contracts import Conditions
from app.services.data import parse
from app.tools.strategy import (
    build_shipment_scenarios,
    optimize_shipment_plan,
    simulate_revenue_scenarios,
    verify_scenario_results,
)


def settings(**kwargs):
    return Conditions(
        **(
            {
                "inventory_kg": 1,
                "expected_unit_price_now": 1500,
                "storage_cost_per_day": 0,
                "shipping_cost_per_batch": 100,
                "max_storage_days": 0,
                "min_cash_needed": 0,
                "risk_preference": "stable",
            }
            | kwargs
        )
    )


def test_zero_horizon_coalesces():
    p = settings()
    rows = simulate_revenue_scenarios(p, build_shipment_scenarios(p))
    assert all(r["schedule"] == [{"kg": 1, "day": 0}] and r["shipping"] == 100 for r in rows)
    assert verify_scenario_results(p, rows)["verified"]


def test_zero_future_price():
    p = settings(max_storage_days=3, expected_unit_price_future=0)
    assert optimize_shipment_plan(p)["schedule"] == [{"kg": 1, "day": 0}]


def test_bad_width():
    with pytest.raises(ValueError):
        parse(b"year,brix\n2022,11,12")


def test_all_missing_metric():
    _, quality = parse(b"year,brix\n2022,\n")
    assert quality["metrics"] == [] and quality["columns"][1]["missing"] == 1


def test_reject_invalid_allocation():
    p = settings()
    row = optimize_shipment_plan(p)
    row["schedule"][0]["kg"] += 1
    with pytest.raises(ValueError):
        verify_scenario_results(p, [row])
