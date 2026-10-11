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
tier = lambda s: "Best bet" if s >= MIN_ANCHOR else ("Good fit" if s >= 4 else "Also nearby")
def hm(m):
    m = int(round(m)); return (f"{m//60} h {m%60:02d} min" if m >= 60 else f"{m} min")

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

# merge pass: a day with fewer than 3 stops joins the nearest day (anchor within MERGE_RAD miles) if the combined time fits
MERGE_RAD = CFG.get("merge_radius_mi", 9.0)
def route_time(stops):
    cur, total = stops[0]["pt"], STOP
    legs = [0.0]
    for b in stops[1:]:
        dm = drive_min(cur, b["pt"]); legs.append(dm); total += dm + STOP; cur = b["pt"]
    return total, legs
def nn_order(stops):
    first = max(stops, key=lambda b: b["score"]); ordered, rest, cur = [first], [b for b in stops if b is not first], first["pt"]
    while rest:
        nxt = min(rest, key=lambda b: miles(cur, b["pt"])); ordered.append(nxt); rest.remove(nxt); cur = nxt["pt"]
    return ordered
changed = True
while changed:
    changed = False
    small = [d for d in days if len(d["stops"]) < 3]
    for d in small:
        if d not in days: continue
        best = None
        for e in days:
            if e is d: continue
            dist = min(miles(s1["pt"], s2["pt"]) for s1 in d["stops"] for s2 in e["stops"])
            if dist > MERGE_RAD: continue
            merged = nn_order(e["stops"] + d["stops"]); t, legs = route_time(merged)
            if t <= MAXM and (best is None or t < best[0]): best = (t, e, merged, legs)
        if best:
            t, e, merged, legs = best; e["stops"], e["legs"], e["minutes"] = merged, legs, t; days.remove(d); changed = True
days.sort(key=lambda d: -max(b["score"] for b in d["stops"]))
singles = [d for d in days if len(d["stops"]) == 1]
days = [d for d in days if len(d["stops"]) > 1]

# area label: most common city; if one city, add the ZIP(s)
for d in days:
    cities = {}
    for s in d["stops"]: cities[s["city"]] = cities.get(s["city"], 0) + 1
    main = max(cities, key=cities.get)
    zips = sorted({str(s["zip"]) for s in d["stops"] if s["city"] == main and s["zip"]})
    d["area"] = main + ((" " + ", ".join(zips[:3])) if len(cities) == 1 and zips else (" and " + ", ".join(c for c in cities if c != main) if len(cities) > 1 else ""))
    d["maps"] = "https://www.google.com/maps/dir/" + "/".join(urllib.parse.quote(s["address"] if s["city"].lower() in s["address"].lower() else f"{s['address']}, {s['city']}, {ST}") for s in d["stops"])
    d["high"] = sum(1 for s in d["stops"] if tier(s["score"]) == "Best bet")
    d["anchor_score"] = d["stops"][0]["score"]

# ---------- Markdown ----------
L = []
L.append(f"# {CFG['market_label']}: daily pamphlet route plan")
L.append("")
L.append(f"Generated {__import__('datetime').date.today().isoformat()} from `{os.path.basename(CFG['workbook'])}`.")
L.append("")
L.append("## How to read this plan")
L.append("")
L.append(f"- **One row = one outing.** Each day is a group of businesses close enough together to visit in one trip of one to two hours. Do them in the order listed; Day 1 is the best use of your first outing.")
L.append(f"- **Businesses to visit** is how many doors you knock on that day. **Best bets** are the ones most likely to sign: recovery studios, IV lounges and performance gyms with a named owner or a specific talking point. Every day contains at least one best bet where one exists nearby; the rest of the stops are good fits or businesses that happen to be on the way.")
L.append(f"- **Time for the outing** is the total for that day: {STOP} minutes at each business plus the driving between them (about {MPH} mph). It does not include the drive from home to the first stop or home from the last, so pick a day whose area is on your way. {CFG.get('home_base_note','')}")
L.append(f"- **Directions** opens Google Maps with the stops already in order.")
L.append(f"- In the stop lists, **Who to ask for** is the owner or manager named in the research, **Talking point** is a true, specific fact to open with, and **Drive from last stop** is the estimated minutes between that business and the one before it. \"Reviewer's pick\" marks a business the list critique singled out as a top prospect.")
L.append(f"- Not included: schools (approach by email through the athletic director), businesses that already offer hyperbaric, rows the research flagged as unverified or closed, and rows without a street address. They are listed at the end with the reason. Visit mid-morning or mid-afternoon and carry the pamphlet for that industry.")
L.append("")
L.append("## The days at a glance")
L.append("")
L.append("| Day | Area to cover | Businesses to visit | Of which best bets | Time for the outing | Directions |")
L.append("|---|---|---|---|---|---|")
for i, d in enumerate(days, 1):
    L.append(f"| {i} | {d['area']} | {len(d['stops'])} | {d['high']} | about {hm(d['minutes'])} | [Google Maps]({d['maps']}) |")
L.append("")
tot_stops = sum(len(d["stops"]) for d in days)
L.append(f"In total: {len(days)} outings, {tot_stops} businesses, {sum(1 for b in biz if tier(b['score'])=='Best bet')} of them best bets, about {sum(d['minutes'] for d in days)/60:.0f} hours of visiting time, plus {len(singles)} single stops listed at the end to pair with errands.")
L.append("")
L.append("## Day by day")
for i, d in enumerate(days, 1):
    L.append("")
    L.append(f"### Day {i}: {d['area']}")
    L.append("")
    L.append(f"{len(d['stops'])} businesses, about {hm(d['minutes'])} including driving between stops. Start at stop 1 (the day's best bet) and follow the order. [Open directions in Google Maps]({d['maps']})")
    L.append("")
    L.append("| Stop | Business | Type | Likelihood | Address | Who to ask for | Talking point | Drive from last stop |")
    L.append("|---|---|---|---|---|---|---|---|")
    for n, (s_, leg) in enumerate(zip(d["stops"], d["legs"]), 1):
        who = s_["owner"] + (f" ({s_['phone']})" if s_["phone"] else "") if s_["owner"] else (s_["phone"] or "")
        why = ("Reviewer's pick. " if s_["callfirst"] else "") + s_["hook"]
        addr = f"{s_['address']}, {s_['city']}" + (" (address approximate)" if s_["approx"] else "")
        L.append(f"| {n} | {s_['name']} | {s_['industry']} | {tier(s_['score'])} | {addr} | {who} | {why} | {'first stop' if n == 1 else str(round(leg)) + ' min'} |")
if singles:
    L.append("")
    L.append("## Single stops to pair with errands")
    L.append("")
    L.append("No other prospect is within reach of a two-hour loop for these. Visit one when you are already in that town.")
    L.append("")
    L.append("| Business | Type | Likelihood | Address | Who to ask for | Talking point |")
    L.append("|---|---|---|---|---|---|")
    for d in singles:
        s_ = d["stops"][0]; who = s_["owner"] + (f" ({s_['phone']})" if s_["phone"] else "") if s_["owner"] else (s_["phone"] or "")
        L.append(f"| {s_['name']} | {s_['industry']} | {tier(s_['score'])} | {s_['address']}, {s_['city']} | {who} | {('Reviewer\'s pick. ' if s_['callfirst'] else '') + s_['hook']} |")
if skipped:
    L.append("")
    L.append("## Not on any route, and why")
    L.append("")
    for name, why in sorted(skipped): L.append(f"- {name}: {why}")
open(CFG["out_md"], "w").write("\n".join(L) + "\n")

# ---------- Workbook ----------
wbo = openpyxl.Workbook(); so = wbo.active; so.title = "Route plan"
hdr = ["Day", "Area to cover", "Stop order", "Business", "Type", "Likelihood", "Score", "Address", "City", "ZIP", "Who to ask for", "Phone", "Talking point", "Drive from last stop (min)", "Time for the outing (min)", "Directions (Google Maps)"]
so.append(hdr)
for i, d in enumerate(days, 1):
    for n, (s, leg) in enumerate(zip(d["stops"], d["legs"]), 1):
        so.append([i, d["area"], n, s["name"], s["industry"], tier(s["score"]), s["score"], s["address"], s["city"], s["zip"], s["owner"], s["phone"], ("Reviewer's pick. " if s["callfirst"] else "") + s["hook"], round(leg), round(d["minutes"]), d["maps"] if n == 1 else ""])
for c in so[1]: c.font = Font(bold=True, color="FFFFFF"); c.fill = PatternFill("solid", fgColor="2B2320")
for i, w in enumerate([5, 24, 5, 32, 28, 8, 6, 30, 16, 8, 24, 16, 50, 10, 8, 40], 1): so.column_dimensions[get_column_letter(i)].width = w
so.freeze_panes = "A2"
sg = wbo.create_sheet("Single stops"); sg.append(["Business", "Type", "Likelihood", "Address", "City", "Who to ask for", "Phone", "Talking point"])
for d in singles:
    s = d["stops"][0]; sg.append([s["name"], s["industry"], tier(s["score"]), s["address"], s["city"], s["owner"], s["phone"], s["hook"]])
sk = wbo.create_sheet("Not on any route"); sk.append(["Business", "Reason"]); [sk.append(list(x)) for x in sorted(skipped)]
wbo.save(CFG["out_xlsx"])
# a "How to read" sheet first
ho = wbo.create_sheet("How to read this", 0)
for line in ["One row on the Route plan sheet = one business to visit. Rows are grouped by Day; do each day in Stop order.",
             "Likelihood: Best bet = most likely to sign (recovery studios, IV lounges, performance gyms with a named owner or talking point); Good fit = worth the stop; Also nearby = on the way.",
             f"Time for the outing = {STOP} minutes at each business plus driving between stops; it does not include the drive from home to the first stop.",
             "Directions = a Google Maps link on the first row of each day with the stops already in order.",
             "Reviewer's pick in the Talking point column = a business the list critique singled out as a top prospect.",
             "Single stops sheet = businesses with no other prospect within a two-hour loop; visit when you are already in that town. Not on any route sheet = left out, with the reason."]:
    ho.append([line])
ho.column_dimensions["A"].width = 140
print(f"{len(days)} days, {tot_stops} stops, skipped {len(skipped)} -> {CFG['out_md']}")
