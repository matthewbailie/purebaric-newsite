#!/usr/bin/env python3
"""Builds _internal/outreach/purebaric_b2b_email_prospects.xlsx from the research JSON files.

    python3 _internal/outreach/source/make_prospect_list.py _internal/outreach/source/prospect-research

Each JSON file is an array of prospect rows (see the brief in the same folder: prospect_research_brief.md),
optionally wrapped as {"prospects": [...], "already_has_hbot": [...]}. Rows outside the delivery area are
dropped and listed on a "Location unverified" sheet. Requires openpyxl.
"""
import glob
import json
import os
import re
import sys
from datetime import date

from openpyxl import Workbook
from openpyxl.styles import Alignment, Font, PatternFill
from openpyxl.utils import get_column_letter
from openpyxl.worksheet.table import Table, TableStyleInfo

SRC = sys.argv[1] if len(sys.argv) > 1 else "."
OUT = os.path.join(os.path.dirname(__file__), "..", "purebaric_b2b_email_prospects.xlsx")

# Delivery area: same rule as service-area.html / netlify/functions/_lib/servicearea.js
PREFIXES = ("840", "841", "844")
ZIPS = set("""84201 84244 84601 84602 84603 84604 84605 84606 84626 84633 84651 84653 84660 84663 84664 84050 84018
84648 84645 84628 84639 84621 84623 84627 84629 84630 84642 84647 84667 84622 84632 84634 84643 84646 84662 84665""".split())

INDUSTRIES = [
    "Gyms and fitness centers",
    "CrossFit and performance gyms",
    "Sports teams and athletic programs",
    "Recovery studios and med spas",
    "Physical therapy, chiropractic, and sports medicine",
    "Salons and beauty studios",
]
TEMPLATE = {
    "Gyms and fitness centers": "gyms-and-fitness",
    "CrossFit and performance gyms": "crossfit-and-performance",
    "Sports teams and athletic programs": "sports-teams-and-athletics",
    "Recovery studios and med spas": "recovery-studios-and-med-spas",
    "Physical therapy, chiropractic, and sports medicine": "physical-therapy-and-sports-medicine",
    "Salons and beauty studios": "salons-and-beauty",
}
KEYS = ["business", "industry", "owner", "owner_title", "email", "email_confidence", "email_source", "phone",
        "website", "address", "city", "zip", "county", "notes", "personal_note_hook"]
EMAIL_RE = re.compile(r"^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$")


# Cities whose ZIPs all fall inside the rule; a row with a blank ZIP in one of these is kept and flagged.
IN_AREA_CITIES = {c.lower() for c in """Salt Lake City, South Salt Lake, Millcreek, Holladay, Murray, Midvale, Sandy, Draper,
Cottonwood Heights, West Jordan, South Jordan, Riverton, Herriman, Bluffdale, Taylorsville, West Valley City, Kearns,
Magna, Lehi, American Fork, Pleasant Grove, Lindon, Orem, Provo, Vineyard, Springville, Spanish Fork, Payson, Salem,
Mapleton, Saratoga Springs, Eagle Mountain, Highland, Alpine, Cedar Hills, Bountiful, North Salt Lake, Woods Cross,
Centerville, Farmington, Kaysville, Layton, Syracuse, Clearfield, Clinton, Ogden, South Ogden, North Ogden, Riverdale,
Roy, West Haven, Pleasant View, Park City, Heber City, Midway, Kamas, Tooele, Grantsville, Stansbury Park, Morgan,
Nephi, Ephraim, Manti""".replace("\n", " ").split(", ")}


def served(z, city=""):
    z = str(z or "").strip()[:5]
    if re.fullmatch(r"\d{5}", z):
        return z.startswith(PREFIXES) or z in ZIPS
    return not z and city.strip().lower() in IN_AREA_CITIES


def clean(row):
    r = {k: str(row.get(k, "") or "").strip() for k in KEYS}
    r["zip"] = r["zip"][:5]
    r["email"] = r["email"].lower().strip("<>. ")
    if r["email"] and not EMAIL_RE.match(r["email"]):
        r["notes"] = (r["notes"] + " | Email as found: " + r["email"]).strip(" |")
        r["email"] = ""
    if not r["email"]:
        r["email_confidence"] = "none"
    if r["industry"] not in INDUSTRIES:
        # map loose labels
        low = r["industry"].lower()
        r["industry"] = next((i for i in INDUSTRIES if low and low.split()[0] in i.lower()), r["industry"])
    r["website"] = re.sub(r"^https?://(www\.)?", "", r["website"]).rstrip("/")
    return r


prospects, competitors, dropped = [], [], []
for f in sorted(glob.glob(os.path.join(SRC, "*.json"))):
    with open(f) as fh:
        data = json.load(fh)
    rows = data.get("prospects", data) if isinstance(data, dict) else data
    comp = data.get("already_has_hbot", []) if isinstance(data, dict) else []
    if isinstance(rows, dict):
        rows = rows.get("rows", [])
    for row in rows:
        r = clean(row)
        r["_src"] = os.path.basename(f)
        if not r["zip"] and served("", r["city"]):
            r["notes"] = ("ZIP not captured; city is inside the delivery area. | " + r["notes"]).strip(" |")
        (prospects if served(r["zip"], r["city"]) else dropped).append(r)
    for row in comp:
        r = clean(row)
        r["_src"] = os.path.basename(f)
        competitors.append(r)

# de-duplicate on (business, city) and on email
seen, uniq = set(), []
for r in sorted(prospects, key=lambda r: (r["email"] == "", r["email_confidence"] != "high")):
    key = (re.sub(r"\W+", "", r["business"].lower()), r["city"].lower())
    ekey = r["email"] or None
    if key in seen or (ekey and ekey in seen):
        continue
    seen.add(key)
    if ekey:
        seen.add(ekey)
    uniq.append(r)
prospects = uniq

CONF_RANK = {"high": 0, "medium": 1, "none": 2}
prospects.sort(key=lambda r: (INDUSTRIES.index(r["industry"]) if r["industry"] in INDUSTRIES else 9,
                              CONF_RANK.get(r["email_confidence"], 3), r["county"], r["city"], r["business"]))

# ---------------- workbook
INK, TERRA, TERRA_BG, CREAM = "2B2320", "B8654D", "F4E7DF", "F7F2EA"
hdr_font = Font(bold=True, color="FFFFFF")
hdr_fill = PatternFill("solid", fgColor=INK)
wrap = Alignment(wrap_text=True, vertical="top")

HEADERS = [("Business", 30), ("Industry", 30), ("Owner / contact", 24), ("Title", 22), ("Email", 32),
           ("Email confidence", 14), ("Email source", 40), ("Phone", 15), ("Website", 28), ("Address", 32),
           ("City", 16), ("ZIP", 8), ("County", 12), ("Email template", 30), ("Personal note hook", 50),
           ("Notes", 50), ("Status", 14), ("Sent on", 12), ("Reply", 30)]


def write_sheet(ws, rows, headers=HEADERS, table_name="Prospects"):
    ws.append([h for h, _ in headers])
    for c, (_, w) in enumerate(headers, 1):
        ws.column_dimensions[get_column_letter(c)].width = w
        cell = ws.cell(row=1, column=c)
        cell.font, cell.fill, cell.alignment = hdr_font, hdr_fill, Alignment(vertical="center")
    for r in rows:
        ws.append([r["business"], r["industry"], r["owner"], r["owner_title"], r["email"], r["email_confidence"],
                   r["email_source"], r["phone"], r["website"], r["address"], r["city"], r["zip"], r["county"],
                   TEMPLATE.get(r["industry"], ""), r["personal_note_hook"], r["notes"], "Not sent", "", ""])
    for row in ws.iter_rows(min_row=2, max_row=ws.max_row):
        for cell in row:
            cell.alignment = wrap
        conf = row[5].value
        if conf == "high":
            row[4].fill = PatternFill("solid", fgColor="EBF2DA")
        elif conf == "none":
            row[4].fill = PatternFill("solid", fgColor=TERRA_BG)
    ws.freeze_panes = "C2"
    ws.row_dimensions[1].height = 22
    if ws.max_row > 1:
        ref = f"A1:{get_column_letter(len(headers))}{ws.max_row}"
        t = Table(displayName=table_name, ref=ref)
        t.tableStyleInfo = TableStyleInfo(name="TableStyleLight1", showRowStripes=True)
        ws.add_table(t)


wb = Workbook()
ws = wb.active
ws.title = "Prospects"
write_sheet(ws, prospects)

ws2 = wb.create_sheet("Already offer HBOT")
write_sheet(ws2, competitors, table_name="Competitors")

ws3 = wb.create_sheet("Location unverified")
write_sheet(ws3, dropped, table_name="Unverified")

# summary
ws4 = wb.create_sheet("Summary", 0)
ws4.column_dimensions["A"].width = 52
ws4.column_dimensions["B"].width = 12
ws4.column_dimensions["C"].width = 14
ws4.column_dimensions["D"].width = 14
ws4.append(["Purebaric B2B email prospects"])
ws4["A1"].font = Font(bold=True, size=14, color=TERRA)
ws4.append([f"Compiled {date.today().isoformat()} from public web search results. Delivery area: ZIPs starting 840, 841, 844 plus the listed Morgan, Juab and Sanpete ZIPs (service-area.html)."])
ws4.append([])
ws4.append(["Industry", "Prospects", "With email", "High conf."])
for c in range(1, 5):
    ws4.cell(row=4, column=c).font = hdr_font
    ws4.cell(row=4, column=c).fill = hdr_fill
for ind in INDUSTRIES:
    rows = [r for r in prospects if r["industry"] == ind]
    ws4.append([ind, len(rows), sum(1 for r in rows if r["email"]), sum(1 for r in rows if r["email_confidence"] == "high")])
ws4.append(["Total", len(prospects), sum(1 for r in prospects if r["email"]), sum(1 for r in prospects if r["email_confidence"] == "high")])
for c in range(1, 5):
    ws4.cell(row=ws4.max_row, column=c).font = Font(bold=True)
ws4.append([])
ws4.append(["Already offer hyperbaric (competitors / pricing references, not prospects)", len(competitors)])
ws4.append(["Location unverified (no ZIP or city captured, or ZIP outside the delivery area); confirm before sending", len(dropped)])
ws4.append([])
for line in [
    "How to use: filter Prospects by Industry, open email-templates/composer.html, pick the matching Email template,",
    "paste the Personal note hook (edit it into one natural sentence), copy, attach the prospectus, send. Mark Status and Sent on.",
    "Email confidence: high = on the business's own site or official listing; medium = third-party directory (verify on their site before sending); none = no email found, use the contact form or phone.",
    "Every email and owner name was taken verbatim from a search result. Confirm the owner is still there before writing to them by name.",
]:
    ws4.append([line])
    ws4.cell(row=ws4.max_row, column=1).alignment = Alignment(wrap_text=True)

wb.save(OUT)
print(f"wrote {OUT}: {len(prospects)} prospects ({sum(1 for r in prospects if r['email'])} with email), "
      f"{len(competitors)} already-HBOT, {len(dropped)} outside area")
