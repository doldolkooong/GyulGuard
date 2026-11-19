import pandas as pd


def inspect_dataset(quality: dict) -> dict:
    return quality


def grouped(frame: pd.DataFrame, key: str, metric: str, method: str = "sum") -> list[dict]:
    """존재하는 컬럼만 집계하며 당도는 합계가 아닌 평균을 사용합니다."""
    if key not in frame or metric not in frame:
        return []
    valid = frame[[key, metric]].dropna()
    if valid.empty:
        return []
    series = valid.groupby(key)[metric]
    values = series.mean() if method == "mean" else series.sum()
    values = values.sort_index()
    return [
        {"label": str(int(k)) if key == "year" else str(k), "value": round(float(v), 2)}
        for k, v in values.items()
    ]


def _total(frame: pd.DataFrame, column: str) -> float | None:
    if column not in frame or not frame[column].notna().any():
        return None
    return round(float(frame[column].sum()), 2)


def _names(frame: pd.DataFrame, column: str) -> list[str]:
    if column not in frame:
        return []
    return sorted(frame[column].dropna().astype(str).unique().tolist())


def summarize_citrus_data(frame: pd.DataFrame) -> dict:
    years = frame["year"].dropna() if "year" in frame else []
    latest = int(max(years)) if len(years) else None
    current = frame[frame.year == latest] if latest is not None else frame
    brix = current["brix"].dropna() if "brix" in current else []
    return {
        "rows": len(frame),
        "latest": latest,
        "production_t": _total(current, "production_t"),
        "shipment_t": _total(current, "shipment_t"),
        "avg_brix": round(float(brix.mean()), 2) if len(brix) else None,
        "min_brix": round(float(brix.min()), 2) if len(brix) else None,
        "max_brix": round(float(brix.max()), 2) if len(brix) else None,
        "regions": len(_names(frame, "region")),
        "varieties": len(_names(frame, "variety")),
        "ports": len(_names(frame, "port")),
        "dates": len(_names(frame, "date")),
        "weeks": len(_names(frame, "week")),
        "years": sorted(set(map(int, years))),
        "region_names": _names(frame, "region"),
        "variety_names": _names(frame, "variety"),
        "port_names": _names(frame, "port"),
        "week_names": _names(frame, "week"),
    }


def analyze_production_by_region(frame: pd.DataFrame) -> list[dict]:
    """기존 /analytics/regions 경로를 유지하면서 데이터별 올바른 집계를 반환합니다."""
    if "production_t" in frame:
        return sorted(grouped(frame, "region", "production_t"), key=lambda row: -row["value"])
    if "shipment_t" in frame:
        return sorted(grouped(frame, "port", "shipment_t"), key=lambda row: -row["value"])
    if "brix" in frame:
        return sorted(grouped(frame, "region", "brix", method="mean"), key=lambda row: -row["value"])
    return []


def _shipment_share(frame: pd.DataFrame) -> list[dict]:
    ports = grouped(frame, "port", "shipment_t")
    total = sum(row["value"] for row in ports)
    if total <= 0:
        return []
    return [{"label": row["label"], "value": round(row["value"] / total * 100, 2)} for row in ports]


def _shipment_by_port_date(frame: pd.DataFrame) -> list[dict]:
    if not {"date", "port", "shipment_t"}.issubset(frame.columns):
        return []
    data = frame[["date", "port", "shipment_t"]].dropna().copy()
    if data.empty:
        return []
    data["date_port"] = data["date"].astype(str) + " / " + data["port"].astype(str)
    return grouped(data, "date_port", "shipment_t")


def _brix_distribution(frame: pd.DataFrame) -> list[dict]:
    if "brix" not in frame:
        return []
    values = pd.to_numeric(frame["brix"], errors="coerce").dropna()
    values = values[values >= 0]
    if values.empty:
        return []
    # 0.5 °Bx 구간에 실제 관측 건수만 집계합니다.
    bins = (values * 2).floordiv(1).div(2)
    counts = bins.value_counts().sort_index()
    return [
        {"label": f"{float(start):.1f}~{float(start) + 0.5:.1f}", "value": int(count)}
        for start, count in counts.items()
    ]


def analyze_shipment_trends(frame: pd.DataFrame) -> dict:
    return {
        "production": grouped(frame, "year", "production_t"),
        "shipment": grouped(frame, "date" if "date" in frame else "year", "shipment_t"),
        "varieties": grouped(frame, "variety", "production_t"),
        "area_region": grouped(frame, "region", "area_ha"),
        "shipment_share": _shipment_share(frame),
        "shipment_by_port_date": _shipment_by_port_date(frame),
        "brix_week": grouped(frame, "week", "brix", method="mean"),
        "brix_city": grouped(frame, "city", "brix", method="mean"),
        "brix_distribution": _brix_distribution(frame),
    }


def analyze_quality_metrics(frame: pd.DataFrame) -> dict:
    data = frame["brix"].dropna() if "brix" in frame else []
    return {
        "brix": {
            "mean": round(float(data.mean()), 2),
            "min": round(float(min(data)), 2),
            "max": round(float(max(data)), 2),
            "count": len(data),
        }
        if len(data)
        else None,
        "grades": frame.grade.value_counts().to_dict() if "grade" in frame else {},
    }
