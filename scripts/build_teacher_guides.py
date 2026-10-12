"""Build printable teacher guides for every grade level in a lesson pack."""

from __future__ import annotations

import argparse
import json
import shutil
import subprocess
from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.enums import TA_LEFT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import LongTable, Paragraph, SimpleDocTemplate, Spacer, TableStyle


ROOT = Path(__file__).resolve().parents[1]
PACK_FILE = ROOT / "public" / "packs" / "mova" / "pack.js"
OUTPUT_DIR = ROOT / "output" / "pdf"
PUBLIC_DIR = ROOT / "public" / "packs" / "mova" / "docs"
FONT_REGULAR = ROOT / "public" / "fonts" / "Nunito.ttf"
FONT_BOLD = ROOT.parent / "den-movy" / "brand" / "src" / "_nunito_900.ttf"

PAPER = colors.HexColor("#FBF6EC")
INK = colors.HexColor("#2A1714")
MUTED = colors.HexColor("#7A6A60")
RED = colors.HexColor("#C8341F")
YELLOW = colors.HexColor("#F2B530")
LINE = colors.HexColor("#E6DAC7")
SOFT = colors.HexColor("#F3EADA")

OUTPUTS = {
    "1-4": "scenarii-1-4.pdf",
    "5-7": "scenarii-5-7.pdf",
    "8-11": "scenarii-8-11.pdf",
}


def load_pack() -> dict:
    node = shutil.which("node")
    if not node:
        raise RuntimeError("Node.js is required to read pack.js")
    script = r"""
const fs = require('fs');
const vm = require('vm');
const context = {window: {DYVO_PACKS: []}};
vm.createContext(context);
vm.runInContext(fs.readFileSync(process.argv[1], 'utf8'), context);
process.stdout.write(JSON.stringify(context.window.DYVO_PACKS[0]));
"""
    result = subprocess.run(
        [node, "-e", script, str(PACK_FILE)],
        check=True,
        capture_output=True,
        text=True,
        encoding="utf-8",
    )
    return json.loads(result.stdout)


def clean_text(value: str) -> str:
    text = str(value)
    for dash in ("‐", "‑", "‒", "–", "—", "―"):
        text = text.replace(dash, "-")
    return text


def xml(value: str) -> str:
    return (
        clean_text(value)
        .replace("&", "&amp;")
        .replace("<", "&lt;")
        .replace(">", "&gt;")
    )


def level_teacher(pack: dict, level_id: str) -> dict:
    teacher = pack["teacher"]
    result = {key: value for key, value in teacher.items() if key != "levels"}
    result.update(teacher.get("levels", {}).get(level_id, {}))
    return result


def draw_page(canvas, doc, pack_title: str, level_label: str):
    canvas.saveState()
    width, height = A4
    canvas.setFillColor(PAPER)
    canvas.rect(0, 0, width, height, fill=1, stroke=0)

    canvas.setFillColor(RED)
    canvas.rect(0, height - 7 * mm, width, 7 * mm, fill=1, stroke=0)
    canvas.setFont("NunitoBold", 10)
    canvas.drawString(16 * mm, height - 15 * mm, "Дивоурок")
    canvas.setFillColor(MUTED)
    canvas.setFont("Nunito", 8.5)
    canvas.drawRightString(width - 16 * mm, height - 15 * mm, clean_text(f"{pack_title} · {level_label}"))

    canvas.setStrokeColor(LINE)
    canvas.line(16 * mm, 14 * mm, width - 16 * mm, 14 * mm)
    canvas.setFillColor(MUTED)
    canvas.setFont("Nunito", 8)
    canvas.drawString(16 * mm, 9 * mm, "dyvourok.com.ua")
    canvas.drawCentredString(width / 2, 9 * mm, "Для використання покупцем набору")
    canvas.drawRightString(width - 16 * mm, 9 * mm, f"Сторінка {doc.page}")
    canvas.restoreState()


def build_pdf(pack: dict, level: dict, destination: Path):
    data = level_teacher(pack, level["id"])
    doc = SimpleDocTemplate(
        str(destination),
        pagesize=A4,
        rightMargin=16 * mm,
        leftMargin=16 * mm,
        topMargin=24 * mm,
        bottomMargin=20 * mm,
        title=clean_text(f"{pack['title']} - сценарій для {level['label']}"),
        author="Дивоурок",
        subject="Сценарій, поради та відповіді для вчителя",
    )

    base = getSampleStyleSheet()
    styles = {
        "kicker": ParagraphStyle(
            "Kicker", parent=base["Normal"], fontName="NunitoBold", fontSize=9,
            leading=12, textColor=RED, spaceAfter=5, alignment=TA_LEFT,
        ),
        "title": ParagraphStyle(
            "Title", parent=base["Title"], fontName="NunitoBold", fontSize=23,
            leading=25, textColor=INK, alignment=TA_LEFT, spaceAfter=4,
        ),
        "lead": ParagraphStyle(
            "Lead", parent=base["Normal"], fontName="Nunito", fontSize=10.5,
            leading=13, textColor=MUTED, spaceAfter=8,
        ),
        "section": ParagraphStyle(
            "Section", parent=base["Heading2"], fontName="NunitoBold", fontSize=15,
            leading=17, textColor=INK, spaceBefore=5, spaceAfter=6,
        ),
        "cell": ParagraphStyle(
            "Cell", parent=base["Normal"], fontName="Nunito", fontSize=8.9,
            leading=11.5, textColor=INK,
        ),
        "cell_bold": ParagraphStyle(
            "CellBold", parent=base["Normal"], fontName="NunitoBold", fontSize=8.8,
            leading=11.5, textColor=RED,
        ),
        "item": ParagraphStyle(
            "Item", parent=base["Normal"], fontName="Nunito", fontSize=9.2,
            leading=12, textColor=INK, leftIndent=9 * mm, firstLineIndent=-6 * mm,
            spaceAfter=4,
        ),
    }

    story = [
        Paragraph("ГОТОВИЙ ПЛАН НА 45 ХВИЛИН", styles["kicker"]),
        Paragraph("Сценарій для вчителя", styles["title"]),
        Paragraph(xml(f"{pack['title']} · {level['label']}"), styles["lead"]),
        Paragraph("План уроку", styles["section"]),
    ]

    rows = [[
        Paragraph("Час", styles["cell_bold"]),
        Paragraph("Хід уроку", styles["cell_bold"]),
    ]]
    for minutes, description in data["minutes"]:
        rows.append([
            Paragraph(xml(minutes), styles["cell_bold"]),
            Paragraph(xml(description), styles["cell"]),
        ])
    table = LongTable(rows, colWidths=[29 * mm, 149 * mm], repeatRows=1, hAlign="LEFT")
    table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), SOFT),
        ("BOX", (0, 0), (-1, -1), 0.7, LINE),
        ("INNERGRID", (0, 0), (-1, -1), 0.5, LINE),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("LEFTPADDING", (0, 0), (-1, -1), 9),
        ("RIGHTPADDING", (0, 0), (-1, -1), 9),
        ("TOPPADDING", (0, 0), (-1, -1), 5),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#FFFDF8")]),
    ]))
    story.extend([table, Spacer(1, 4 * mm)])

    def add_numbered_section(title: str, items: list[str], accent: colors.Color):
        story.append(Paragraph(title, styles["section"]))
        for index, item in enumerate(items, 1):
            bullet = f'<font color="{accent.hexval()}"><b>{index}.</b></font>'
            story.append(Paragraph(f"{bullet} {xml(item)}", styles["item"]))

    add_numbered_section("Поради", data["tips"], RED)
    story.append(Spacer(1, 1 * mm))
    add_numbered_section("Відповіді", data["answers"], colors.HexColor("#2E7D4F"))

    callback = lambda canvas, current_doc: draw_page(canvas, current_doc, pack["title"], level["label"])
    doc.build(story, onFirstPage=callback, onLaterPages=callback)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--no-public-copy", action="store_true")
    args = parser.parse_args()

    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    PUBLIC_DIR.mkdir(parents=True, exist_ok=True)
    pdfmetrics.registerFont(TTFont("Nunito", str(FONT_REGULAR)))
    pdfmetrics.registerFont(TTFont("NunitoBold", str(FONT_BOLD)))

    pack = load_pack()
    for level in pack["grades"]:
        filename = OUTPUTS[level["id"]]
        output = OUTPUT_DIR / filename
        build_pdf(pack, level, output)
        if not args.no_public_copy:
            shutil.copy2(output, PUBLIC_DIR / filename)
        print(f"built {output}")


if __name__ == "__main__":
    main()
