import os
from typing import Literal

from langchain_core.tools import tool
from langchain_openai import ChatOpenAI
from pydantic import BaseModel

from app.schemas.contracts import Plan


class ExplanationOrder(BaseModel):
    first: Literal["현금", "비용", "보관"]


def describe(report: dict) -> str:
    rows = report["scenarios"]
    chosen = next((r for r in rows if r["name"] == report["recommended"]), None)
    if not chosen:
        return report["explanation"]
    p = report["params"]
    facts = {
        "현금": f"당일 순현금 {chosen['cash_today']:,.0f}원이 최소 필요액 {p['min_cash_needed']:,}원을 충족합니다.",
        "비용": f"출하비와 보관비 합계는 {chosen['shipping'] + chosen['storage']:,.0f}원이며 예상 순수입은 {chosen['net']:,.0f}원입니다.",
        "보관": f"마지막 출하는 {max(b['day'] for b in chosen['schedule'])}일차로 보관 한도 {p['max_storage_days']}일 이내입니다.",
    }
    first = "현금" if p["min_cash_needed"] else "비용"
    if os.getenv("LLM_PROVIDER", "local") == "openai":
        model = ChatOpenAI(model=os.getenv("LLM_MODEL", "gpt-4o-mini"), timeout=20, max_retries=0)
        order = model.with_structured_output(ExplanationOrder).invoke(
            "다음 검증된 출하 비교의 설명에서 먼저 다룰 항목을 선택하세요. 전략 선호도 "
            + p["risk_preference"]
            + " / "
            + " ".join(facts.values())
        )
        first = order.first
    return " ".join([facts[first], *(v for k, v in facts.items() if k != first)])


@tool(args_schema=Plan)
def choose_tools(tools: list[str]) -> list[str]:
    """Select applicable allowlisted citrus analytics functions."""
    return tools


def plan_tools(metrics: list[str], dimensions: list[str]) -> tuple[list[str], str]:
    allowed = []
    if "region" in dimensions and "production_t" in metrics:
        allowed.append("analyze_production_by_region")
    if ("year" in dimensions or "variety" in dimensions) and {"production_t", "shipment_t"}.intersection(
        metrics
    ):
        allowed.append("analyze_shipment_trends")
    if {"brix", "grade"}.intersection(metrics):
        allowed.append("analyze_quality_metrics")
    if os.getenv("LLM_PROVIDER", "local") == "openai":
        client = ChatOpenAI(model=os.getenv("LLM_MODEL", "gpt-4o-mini"), timeout=20, max_retries=0)
        response = client.bind_tools([choose_tools], tool_choice="choose_tools").invoke(
            "Select all applicable statistics from the following fixed tool identifiers. "
            + ", ".join(allowed)
        )
        call = response.tool_calls[0]
        if call["name"] != "choose_tools":
            raise ValueError("허용되지 않은 도구")
        proposed = Plan.model_validate(call["args"]).tools
        if set(proposed) != set(allowed):
            raise ValueError("데이터 범위와 분석 계획 불일치")
        return list(dict.fromkeys(proposed)), "openai"
    return allowed, "local"
