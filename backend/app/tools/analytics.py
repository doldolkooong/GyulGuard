import pandas as pd


def inspect_dataset(quality: dict) -> dict:
    return quality


def grouped(frame: pd.DataFrame, key: str, metric: str) -> list:
    if key not in frame or metric not in frame:
        return []
    valid = frame[[key, metric]].dropna()
    values = valid.groupby(key)[metric].sum().sort_index()
    return [
        {"label": str(int(k)) if key == "year" else str(k), "value": round(float(v), 2)}
        for k, v in values.items()
    ]


def summarize_citrus_data(frame: pd.DataFrame) -> dict:
    years = frame["year"].dropna() if "year" in frame else []
    latest = int(max(years)) if len(years) else None
    current = frame[frame.year == latest] if latest else frame
    return {
        "rows": len(frame),
        "latest": latest,
        "production_t": float(current.production_t.sum(min_count=1))
        if "production_t" in current and current.production_t.notna().any()
        else None,
        "regions": int(frame.region.nunique()) if "region" in frame else 0,
        "varieties": int(frame.variety.nunique()) if "variety" in frame else 0,
        "years": sorted(set(map(int, years))),
        "region_names": sorted(frame.region.dropna().unique().tolist()) if "region" in frame else [],
        "variety_names": sorted(frame.variety.dropna().unique().tolist()) if "variety" in frame else [],
    }


def analyze_production_by_region(frame: pd.DataFrame) -> list:
    return sorted(grouped(frame, "region", "production_t"), key=lambda row: -row["value"])


def analyze_shipment_trends(frame: pd.DataFrame) -> dict:
    return {
        "production": grouped(frame, "year", "production_t"),
        "shipment": grouped(frame, "date" if "date" in frame else "year", "shipment_t"),
        "varieties": grouped(frame, "variety", "production_t"),
    }


def analyze_quality_metrics(frame: pd.DataFrame) -> dict:
    data = frame.brix.dropna() if "brix" in frame else []
    return {
        "brix": {
            "mean": round(float(data.mean()), 2),
            "min": float(min(data)),
            "max": float(max(data)),
            "count": len(data),
        }
        if len(data)
        else None,
        "grades": frame.grade.value_counts().to_dict() if "grade" in frame else {},
    }
