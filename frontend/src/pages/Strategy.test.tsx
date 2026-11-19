import { afterEach, beforeEach, expect, it, vi } from "vitest";
import {
  cleanup,
  render,
  screen,
  fireEvent,
  waitFor,
} from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { Agent, Results } from "./Strategy";
import { Explorer } from "./Data";
import { api } from "../api/client";
import type { Dataset } from "../types";
vi.mock("../api/client", async (original) => ({
  ...(await original<typeof import("../api/client")>()),
  api: vi.fn(),
}));
const ds: Dataset = {
  id: "ds",
  name: "생산 통계",
  version: "abc",
  source: { title: "제주", url: "", notes: "" },
  quality: {
    columns: [],
    rows: 1,
    period: [],
    encoding: "utf-8",
    invalid: {},
    duplicates: 0,
    metrics: [],
  },
};
const mock = vi.mocked(api);
beforeEach(() => {
  mock.mockReset();
});
afterEach(cleanup);
it("폼의 물량 검증과 분석 실행", async () => {
  mock
    .mockResolvedValueOnce({ id: "one" })
    .mockResolvedValueOnce({ status: "completed" })
    .mockResolvedValueOnce({ steps: [], tools: [] });
  render(
    <MemoryRouter>
      <Agent ds={ds} />
    </MemoryRouter>,
  );
  const kg = screen.getByLabelText(/보유 물량/) as HTMLInputElement;
  fireEvent.change(kg, { target: { value: "-1" } });
  expect(kg.validity.valid).toBe(false);
  fireEvent.change(kg, { target: { value: "10" } });
  fireEvent.click(screen.getByText("출하 전략 분석"));
  await screen.findByText("시나리오 비교");
  expect(mock.mock.calls[0][0]).toBe("/agents/runs");
});
it("API 오류를 화면에 표시", async () => {
  mock.mockRejectedValue(new Error("서버 연결 실패"));
  render(
    <MemoryRouter>
      <Results />
    </MemoryRouter>,
  );
  expect((await screen.findByRole("alert")).textContent).toContain(
    "서버 연결 실패",
  );
});
const demoReport = {
  scenarios: [
    { name: "즉시 전량", schedule: [{ day: 0, kg: 1000 }], net: 1980000, gross: 2000000, storage: 0, shipping: 20000, cash_today: 1980000, feasible: true, score: 1 },
    { name: "분할 최적화", schedule: [{ day: 0, kg: 200 }, { day: 10, kg: 800 }], net: 2250000, gross: 2320000, storage: 30000, shipping: 40000, cash_today: 400000, feasible: true, score: 2 },
  ],
  recommended: "분할 최적화",
  alternative: "즉시 전량",
  basis: "가정 기반 시뮬레이션",
  source: { title: "제주 감귤 자료", url: "https://example.org" },
  version: "abc123",
  params: { inventory_kg: 1000, expected_unit_price_now: 2000, expected_unit_price_future: 2400, storage_cost_per_day: 3, shipping_cost_per_batch: 20000, max_storage_days: 10, min_cash_needed: 400000, risk_preference: "balanced" },
  limits: "미래 단가는 입력값입니다.",
  explanation: "보유 물량과 현금 조건을 고려했습니다.",
};
const demoSaved = [{ id: "r", created: "2025-01-01", recommended: "분할 최적화", basis: "가정 기반 시뮬레이션" }];

it("시나리오 비교는 손익 차이·전략별 일정에 집중", async () => {
  mock.mockResolvedValueOnce(demoSaved).mockResolvedValueOnce(demoReport);
  render(<MemoryRouter><Results /></MemoryRouter>);
  expect(await screen.findByText("즉시 전량 대비 순수입 증감")).toBeTruthy();
  expect(screen.getByText("출하 일정 상세 비교")).toBeTruthy();
  expect(screen.queryByText("PDF 다운로드")).toBeNull();
  expect(screen.getAllByText("+270,000원").length).toBeGreaterThan(0);
});

it("보고서 센터는 다운로드·근거·재현 정보에 집중", async () => {
  mock.mockResolvedValueOnce(demoSaved).mockResolvedValueOnce(demoReport);
  render(<MemoryRouter><Results reports /></MemoryRouter>);
  const pdf = await screen.findByText("PDF 다운로드");
  expect(pdf.closest("a")?.getAttribute("href")).toContain("r/download?format=pdf");
  expect(screen.getByText("CSV 다운로드")).toBeTruthy();
  expect(screen.getByText("02. 분석 입력 조건")).toBeTruthy();
  expect(screen.getByText("03. 데이터 출처 및 재현 정보")).toBeTruthy();
  expect(screen.queryByText("즉시 전량 대비 순수입 증감")).toBeNull();
});
it("탐색기에 미리보기 표시", async () => {
  mock.mockResolvedValue({ preview: "[]" });
  render(<Explorer ds={ds} onUpload={() => {}} />);
  await waitFor(() => expect(screen.getByText("데이터 미리보기")).toBeTruthy());
  expect(screen.getByLabelText("CSV 파일")).toBeTruthy();
});
