import csv
from io import BytesIO, StringIO
from pathlib import Path
from xml.sax.saxutils import escape

from reportlab.graphics.shapes import Drawing, Rect, String
from reportlab.lib.colors import HexColor
from reportlab.lib.styles import ParagraphStyle
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle


def csv_report(report: dict) -> bytes:
    buf = StringIO()
    writer = csv.writer(buf)
    writer.writerow(
        [
            "시뮬레이션",
            "시나리오",
            "조건 충족",
            "매출(원)",
            "보관비",
            "출하비",
            "예상 순수입",
            "당일 순현금",
            "일차:kg",
            "데이터 버전",
        ]
    )
    for r in report["scenarios"]:
        writer.writerow(
            [
                report["basis"],
                r["name"],
                r["feasible"],
                r["gross"],
                r["storage"],
                r["shipping"],
                r["net"],
                r["cash_today"],
                " / ".join(f"{b['day']}:{b['kg']}" for b in r["schedule"]),
                report["version"],
            ]
        )
    return buf.getvalue().encode("utf-8-sig")


def pdf_report(report: dict) -> bytes:
    pdfmetrics.registerFont(
        TTFont("Nanum", str(Path(__file__).resolve().parents[2] / "fonts/NanumGothic.ttf"))
    )
    buf = BytesIO()
    doc = SimpleDocTemplate(buf, title="귤지킴이 출하 전략", leftMargin=42, rightMargin=42)
    style = ParagraphStyle("body", fontName="Nanum", fontSize=10, leading=16, wordWrap="CJK")

    def para(value):
        return Paragraph(escape(str(value)), style)

    rows = report["scenarios"]
    items = [
        Paragraph(
            "귤지킴이  |  출하 전략 보고서",
            ParagraphStyle("heading", fontName="Nanum", fontSize=21, leading=30),
        ),
        para(report["basis"]),
        Spacer(1, 14),
        para(f"우선 검토안 · {report['recommended'] or '조건 충족안 없음'}"),
        para(f"대안 · {report['alternative'] or '다른 실행 가능 일정 없음'}"),
        para(report["explanation"]),
        Spacer(1, 12),
    ]
    summary = report.get("summary", {})
    if summary.get("production_t") is not None:
        items.append(
            para(
                f"생산 통계 · {summary['latest']}년 합계 {summary['production_t']:,.2f}톤 · {summary['regions']}개 지역"
            )
        )
    table = [["전략", "예상 순수입(원)", "총비용(원)", "당일 순현금", "조건"]]
    for r in rows:
        table.append(
            [
                r["name"],
                f"{r['net']:,.0f}",
                f"{r['storage'] + r['shipping']:,.0f}",
                f"{r['cash_today']:,.0f}",
                "충족" if r["feasible"] else "미충족",
            ]
        )
    items.append(
        Table(
            table,
            style=TableStyle(
                [
                    ("FONTNAME", (0, 0), (-1, -1), "Nanum"),
                    ("BACKGROUND", (0, 0), (-1, 0), HexColor("#ffe8cc")),
                    ("BOTTOMPADDING", (0, 0), (-1, -1), 7),
                ]
            ),
        )
    )
    items += [Spacer(1, 13), para("전략별 예상 순수입 · 원")]
    plot = Drawing(490, 115)
    scale = 140 / max([abs(r["net"]) for r in rows] + [1])
    for i, r in enumerate(rows):
        y = 92 - i * 19
        w = scale * r["net"]
        plot.add(String(0, y, r["name"], fontName="Nanum", fontSize=9))
        plot.add(Rect(min(260, 260 + w), y, abs(w), 8, fillColor=HexColor("#FF8A00"), strokeColor=None))
        plot.add(String(410, y, f"{r['net']:,.0f}", fontName="Nanum", fontSize=8))
    items.append(plot)
    for r in rows:
        items.append(
            para(r["name"] + " · " + " / ".join(f"{b['day']}일차 {b['kg']:,}kg" for b in r["schedule"]))
        )
    p = report["params"]
    items += [
        Spacer(1, 10),
        para(
            f"보유 {p['inventory_kg']:,}kg · 현재 {p['expected_unit_price_now']:,}원/kg · 미래 가정 {p['expected_unit_price_future'] if p['expected_unit_price_future'] is not None else p['expected_unit_price_now']}원/kg"
        ),
        para(report["limits"]),
        para("출처 · " + report["source"]["title"]),
        para(report["source"].get("url", "")),
        para("버전 · " + report["version"]),
    ]
    doc.build(items)
    return buf.getvalue()
