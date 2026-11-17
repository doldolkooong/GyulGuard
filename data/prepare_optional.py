"""공식 측정값과 신고소별 출하량을 개별 업로드 가능한 CSV로 변환한다."""
import csv
from datetime import datetime
from pathlib import Path

ROOT = Path(__file__).resolve().parent


def quality() -> list[dict]:
    samples = []
    with (ROOT / "raw" / "jdc-brix-2020.csv").open(encoding="cp949", newline="") as file:
        for row in csv.DictReader(file):
            for field, value in row.items():
                if field.startswith("당도(brix)_") and value.strip():
                    samples.append({
                        "site_id": row["관리번호"],
                        "year": 2020,
                        "week": field.removeprefix("당도(brix)_"),
                        "region": row["지역(읍/면/동)"],
                        "city": row["지역(시)"],
                        "brix": value,
                    })
    return samples


def shipments() -> list[dict]:
    shipments = []
    with (ROOT / "raw" / "jejudatahub-855-preview.csv").open(encoding="cp949", newline="") as file:
        for row in csv.DictReader(file):
            if row["품종소분류"] != "노지온주" or row["신고소"] not in {"제주공항", "제주항"}:
                continue
            day = datetime.strptime(row["출하일자"], "%Y%m%d").date()
            shipments.append({
                "date": day.isoformat(),
                "year": day.year,
                "variety": row["품종소분류"],
                "port": row["신고소"],
                "shipment_t": row["출하량"],
            })
    return shipments


if __name__ == "__main__":
    destination = ROOT / "optional"
    destination.mkdir(exist_ok=True)
    for name, records in [("quality", quality()), ("shipment", shipments())]:
        with (destination / f"{name}.csv").open("w", encoding="utf-8", newline="") as output:
            writer = csv.DictWriter(output, fieldnames=list(records[0]), lineterminator="\n")
            writer.writeheader()
            writer.writerows(records)
