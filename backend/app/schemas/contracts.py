from typing import Literal

from pydantic import BaseModel, ConfigDict, Field


class Conditions(BaseModel):
    model_config = ConfigDict(extra="forbid", allow_inf_nan=False)
    dataset_id: str | None = None
    inventory_kg: int = Field(gt=0, le=1_000_000)
    expected_unit_price_now: int = Field(ge=0, le=1_000_000)
    expected_unit_price_future: int | None = Field(default=None, ge=0, le=1_000_000)
    storage_cost_per_day: float = Field(ge=0, le=10000, multiple_of=0.01)
    shipping_cost_per_batch: int = Field(ge=0, le=100_000_000)
    max_storage_days: int = Field(ge=0, le=180)
    min_cash_needed: int = Field(ge=0, le=1_000_000_000_000)
    risk_preference: Literal["stable", "balanced", "aggressive"]


class Envelope(BaseModel):
    tool_name: str
    execution_id: str
    parameters: dict
    success: bool
    elapsed_ms: float
    dataset_version: str
    result: dict | list | None = None
    error: str | None = None


class Ticket(BaseModel):
    id: str
    status: str


class DatasetInfo(BaseModel):
    id: str
    name: str
    version: str
    source: dict
    quality: dict


class RunView(Ticket):
    dataset_id: str
    version: str
    params: Conditions
    error: str | None
    created: str


class Plan(BaseModel):
    tools: list[Literal["analyze_production_by_region", "analyze_shipment_trends", "analyze_quality_metrics"]]
