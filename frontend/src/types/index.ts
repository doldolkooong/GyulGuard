export type Row = { label: string; value: number };
export type Quality = {
  rows: number;
  duplicates: number;
  encoding: string;
  period: number[];
  columns: { name: string; dtype: string; missing: number }[];
  metrics: string[];
  invalid: Record<string, number>;
};
export type Dataset = {
  id: string;
  name: string;
  version: string;
  source: { title: string; url: string; notes: string };
  quality: Quality;
};
export type Summary = {
  rows: number;
  latest: number | null;
  production_t: number | null;
  regions: number;
  varieties: number;
  years: number[];
  region_names: string[];
  variety_names: string[];
};
export type Inputs = {
  inventory_kg: number;
  expected_unit_price_now: number;
  expected_unit_price_future: number | null;
  storage_cost_per_day: number;
  shipping_cost_per_batch: number;
  max_storage_days: number;
  min_cash_needed: number;
  risk_preference: string;
};
export type Run = {
  id: string;
  status: string;
  created: string;
  version: string;
  params: Inputs;
  error: string | null;
  dataset_id: string;
};
export type Trace = {
  steps: { name: string; status: string; elapsed_ms?: number }[];
  tools: {
    tool_name: string;
    elapsed_ms: number;
    success: boolean;
    execution_id: string;
    result: unknown;
  }[];
  agents: unknown[];
};
export type Scenario = {
  name: string;
  schedule: { day: number; kg: number }[];
  net: number;
  gross: number;
  storage: number;
  shipping: number;
  cash_today: number;
  feasible: boolean;
  score: number;
};
export type Report = {
  sensitivity?: { label: string; price: number; net: Record<string, number> }[];
  scenarios: Scenario[];
  recommended: string | null;
  alternative: string | null;
  basis: string;
  limits: string;
  explanation: string;
  source: Dataset["source"];
  version: string;
  params: Inputs;
};
export type Saved = {
  id: string;
  created: string;
  recommended: string | null;
  basis: string;
};
