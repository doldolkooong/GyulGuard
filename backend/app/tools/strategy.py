from ortools.linear_solver import pywraplp

from app.schemas.contracts import Conditions

RISK = {"stable": 0.12, "balanced": 0.05, "aggressive": 0.0}


def slots(p: Conditions) -> list[int]:
    return sorted({0, p.max_storage_days // 2, p.max_storage_days})


def unit_price(p: Conditions, day: int) -> float:
    future = p.expected_unit_price_future
    if future is None or not p.max_storage_days:
        return p.expected_unit_price_now
    return p.expected_unit_price_now + (future - p.expected_unit_price_now) * day / p.max_storage_days


def penalty(p: Conditions, day: int) -> float:
    return RISK[p.risk_preference] * p.expected_unit_price_now * day / max(1, p.max_storage_days)


def concentration_rate(p: Conditions) -> float:
    return 0.05 * p.expected_unit_price_now if p.risk_preference == "balanced" else 0.0


def build_shipment_scenarios(p: Conditions) -> list:
    candidates = []
    for name, days in [
        ("즉시 전량", [0]),
        ("2회 분할", [0, p.max_storage_days]),
        ("3회 분할", slots(p)),
        ("보관 후 출하", [p.max_storage_days]),
    ]:
        days = sorted(set(days))
        qty, extra = divmod(p.inventory_kg, len(days))
        schedule = [
            {"day": day, "kg": qty + int(i < extra)} for i, day in enumerate(days) if qty + int(i < extra)
        ]
        candidates.append({"name": name, "schedule": schedule})
    return candidates


def evaluate(p: Conditions, candidate: dict) -> dict:
    batches = candidate["schedule"]
    gross = sum(unit_price(p, b["day"]) * b["kg"] for b in batches)
    holding = sum(b["kg"] * b["day"] * p.storage_cost_per_day for b in batches)
    shipping = len(batches) * p.shipping_cost_per_batch
    today = sum(
        b["kg"] * p.expected_unit_price_now - p.shipping_cost_per_batch for b in batches if b["day"] == 0
    )
    net = gross - holding - shipping
    score = net - sum(penalty(p, b["day"]) * b["kg"] for b in batches)
    score -= concentration_rate(p) * max((b["kg"] for b in batches), default=0)
    valid = bool(batches) and today >= p.min_cash_needed
    return {
        **candidate,
        "gross": round(gross, 2),
        "shipping": shipping,
        "storage": round(holding, 2),
        "net": round(net, 2),
        "cash_today": today,
        "score": round(score, 2),
        "feasible": valid,
    }


def simulate_revenue_scenarios(p: Conditions, candidates: list) -> list:
    return [evaluate(p, c) for c in candidates]


def optimize_shipment_plan(p: Conditions) -> dict:
    solver = pywraplp.Solver.CreateSolver("CBC")
    if solver is None:
        raise RuntimeError("OR-Tools CBC unavailable")
    days = slots(p)
    amount = {d: solver.IntVar(0, p.inventory_kg, f"kg_{d}") for d in days}
    active = {d: solver.BoolVar(f"batch_{d}") for d in days}
    for d in days:
        solver.Add(amount[d] <= p.inventory_kg * active[d])
        solver.Add(active[d] <= amount[d])
    solver.Add(sum(amount.values()) == p.inventory_kg)
    solver.Add(
        amount[0] * p.expected_unit_price_now - active[0] * p.shipping_cost_per_batch >= p.min_cash_needed
    )
    peak = solver.IntVar(0, p.inventory_kg, "peak_batch")
    for quantity in amount.values():
        solver.Add(peak >= quantity)
    solver.Maximize(
        sum(
            amount[d] * (unit_price(p, d) - d * p.storage_cost_per_day - penalty(p, d))
            - active[d] * p.shipping_cost_per_batch
            for d in days
        )
        - concentration_rate(p) * peak
    )
    status = solver.Solve()
    if status not in (solver.OPTIMAL, solver.INFEASIBLE):
        raise RuntimeError("최적화 상태를 확인할 수 없습니다.")
    batches = [
        {"day": d, "kg": round(amount[d].solution_value())}
        for d in days
        if status == solver.OPTIMAL and amount[d].solution_value() > 0.5
    ]
    return evaluate(
        p,
        {
            "name": "선호 반영 최적화",
            "schedule": batches,
            "solver": "CBC",
            "solver_status": "optimal" if status == solver.OPTIMAL else "infeasible",
        },
    )


def verify_scenario_results(p: Conditions, scenarios: list) -> dict:
    for row in scenarios:
        batches = row["schedule"]
        if row.get("solver_status") == "infeasible":
            if row["feasible"] or batches:
                raise ValueError("불가능한 배분 결과")
            continue
        if sum(b["kg"] for b in batches) != p.inventory_kg or len(batches) > 3:
            raise ValueError("배분 수량 오류")
        if any(b["kg"] <= 0 or not 0 <= b["day"] <= p.max_storage_days for b in batches):
            raise ValueError("출하 일정 오류")
        if abs(row["net"] - (row["gross"] - row["storage"] - row["shipping"])) > 0.02:
            raise ValueError("손익 검산 오류")
        if row["feasible"] != (row["cash_today"] >= p.min_cash_needed):
            raise ValueError("현금 조건 검증 오류")
    return {"verified": True, "count": len(scenarios)}


def compare_scenarios(scenarios: list) -> dict:
    ranked = sorted((r for r in scenarios if r["feasible"]), key=lambda r: (-r["score"], len(r["schedule"])))
    return {
        "recommended": ranked[0]["name"] if ranked else None,
        "alternative": next((r["name"] for r in ranked if r["schedule"] != ranked[0]["schedule"]), None)
        if ranked
        else None,
    }


def generate_strategy_report(
    scenarios: list, ranking: dict, source: dict, version: str, params: dict, summary: dict
) -> dict:
    p = Conditions.model_validate(params)
    future = (
        p.expected_unit_price_now if p.expected_unit_price_future is None else p.expected_unit_price_future
    )
    sensitivity = []
    for factor, label in ((0.9, "보수적"), (1.0, "기준"), (1.1, "낙관적")):
        price = round(future * factor)
        assumption = p.model_copy(update={"expected_unit_price_future": price})
        sensitivity.append(
            {
                "label": label,
                "price": price,
                "net": {r["name"]: evaluate(assumption, r)["net"] for r in scenarios if r["schedule"]},
            }
        )
    return {
        "sensitivity": sensitivity,
        "scenarios": scenarios,
        **ranking,
        "source": source,
        "version": version,
        "params": params,
        "summary": summary,
        "basis": "가정 기반 시뮬레이션",
        "limits": "미래 단가는 입력 가정입니다. 중간 단가는 선형 보간하며 감모·등급 변화·수요 한도는 반영하지 않습니다.",
        "explanation": "오늘 필요한 순현금을 충족하는 일정 중 위험 조정 점수가 가장 높은 순서입니다."
        if ranking["recommended"]
        else "오늘 필요한 순현금을 충족하는 일정이 없습니다. 최소 현금 또는 비용 가정을 확인하세요.",
    }
