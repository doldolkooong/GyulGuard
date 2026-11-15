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
it("저장된 시나리오와 다운로드 링크 표시", async () => {
  mock
    .mockResolvedValueOnce([
      { id: "r", created: "2025-01-01", recommended: "즉시 전량" },
    ])
    .mockResolvedValueOnce({
      scenarios: [],
      recommended: "즉시 전량",
      alternative: null,
      basis: "가정 기반 시뮬레이션",
      source: { title: "제주" },
      params: {},
      limits: "단가 가정",
      explanation: "현금 조건 충족",
    });
  render(
    <MemoryRouter>
      <Results reports />
    </MemoryRouter>,
  );
  expect(
    (await screen.findByText("PDF 다운로드")).getAttribute("href"),
  ).toContain("r/download?format=pdf");
  expect(screen.getByText("CSV 다운로드")).toBeTruthy();
  expect(screen.getByText("출하 일정과 비용")).toBeTruthy();
});
it("탐색기에 미리보기 표시", async () => {
  mock.mockResolvedValue({ preview: "[]" });
  render(<Explorer ds={ds} onUpload={() => {}} />);
  await waitFor(() => expect(screen.getByText("데이터 미리보기")).toBeTruthy());
  expect(screen.getByLabelText("CSV 파일")).toBeTruthy();
});
