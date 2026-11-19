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
import type { Dataset, Summary, Run, Row, Saved, Trends, QualityStats } from "../types";
import { useData } from "../hooks/useData";
import { api, num, date } from "../api/client";
import { Chart, ShareDonut, Panel, Empty, Wait } from "../components/UI";
import s from "../styles/App.module.css";

export type DataKind = "production" | "shipment" | "quality" | "other";

export function getDataKind(ds: Dataset): DataKind {
  const metrics = ds.quality?.metrics ?? [];
  if (metrics.includes("production_t")) return "production";
  if (metrics.includes("shipment_t")) return "shipment";
  if (metrics.includes("brix")) return "quality";
  return "other";
}

export function Dashboard({ ds }: { ds: Dataset }) {
  const kind = getDataKind(ds);
  const q = "?dataset_id=" + encodeURIComponent(ds.id);
  const summary = useData<Summary>("/analytics/summary" + q);
  const year = summary.data?.latest;
  const filtered = q + (year !== null && year !== undefined ? "&year=" + year : "");
  const regions = useData<Row[]>("/analytics/regions" + filtered);
  const trends = useData<Trends>("/analytics/trends" + q);
  const history = useData<Run[]>("/agents/runs");
  const reports = useData<Saved[]>("/reports");
  const stats = summary.data;

  const kpis = stats
    ? kind === "production"
      ? [
          [Sprout, "생산량", num(stats.production_t, 2), "톤"],
          [MapPin, "분석 지역", num(stats.regions), "곳"],
          [Leaf, "재배 유형", num(stats.varieties), "종"],
          [Database, "분석 레코드", num(stats.rows), "행"],
        ]
      : kind === "shipment"
        ? [
            [Sprout, "총 출하량", num(stats.shipment_t, 2), "톤"],
            [MapPin, "신고소", num(stats.ports), "곳"],
            [Leaf, "집계 날짜", num(stats.dates), "일"],
            [Database, "출하 기록", num(stats.rows), "행"],
          ]
        : kind === "quality"
          ? [
              [Sprout, "평균 당도", num(stats.avg_brix, 2), "°Bx"],
              [MapPin, "측정 지역", num(stats.regions), "곳"],
              [Leaf, "최고 당도", num(stats.max_brix, 2), "°Bx"],
              [Database, "측정 레코드", num(stats.rows), "행"],
            ]
          : [[Database, "분석 레코드", num(stats.rows), "행"]]
    : [];
  const heading = kind === "production" ? "감귤 생산 현황" : kind === "shipment" ? "감귤 출하 현황" : kind === "quality" ? "감귤 당도 현황" : "데이터 분석 현황";
  const chart1 = kind === "production" ? "지역별 생산량" : kind === "shipment" ? "신고소별 출하량" : kind === "quality" ? "지역별 평균 당도" : "지역별 통계";
  const chart2 = kind === "production" ? "연도별 생산 추이" : kind === "shipment" ? "일자별 출하량" : kind === "quality" ? "주차별 평균 당도" : "기간별 통계";
  const unit = kind === "quality" ? "°Bx" : "톤";
  const values = kind === "production" ? trends.data?.production : kind === "shipment" ? trends.data?.shipment : kind === "quality" ? trends.data?.brix_week : [];

  return (
    <>
      <div className={s.hero}>
        <div>
          <span className={s.eyebrow}><i /> 제주 감귤 AI 출하비서</span>
          <h1>우리 농가의 출하 전략,<br />귤몽이와 함께 살펴봐요.</h1>
          <Link className={s.primary} to="/agent">AI 분석 시작 <ArrowRight size={16} /></Link>
        </div>
      </div>
      <div className={s.sectionHead}>
        <h2>{heading}</h2>
        <span>{year !== null && year !== undefined ? `${year}년 기준` : "전체 기간"} · {ds.name}</span>
      </div>
      {stats ? (
        <div className={s.kpis}>
          {kpis.map(([Icon, label, value, suffix], i) => {
            const I = Icon as typeof Sprout;
            return <div key={i}>
              <span><I size={17} />{String(label)}</span>
              <strong>{String(value)}<small>{String(suffix)}</small></strong>
            </div>;
          })}
        </div>
      ) : <Wait error={summary.error} />}
      {kind !== "other" && (
        <div className={s.grid}>
          <Panel title={chart1} meta={kind === "quality" ? "지역별 평균 · °Bx" : kind === "shipment" ? "신고소별 합계 · 톤" : "상위 5개 지역 · 톤"} to="/analytics">
            {regions.data ? <Chart rows={regions.data.slice(0, kind === "production" ? 5 : 10)} unit={unit} /> : <Wait error={regions.error} />}
          </Panel>
          <Panel title={chart2} meta={kind === "quality" ? "주차별 평균 · °Bx" : kind === "shipment" ? "날짜별 합계 · 톤" : `${ds.quality.period.join("–")} · 톤`} to="/analytics">
            {values ? <Chart rows={values} line unit={unit} /> : <Wait error={trends.error} />}
          </Panel>
        </div>
      )}
      <p className={s.notice}>{ds.source.notes} · 선택한 데이터의 실제 컬럼에 맞는 지표만 표시합니다.</p>
      <div className={s.grid}>
        <Panel title="최근 분석 이력" to="/audit">
          {history.data?.length ? history.data.slice(0, 4).map(r =>
            <p key={r.id}>{date(r.created)} · {num(r.params.inventory_kg)}kg · {r.status}</p>
          ) : history.data ? <Empty>첫 출하 분석을 시작해 보세요.</Empty> : <Wait error={history.error} />}
        </Panel>
        <Panel title="최근 출하 전략" to="/scenarios">
          {reports.data?.length ? <p>{date(reports.data[0].created)} · {reports.data[0].recommended || "조건 충족안 없음"}</p>
          : reports.data ? <Empty>분석을 마치면 전략을 확인할 수 있어요.</Empty> : <Wait error={reports.error} />}
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
  const kind = getDataKind(ds);
  const [year, setYear] = useState("");
  const [region, setRegion] = useState("");
  const [variety, setVariety] = useState("");
  const [port, setPort] = useState("");
  const [week, setWeek] = useState("");

  const params = new URLSearchParams({ dataset_id: ds.id });
  const info = useData<Summary>("/analytics/summary?" + params);
  if (year) params.set("year", year);
  if (region) params.set("region", region);
  if (variety) params.set("variety", variety);
  if (port) params.set("port", port);
  if (week) params.set("week", week);
  const query = "?" + params.toString();
  const regions = useData<Row[]>("/analytics/regions" + query);
  const trends = useData<Trends>("/analytics/trends" + query);
  const quality = useData<QualityStats>(kind === "quality" ? "/analytics/quality" + query : null);
  const charts = trends.data;
  // 구버전 API에서는 확장 차트 배열이 없을 수 있습니다.
  const missingCharts =
    (kind === "shipment" && charts && !Array.isArray(charts.shipment_share)) ||
    (kind === "quality" && charts && !Array.isArray(charts.brix_distribution));

  const filterOptions: [string, string, (v: string) => void, (string | number)[] | undefined][] = [];
  if ((info.data?.years?.length ?? 0) > 1) {
    filterOptions.push(["연도", year, setYear, info.data?.years]);
  }
  if (kind === "production") {
    filterOptions.push(["지역", region, setRegion, info.data?.region_names]);
    filterOptions.push(["재배 유형", variety, setVariety, info.data?.variety_names]);
  } else if (kind === "shipment") {
    filterOptions.push(["신고소", port, setPort, info.data?.port_names]);
  } else if (kind === "quality") {
    filterOptions.push(["지역", region, setRegion, info.data?.region_names]);
    filterOptions.push(["측정 주차", week, setWeek, info.data?.week_names]);
  }

  const unit = kind === "quality" ? "°Bx" : "톤";
  const primary = kind === "production" ? "지역별 생산량" : kind === "shipment" ? "신고소별 출하량" : "지역별 평균 당도";
  const secondary = kind === "production" ? "연도별 생산 추이" : kind === "shipment" ? "일자별 출하량" : "주차별 평균 당도";
  const times = kind === "production" ? charts?.production : kind === "shipment" ? charts?.shipment : charts?.brix_week;

  return (
    <>
      <div className={s.filters}>
        {filterOptions.map(([label, value, setter, options]) => (
          <label key={label}>{label}
            <select aria-label={label} value={value} onChange={e => setter(e.target.value)}>
              <option value="">전체</option>
              {(options || []).map(v => <option key={String(v)} value={String(v)}>{String(v)}</option>)}
            </select>
          </label>
        ))}
      </div>
      {info.error && <Wait error={info.error} />}
      {missingCharts && (
        <p role="alert" className={s.notice}>
          백엔드가 이전 버전의 통계 응답을 반환하고 있습니다. 서버를 종료한 뒤
          다시 실행해 주세요. 일부 추가 차트는 서버 재시작 전까지 표시되지 않습니다.
        </p>
      )}
      {kind === "other" ? (
        <Panel title="분석 가능한 수치 컬럼이 없습니다">
          <Empty>데이터 탐색기에서 생산량, 출하량 또는 당도 컬럼을 확인하세요.</Empty>
        </Panel>
      ) : (
        <div className={s.grid}>
          <Panel title={primary} meta={kind === "quality" ? "지역별 평균 · °Bx" : "선택 범위 합계 · 톤"}>
            {regions.data ? <Chart rows={regions.data.slice(0, 10)} unit={unit} /> : <Wait error={regions.error} />}
          </Panel>
          <Panel title={secondary} meta={kind === "production" ? "연도별 합계 · 톤" : kind === "shipment" ? "날짜별 합계 · 톤" : "주차별 평균 · °Bx"}>
            {times ? <Chart rows={times} unit={unit} line={times.length > 1} /> : <Wait error={trends.error} />}
          </Panel>
          {kind === "production" && (
            <>
              <Panel title="재배 유형별 생산량" meta="선택 범위 합계 · 톤">
                {charts ? <Chart rows={charts.varieties} unit="톤" /> : <Wait error={trends.error} />}
              </Panel>
              <Panel title="지역별 재배면적" meta="선택 범위 합계 · ha">
                {charts ? <Chart rows={charts.area_region.slice(0, 10)} unit="ha" /> : <Wait error={trends.error} />}
              </Panel>
            </>
          )}
          {kind === "shipment" && (
            <>
              <Panel title="신고소별 출하 비중" meta="전체 출하량 중 비율 · %">
                {charts ? <ShareDonut rows={charts.shipment_share} /> : <Wait error={trends.error} />}
              </Panel>
              <Panel title="일자·신고소별 출하 비교" meta="관측된 날짜와 신고소별 합계 · 톤">
                {charts ? <Chart rows={charts.shipment_by_port_date} unit="톤" labelWidth={150} /> : <Wait error={trends.error} />}
              </Panel>
            </>
          )}
          {kind === "quality" && (
            <>
              <Panel title="당도 구간별 관측 건수" meta="0.5°Bx 구간 · 관측 건수">
                {charts ? <Chart rows={charts.brix_distribution} unit="건" /> : <Wait error={trends.error} />}
              </Panel>
              <Panel title="행정시별 평균 당도" meta="제주시 / 서귀포시 · °Bx">
                {charts ? <Chart rows={charts.brix_city} unit="°Bx" /> : <Wait error={trends.error} />}
                {quality.data?.brix && (
                  <p className={s.notice}>
                    전체 평균 {num(quality.data.brix.mean, 2)}°Bx · 최저 {num(quality.data.brix.min, 2)}°Bx · 최고 {num(quality.data.brix.max, 2)}°Bx · {num(quality.data.brix.count)}건
                  </p>
                )}
              </Panel>
            </>
          )}
        </div>
      )}
      {kind === "shipment" && <p className={s.notice}>2022년 11월 25~26일 4건의 기록으로, 장기 출하 추세로 일반화할 수 없습니다.</p>}
      <p className={s.notice}>{ds.source.notes}</p>
    </>
  );
}
