import { useId, type ReactNode } from "react";
import { ArrowRight, Inbox } from "lucide-react";
import { Link } from "react-router-dom";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  BarChart,
  Bar,
  Cell,
  PieChart,
  Pie,
  Legend,
} from "recharts";
import type { Row } from "../types";
import { num } from "../api/client";
import s from "../styles/App.module.css";

// 구버전 API가 정의되지 않은 배열을 반환해도 화면 전체가 중단되지 않게 합니다.
function validRows(rows: Row[] | null | undefined): Row[] {
  if (!Array.isArray(rows)) return [];
  return rows.filter(
    (row) => row != null && typeof row.label === "string" &&
      typeof row.value === "number" && Number.isFinite(row.value),
  );
}
export function Empty({ children }: { children: ReactNode }) {
  return (
    <div className={s.empty}>
      <img src="/mascot.svg" alt="" />
      <span>{children}</span>
    </div>
  );
}
export function Wait({ error }: { error?: string }) {
  return (
    <p role={error ? "alert" : "status"} className={s.notice}>
      {error || "귤몽이 데이터를 살펴보고 있어요…"}
    </p>
  );
}
export function Panel({
  title,
  meta,
  children,
  to,
}: {
  title: string;
  meta?: string;
  children: ReactNode;
  to?: string;
}) {
  return (
    <section className={s.panel}>
      <header>
        <div>
          <h2>{title}</h2>
          {meta && <small>{meta}</small>}
        </div>
        {to && (
          <Link aria-label={title + " 자세히 보기"} to={to}>
            <ArrowRight size={18} />
          </Link>
        )}
      </header>
      {children}
    </section>
  );
}
export function Chart({
  rows,
  line = false,
  unit = "톤",
  labelWidth = 86,
}: {
  rows?: Row[] | null;
  line?: boolean;
  unit?: string;
  labelWidth?: number;
}) {
  const id = useId().replaceAll(":", "");
  const safeRows = validRows(rows);
  if (!safeRows.length)
    return (
      <div className={s.empty}>
        <Inbox />
        집계 가능한 값이 없습니다.
      </div>
    );
  const axis = { fontSize: 11, fill: "#776e61" },
    tip = (v: number) => [num(v, 2) + " " + unit, "집계값"];
  return (
    <div className={s.chart}>
      <ResponsiveContainer width="100%" height="100%">
        {line ? (
          <AreaChart
            data={safeRows}
            margin={{ left: 4, right: 15, top: 12, bottom: 0 }}
          >
            <defs>
              <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#ffac47" stopOpacity={0.48} />
                <stop offset="100%" stopColor="#ffac47" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} strokeDasharray="3 5" />
            <XAxis dataKey="label" tick={axis} />
            <YAxis width={56} tick={axis} tickFormatter={(v) => num(v)} />
            <Tooltip formatter={tip} />
            <Area
              dataKey="value"
              stroke="#e88722"
              strokeWidth={3}
              fill={"url(#" + id + ")"}
            />
          </AreaChart>
        ) : (
          <BarChart
            data={safeRows}
            layout="vertical"
            margin={{ left: 6, right: 24, top: 2, bottom: 0 }}
          >
            <XAxis type="number" tick={axis} tickFormatter={(v) => num(v)} />
            <YAxis
              type="category"
              dataKey="label"
              width={labelWidth}
              tick={axis}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip formatter={tip} />
            <Bar dataKey="value" radius={[0, 5, 5, 0]} maxBarSize={21}>
              {safeRows.map((r, i) => (
                <Cell key={r.label} fill={i === 0 ? "#ed8724" : "#e8b978"} />
              ))}
            </Bar>
          </BarChart>
        )}
      </ResponsiveContainer>
    </div>
  );
}


/** 실제 집계 비율을 사용합니다. 수치가 없는 항목은 표시하지 않습니다. */
export function ShareDonut({ rows }: { rows?: Row[] | null }) {
  const valid = validRows(rows).filter((r) => r.value > 0);
  if (!valid.length) return <Empty>비중을 계산할 출하량이 없습니다.</Empty>;
  return (
    <div className={s.chart}>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={valid}
            dataKey="value"
            nameKey="label"
            cx="50%"
            cy="45%"
            innerRadius={54}
            outerRadius={86}
            paddingAngle={2}
          >
            {valid.map((r, i) => (
              <Cell key={r.label} fill={i === 0 ? "#f18d29" : "#398657"} />
            ))}
          </Pie>
          <Tooltip formatter={(value) => `${num(Number(value), 2)}%`} />
          <Legend verticalAlign="bottom" />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
