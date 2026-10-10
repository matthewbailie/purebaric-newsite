#!/usr/bin/env python3
"""Compile the Knoxville research JSON files into purebaric_knoxville_prospects.xlsx (market research only).

    python3 make_knoxville_list.py

Reads research/*.json (arrays, or {"prospects": [...], "already_has_hbot": [...]}), keeps rows whose city is inside the
25-mile radius list (or whose ZIP is in the Knoxville 377/378 range when the city is unknown), de-duplicates, flags
shared addresses, and writes three sheets: Prospects, Already offer HBOT, Outside radius / unverified.
Requires openpyxl.  Haversine distance from downtown Knoxville is computed for cities with known coordinates.
"""
import glob, json, math, os, re
from datetime import date
from openpyxl import Workbook
from openpyxl.styles import Alignment, Font, PatternFill
from openpyxl.utils import get_column_letter

HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(HERE, "research")
OUT = os.path.join(HERE, "purebaric_knoxville_prospects.xlsx")
CENTER = (35.9606, -83.9207)   # downtown Knoxville (Gay St and Summit Hill)
RADIUS_MI = 25

# city -> (lat, lon, county). Distances are checked against CENTER.
CITIES = {
    "knoxville": (35.9606, -83.9207, "Knox"), "farragut": (35.8848, -84.1524, "Knox"), "powell": (36.0334, -84.0330, "Knox"),
    "halls": (36.0909, -83.9318, "Knox"), "karns": (35.9995, -84.1180, "Knox"), "hardin valley": (35.9570, -84.1700, "Knox"),
    "fountain city": (36.0290, -83.9330, "Knox"), "bearden": (35.9400, -84.0140, "Knox"), "cedar bluff": (35.9290, -84.0920, "Knox"),
    "corryton": (36.1420, -83.7980, "Knox"), "mascot": (36.0620, -83.7450, "Knox"), "strawberry plains": (36.0390, -83.6680, "Knox"),
    "concord": (35.8700, -84.1400, "Knox"), "maryville": (35.7565, -83.9705, "Blount"), "alcoa": (35.7895, -83.9738, "Blount"),
    "louisville": (35.8215, -84.0480, "Blount"), "friendsville": (35.7540, -84.1330, "Blount"), "rockford": (35.8310, -83.9360, "Blount"),
    "walland": (35.7330, -83.8110, "Blount"), "greenback": (35.6620, -84.1720, "Loudon"), "townsend": (35.6750, -83.7540, "Blount"),
    "oak ridge": (36.0104, -84.2696, "Anderson"), "clinton": (36.1034, -84.1319, "Anderson"), "norris": (36.1950, -84.0650, "Anderson"),
    "andersonville": (36.2060, -84.0130, "Anderson"), "oliver springs": (36.0450, -84.3430, "Anderson"), "rocky top": (36.2150, -84.1550, "Anderson"),
    "lake city": (36.2150, -84.1550, "Anderson"), "lenoir city": (35.7973, -84.2560, "Loudon"), "loudon": (35.7329, -84.3338, "Loudon"),
    "tellico village": (35.6900, -84.2600, "Loudon"), "seymour": (35.8900, -83.7280, "Sevier"), "kodak": (35.9720, -83.6200, "Sevier"),
    "sevierville": (35.8681, -83.5619, "Sevier"), "pigeon forge": (35.7884, -83.5543, "Sevier"), "gatlinburg": (35.7143, -83.5102, "Sevier"),
    "maynardville": (36.2500, -83.7980, "Union"), "luttrell": (36.2030, -83.7400, "Union"), "new market": (36.1010, -83.5550, "Jefferson"),
    "dandridge": (36.0150, -83.4150, "Jefferson"), "jefferson city": (36.1220, -83.4930, "Jefferson"), "morristown": (36.2140, -83.2950, "Hamblen"),
    "kingston": (35.8810, -84.5080, "Roane"), "harriman": (35.9340, -84.5520, "Roane"), "sweetwater": (35.6015, -84.4610, "Monroe"),
    "madisonville": (35.5200, -84.3640, "Monroe"), "athens": (35.4430, -84.5930, "McMinn"), "lafollette": (36.3830, -84.1200, "Campbell"),
    "tazewell": (36.4540, -83.5690, "Claiborne"), "newport": (35.9670, -83.1880, "Cocke"), "heiskell": (36.1120, -84.0400, "Knox"),
}
INDUSTRIES = ["Gyms and fitness centers", "CrossFit and performance gyms", "Sports teams and athletic programs",
              "Recovery studios and med spas", "Physical therapy, chiropractic, and sports medicine", "Salons and beauty studios"]
KEYS = ["business", "industry", "owner", "owner_title", "email", "email_confidence", "email_source", "phone",
        "website", "address", "city", "zip", "county", "notes", "personal_note_hook"]
EMAIL_RE = re.compile(r"^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$")

def miles(a, b):
    la1, lo1, la2, lo2 = map(math.radians, (a[0], a[1], b[0], b[1]))
    h = math.sin((la2-la1)/2)**2 + math.cos(la1)*math.cos(la2)*math.sin((lo2-lo1)/2)**2
    return 3958.8 * 2 * math.asin(math.sqrt(h))

def locate(city, zipc):
    c = (city or "").lower().split("(")[0].split(",")[0].strip()
    c = {"knox": "knoxville", "west knoxville": "knoxville", "south knoxville": "knoxville", "north knoxville": "knoxville",
         "east knoxville": "knoxville", "downtown knoxville": "knoxville"}.get(c, c)
    if c in CITIES:
        lat, lon, county = CITIES[c]
        return round(miles(CENTER, (lat, lon)), 1), county, c
    return None, "", c

def clean(row):
    r = {k: str(row.get(k, "") or "").strip() for k in KEYS}
    r["zip"] = r["zip"][:5]
    r["email"] = r["email"].lower().strip("<>. ")
    if r["email"] and not EMAIL_RE.match(r["email"]):
        r["notes"] = (r["notes"] + " | Email as found: " + r["email"]).strip(" |"); r["email"] = ""
    if not r["email"]:
        r["email_confidence"] = "none"
    if r["industry"] not in INDUSTRIES:
        low = r["industry"].lower()
        r["industry"] = next((i for i in INDUSTRIES if low and low.split()[0] in i.lower()), r["industry"])
    r["website"] = re.sub(r"^https?://(www\.)?", "", r["website"]).rstrip("/")
    d, county, c = locate(r["city"], r["zip"])
    r["distance_mi"] = d if d is not None else ""
    if not r["county"] and county:
        r["county"] = county
    return r

def in_radius(r):
    if r["distance_mi"] != "":
        return r["distance_mi"] <= RADIUS_MI + 2   # 2-mile tolerance for city-centre vs address (Loudon city at 28 is out)
    return bool(re.fullmatch(r"37[78]\d\d", r["zip"]))

NORM = lambda s: re.sub(r"[^a-z0-9]", "", (s or "").lower())
STOP = {"the", "gym", "fitness", "llc", "club", "studio", "tennessee", "tn", "inc", "center", "centre", "of", "and", "knoxville"}
def keyname(s):
    s = re.sub(r"\(.*?\)", "", (s or "").lower())
    return "".join(w for w in re.sub(r"[^a-z0-9 ]", " ", s).split() if w not in STOP)
def keyaddr(a):
    a = re.sub(r"\(.*?\)", "", (a or "").lower())
    a = re.sub(r"\b(suite|ste|unit|bldg|building|#)\s*[a-z0-9-]+", "", a)
    a = re.sub(r"\b(street|st|drive|dr|road|rd|boulevard|blvd|avenue|ave|way|lane|ln|parkway|pkwy|place|pl|court|ct|highway|hwy|pike)\b", "", a)
    return re.sub(r"[^a-z0-9]", "", a)

# enrichment files (enriched_*.json): fill blanks and carry flags, keyed by normalized business name (+ city when it matches)
enriched = {}
for f in sorted(glob.glob(os.path.join(SRC, "enriched_*.json"))):
    try:
        for e in json.load(open(f)):
            enriched[(NORM(e.get("business")), NORM(e.get("city")))] = e
            enriched.setdefault((NORM(e.get("business")), ""), e)
    except Exception as ex:
        print("skip", f, ex)
def apply_enrichment(r):
    e = enriched.get((NORM(r["business"]), NORM(r["city"]))) or enriched.get((NORM(r["business"]), ""))
    if not e:
        return r, ""
    for k in ("email", "phone", "website", "zip", "owner", "owner_title"):
        if not r.get(k) and e.get(k):
            r[k] = str(e[k]).strip()
            if k == "email":
                r["email_confidence"] = e.get("email_confidence") or "medium"; r["email_source"] = e.get("email_source") or ""
    flags = str(e.get("notes", "") or "")
    if flags:
        r["notes"] = (flags + " | " + r["notes"]).strip(" |")
    return r, flags.upper()

OVR = os.path.join(SRC, "_overrides.json")
DROP, FLAG, ADD, HOLD, SETPHONE, FIXNOTES, SETADDR, SETOWNER, SETHOOK, SETZIP, COMPADDR, CALLFIRST = set(), {}, [], {}, {}, {}, {}, {}, {}, {}, {}, []
if os.path.exists(OVR):
    o = json.load(open(OVR)); DROP = {NORM(x) for x in o.get("drop", [])}; FLAG = {NORM(k): v for k, v in o.get("flag", {}).items()}
    ADD = o.get("add", []); HOLD = {k.lower(): v for k, v in o.get("hold_email", {}).items()}
    SETPHONE = {NORM(k): v for k, v in o.get("set_phone", {}).items()}; FIXNOTES = {NORM(k): v for k, v in o.get("fix_notes", {}).items()}
    SETADDR = {NORM(k): v for k, v in o.get("set_address", {}).items()}
    SETOWNER = {NORM(k): v for k, v in o.get("set_owner", {}).items()}; SETHOOK = {NORM(k): v for k, v in o.get("set_hook", {}).items()}
    SETZIP = {NORM(k): v for k, v in o.get("set_zip", {}).items()}; COMPADDR = {NORM(k): v for k, v in o.get("competitor_address", {}).items()}
    CALLFIRST = [NORM(x) for x in o.get("call_first", [])]
def apply_overrides(r):
    k = NORM(r["business"])
    if r["email"] and r["email"].lower() in HOLD:
        why = HOLD[r["email"].lower()]
        r["notes"] = (f"EMAIL HELD BACK ({r['email']}): {why} | " + r["notes"]).strip(" |"); r["email"] = ""; r["email_confidence"] = "none"
    for pk, ph in SETPHONE.items():
        if pk and (pk in k or k in pk): r["phone"] = ph; r["notes"] = ("Phone corrected after critique. | " + r["notes"]).strip(" |")
    for ak, addr in SETADDR.items():
        if ak and (ak in k or k in ak):
            r["address"] = addr; r["notes"] = ("Address corrected after the email pass. | " + r["notes"]).strip(" |")
    for ok_, val in SETOWNER.items():
        if ok_ and (ok_ in k or k in ok_): r["owner"], r["owner_title"] = val[0], val[1]; r["notes"] = ("Contact corrected after critique. | " + r["notes"]).strip(" |")
    for hk2, val in SETHOOK.items():
        if hk2 and (hk2 in k or k in hk2): r["personal_note_hook"] = val
    for zk, val in SETZIP.items():
        if zk and (zk in k or k in zk): r["zip"] = val
    for nk, note in FIXNOTES.items():
        if nk and (nk in k or k in nk): r["notes"] = (note + " | " + r["notes"]).strip(" |")
    return r

prospects, competitors, outside = [], [], []
for f in sorted(glob.glob(os.path.join(SRC, "*.json"))):
    if os.path.basename(f).startswith(("_", "enriched_")):
        continue
    data = json.load(open(f))
    if isinstance(data, dict):
        rows, comp = data.get("prospects", []), data.get("already_has_hbot", [])
    else:  # a bare array, possibly with a trailing {"already_has_hbot": [...]} element
        rows = [x for x in data if "business" in x]
        comp = sum((x.get("already_has_hbot", []) for x in data if "already_has_hbot" in x), [])
    for row in rows:
        r = clean(row); r["_src"] = os.path.basename(f)
        if NORM(r["business"]) in DROP:
            r["notes"] = ("DROPPED after the adversarial critique (duplicate, out of radius, or reputation risk). | " + r["notes"]).strip(" |")
            outside.append(r); continue
        r, flags = apply_enrichment(r)
        r = clean(r); r["_src"] = os.path.basename(f)
        if NORM(r["business"]) in FLAG:
            r["notes"] = (FLAG[NORM(r["business"])] + " | " + r["notes"]).strip(" |")
        r = apply_overrides(r)
        if "DROP:" in flags or "CLOSED" in flags:
            outside.append(r); continue
        if "HAS_HBOT" in flags:
            competitors.append(r); continue
        (prospects if in_radius(r) else outside).append(r)
    for row in comp:
        r = clean(row); r["_src"] = os.path.basename(f); competitors.append(r)

for row in ADD:
    r = clean(row); r["_src"] = "_overrides.json (critique adds)"
    r["notes"] = ("Added after the adversarial critique. | " + r["notes"]).strip(" |")
    (prospects if in_radius(r) else outside).append(r)

# de-duplicate competitors by name (the same hospital program was found by several research passes); a clinic that is
# also on the prospect list with only a directory listing for HBOT stays a prospect (flagged) and leaves the competitor sheet
pkeys = {keyname(r["business"])[:18] for r in prospects}
cseen, cuniq = set(), []
for r in competitors:
    k = keyname(r["business"])[:18]
    if k in cseen: continue
    if "unverified" in r["notes"].lower() or "fresha" in (r["notes"] + r["email_source"]).lower():   # directory-only HBOT claims are not competitors
        for pr in prospects:
            if keyname(pr["business"])[:18] == k:
                pr["notes"] = ("A booking directory (Fresha) lists hyperbaric here; not confirmed on its own site. Ask on the call. | " + pr["notes"]).strip(" |")
        continue
    for ck, addr in COMPADDR.items():
        if ck and ck in NORM(r["business"]): r["address"] = addr
    cseen.add(k); cuniq.append(r)
competitors = cuniq
for r in prospects:
    r["call_first"] = "Yes" if any(c and c in NORM(r["business"]) for c in CALLFIRST) else ""
seen, uniq = set(), []
for r in sorted(prospects, key=lambda r: (r["email"] == "", r["email_confidence"] != "high")):
    key = (keyname(r["business"]), r["city"].lower()[:12])
    if key in seen or (r["email"] and r["email"] in seen):
        continue
    seen.add(key)
    if r["email"]: seen.add(r["email"])
    uniq.append(r)
prospects = uniq
by_addr = {}
for r in prospects:
    if r["industry"] == "Sports teams and athletic programs": continue
    k = keyaddr(r["address"])
    if len(k) > 6: by_addr.setdefault(k, []).append(r)
for g in by_addr.values():
    if len(g) > 1:
        for r in g:
            others = [o["business"] for o in g if o is not r]
            r["notes"] = (f"Shares a street address with {', '.join(others)}; confirm before contacting both. | " + r["notes"]).strip(" |")
RANK = {"high": 0, "medium": 1, "none": 2}
prospects.sort(key=lambda r: (r.get("call_first") != "Yes", INDUSTRIES.index(r["industry"]) if r["industry"] in INDUSTRIES else 9, RANK.get(r["email_confidence"], 3), r["county"], r["city"], r["business"]))

HEADERS = [("Call first", 9), ("Business", 30), ("Industry", 30), ("Owner / contact", 24), ("Title", 22), ("Email", 32), ("Email confidence", 14),
           ("Email source", 40), ("Phone", 15), ("Website", 28), ("Address", 32), ("City", 16), ("ZIP", 8), ("County", 12),
           ("Miles from downtown", 10), ("Personal note hook", 50), ("Notes", 50), ("Source file", 14)]
FIELDS = ["call_first", "business", "industry", "owner", "owner_title", "email", "email_confidence", "email_source", "phone", "website",
          "address", "city", "zip", "county", "distance_mi", "personal_note_hook", "notes", "_src"]
def sheet(ws, rows):
    ws.append([h for h, _ in HEADERS])
    for i, (h, w) in enumerate(HEADERS, 1):
        c = ws.cell(row=1, column=i); c.font = Font(bold=True, color="FFFFFF"); c.fill = PatternFill("solid", fgColor="2B2320")
        ws.column_dimensions[get_column_letter(i)].width = w
    for r in rows:
        ws.append([r.get(k, "") for k in FIELDS])
    for row in ws.iter_rows(min_row=2):
        for c in row: c.alignment = Alignment(wrap_text=True, vertical="top")
    ws.freeze_panes = "A2"; ws.auto_filter.ref = ws.dimensions

wb = Workbook(); ws = wb.active; ws.title = "Prospects"; sheet(ws, prospects)
sheet(wb.create_sheet("Already offer HBOT"), competitors)
sheet(wb.create_sheet("Dropped or outside radius"), outside)
s = wb.create_sheet("Summary"); s.append(["Purebaric Knoxville market research", str(date.today())]); s.append([])
s.append(["Industry", "Prospects", "With email", "High-confidence email"])
for ind in INDUSTRIES:
    rows = [r for r in prospects if r["industry"] == ind]
    s.append([ind, len(rows), sum(1 for r in rows if r["email"]), sum(1 for r in rows if r["email_confidence"] == "high")])
s.append(["Total", len(prospects), sum(1 for r in prospects if r["email"]), sum(1 for r in prospects if r["email_confidence"] == "high")])
s.append([]); s.append(["Already offer HBOT (competitors / references)", len(competitors)]); s.append(["Outside radius or unverified", len(outside)])
s.column_dimensions["A"].width = 52
wb.save(OUT)
print(f"{len(prospects)} prospects ({sum(1 for r in prospects if r['email'])} with email), {len(competitors)} competitors, {len(outside)} outside -> {OUT}")
