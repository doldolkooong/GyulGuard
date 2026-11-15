import logging
from time import perf_counter
from typing import TypedDict
from uuid import uuid4

from langgraph.graph import END, START, StateGraph
from sqlalchemy.orm import Session

from app.agents.provider import describe, plan_tools
from app.core.db import SessionLocal
from app.models.entities import Dataset, Execution, Optimization, Report, Run, Scenario, Step, ToolLog
from app.schemas.contracts import Conditions, Envelope
from app.services.data import records
from app.tools import analytics as a
from app.tools import strategy as s


class State(TypedDict, total=False):
    plan: list[str]
    quality: dict
    summary: dict
    candidates: list
    rows: list
    ranking: dict
    report: dict


def execute(run_id: str) -> None:
    with SessionLocal() as db:
        run = db.get(Run, run_id)
        try:
            run.status = "running"
            db.commit()
            dataset = db.get(Dataset, run.dataset_id)
            frame = records(db, dataset.id)
            p = Conditions.model_validate(run.params)

            def call(fn, *args, **params):
                start = perf_counter()
                try:
                    result = fn(*args)
                    success, error = True, None
                except Exception as exc:
                    result, success, error = None, False, type(exc).__name__
                    raise
                finally:
                    log = Envelope(
                        tool_name=fn.__name__,
                        execution_id=uuid4().hex,
                        parameters={
                            "run_id": run_id,
                            "dataset_id": run.dataset_id,
                            "conditions": run.params,
                            **params,
                        },
                        success=success,
                        elapsed_ms=round((perf_counter() - start) * 1000, 2),
                        dataset_version=run.version,
                        result=result,
                        error=error,
                    )
                    db.add(ToolLog(run_id=run_id, payload=log.model_dump()))
                    db.commit()
                return result

            def planner(_):
                tools, provider = plan_tools(
                    dataset.quality["metrics"], [c["name"] for c in dataset.quality["columns"]]
                )
                db.add(
                    Execution(
                        run_id=run_id,
                        payload={
                            "provider": provider,
                            "plan": tools,
                            "storage_days": s.slots(p),
                            "objective": p.risk_preference,
                            "price_basis": "현재 단가 유지"
                            if p.expected_unit_price_future is None
                            else "미래 단가 입력",
                            "cash_floor": p.min_cash_needed,
                        },
                    )
                )
                return {"plan": tools}

            def analysis(state):
                summary = call(a.summarize_citrus_data, frame)
                functions = {
                    fn.__name__: fn
                    for fn in (
                        a.analyze_production_by_region,
                        a.analyze_shipment_trends,
                        a.analyze_quality_metrics,
                    )
                }
                for key in state["plan"]:
                    summary[key] = call(functions[key], frame)
                return {"summary": summary}

            def scenarios(_):
                candidates = call(s.build_shipment_scenarios, p)
                return {"rows": call(s.simulate_revenue_scenarios, p, candidates)}

            def optimize(state):
                optimal = call(s.optimize_shipment_plan, p)
                db.add(Optimization(run_id=run_id, payload=optimal))
                return {"rows": [*state["rows"], optimal]}

            def verify(state):
                call(s.verify_scenario_results, p, state["rows"])
                return {"ranking": call(s.compare_scenarios, state["rows"])}

            def report(state):
                result = call(
                    s.generate_strategy_report,
                    state["rows"],
                    state["ranking"],
                    dataset.source,
                    run.version,
                    run.params,
                    state["summary"],
                )
                result = {**result, "explanation": describe(result)}
                db.add_all(Scenario(run_id=run_id, payload=row) for row in state["rows"])
                db.add(Report(id=run_id, payload=result))
                return {"report": result}

            nodes = [
                ("실행 계획", planner),
                ("데이터 점검", lambda _: {"quality": call(a.inspect_dataset, dataset.quality)}),
                ("현황 분석", analysis),
                ("시나리오 생성", scenarios),
                ("물량 최적화", optimize),
                ("조건 검증", verify),
                ("보고서 생성", report),
            ]
            graph = StateGraph(State)
            previous = START
            for name, fn in nodes:
                graph.add_node(name, tracked(db, run_id, name, fn))
                graph.add_edge(previous, name)
                previous = name
            graph.add_edge(previous, END)
            graph.compile().invoke({}, config={"recursion_limit": 12})
            run.status = "completed"
            db.commit()
        except Exception as exc:  # noqa: BLE001 - 작업 경계에서 실패 상태를 보존한다.
            db.rollback()
            run.status = "failed"
            run.error = f"실행 실패 ({type(exc).__name__}). 도구 설정과 입력을 확인하세요."
            db.commit()
            logging.getLogger(__name__).error("Run %s failed: %s", run_id, type(exc).__name__)


def tracked(db: Session, run_id: str, name: str, function):
    def node(state: State):
        step = Step(run_id=run_id, payload={"name": name, "status": "running"})
        db.add(step)
        db.commit()
        start = perf_counter()
        try:
            value = function(state)
            status = "completed"
            return value
        except Exception:
            status = "failed"
            raise
        finally:
            step.payload = {
                "name": name,
                "status": status,
                "elapsed_ms": round((perf_counter() - start) * 1000, 2),
            }
            db.commit()

    return node
