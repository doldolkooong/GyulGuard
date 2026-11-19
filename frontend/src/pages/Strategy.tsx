import { useEffect, useState, type FormEvent } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ArrowRight, Download, Play, CheckCircle2 } from "lucide-react";
import type { Dataset, Inputs, Run, Trace, Report, Saved } from "../types";
import { api, date, num } from "../api/client";
import { useData } from "../hooks/useData";
import { Panel, Empty, Wait } from "../components/UI";
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

const won = (value: number | null | undefined) =>
  value == null || !Number.isFinite(value) ? "—" : `${num(Math.round(value))}원`;

const signedWon = (value: number) =>
  `${value > 0 ? "+" : value < 0 ? "−" : ""}${won(Math.abs(value))}`;

function SavedReportSelector({
  items,
  id,
  onChange,
}: {
  items: Saved[];
  id: string;
  onChange: (next: string) => void;
}) {
  return (
    <label className={s.selectLine}>
      저장된 분석
      <select value={id} onChange={(e) => onChange(e.target.value)}>
        {items.map((item) => (
          <option key={item.id} value={item.id}>
            {date(item.created)} · {item.recommended || "조건 충족안 없음"} · {item.id.slice(0, 6)}
          </option>
        ))}
      </select>
    </label>
  );
}

/** 출하 방식별 차이를 비교하는 화면입니다. 보고서 다운로드·근거 설명은 별도 화면에 둡니다. */
function ScenarioComparison({ result, id }: { result: Report; id: string }) {
  const scenarios = result.scenarios ?? [];
  const baseline =
    scenarios.find((item) => item.name.includes("즉시") && item.schedule.length) ??
    scenarios.find((item) => item.schedule.length);
  const recommended = scenarios.find((item) => item.name === result.recommended);
  const initial = recommended?.name ?? scenarios[0]?.name ?? "";
  const [selectedName, setSelectedName] = useState(initial);
  useEffect(() => setSelectedName(initial), [initial, id]);
  const selected = scenarios.find((item) => item.name === selectedName) ?? scenarios[0];
  const baseNet = baseline?.net ?? 0;
  const maxDifference = Math.max(
    1,
    ...scenarios
      .filter((item) => item.schedule.length)
      .map((item) => Math.abs(item.net - baseNet)),
  );
  if (!scenarios.length) return <Empty>저장된 출하 시나리오가 없습니다.</Empty>;

  return (
    <>
      <section className={s.recommend}>
        <small>가정 기반 시뮬레이션 · 최종 전략 비교</small>
        <h2>
          <CheckCircle2 size={20} />
          {result.recommended ?? "조건을 만족하는 전략이 없습니다"}
        </h2>
        <p>{result.explanation}</p>
        <Link className={s.textLink} to={`/reports?run=${encodeURIComponent(id)}`}>
          분석 근거와 보고서 보기 <ArrowRight size={15} />
        </Link>
      </section>

      <div className={s.compareKpis}>
        <div>
          <small>즉시 전량 출하 · 기준</small>
          <strong>{baseline ? won(baseline.net) : "—"}</strong>
        </div>
        <div>
          <small>추천 전략 예상 순수입</small>
          <strong>{recommended ? won(recommended.net) : "—"}</strong>
        </div>
        <div>
          <small>기준 대비 예상 손익</small>
          <strong className={(recommended?.net ?? baseNet) >= baseNet ? s.deltaPositive : s.deltaNegative}>
            {recommended && baseline ? signedWon(recommended.net - baseNet) : "—"}
          </strong>
        </div>
        <div>
          <small>당일 필요한 순현금</small>
          <strong>{won(result.params.min_cash_needed)}</strong>
        </div>
      </div>

      <Panel title="즉시 전량 대비 순수입 증감" meta="차이값 중심 비교 · 0원을 기준으로 좌측은 감소, 우측은 증가">
        <div className={s.deltaLegend}>
          <span>손익 감소</span><span>기준 0원</span><span>손익 증가</span>
        </div>
        <div className={s.deltaList}>
          {scenarios.map((item) => {
            const hasPlan = item.schedule.length > 0;
            const diff = hasPlan ? item.net - baseNet : 0;
            const width = (Math.abs(diff) / maxDifference) * 47;
            return (
              <div className={s.deltaRow} key={item.name}>
                <span className={s.deltaName}>{item.name}</span>
                <div className={s.deltaTrack} role="img" aria-label={`${item.name}: ${hasPlan ? signedWon(diff) : "계산 불가"}`}>
                  <i className={s.deltaCenter} />
                  {hasPlan && diff !== 0 && (
                    <i
                      className={`${s.deltaBar} ${diff > 0 ? s.deltaBarPositive : s.deltaBarNegative}`}
                      style={{ left: `${diff > 0 ? 50 : 50 - width}%`, width: `${width}%` }}
                    />
                  )}
                </div>
                <strong className={diff > 0 ? s.deltaPositive : diff < 0 ? s.deltaNegative : ""}>
                  {hasPlan ? signedWon(diff) : "배분 불가"}
                </strong>
                <small>{item.feasible ? "조건 충족" : "조건 미충족"}</small>
              </div>
            );
          })}
        </div>
        <small>수치는 사용자가 입력한 가격 가정에 따른 계산값이며 미래 수익을 보장하지 않습니다.</small>
      </Panel>

      <Panel title="전략별 손익·현금 조건 비교" meta="최고 순수입과 실제 실행 가능한 전략은 다를 수 있습니다">
        <div className={s.scroll}>
          <table>
            <thead>
              <tr>
                <th>출하 전략</th><th>예상 순수입</th><th>당일 순현금</th>
                <th>보관비</th><th>출하비</th><th>조건</th>
              </tr>
            </thead>
            <tbody>
              {scenarios.map((item) => (
                <tr key={item.name}>
                  <td><b>{item.name}</b></td>
                  <td>{item.schedule.length ? won(item.net) : "—"}</td>
                  <td>{item.schedule.length ? won(item.cash_today) : "—"}</td>
                  <td>{won(item.storage)}</td>
                  <td>{won(item.shipping)}</td>
                  <td>{item.feasible ? "충족" : "미충족"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>

      <Panel title="출하 일정 상세 비교" meta="전략을 선택하면 실제 계산된 일차별 출하량이 표시됩니다">
        <div className={s.scenarioChoices} role="group" aria-label="출하 전략 선택">
          {scenarios.map((item) => (
            <button
              key={item.name}
              type="button"
              aria-pressed={selected?.name === item.name}
              className={`${s.scenarioChoice} ${selected?.name === item.name ? s.scenarioChoiceActive : ""}`}
              onClick={() => setSelectedName(item.name)}
            >
              {item.name}
            </button>
          ))}
        </div>
        {selected?.schedule.length ? (
          <>
            <div className={s.scroll}>
              <table>
                <thead><tr><th>출하 일차</th><th>출하 물량</th><th>총 보유량 대비</th></tr></thead>
                <tbody>
                  {selected.schedule.map((batch, i) => (
                    <tr key={`${batch.day}-${i}`}>
                      <td>{batch.day === 0 ? "당일" : `${batch.day}일 후`}</td>
                      <td>{num(batch.kg)}kg</td>
                      <td>{num((batch.kg / result.params.inventory_kg) * 100, 1)}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className={s.detailNote}>
              예상 매출 {won(selected.gross)} − 보관비 {won(selected.storage)} − 출하비 {won(selected.shipping)}
              = <b>순수입 {won(selected.net)}</b>
            </p>
            {!selected.feasible && <Wait error="입력한 당일 현금·보관 기간 제약을 충족하지 못하는 전략입니다." />}
          </>
        ) : (
          <Empty>해당 조건에서는 출하 물량을 배분할 수 없습니다.</Empty>
        )}
      </Panel>

      {!!result.sensitivity?.length && (
        <Panel title="미래 가격 변동 시나리오" meta="출하 일정 고정 · 미래 단가를 변경한 가상 민감도 분석">
          <div className={s.scroll}>
            <table>
              <thead>
                <tr>
                  <th>출하 전략</th>
                  {result.sensitivity.map((item) => (
                    <th key={item.label}>{item.label} · {num(item.price)}원/kg</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {scenarios.filter((item) => item.schedule.length).map((item) => (
                  <tr key={item.name}>
                    <td>{item.name}</td>
                    {result.sensitivity?.map((caseItem) => (
                      <td key={caseItem.label}>{won(caseItem.net[item.name])}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
      )}
      <Link className={s.primary} to={`/reports?run=${encodeURIComponent(id)}`}>
        보고서 센터에서 분석 근거 확인 <ArrowRight size={16} />
      </Link>
    </>
  );
}

/** 분석의 근거와 다운로드를 다루는 문서형 화면입니다. */
function ReportCenter({ result, id, saved }: { result: Report; id: string; saved?: Saved }) {
  const scenario = result.scenarios?.find((item) => item.name === result.recommended);
  const sourceUrl = /^https?:\/\//i.test(result.source.url ?? "") ? result.source.url : null;
  const inputRows = [
    ["보유 물량", `${num(result.params.inventory_kg)}kg`],
    ["현재 단가 가정", `${num(result.params.expected_unit_price_now)}원/kg`],
    ["미래 단가 가정", `${num(result.params.expected_unit_price_future ?? result.params.expected_unit_price_now)}원/kg`],
    ["보관비", `${num(result.params.storage_cost_per_day, 2)}원/kg·일`],
    ["회당 출하비", won(result.params.shipping_cost_per_batch)],
    ["최대 보관기간", `${num(result.params.max_storage_days)}일`],
    ["최소 당일 현금", won(result.params.min_cash_needed)],
    ["전략 선호도", result.params.risk_preference],
  ];
  return (
    <>
      <section className={s.reportCover}>
        <div>
          <small>GYULGUARD · AI AGENT ANALYSIS REPORT</small>
          <h2>감귤 출하 의사결정 분석 보고서</h2>
          <p>분석 시각 {saved ? date(saved.created) : "—"} · 분석 ID {id.slice(0, 8)}</p>
          <p>가정 기반 시뮬레이션 · 실제 미래 가격·수익을 보장하지 않습니다.</p>
        </div>
        <img src="/mascot.svg" alt="귤몽" />
      </section>
      <div className={s.actions}>
        {(["pdf", "csv"] as const).map((format) => (
          <a
            key={format}
            className={s.primary}
            href={`/api/reports/${encodeURIComponent(id)}/download?format=${format}`}
            download
          >
            <Download size={16} /> {format.toUpperCase()} 다운로드
          </a>
        ))}
        <Link className={s.secondaryLink} to={`/scenarios?run=${encodeURIComponent(id)}`}>
          시나리오 상세 비교 <ArrowRight size={15} />
        </Link>
      </div>
      <Panel title="01. 분석 결과 요약" meta={result.basis}>
        <h3 className={s.reportConclusion}>{result.recommended ?? "조건을 만족하는 출하 전략이 없습니다"}</h3>
        <p>{result.explanation}</p>
        <p><b>검토할 대안:</b> {result.alternative ?? "별도 실행 가능 대안 없음"}</p>
      </Panel>
      <div className={s.grid}>
        <Panel title="02. 분석 입력 조건" meta="사용자가 설정한 물량·가격·비용·운영 조건">
          <dl className={s.reportInfoList}>
            {inputRows.map(([label, value]) => (
              <div key={label}><dt>{label}</dt><dd>{value}</dd></div>
            ))}
          </dl>
        </Panel>
        <Panel title="03. 데이터 출처 및 재현 정보" meta="동일 조건의 반복 분석을 위한 식별 정보">
          <dl className={s.reportInfoList}>
            <div><dt>데이터셋</dt><dd>{result.source.title}</dd></div>
            <div><dt>데이터 버전</dt><dd className={s.mono}>{result.version || "—"}</dd></div>
            <div><dt>분석 실행 ID</dt><dd className={s.mono}>{id}</dd></div>
            <div><dt>분석 기준</dt><dd>{result.basis}</dd></div>
          </dl>
          {sourceUrl && <a href={sourceUrl} target="_blank" rel="noopener noreferrer">공식 데이터 출처 확인 ↗</a>}
          <p><Link to="/audit">실제 Tool 호출·검증 로그 확인 →</Link></p>
        </Panel>
      </div>
      <div className={s.grid}>
        <Panel title="04. 권장 출하 계획" meta="선정된 최종 전략의 비용 및 일정만 요약">
          {scenario?.schedule.length ? (
            <>
              <h3 className={s.reportConclusion}>{scenario.name}</h3>
              <div className={s.scroll}>
                <table>
                  <thead><tr><th>출하 시점</th><th>출하 물량</th></tr></thead>
                  <tbody>
                    {scenario.schedule.map((batch, i) => (
                      <tr key={`${batch.day}-${i}`}>
                        <td>{batch.day === 0 ? "당일" : `${batch.day}일 후`}</td>
                        <td>{num(batch.kg)}kg</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p><b>예상 순수입:</b> {won(scenario.net)}</p>
              <p>보관비 {won(scenario.storage)} · 출하비 {won(scenario.shipping)}</p>
              <p><b>당일 순현금:</b> {won(scenario.cash_today)}</p>
            </>
          ) : (
            <Empty>권장할 수 있는 출하 계획이 없습니다. 입력 제약조건을 확인해 주세요.</Empty>
          )}
        </Panel>
        <Panel title="05. 검증 근거 및 한계" meta="데이터 기반 분석과 가격 가정을 구분합니다">
          <p><b>계산 원칙:</b> 예상 매출에서 보관비와 출하비를 차감하고, 최소 현금 및 출하 기한 조건을 검증합니다.</p>
          <p>{result.limits}</p>
          <p>미래 단가는 입력된 가정이며, 실제 시세 예측 또는 자동 출하·판매를 의미하지 않습니다.</p>
        </Panel>
      </div>
      <p className={s.reportFooter}>보고서에는 결과와 근거를, 시나리오 비교 화면에는 대안별 수치와 일정 차이를 제공합니다.</p>
    </>
  );
}

export function Results({ reports = false }: { reports?: boolean }) {
  const list = useData<Saved[]>("/reports");
  const [params, setParams] = useSearchParams();
  const requestedId = params.get("run");
  const id = requestedId || list.data?.[0]?.id;
  const report = useData<Report>(id ? `/reports/${encodeURIComponent(id)}` : null);
  if (!list.data) return <Wait error={list.error} />;
  if (!id) return <Empty>저장된 분석이 없습니다. <Link to="/agent">첫 분석 시작 →</Link></Empty>;
  const saved = list.data.find((item) => item.id === id);
  return (
    <>
      <SavedReportSelector items={list.data} id={id} onChange={(next) => setParams({ run: next })} />
      {report.data ? (
        reports
          ? <ReportCenter result={report.data} id={id} saved={saved} />
          : <ScenarioComparison result={report.data} id={id} />
      ) : (
        <Wait error={report.error} />
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
