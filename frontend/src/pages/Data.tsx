import { useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  Sprout,
  MapPin,
  Leaf,
  Database,
  UploadCloud,
} from "lucide-react";
import type { Dataset, Summary, Run, Row, Saved } from "../types";
import { useData } from "../hooks/useData";
import { api, num, date } from "../api/client";
import { Chart, Panel, Empty, Wait } from "../components/UI";
import s from "../styles/App.module.css";

export function Dashboard({ ds }: { ds: Dataset }) {
  const q = "?dataset_id=" + ds.id,
    summary = useData<Summary>("/analytics/summary" + q),
    year = summary.data?.latest;
  const regions = useData<Row[]>(
    summary.data
      ? "/analytics/regions" + q + (year ? "&year=" + year : "")
      : null,
  );
  const trends = useData<{ production: Row[] }>("/analytics/trends" + q),
    history = useData<Run[]>("/agents/runs"),
    reports = useData<Saved[]>("/reports");
  const stats = summary.data;
  return (
    <>
      <div className={s.hero}>
        <div>
          <span className={s.eyebrow}>
            <i /> 제주 감귤 AI 출하비서
          </span>
          <h1>
            우리 농가의 출하 전략,
            <br />
            귤몽이와 함께 살펴봐요.
          </h1>
          <Link className={s.primary} to="/agent">
            AI 분석 시작 <ArrowRight size={16} />
          </Link>
        </div>
      </div>
      <div className={s.sectionHead}>
        <h2>감귤 생산 현황</h2>
        <span>
          {year && year + "년 기준"} · {ds.name}
        </span>
      </div>
      {stats ? (
        <div className={s.kpis}>
          {[
            [Sprout, "생산량", num(stats.production_t, 2), "톤"],
            [MapPin, "분석 지역", num(stats.regions), "곳"],
            [Leaf, "재배 유형", num(stats.varieties), "종"],
            [Database, "분석 레코드", num(stats.rows), "행"],
          ].map(([Icon, label, value, unit], i) => {
            const I = Icon as typeof Sprout;
            return (
              <div key={i}>
                <span>
                  <I size={17} />
                  {String(label)}
                </span>
                <strong>
                  {String(value)}
                  <small>{String(unit)}</small>
                </strong>
              </div>
            );
          })}
        </div>
      ) : (
        <Wait error={summary.error} />
      )}
      <div className={s.grid}>
        <Panel
          title="지역별 생산량"
          meta={String(year || "전체 기간") + " · 상위 5개 지역 · 톤"}
          to="/analytics"
        >
          {regions.data ? (
            <Chart rows={regions.data.slice(0, 5)} />
          ) : (
            <Wait error={regions.error} />
          )}
        </Panel>
        <Panel
          title="연도별 생산 추이"
          meta={ds.quality.period.join(" — ") + " · 톤"}
          to="/analytics"
        >
          {trends.data ? (
            <Chart rows={trends.data.production} line />
          ) : (
            <Wait error={trends.error} />
          )}
        </Panel>
      </div>
      <div className={s.grid}>
        <Panel title="최근 분석 이력" to="/audit">
          {history.data?.length ? (
            history.data.slice(0, 4).map((r) => (
              <p key={r.id}>
                {date(r.created)} · {num(r.params.inventory_kg)}kg · {r.status}
              </p>
            ))
          ) : history.data ? (
            <Empty>첫 출하 분석을 시작해 보세요.</Empty>
          ) : (
            <Wait error={history.error} />
          )}
        </Panel>
        <Panel title="최근 출하 전략" to="/scenarios">
          {reports.data?.length ? (
            <p>
              {date(reports.data[0].created)} ·{" "}
              {reports.data[0].recommended || "조건 충족안 없음"}
            </p>
          ) : reports.data ? (
            <Empty>분석을 마치면 전략을 확인할 수 있어요.</Empty>
          ) : (
            <Wait error={reports.error} />
          )}
        </Panel>
      </div>
    </>
  );
}

export function Explorer({
  ds,
  onUpload,
}: {
  ds: Dataset;
  onUpload: (id: string) => void;
}) {
  const [message, set] = useState(""),
    [busy, setBusy] = useState(false);
  const detail = useData<{ preview: string }>("/datasets/" + ds.id);
  async function upload(file?: File) {
    if (!file) return;
    if (
      !file.name.toLowerCase().endsWith(".csv") ||
      file.size > 4 * 1024 * 1024
    ) {
      set("4 MiB 이하 CSV를 선택하세요.");
      return;
    }
    setBusy(true);
    set("");
    try {
      const body = new FormData();
      body.append("file", file);
      const item = await api<Dataset>("/datasets/upload", {
        method: "POST",
        body,
      });
      onUpload(item.id);
      set("업로드를 마쳤습니다.");
    } catch (e) {
      set((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  const q = ds.quality,
    rows: Record<string, unknown>[] = detail.data
      ? JSON.parse(detail.data.preview)
      : [];
  return (
    <>
      <Panel title="데이터셋 불러오기" meta="UTF-8 · CP949 / CSV 최대 4 MiB">
        <label className={s.upload}>
          <UploadCloud /> {busy ? "업로드 중…" : "CSV 파일 선택"}
          <input
            aria-label="CSV 파일"
            type="file"
            accept=".csv"
            disabled={busy}
            onChange={(e) => {
              upload(e.target.files?.[0]);
              e.target.value = "";
            }}
          />
        </label>
        <p>
          생산량(톤), 출하량(톤), 당도, 등급 중 한 열을 포함해 주세요.
          지역·연도·품종을 함께 올리면 그룹별 비교가 가능합니다.
        </p>
        {message && <p role="status">{message}</p>}
      </Panel>
      <Panel title={ds.name} meta={ds.source.notes}>
        <p>
          {ds.source.url && <a href={ds.source.url}>공식 원본 확인 ↗</a>} ·{" "}
          {q.encoding} · {num(q.rows)}행 · 중복 {num(q.duplicates)}행 ·{" "}
          {q.period.join("–")}
        </p>
        <p>
          결측 {num(q.columns.reduce((n, c) => n + c.missing, 0))}셀 · 숫자 변환
          오류 {num(Object.values(q.invalid).reduce((a, b) => a + b, 0))}셀
        </p>
        <div className={s.scroll}>
          <table>
            <thead>
              <tr>
                <th>열 이름</th>
                <th>자료형</th>
                <th>결측</th>
              </tr>
            </thead>
            <tbody>
              {q.columns.map((c) => (
                <tr key={c.name}>
                  <td>{c.name}</td>
                  <td>{c.dtype}</td>
                  <td>{c.missing}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
      <Panel title="데이터 미리보기" meta="원본 순서 · 최대 12행">
        {detail.data ? (
          <div className={s.scroll}>
            <table>
              <thead>
                <tr>
                  {q.columns.map((c) => (
                    <th key={c.name}>{c.name}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={i}>
                    {q.columns.map((c) => (
                      <td key={c.name}>{String(r[c.name] ?? "—")}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <Wait error={detail.error} />
        )}
      </Panel>
    </>
  );
}

export function Analytics({ ds }: { ds: Dataset }) {
  const [year, setYear] = useState(""),
    [region, setRegion] = useState(""),
    [variety, setVariety] = useState("");
  const params = new URLSearchParams({ dataset_id: ds.id });
  const info = useData<Summary>("/analytics/summary?" + params);
  if (year) params.set("year", year);
  if (region) params.set("region", region);
  if (variety) params.set("variety", variety);
  const regions = useData<Row[]>("/analytics/regions?" + params),
    trends = useData<{ production: Row[]; shipment: Row[]; varieties: Row[] }>(
      "/analytics/trends?" + params,
    );
  const qual = useData<{
    brix: { mean: number; count: number } | null;
    grades: Record<string, number>;
  }>("/analytics/quality?" + params);
  return (
    <>
      <div className={s.filters}>
        {[
          ["연도", year, setYear, info.data?.years],
          ["지역", region, setRegion, info.data?.region_names],
          ["재배 유형", variety, setVariety, info.data?.variety_names],
        ].map(([label, value, setter, options]) => (
          <label key={String(label)}>
            {String(label)}
            <select
              value={String(value)}
              onChange={(e) => (setter as (v: string) => void)(e.target.value)}
            >
              <option value="">전체</option>
              {((options || []) as (string | number)[]).map((v) => (
                <option key={v}>{v}</option>
              ))}
            </select>
          </label>
        ))}
      </div>
      {info.error && <Wait error={info.error} />}
      <div className={s.grid}>
        <Panel title="지역별 생산량" meta="선택한 기간 합계 · 상위 10개 지역">
          {regions.data ? (
            <Chart rows={regions.data.slice(0, 10)} />
          ) : (
            <Wait error={regions.error} />
          )}
        </Panel>
        <Panel title="기간별 생산량" meta="연간 합계 · 톤">
          {trends.data ? (
            <Chart rows={trends.data.production} line />
          ) : (
            <Wait error={trends.error} />
          )}
        </Panel>
        <Panel title="재배 유형별 생산량">
          {trends.data && <Chart rows={trends.data.varieties} />}
        </Panel>
        <Panel title="출하량과 품질">
          {trends.data?.shipment.length ? (
            <Chart rows={trends.data.shipment} line />
          ) : (
            <p>선택 범위에 출하량 관측값이 없습니다.</p>
          )}
          {qual.data ? (
            <>
              <p>
                {qual.data.brix
                  ? "평균 당도 " + num(qual.data.brix.mean, 2) + " °Bx"
                  : "당도 관측값이 없습니다."}
              </p>
              <p>
                {Object.entries(qual.data.grades)
                  .map(([k, v]) => k + " " + v + "건")
                  .join(" · ") || "등급 관측값이 없습니다."}
              </p>
            </>
          ) : (
            <Wait error={qual.error} />
          )}
        </Panel>
      </div>
      <p className={s.notice}>{ds.source.notes}</p>
    </>
  );
}
