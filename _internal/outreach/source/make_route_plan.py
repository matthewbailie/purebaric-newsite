"""Daily walk-in route plan for handing pamphlets to prospects.

Usage: python3 make_route_plan.py <config.json>
Config keys: workbook, state_abbrev, state_name, market_label, home_base_note, out_md, out_xlsx,
  max_minutes (default 120), stop_minutes (10), cluster_radius_mi (4.0), speed_mph (22), road_factor (1.3),
  exclude_industries (list), min_anchor_score (6)

Scoring (higher = more likely to sign): industry base (recovery 5, CrossFit 4, PT/chiro 3, sports teams 3, gyms 2, salons 2)
+2 Call first, +1 named owner, +1 personal hook, +1 verified email. Rows with "Hyperbaric on website" = Yes, no address,
unverified/closed notes, or directory-only weight-loss clinics are left out. Each day starts at its anchor (the
highest-scoring unassigned business), adds the best nearby businesses while the day stays within max_minutes
(10 minutes per stop plus drive time between stops; drive time from home is not counted), and days are listed
best-anchor first. Geocodes come from geocode_cache.json (geocode_prospects.py).
"""
import json, math, os, re, sys, urllib.parse
import openpyxl
from openpyxl.styles import Font, PatternFill, Alignment
from openpyxl.utils import get_column_letter
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from geocode_prospects import key as gkey, CACHE

CFG = json.load(open(sys.argv[1]))
ST = CFG["state_abbrev"]; MAXM = CFG.get("max_minutes", 120); STOP = CFG.get("stop_minutes", 10)
RAD = CFG.get("cluster_radius_mi", 4.0); MPH = CFG.get("speed_mph", 22); RF = CFG.get("road_factor", 1.3)
EXCL_IND = set(CFG.get("exclude_industries", ["High schools and colleges (athletics)"]))
MIN_ANCHOR = CFG.get("min_anchor_score", 6)
BASE = {"Recovery studios and med spas": 5, "CrossFit and performance gyms": 4, "Physical therapy, chiropractic, and sports medicine": 3,
        "Sports teams and athletic programs": 3, "Gyms and fitness centers": 2, "Salons and beauty studios": 2}
BAD_NOTES = re.compile(r"unverified|closed|not callable|mypeptidematch|directory only|directory-only|no own site|probably closed|reputation risk|dropped", re.I)

def miles(a, b):
    la1, lo1, la2, lo2 = map(math.radians, (a[0], a[1], b[0], b[1]))
    h = math.sin((la2-la1)/2)**2 + math.cos(la1)*math.cos(la2)*math.sin((lo2-lo1)/2)**2
    return 3958.8 * 2 * math.asin(math.sqrt(h))
def drive_min(a, b): return miles(a, b) * RF / MPH * 60

cache = json.load(open(CACHE))
wb = openpyxl.load_workbook(CFG["workbook"], read_only=True); ws = [w for w in wb.worksheets if "rospect" in w.title][0]
rows = list(ws.iter_rows(values_only=True)); h = list(rows[0])
biz, skipped = [], []
for r in rows[1:]:
    d = dict(zip(h, r))
    if not d.get("Business"): continue
    ind = d.get("Industry") or ""
    if ind in EXCL_IND: continue
    if (d.get("Hyperbaric on website") or "") == "Yes": skipped.append((d["Business"], "already offers hyperbaric")); continue
    if not d.get("Address"): skipped.append((d["Business"], "no street address")); continue
    notes = (d.get("Notes") or "")
    if BAD_NOTES.search(notes): skipped.append((d["Business"], "notes flag it as unverified, closed or directory-only")); continue
    g = cache.get(gkey(d["Address"], d.get("City") or "", ST))
    if not g or g.get("lat") is None: skipped.append((d["Business"], "address could not be geocoded")); continue
    score = BASE.get(ind, 1)
    if (d.get("Call first") or "") == "Yes": score += 2
    if d.get("Owner / contact"): score += 1
    if d.get("Personal note hook"): score += 1
    if d.get("Email") and (d.get("Email confidence") or "").lower() == "high": score += 1
    biz.append({"name": d["Business"], "industry": ind, "owner": d.get("Owner / contact") or "", "phone": d.get("Phone") or "",
                "address": d["Address"], "city": d.get("City") or "", "zip": d.get("ZIP") or "", "hook": (d.get("Personal note hook") or "")[:140],
                "score": score, "pt": (g["lat"], g["lon"]), "approx": bool(g.get("approx")), "callfirst": (d.get("Call first") or "") == "Yes"})
tier = lambda s: "High" if s >= MIN_ANCHOR else ("Medium" if s >= 4 else "Fill")

unassigned = sorted(biz, key=lambda b: -b["score"])
days = []
while unassigned:
    anchor = unassigned[0]
    cands = [b for b in unassigned[1:] if miles(anchor["pt"], b["pt"]) <= RAD]
    route, used = [anchor], STOP
    cur = anchor["pt"]
    # add stops: prefer higher tier, then nearer; stop when the day would exceed the budget
    while True:
        best, bestkey = None, None
        for c in cands:
            if c in route: continue
            dm = drive_min(cur, c["pt"])
            if used + dm + STOP > MAXM: continue
            k = (-c["score"], dm)
            if bestkey is None or k < bestkey: best, bestkey = c, k
        if best is None: break
        route.append(best); used += bestkey[1] + STOP; cur = best["pt"]
    # re-order the route nearest-neighbour from the anchor and recompute the time
    ordered, rest, cur = [anchor], [b for b in route if b is not anchor], anchor["pt"]
    while rest:
        nxt = min(rest, key=lambda b: miles(cur, b["pt"])); ordered.append(nxt); rest.remove(nxt); cur = nxt["pt"]
    legs, total = [0.0], STOP
    for a, b in zip(ordered, ordered[1:]):
        dm = drive_min(a["pt"], b["pt"]); legs.append(dm); total += dm + STOP
    for b in ordered: unassigned.remove(b)
    days.append({"stops": ordered, "legs": legs, "minutes": total})

# area label: most common city; if one city, add the ZIP(s)
for d in days:
    cities = {}
    for s in d["stops"]: cities[s["city"]] = cities.get(s["city"], 0) + 1
    main = max(cities, key=cities.get)
    zips = sorted({str(s["zip"]) for s in d["stops"] if s["city"] == main and s["zip"]})
    d["area"] = main + ((" " + ", ".join(zips[:3])) if len(cities) == 1 and zips else (" and " + ", ".join(c for c in cities if c != main) if len(cities) > 1 else ""))
    d["maps"] = "https://www.google.com/maps/dir/" + "/".join(urllib.parse.quote(f"{s['address']}, {s['city']}, {ST}") for s in d["stops"])
    d["high"] = sum(1 for s in d["stops"] if tier(s["score"]) == "High")
    d["anchor_score"] = d["stops"][0]["score"]

# ---------- Markdown ----------
L = []
L.append(f"# {CFG['market_label']}: daily pamphlet route plan")
L.append("")
L.append(f"Generated {__import__('datetime').date.today().isoformat()} from `{os.path.basename(CFG['workbook'])}`. Each day is one geographic cluster built around the highest-potential business still unvisited (the anchor), with other prospects within {RAD:g} miles added while the day stays under {MAXM} minutes: {STOP} minutes per stop plus drive time between stops at about {MPH} mph. {CFG.get('home_base_note','')} Days are listed best-anchor first, so start at Day 1. Open the Google Maps link for turn-by-turn directions in stop order.")
L.append("")
L.append("Scoring: recovery studios and IV lounges score highest, then CrossFit and performance gyms, then chiropractic, physical therapy and sports clubs, then gyms and salons; a Call-first mark, a named owner, a verifiable hook and a verified email each add a point. High = anchor-grade. Schools, businesses that already offer hyperbaric, and rows flagged unverified or closed are left out (list at the end). Visit mid-morning or mid-afternoon; carry the industry pamphlet for each stop.")
L.append("")
L.append("## Summary")
L.append("")
L.append("| Day | Area | Stops | High-potential stops | Est. minutes | Route |")
L.append("|---|---|---|---|---|---|")
for i, d in enumerate(days, 1):
    L.append(f"| {i} | {d['area']} | {len(d['stops'])} | {d['high']} | {round(d['minutes'])} | [Google Maps]({d['maps']}) |")
L.append("")
tot_stops = sum(len(d["stops"]) for d in days)
L.append(f"{len(days)} days, {tot_stops} stops, {sum(1 for b in biz if tier(b['score'])=='High')} high-potential businesses, {sum(d['minutes'] for d in days)/60:.1f} hours of visiting time in total.")
L.append("")
L.append("## Day by day")
for i, d in enumerate(days, 1):
    L.append("")
    L.append(f"### Day {i}: {d['area']} ({len(d['stops'])} stops, about {round(d['minutes'])} minutes)")
    L.append("")
    L.append(f"[Open route in Google Maps]({d['maps']})")
    L.append("")
    L.append("| # | Business | Industry | Tier | Address | Contact | Why this one | Drive from previous |")
    L.append("|---|---|---|---|---|---|---|---|")
    for n, (s, leg) in enumerate(zip(d["stops"], d["legs"]), 1):
        who = s["owner"] + (f", {s['phone']}" if s["phone"] else "")
        why = ("Call first. " if s["callfirst"] else "") + s["hook"]
        addr = f"{s['address']}, {s['city']}" + (" (address approximate)" if s["approx"] else "")
        L.append(f"| {n} | {s['name']} | {s['industry']} | {tier(s['score'])} | {addr} | {who} | {why} | {'start' if n == 1 else str(round(leg)) + ' min'} |")
if skipped:
    L.append("")
    L.append("## Not on a route (reason)")
    L.append("")
    for name, why in sorted(skipped): L.append(f"- {name}: {why}")
open(CFG["out_md"], "w").write("\n".join(L) + "\n")

# ---------- Workbook ----------
wbo = openpyxl.Workbook(); so = wbo.active; so.title = "Route plan"
hdr = ["Day", "Area", "Stop", "Business", "Industry", "Tier", "Score", "Address", "City", "ZIP", "Owner / contact", "Phone", "Hook", "Drive from previous (min)", "Day minutes", "Google Maps route"]
so.append(hdr)
for i, d in enumerate(days, 1):
    for n, (s, leg) in enumerate(zip(d["stops"], d["legs"]), 1):
        so.append([i, d["area"], n, s["name"], s["industry"], tier(s["score"]), s["score"], s["address"], s["city"], s["zip"], s["owner"], s["phone"], s["hook"], round(leg), round(d["minutes"]), d["maps"] if n == 1 else ""])
for c in so[1]: c.font = Font(bold=True, color="FFFFFF"); c.fill = PatternFill("solid", fgColor="2B2320")
for i, w in enumerate([5, 24, 5, 32, 28, 8, 6, 30, 16, 8, 24, 16, 50, 10, 8, 40], 1): so.column_dimensions[get_column_letter(i)].width = w
so.freeze_panes = "A2"
sk = wbo.create_sheet("Not on a route"); sk.append(["Business", "Reason"]); [sk.append(list(x)) for x in sorted(skipped)]
wbo.save(CFG["out_xlsx"])
print(f"{len(days)} days, {tot_stops} stops, skipped {len(skipped)} -> {CFG['out_md']}")
