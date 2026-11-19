import { Component, useState, type ReactNode, type ErrorInfo } from "react";
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
// 분석 화면 오류가 다른 메뉴까지 종료시키지 않도록 격리합니다.
class AnalyticsErrorBoundary extends Component<
  { children: ReactNode },
  { hasError: boolean; message: string }
> {
  state = { hasError: false, message: "" };

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, message: error.message };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[GyulGuard Analytics]", error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <section role="alert" style={{ padding: 24, border: "1px solid #e6d8c5", borderRadius: 16, background: "#fffdf8" }}>
          <h2>분석 화면을 표시하지 못했습니다.</h2>
          <p style={{ marginTop: 10 }}>다른 메뉴는 정상적으로 사용할 수 있습니다. 서버 응답과 브라우저 콘솔을 확인해 주세요.</p>
          <p style={{ marginTop: 10, fontSize: 13, color: "#766655" }}>오류: {this.state.message}</p>
          <button style={{ marginTop: 14, padding: "8px 16px" }} onClick={() => this.setState({ hasError: false, message: "" })}>
            다시 시도
          </button>
        </section>
      );
    }
    return this.props.children;
  }
}

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
    [selected, select] = useState(""),
    [open, toggle] = useState(false);
  const list = useData<Dataset[]>("/datasets", revision),
    ds = list.data?.find((d) => d.id === selected) ||
    list.data?.find((d) => d.name === "서귀포시 감귤 생산 정보") ||
    list.data?.[0];
  const loc = useLocation(),
    title = nav.find(([path]) => path === loc.pathname)?.[1] || "대시보드";
  function choose(id: string) {
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
                element={<AnalyticsErrorBoundary key={ds.id}><Analytics ds={ds} /></AnalyticsErrorBoundary>}
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
