import { useEffect, useState, type FormEvent } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ArrowRight, Download, Play, CheckCircle2 } from "lucide-react";
import type { Dataset, Inputs, Run, Trace, Report, Saved } from "../types";
import { api, date, num } from "../api/client";
import { useData } from "../hooks/useData";
import { Panel, Empty, Wait, Chart } from "../components/UI";
import s from "../styles/App.module.css";

const fields = [
  ["inventory_kg", "보유 물량", "kg", 1000000],
  ["expected_unit_price_now", "현재 예상 단가", "원/kg", 1000000],
  ["expected_unit_price_future", "미래 예상 단가 (선택)", "원/kg", 1000000],
  ["storage_cost_per_day", "하루 보관비", "원/kg·일", 10000],
  ["shipping_cost_per_batch", "회당 출하비", "원/회", 100000000],
  ["max_storage_days", "최대 보관 기간", "일", 180],
  ["min_cash_needed", "오늘 필요한 순현금", "원", 1000000000000],
] as const;
const defaults: Inputs = {
  inventory_kg: 1000,
  expected_unit_price_now: 2200,
  expected_unit_price_future: null,
  storage_cost_per_day: 2,
  shipping_cost_per_batch: 35000,
  max_storage_days: 14,
  min_cash_needed: 0,
  risk_preference: "balanced",
};
export function Agent({ ds }: { ds: Dataset }) {
  const [p, set] = useState<Inputs>(defaults),
    [id, setId] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [run, setRun] = useState<Run>(),
    [trace, setTrace] = useState<Trace>();
  useEffect(() => {
    if (!id) return;
    let active = true,
      timer: ReturnType<typeof setTimeout>;
    async function poll() {
      try {
        const [r, t] = await Promise.all([
          api<Run>("/agents/runs/" + id),
          api<Trace>("/agents/runs/" + id + "/steps"),
        ]);
        if (!active) return;
        setRun(r);
        setTrace(t);
        if (["completed", "failed"].includes(r.status)) {
          setBusy(false);
          if (r.error) setError(r.error);
        } else timer = setTimeout(poll, 450);
      } catch (e) {
        if (active) {
          setBusy(false);
          setError((e as Error).message);
        }
      }
    }
    poll();
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [id]);
  async function start(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    setRun(undefined);
    setTrace(undefined);
    setId("");
    try {
      const r = await api<{ id: string }>("/agents/runs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...p, dataset_id: ds.id }),
      });
      setId(r.id);
    } catch (e) {
      setBusy(false);
      setError((e as Error).message);
    }
  }
  return (
    <div className={s.workGrid}>
      <Panel
        title="출하 조건 입력"
        meta="가정 기반 시뮬레이션 · 미래 단가가 비어 있으면 현재 단가를 유지합니다."
      >
        <form onSubmit={start}>
          <fieldset disabled={busy} className={s.form}>
            {fields.map(([k, label, unit, max]) => (
              <label key={k}>
                {label}
                <div className={s.inputUnit}>
                  <input
                    type="number"
                    required={k !== "expected_unit_price_future"}
                    min={k === "inventory_kg" ? 1 : 0}
                    step={k === "storage_cost_per_day" ? 0.01 : 1}
                    max={max}
                    value={p[k] ?? ""}
                    onChange={(e) =>
                      set({
                        ...p,
                        [k]:
                          e.target.value === "" ? null : Number(e.target.value),
                      })
                    }
                  />
                  <span>{unit}</span>
                </div>
              </label>
            ))}
            <label>
              전략 선호도
              <select
                value={p.risk_preference}
                onChange={(e) => set({ ...p, risk_preference: e.target.value })}
              >
                <option value="stable">안정성 중심</option>
                <option value="balanced">균형 · 분산 출하 선호</option>
                <option value="aggressive">수익성 중심</option>
              </select>
            </label>
          </fieldset>
          <button className={s.primary} disabled={busy}>
            <Play size={16} />
            {busy ? "계산 중…" : "출하 전략 분석"}
          </button>
        </form>
        {error && <Wait error={error} />}
      </Panel>
      <Panel title="Agent 실행 단계" meta={ds.name}>
        <div className={s.guide}>
          <img src="/mascot.svg" alt="귤몽" />
          <p>
            {busy
              ? "귤몽이 출하 전략을 계산하고 있어요."
              : run?.status === "completed"
                ? "계산과 조건 검증을 마쳤어요."
                : "농가 조건을 입력하고 분석을 시작해 주세요."}
          </p>
        </div>
        {trace && (
          <>
            <progress
              value={trace.steps.filter((t) => t.status === "completed").length}
              max={7}
            />
            {trace.steps.map((t) => (
              <p key={t.name}>
                {t.name} · {t.status} · {num(t.elapsed_ms, 1)} ms
              </p>
            ))}
            <details>
              <summary>호출한 도구 {trace.tools.length}개</summary>
              {trace.tools.map((t) => (
                <p key={t.execution_id}>
                  {t.tool_name} · {num(t.elapsed_ms, 1)} ms
                </p>
              ))}
            </details>
          </>
        )}
        {run?.status === "completed" && (
          <Link className={s.primary} to={"/scenarios?run=" + id}>
            시나리오 비교 <ArrowRight size={16} />
          </Link>
        )}
      </Panel>
    </div>
  );
}

export function Results({ reports = false }: { reports?: boolean }) {
  const list = useData<Saved[]>("/reports"),
    [params, setParams] = useSearchParams();
  const id = params.get("run") || list.data?.[0]?.id;
  const r = useData<Report>(id ? "/reports/" + id : null);
  if (!list.data) return <Wait error={list.error} />;
  if (!id)
    return (
      <Empty>
        저장된 분석이 없습니다. <Link to="/agent">첫 분석 시작 →</Link>
      </Empty>
    );
  const result = r.data;
  return (
    <>
      <label className={s.selectLine}>
        저장된 보고서
        <select value={id} onChange={(e) => setParams({ run: e.target.value })}>
          {list.data.map((x) => (
            <option key={x.id} value={x.id}>
              {date(x.created)} · {x.recommended || "조건 충족안 없음"} ·{" "}
              {x.id.slice(0, 6)}
            </option>
          ))}
        </select>
      </label>
      {result ? (
        <>
          <section className={s.recommend}>
            <small>{result.basis}</small>
            <h2>
              <CheckCircle2 />
              {result.recommended || "조건 충족안 없음"}
            </h2>
            <p>{result.explanation}</p>
            <p>
              대안 · {result.alternative || "서로 다른 실행 가능 일정 없음"}
            </p>
          </section>
          <div className={s.grid}>
            <Panel
              title="예상 순수입 비교"
              meta="매출에서 출하비와 보관비 차감 · 원"
            >
              <Chart
                unit="원"
                rows={result.scenarios
                  .filter((x) => x.schedule.length)
                  .map((x) => ({ label: x.name, value: x.net }))}
              />
            </Panel>
            <Panel title="분석 조건 및 한계" meta={result.source.title}>
              <p>
                보유 {num(result.params.inventory_kg)} kg · 보관{" "}
                {result.params.max_storage_days}일
              </p>
              <p>
                현재 {num(result.params.expected_unit_price_now)}원/kg · 미래
                가정{" "}
                {num(
                  result.params.expected_unit_price_future ??
                    result.params.expected_unit_price_now,
                )}
                원/kg
              </p>
              <p>{result.limits}</p>
              {result.source.url && (
                <a href={result.source.url}>데이터 출처 ↗</a>
              )}
            </Panel>
          </div>
          <div className={s.scenarioCards}>
            {result.scenarios.map((x) => (
              <section key={x.name}>
                <small>
                  {x.feasible ? "현금 조건 충족" : "현금 조건 미충족"}
                </small>
                <h3>{x.name}</h3>
                <p>{x.schedule.length ? num(x.net) + "원" : "배분 불가"}</p>
                <small>예상 순수입 · 실제 {x.schedule.length}회 출하</small>
              </section>
            ))}
          </div>
          <Panel
            title="출하 일정과 비용"
            meta="일차별 출하량 · 당일 현금은 당일 출하비 차감 후 금액"
          >
            <div className={s.scroll}>
              <table>
                <thead>
                  <tr>
                    {[
                      "시나리오",
                      "일차 / 물량",
                      "예상 순수입",
                      "보관비",
                      "출하비",
                      "당일 순현금",
                      "위험 조정 점수",
                      "조건",
                    ].map((x) => (
                      <th key={x}>{x}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {result.scenarios.map((x) => (
                    <tr key={x.name}>
                      <td>{x.name}</td>
                      <td>
                        {x.schedule
                          .map((b) => b.day + "일 / " + num(b.kg) + "kg")
                          .join(" · ") || "배분 불가"}
                      </td>
                      <td>{x.schedule.length ? num(x.net) : "—"}</td>
                      <td>{num(x.storage)}</td>
                      <td>{num(x.shipping)}</td>
                      <td>{num(x.cash_today)}</td>
                      <td>{x.feasible ? num(x.score) : "—"}</td>
                      <td>{x.feasible ? "충족" : "미충족"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Panel>
          {!!result.sensitivity?.length && (
            <Panel
              title="미래 단가 가정별 순수입"
              meta="출하 일정 고정 · 마지막 날 단가를 기준 대비 −10%, 유지, +10%로 변경 · 원"
            >
              <div className={s.scroll}>
                <table>
                  <thead>
                    <tr>
                      <th>출하안</th>
                      {result.sensitivity.map((x) => (
                        <th key={x.label}>
                          {x.label} · {num(x.price)}원/kg
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {result.scenarios
                      .filter((x) => x.schedule.length)
                      .map((x) => (
                        <tr key={x.name}>
                          <td>{x.name}</td>
                          {result.sensitivity?.map((v) => (
                            <td key={v.label}>{num(v.net[x.name])}</td>
                          ))}
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </Panel>
          )}
          {reports ? (
            <div className={s.actions}>
              {["pdf", "csv"].map((f) => (
                <a
                  className={s.primary}
                  key={f}
                  download
                  href={"/api/reports/" + id + "/download?format=" + f}
                >
                  <Download size={16} />
                  {f.toUpperCase()} 다운로드
                </a>
              ))}
            </div>
          ) : (
            <Link className={s.primary} to={"/reports?run=" + id}>
              보고서 보기 <ArrowRight size={16} />
            </Link>
          )}
        </>
      ) : (
        <Wait error={r.error} />
      )}
    </>
  );
}

export function Audit() {
  const runs = useData<Run[]>("/agents/runs"),
    health = useData<{ llm_provider: string; llm_model: string | null }>(
      "/health",
    );
  const [selected, select] = useState(""),
    id = selected || runs.data?.[0]?.id,
    r = runs.data?.find((x) => x.id === id);
  const trace = useData<Trace>(id ? "/agents/runs/" + id + "/steps" : null);
  return (
    <>
      <Panel title="실행 환경">
        <div>
          LLM ·{" "}
          {health.data ? (
            health.data.llm_provider === "local" ? (
              "로컬 규칙 플래너"
            ) : (
              health.data.llm_model
            )
          ) : (
            <Wait error={health.error} />
          )}
        </div>
      </Panel>
      <Panel title="Agent 실행 기록">
        {runs.data?.length ? (
          <>
            <select value={id} onChange={(e) => select(e.target.value)}>
              {runs.data.map((r) => (
                <option value={r.id} key={r.id}>
                  {date(r.created)} · {r.status} · {r.id.slice(0, 8)}
                </option>
              ))}
            </select>
            <p>데이터 버전 · {r?.version}</p>
            {r?.error && <Wait error={r.error} />}
            <details>
              <summary>재현 파라미터</summary>
              <pre>{JSON.stringify(r?.params, null, 2)}</pre>
            </details>
          </>
        ) : runs.data ? (
          <Empty>아직 실행 기록이 없습니다.</Empty>
        ) : (
          <Wait error={runs.error} />
        )}
      </Panel>
      {id && (
        <Panel title="도구 호출 로그">
          {trace.data ? (
            <>
              {trace.data.steps.map((t) => (
                <span className={s.chip} key={t.name}>
                  {t.name} · {t.status}
                </span>
              ))}
              {trace.data.tools.map((t) => (
                <details key={t.execution_id}>
                  <summary>
                    {t.tool_name} · {t.success ? "성공" : "실패"} ·{" "}
                    {num(t.elapsed_ms, 2)} ms
                  </summary>
                  <pre>{JSON.stringify(t, null, 2)}</pre>
                </details>
              ))}
            </>
          ) : (
            <Wait error={trace.error} />
          )}
        </Panel>
      )}
    </>
  );
}
