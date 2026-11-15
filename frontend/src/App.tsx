import { useState } from "react";
import {
  NavLink,
  Routes,
  Route,
  useLocation,
  Navigate,
} from "react-router-dom";
import {
  LayoutDashboard,
  Database,
  ChartNoAxesCombined,
  Workflow,
  Layers3,
  Files,
  ScrollText,
  Menu,
  X,
  Leaf,
} from "lucide-react";
import { useData } from "./hooks/useData";
import type { Dataset } from "./types";
import { Dashboard, Explorer, Analytics } from "./pages/Data";
import { Agent, Results, Audit } from "./pages/Strategy";
import { Wait } from "./components/UI";
import s from "./styles/App.module.css";
const nav = [
  ["/", "대시보드", LayoutDashboard],
  ["/data", "데이터 탐색기", Database],
  ["/analytics", "감귤 현황 분석", ChartNoAxesCombined],
  ["/agent", "Agent 실행 센터", Workflow],
  ["/scenarios", "시나리오 비교", Layers3],
  ["/reports", "보고서 센터", Files],
  ["/audit", "시스템 로그", ScrollText],
] as const;
export default function App() {
  const [revision, refresh] = useState(0),
    [selected, select] = useState(localStorage.getItem("gyul-dataset") || ""),
    [open, toggle] = useState(false);
  const list = useData<Dataset[]>("/datasets", revision),
    ds = list.data?.find((d) => d.id === selected) || list.data?.[0];
  const loc = useLocation(),
    title = nav.find(([path]) => path === loc.pathname)?.[1] || "대시보드";
  function choose(id: string) {
    localStorage.setItem("gyul-dataset", id);
    select(id);
  }
  return (
    <div className={s.shell}>
      <aside className={open ? s.open : ""}>
        <NavLink to="/" className={s.brand}>
          <img src="/mascot.svg" alt="" />
          <b>
            귤지킴이<small>GYULGUARD</small>
          </b>
        </NavLink>
        <nav>
          {nav.map(([path, label, Icon]) => (
            <NavLink
              onClick={() => toggle(false)}
              key={path}
              end
              to={path}
              className={({ isActive }) => (isActive ? s.active : "")}
            >
              <Icon size={19} />
              {label}
            </NavLink>
          ))}
        </nav>
        <footer>
          <Leaf size={16} /> 제주 감귤 농가의 분석 비서
        </footer>
      </aside>
      <main>
        <div className={s.top}>
          <button aria-label="메뉴 열기 닫기" onClick={() => toggle(!open)}>
            {open ? <X /> : <Menu />}
          </button>
          <b>{title}</b>
          <span>
            <i /> {list.error ? "연결 오류" : ds ? "데이터 연결됨" : "연결 중"}
          </span>
        </div>
        <article>
          {loc.pathname !== "/" && <h1>{title}</h1>}
          {list.data && (
            <label className={s.dataset}>
              분석 데이터
              <select value={ds?.id} onChange={(e) => choose(e.target.value)}>
                {list.data.map((d) => (
                  <option value={d.id} key={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </label>
          )}
          {ds ? (
            <Routes>
              <Route path="/" element={<Dashboard ds={ds} />} />
              <Route
                path="/data"
                element={
                  <Explorer
                    ds={ds}
                    onUpload={(id) => {
                      choose(id);
                      refresh((n) => n + 1);
                    }}
                  />
                }
              />
              <Route
                path="/analytics"
                element={<Analytics key={ds.id} ds={ds} />}
              />
              <Route path="/agent" element={<Agent ds={ds} />} />
              <Route path="/scenarios" element={<Results />} />
              <Route path="/reports" element={<Results reports />} />
              <Route path="/audit" element={<Audit />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          ) : (
            <>
              <Wait error={list.error} />
              {list.error && (
                <button onClick={() => refresh((n) => n + 1)}>다시 연결</button>
              )}
            </>
          )}
        </article>
      </main>
    </div>
  );
}
