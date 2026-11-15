from pydantic import BaseModel

from app.schemas.contracts import Conditions, Envelope


class Aggregate(BaseModel):
    label: str
    value: float


class Summary(BaseModel):
    rows: int
    latest: int | None
    production_t: float | None
    regions: int
    varieties: int
    years: list[int]
    region_names: list[str]
    variety_names: list[str]


class Trends(BaseModel):
    production: list[Aggregate]
    shipment: list[Aggregate]
    varieties: list[Aggregate]


class QualityMetrics(BaseModel):
    brix: dict[str, float] | None
    grades: dict[str, int]


class Batch(BaseModel):
    day: int
    kg: int


class ScenarioView(BaseModel):
    name: str
    schedule: list[Batch]
    gross: float
    storage: float
    shipping: float
    net: float
    cash_today: float
    score: float
    feasible: bool
    solver: str | None = None
    solver_status: str | None = None


class StrategyReport(BaseModel):
    sensitivity: list[dict] = []
    scenarios: list[ScenarioView]
    recommended: str | None
    alternative: str | None
    source: dict
    version: str
    params: Conditions
    summary: dict
    basis: str
    limits: str
    explanation: str


class SavedReport(BaseModel):
    id: str
    created: str
    recommended: str | None
    basis: str


class Trace(BaseModel):
    steps: list[dict]
    agents: list[dict]
    tools: list[Envelope]
