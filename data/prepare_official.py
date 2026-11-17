"""보존한 서귀포시 원본 CSV를 표준 행 구조로 변환한다."""

import csv
import hashlib
import json
from collections import Counter, defaultdict
from decimal import Decimal
from pathlib import Path

ROOT = Path(__file__).resolve().parent
RAW = ROOT / "raw" / "seogwipo-citrus-20240513.csv"
HUB = ROOT / "raw" / "jejudatahub-1313-20230410.csv"
PROCESSED = ROOT / "processed"
METRICS = {"생산량": "production_t", "면적": "area_ha", "농가수": "farm_count"}
FIELDS = ["year", "region", "variety", *METRICS.values()]


def merge_hub_values(rows: list[dict[str, str]], varieties: list[str]) -> dict:
    digest = hashlib.sha256(HUB.read_bytes()).hexdigest()
    if digest != "f683c4a6be7bc81a8a39df1d855cce5e2729580f03cf62ce8dab9c1018be4ee9":
        raise ValueError("허브 원본 해시가 다릅니다.")
    def key(row: dict[str, str]) -> tuple[str, str, str]:
        return row["연도"], row["읍면동"].strip(), row["구분"]
    update_rows = {key(r): r for r in rows}
    with HUB.open(encoding="cp949", newline="") as source:
        hub_rows = list(csv.DictReader(source))
    counts = Counter()
    for row in hub_rows:
        newer = update_rows[key(row)]
        for variety in varieties:
            if row[variety].strip():
                if Decimal(row[variety]) != Decimal(newer[variety]):
                    raise ValueError(f"배포판 간 수치 불일치: {key(row)} {variety}")
                newer[variety] = row[variety]
                counts["values_used_from_hub"] += 1
            else:
                counts["blank_cells_completed_from_update"] += 1
    return {"raw_sha256": digest, "rows": len(hub_rows), **counts}


def prepare() -> None:
    digest = hashlib.sha256(RAW.read_bytes()).hexdigest()
    if digest != "ece387b07f25282dc30c553e0177c5792d5cb46c9d3d58e29e234e126b46059e":
        raise ValueError("원본 해시가 배포본과 다릅니다.")
    with RAW.open(encoding="cp949", newline="") as source:
        reader = csv.DictReader(source)
        assert reader.fieldnames
        columns = reader.fieldnames
        rows = list(reader)
    hub_quality = merge_hub_values(rows, columns[3:-1])
    records = defaultdict(dict)
    for row in rows:
        metric = METRICS[row["구분"]]
        for variety in columns[3:-1]:
            key = (int(row["연도"]), row["읍면동"].strip(), variety)
            if metric in records[key]:
                raise ValueError(f"중복 키 {key}: {metric}")
            value = Decimal(row[variety])
            if not value.is_finite() or value < 0:
                raise ValueError(f"잘못된 값 {key}: {value}")
            records[key][metric] = value
    PROCESSED.mkdir(exist_ok=True)
    annual = Counter()
    csv_path = PROCESSED / "official.csv"
    with csv_path.open("w", encoding="utf-8", newline="") as output:
        writer = csv.DictWriter(output, fieldnames=FIELDS, lineterminator="\n")
        writer.writeheader()
        for (year, region, variety), metrics in sorted(records.items()):
            if set(metrics) != set(METRICS.values()):
                raise ValueError(f"통계 누락 {year} {region} {variety}")
            writer.writerow(dict(year=year, region=region, variety=variety, **metrics))
            annual[year] += metrics["production_t"]
    quality = {
        "jejudatahub_original": hub_quality,
        "raw_sha256": digest,
        "processed_sha256": hashlib.sha256(csv_path.read_bytes()).hexdigest(),
        "raw_rows": len(rows),
        "raw_columns": columns,
        "missing_by_raw_column": {c: sum(not r[c].strip() for r in rows) for c in columns},
        "raw_duplicate_rows": len(rows) - len({tuple(r.values()) for r in rows}),
        "trimmed_region_rows": sum(r["읍면동"].strip() != r["읍면동"] for r in rows),
        "fractional_farm_count": sum(bool(m["farm_count"] % 1) for m in records.values()),
        "reference_dates": sorted({r["데이터기준일"] for r in rows}),
        "normalized_rows": len(records),
        "normalized_columns": FIELDS,
        "regions": sorted({r["읍면동"].strip() for r in rows}),
        "production_t_by_year": {year: str(total) for year, total in sorted(annual.items())},
    }
    (PROCESSED / "quality.json").write_text(
        json.dumps(quality, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )


if __name__ == "__main__":
    prepare()
