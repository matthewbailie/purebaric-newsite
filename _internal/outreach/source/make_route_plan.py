"""Daily walk-in route plan for handing pamphlets to prospects (version 3).

Usage: python3 make_route_plan.py <config.json>
Config keys: workbook, state_abbrev, state_name, market_label, home (lat, lon), home_label, out_md, out_xlsx,
  max_minutes (120), stop_minutes (10), cluster_radius_mi (4.0), speed_mph (22), road_factor (1.3),
  exclude_industries (list), min_day_minutes (60)

What it does
- Keeps businesses that can be visited: street address that geocoded, not a school, not already offering hyperbaric,
  not tagged by the research as unverified, closed, a weak fit or a directory-only weight-loss or hormone clinic.
  College athletics departments and pro teams go to an "email first" list instead of door visits.
- Scores fit by the kind of service, not by how complete the research row is: contrast, cryo, float, sauna, IV,
  stretch and recovery studios and performance gyms score highest; aesthetics-only med spas and chain gyms lowest.
  A named owner and a reviewer's pick add a point each. Best bet = 6 or more.
- Builds days from the home base: the round trip from home, ten minutes per stop and the driving between stops must fit
  in max_minutes. Businesses that cannot be reached within that budget go to "Far trips". Businesses in the same
  building always travel together. Days under min_day_minutes are merged or moved to "On their own".
- Ranks days by best bets per hour on the road.
Geocodes come from geocode_cache.json (geocode_prospects.py and the Census batch merge).
"""
import json, math, os, re, sys, urllib.parse, datetime
from collections import Counter, defaultdict
import openpyxl
from openpyxl.styles import Font, PatternFill
from openpyxl.utils import get_column_letter
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from geocode_prospects import key as gkey, CACHE

CFG = json.load(open(sys.argv[1]))
ST, STATE = CFG["state_abbrev"], CFG["state_name"]
MAXM = CFG.get("max_minutes", 120); STOP = CFG.get("stop_minutes", 10); RAD = CFG.get("cluster_radius_mi", 4.0)
MPH = CFG.get("speed_mph", 22); RF = CFG.get("road_factor", 1.3); MIN_DAY = CFG.get("min_day_minutes", 60)
HOME = tuple(CFG["home"]); HOME_LABEL = CFG.get("home_label", "home").split(" (")[0]; HOME_NOTE = CFG.get("home_note", "")
EXCL_IND = set(CFG.get("exclude_industries", ["High schools and colleges (athletics)"]))

def miles(a, b):
    la1, lo1, la2, lo2 = map(math.radians, (a[0], a[1], b[0], b[1]))
    h = math.sin((la2-la1)/2)**2 + math.cos(la1)*math.cos(la2)*math.sin((lo2-lo1)/2)**2
    return 3958.8 * 2 * math.asin(math.sqrt(h))
def dmin(a, b):
    d = miles(a, b)
    m = d * (RF if d < 5 else (1.2 if d < 12 else 1.15))      # road factor shrinks on longer, straighter legs
    speed = MPH if d < 5 else (35 if d < 12 else 50)         # city streets, arterials, highway
    return m / speed * 60
def hm(m):
    m = int(round(m)); return f"{m//60} h {m%60:02d} min" if m >= 60 else f"{m} min"

# ---------- classification ----------
TOP_RECOVERY = re.compile(r"cryo|float|sauna|cold plunge|contrast|\bIV\b|hydration|drip|stretch|recovery|red light|compression|infrared|biohack|longevity|performance", re.I)
AESTHETIC = re.compile(r"aesthetic|medspa|med spa|skin|laser|botox|injectab|lash|brow|beauty bar|facial", re.I)
MEDICAL_WEAK = re.compile(r"weight[- ]?loss|weigh to go|\bslim\b|testosterone|\blow t\b|\btrt\b|hormone pellet|hormone (therapy|clinic|replacement)|plastic surg|ketamine|chelation|primary care|men's health|mens health|vitality clinic|semaglutide|tirzepatide", re.I)
WEAK_FIT = re.compile(r"functional medicine|hormone|thyroid|anti-aging|wellness clinic|family medicine|urgent care", re.I)
RECOVERY_SERVICE = re.compile(r"cryo|float|sauna|cold plunge|contrast|stretch|compression|red light|infrared|recovery lounge|recovery studio", re.I)
CHAIN_GYM = re.compile(r"planet fitness|anytime fitness|crunch|vasa|eos fitness|la fitness|24 hour|gold's|workout anytime|snap fitness|orangetheory|f45|burn boot camp|fit body boot camp|pure barre|club pilates|title boxing|9round", re.I)
EMAIL_FIRST = re.compile(r"universit|college|athletics|\bbyu\b|\buvu\b|\bslcc\b|utah state|westminster|football|\bsc\b|\bfc\b|ice bears|smokies|jazz|real salt lake|\bbees\b|grizzlies|royals|mammoth|utah warriors", re.I)
STATUS_BAD = [(re.compile(r"\bUNVERIFIED\b"), "research marks the business itself as unverified"),
              (re.compile(r"weak fit", re.I), "research marks it a weak fit"),
              (re.compile(r"mypeptidematch", re.I), "directory-only weight-loss or hormone listing"),
              (re.compile(r"\b(appears|is|now|likely|probably) closed\b|permanently closed|marking it closed|shows it as closed", re.I), "research says it may be closed"),
              (re.compile(r"not callable|reputation risk", re.I), "research flags it as not usable")]

def classify(d):
    ind = d.get("Industry") or ""; name = d.get("Business") or ""; notes = d.get("Notes") or ""; text = name + " " + notes
    for rx, why in STATUS_BAD:
        if rx.search(notes): return 0, why, None
    if MEDICAL_WEAK.search(name) or MEDICAL_WEAK.search(notes): return 0, "weight-loss, hormone, ketamine, plastic-surgery or similar medical practice", None
    if ind == "Sports teams and athletic programs" and EMAIL_FIRST.search(name): return 3, None, "email"
    if ind == "Recovery studios and med spas":
        hook = d.get("Personal note hook") or ""
        if TOP_RECOVERY.search(name) or RECOVERY_SERVICE.search(notes + " " + hook): base = 6
        elif AESTHETIC.search(name) or WEAK_FIT.search(name + " " + hook): base = 3
        else: base = 4
    elif ind == "CrossFit and performance gyms": base = 5
    elif ind == "Physical therapy, chiropractic, and sports medicine": base = 4 if re.search(r"sport|performance|athlet", text, re.I) else 3
    elif ind == "Sports teams and athletic programs": base = 3
    elif ind == "Gyms and fitness centers": base = 1 if CHAIN_GYM.search(name) else 2
    elif ind == "Salons and beauty studios": base = 3 if re.search(r"\bspa\b", name, re.I) else 2
    else: base = 2
    score = base + (1 if d.get("Owner / contact") else 0) + (1 if (d.get("Call first") or "") == "Yes" else 0)
    return score, None, "visit"
tier = lambda s: "Best bet" if s >= 6 else ("Good fit" if s >= 4 else "Also nearby")

def clean_street(a):
    a = re.sub(r"\(.*?\)", "", a or "").strip(" ,"); return re.sub(r"\s+", " ", a)
def is_address(a): return bool(re.match(r"^\d", clean_street(a)))
def hook_clean(h):
    h = re.sub(r"\(.*?\)|\[.*?\]", "", h or ""); h = re.sub(r"\b(per|via|according to|source:)\s+[A-Z][\w'.&/ -]{2,40}", "", h)
    h = re.sub(r"\s+", " ", h).strip(" ;,")
    m = re.match(r"(.+?[.!?])(\s|$)", h); return (m.group(1) if m else h)[:160]
def who_clean(o):
    o = re.sub(r"\(.*?\)", "", o or ""); return re.sub(r"\s+", " ", o).strip(" ,;")

# ---------- load ----------
cache = json.load(open(CACHE))
wb = openpyxl.load_workbook(CFG["workbook"], read_only=True); ws = [w for w in wb.worksheets if "rospect" in w.title][0]
rows = list(ws.iter_rows(values_only=True)); h = list(rows[0])
biz, skipped, email_first, need_address = [], [], [], []
for r in rows[1:]:
    d = dict(zip(h, r))
    if not d.get("Business"): continue
    if (d.get("Industry") or "") in EXCL_IND: continue
    if (d.get("Hyperbaric on website") or "") == "Yes": skipped.append((d["Business"], "already offers hyperbaric")); continue
    score, why, route = classify(d)
    if why: skipped.append((d["Business"], why)); continue
    rec = {"name": d["Business"], "industry": d.get("Industry") or "", "owner": who_clean(d.get("Owner / contact")), "phone": d.get("Phone") or "",
           "address": clean_street(d.get("Address")), "city": d.get("City") or "", "zip": str(d.get("ZIP") or "")[:5], "hook": hook_clean(d.get("Personal note hook")),
           "score": score, "top": (d.get("Call first") or "") == "Yes", "email": d.get("Email") or ""}
    if route == "email": email_first.append(rec); continue
    if not is_address(rec["address"]):
        if score >= 5: need_address.append(rec)
        else: skipped.append((rec["name"], "no usable street address"))
        continue
    g = cache.get(gkey(d.get("Address"), rec["city"], ST))
    if not g or g.get("lat") is None: skipped.append((rec["name"], "address could not be geocoded")); continue
    num = re.match(r"\d+", rec["address"]).group(0); disp = (g.get("display") or "")
    rec["approx"] = bool(g.get("approx")) or (bool(disp) and num not in disp.split(",")[0])
    rec["pt"] = (g["lat"], g["lon"])
    if rec["approx"]:
        # The geocoder could only place this at the street or town, which would bend the day's loop the
        # wrong way; list it for an address check instead of routing it.
        (need_address if score >= 4 else skipped).append(rec if score >= 4 else (rec["name"], "map point could not be pinned to the building"))
        continue
    biz.append(rec)

# One stop per building: businesses at the same street address (suites ignored) or the same map point are
# visited together, the extra names listed as "also here", so no building is driven to twice.
def _bldg(b):
    street = re.sub(r"\b(suite|ste|unit|apt|bldg|building|#)\.?\s*[\w-]+\b.*$", "", b["address"], flags=re.I)
    street = re.sub(r"\s+#.*$", "", street)
    return (re.sub(r"\W", "", street.lower()), re.sub(r"\W", "", b["city"].lower()))
seen, bypt = {}, {}
for b in sorted(biz, key=lambda b: -b["score"]):
    k = _bldg(b); pk = (round(b["pt"][0], 4), round(b["pt"][1], 4))
    host = seen.get(k) or bypt.get(pk)
    if host is not None: host["also"] = host.get("also", []) + [b["name"]]; continue
    seen[k] = b; bypt[pk] = b
biz = list(seen.values())

# ---------- day building ----------
def _tour_minutes(order):
    legs = [dmin(HOME, order[0]["pt"])] + [dmin(a["pt"], b["pt"]) for a, b in zip(order, order[1:])]
    return sum(legs) + dmin(order[-1]["pt"], HOME) + STOP * len(order), legs

def _improve(order):
    """Travelling-salesman polish of one day's loop (home -> stops -> home): repeat 2-opt segment
    reversals and or-opt moves (relocating runs of 1 to 3 stops) until no move shortens the loop, so the
    day drives one cohesive circuit instead of criss-crossing."""
    pts = [HOME] + [s["pt"] for s in order] + [HOME]
    n = len(pts)
    def cost(seq): return sum(dmin(seq[i], seq[i + 1]) for i in range(len(seq) - 1))
    best = cost(pts); improved = True
    while improved:
        improved = False
        # 2-opt: reverse pts[i..j] (never the fixed home endpoints)
        for i in range(1, n - 2):
            for j in range(i + 1, n - 1):
                delta = (dmin(pts[i - 1], pts[j]) + dmin(pts[i], pts[j + 1])) - (dmin(pts[i - 1], pts[i]) + dmin(pts[j], pts[j + 1]))
                if delta < -1e-6:
                    pts[i:j + 1] = pts[i:j + 1][::-1]; order[i - 1:j] = order[i - 1:j][::-1]; best += delta; improved = True
        # or-opt: move a run of 1-3 stops somewhere else in the loop
        for k in (1, 2, 3):
            i = 1
            while i + k <= n - 1:
                run_pts, run_ord = pts[i:i + k], order[i - 1:i - 1 + k]
                rest_pts, rest_ord = pts[:i] + pts[i + k:], order[:i - 1] + order[i - 1 + k:]
                # saving from lifting the run out: its two outer edges, less the edge that closes the gap (its inner edges travel with it)
                removed = dmin(pts[i - 1], pts[i]) + dmin(pts[i + k - 1], pts[i + k]) - dmin(pts[i - 1], pts[i + k])
                cand = None
                for j in range(1, len(rest_pts)):
                    for seg in (run_pts, run_pts[::-1]):
                        added = dmin(rest_pts[j - 1], seg[0]) + dmin(seg[-1], rest_pts[j]) - dmin(rest_pts[j - 1], rest_pts[j])
                        if added < removed - 1e-6 and (cand is None or added < cand[0]): cand = (added, j, seg is run_pts)
                if cand:
                    added, j, fwd = cand
                    seg_o = run_ord if fwd else run_ord[::-1]; seg_p = run_pts if fwd else run_pts[::-1]
                    pts[:] = rest_pts[:j] + seg_p + rest_pts[j:]; order[:] = rest_ord[:j - 1] + seg_o + rest_ord[j - 1:]
                    improved = True
                else:
                    i += 1
    return order

def _exact_order(stops):
    """Shortest loop home -> every stop -> home by Held-Karp dynamic programming (exact for up to 12 stops)."""
    n = len(stops); pts = [s["pt"] for s in stops]
    d_home = [dmin(HOME, p) for p in pts]
    d = [[0.0 if i == j else dmin(pts[i], pts[j]) for j in range(n)] for i in range(n)]
    INF = float("inf"); full = (1 << n) - 1
    best = [[INF] * n for _ in range(1 << n)]; parent = [[-1] * n for _ in range(1 << n)]
    for i in range(n): best[1 << i][i] = d_home[i]
    for mask in range(1, 1 << n):
        for last in range(n):
            cur = best[mask][last]
            if cur == INF or not (mask >> last) & 1: continue
            for nxt in range(n):
                if (mask >> nxt) & 1: continue
                m2 = mask | (1 << nxt); v = cur + d[last][nxt]
                if v < best[m2][nxt]: best[m2][nxt] = v; parent[m2][nxt] = last
    last = min(range(n), key=lambda i: best[full][i] + d_home[i])
    order = []; mask = full
    while last != -1:
        order.append(stops[last]); prev = parent[mask][last]; mask &= ~(1 << last); last = prev
    return order[::-1]

def route_cost(stops, polish=False):
    """Best loop for a set of stops: nearest-neighbour from every start (polished by _improve when
    asked), scored door to door (drive out, stops, drives between, drive home). Day building uses the
    quick version; every finished day is polished once at the end, which can only shorten it."""
    best = None
    for start in stops:
        order, rest, cur = [start], [s for s in stops if s is not start], start["pt"]
        while rest:
            nxt = min(rest, key=lambda s: miles(cur, s["pt"])); order.append(nxt); rest.remove(nxt); cur = nxt["pt"]
        if polish and len(order) > 2: order = _improve(order)
        total, legs = _tour_minutes(order)
        if best is None or total < best[0]: best = (total, order, legs)
    if polish and 3 <= len(stops) <= 12:
        # Exact answer for the sizes a day can hold; the heuristic above is only a fallback for bigger sets.
        order = _exact_order(list(stops)); total, legs = _tour_minutes(order)
        if total < best[0] - 1e-9: best = (total, order, legs)
    return best

far, unassigned = [], []
for b in biz:
    (far if dmin(HOME, b["pt"]) * 2 + STOP > MAXM else unassigned).append(b)
days = []
while unassigned:
    anchor = max(unassigned, key=lambda b: (b["score"], -dmin(HOME, b["pt"])))
    stops = [anchor]
    cands = sorted([b for b in unassigned if b is not anchor and miles(anchor["pt"], b["pt"]) <= RAD], key=lambda b: (-b["score"], miles(anchor["pt"], b["pt"])))
    for c in cands:
        if route_cost(stops + [c])[0] <= MAXM: stops.append(c)
    for c in [b for b in unassigned if b not in stops]:
        if any(miles(c["pt"], s["pt"]) <= 0.15 for s in stops) and route_cost(stops + [c])[0] <= MAXM: stops.append(c)
    total, order, legs = route_cost(stops)
    while total > MAXM and len(order) > 1:
        drop = min([s for s in order if s is not anchor], key=lambda s: s["score"]); order.remove(drop); total, order, legs = route_cost(order)
    for s in order: unassigned.remove(s)
    days.append({"stops": order, "legs": legs, "minutes": total})

changed = True
while changed:
    changed = False
    for d in sorted(days, key=lambda d: d["minutes"]):
        if d["minutes"] >= MIN_DAY or d not in days: continue
        best = None
        for e in days:
            if e is d: continue
            if min(miles(a["pt"], b["pt"]) for a in d["stops"] for b in e["stops"]) > RAD * 2.5: continue
            t, order, legs = route_cost(e["stops"] + d["stops"])
            if t <= MAXM and (best is None or t < best[0]): best = (t, e, order, legs)
        if best:
            t, e, order, legs = best; e.update({"stops": order, "legs": legs, "minutes": t}); days.remove(d); changed = True
singles = [d for d in days if d["minutes"] < MIN_DAY or len(d["stops"]) == 1]
days = [d for d in days if d["minutes"] >= MIN_DAY and len(d["stops"]) > 1]
for d in days:
    # Final travelling-salesman polish of each day's loop (2-opt and or-opt), now that its stops are fixed.
    if len(d["stops"]) > 2:
        t, order, legs = route_cost(d["stops"], polish=True)
        d.update({"stops": order, "legs": legs, "minutes": t})
    d["home_out"] = d["legs"][0]; d["home_back"] = dmin(d["stops"][-1]["pt"], HOME)
    d["best"] = sum(1 for s in d["stops"] if tier(s["score"]) == "Best bet")
days.sort(key=lambda d: (-(d["best"] / (d["minutes"] / 60)), -d["best"], d["minutes"]))

def street_of(a):
    a = re.sub(r"^\d+[A-Za-z]?\s+", "", a); return re.split(r",| suite| ste\b| #| unit| bldg", a, flags=re.I)[0].strip()
for d in days:
    cl = lambda c: re.sub(r"\s*\(.*?\)", "", c or "").strip()
    cities = Counter(cl(s["city"]) for s in d["stops"]); city = cities.most_common(1)[0][0]
    streets = Counter(street_of(s["address"]) for s in d["stops"] if cl(s["city"]) == city); st_, n = streets.most_common(1)[0]
    others = [c for c, _ in cities.most_common() if c != city][:2]
    d["area"] = f"{city}: {st_}" if n >= 2 else (f"{city} and {', '.join(others)}" if others else f"{city} ({d['stops'][0]['zip']})")
cnt = Counter(d["area"] for d in days); seen_n = Counter()
for d in days:
    if cnt[d["area"]] > 1: seen_n[d["area"]] += 1; d["area"] = f"{d['area']}, part {seen_n[d['area']]}"
def maps_link(stops):
    def full(s):
        # Some prospect rows already carry the city, state or ZIP inside the address; add only what is missing.
        a = s["address"].strip().rstrip(",")
        low = a.lower()
        if s["city"] and s["city"].lower() not in low: a += f", {s['city']}"
        if f" {ST.lower()}" not in a.lower() and f",{ST.lower()}" not in a.lower(): a += f", {ST}"
        if s["zip"] and s["zip"] not in a: a += f" {s['zip']}"
        return a
    parts = [urllib.parse.quote(full(s), safe="") for s in stops if is_address(s["address"])]
    hl = urllib.parse.quote(HOME_LABEL.split(" (")[0], safe="")
    return "https://www.google.com/maps/dir/" + hl + "/" + "/".join(parts) + "/" + hl
for d in days + singles: d["maps"] = maps_link(d["stops"])
main_days = [d for d in days if d["best"] >= 1]; fill_days = [d for d in days if d["best"] == 0]
ordered_days = main_days + fill_days
far_by_town = defaultdict(list)
for b in sorted(far, key=lambda b: -b["score"]): far_by_town[b["city"]].append(b)

# ---------- Pamphlets to take: one per business (shared-address businesses included), by pamphlet ----------
PAMPHLET_FOR = {"Gyms and fitness centers": "Gyms and fitness", "CrossFit and performance gyms": "CrossFit and performance",
    "Sports teams and athletic programs": "Sports teams and clubs", "High schools and colleges (athletics)": "High schools and colleges",
    "Recovery studios and med spas": "Recovery studios and med spas", "Physical therapy, chiropractic, and sports medicine": "Physical therapy and chiropractic",
    "Physical therapy and chiropractic clinics": "Physical therapy and chiropractic", "Salons and beauty studios": "Salons and day spas"}
def pamphlets(stops):
    counts = {}
    for s in stops:
        k = PAMPHLET_FOR.get(s["industry"], s["industry"] or "Other"); counts[k] = counts.get(k, 0) + 1 + len(s.get("also", []))
    items = sorted(counts.items(), key=lambda kv: (-kv[1], kv[0]))
    return sum(counts.values()), ", ".join(f"{n} {name}" for name, n in items)
for d in days + singles:
    d["pamphlets_total"], d["pamphlets_by"] = pamphlets(d["stops"])

# ---------- Markdown ----------
L = []
tot_stops = sum(len(d["stops"]) for d in days); tot_best = sum(d["best"] for d in days)
L.append(f"# {CFG['market_label']}: daily pamphlet route plan")
L.append("")
L.append(f"Generated {datetime.date.today().isoformat()} from `{os.path.basename(CFG['workbook'])}`. Start and end point for every day: {HOME_LABEL}. {HOME_NOTE}".rstrip())
L.append("")
L.append("## How this plan works")
L.append("")
L.append(f"Each **Day** is one outing from {HOME_LABEL} and back: drive to the first business, hand the pamphlet to the owner or manager and talk for about ten minutes, drive to the next, and so on, then home. The time shown for a day is the whole trip, door to door, and every day fits inside about {MAXM//60} hours. The number of businesses differs by day because the cap is on time, not on visits: a day in a dense corridor fits eight or nine quick stops; a day with longer drives fits fewer.")
L.append("")
if days:
    ex = days[0]
    L.append(f"**Example, Day 1.** {len(ex['stops'])} businesses: about {round(ex['home_out'])} minutes to the first stop, {len(ex['stops'])} x {STOP} minutes of conversation, about {round(sum(ex['legs'][1:]))} minutes driving between stops, and about {round(ex['home_back'])} minutes home. Total about {hm(ex['minutes'])}.")
    L.append("")
L.append(f"**Best bets** are the businesses most likely to say yes, judged by what they sell: contrast and cold-plunge studios, cryotherapy, float, sauna, IV lounges, stretch and recovery studios, and performance gyms, with a point added for a named owner and for a reviewer's pick. Days 1 to {len(main_days)} each include at least one best bet and are ranked by best bets per hour on the road, so start at Day 1. The fill-in days after them have no best bet and can wait.")
L.append("")
L.append("Not visited on these days: college athletics departments and pro teams (email them first; list below), businesses too far away for a two-hour round trip (listed as far trips), businesses with no usable street address (listed so an address can be found), schools, businesses that already offer hyperbaric, and businesses the research marked as unverified, closed, a weak fit, or a weight-loss or hormone clinic (listed with the reason at the end).")
L.append("")
L.append("## The days")
L.append("")
L.append("**How to read each line.** *Businesses* is the number of stops that day. *Best bets* is how many of those stops are the kinds of business most likely to sign: recovery studios, IV lounges, sauna, cryotherapy, float, stretch studios and performance gyms. The rest of the day's stops are good fits or businesses that are on the way. *Door to door* is the whole trip, including the drive from home and back. Each day's Google Maps link is in its own section under \"Stop by stop\" below.")
L.append("")
for i, d in enumerate(ordered_days, 1):
    bb = ("all " if d["best"] == len(d["stops"]) and d["best"] > 1 else "") + f"{d['best']} best bet" + ("" if d["best"] == 1 else "s")
    L.append(f"- **Day {i}, {d['area']}:** {len(d['stops'])} businesses, {bb}. About {hm(d['minutes'])} door to door. Take {d['pamphlets_total']} pamphlets.")
    if i == len(main_days) and fill_days: L.append(""); L.append("Fill-in days (no best bet):"); L.append("")
L.append("")
L.append(f"{len(days)} days in all: {tot_stops} businesses, {tot_best} best bets, about {sum(d['minutes'] for d in days)/60:.0f} hours on the road.")
L.append("")
L.append("## Stop by stop")
L.append("")
L.append("In the tables, **Chance of a yes** means: **Best bet**, the kind of business most likely to sign; **Good fit**, worth the stop; **Also nearby**, on the way, so hand them a pamphlet too. Tap the Google Maps link to open the day's route in order, starting and ending at home.")
for i, d in enumerate(ordered_days, 1):
    L.append(""); L.append(f"### Day {i}: {d['area']}"); L.append("")
    L.append(f"{len(d['stops'])} businesses, about {hm(d['minutes'])} door to door ({round(d['home_out'])} min out from {HOME_LABEL.split(' (')[0]}, {round(d['home_back'])} min back)."); L.append("")
    L.append(f"[Open Day {i} in Google Maps]({d['maps']})"); L.append("")
    L.append(f"**Pamphlets to take: {d['pamphlets_total']}** ({d['pamphlets_by']}), plus a couple of spares."); L.append("")
    L.append("| Stop | Business | Kind of business | Chance of a yes | Address | Ask for | Good to know | Drive to get here |")
    L.append("|---|---|---|---|---|---|---|---|")
    for n, (s, leg) in enumerate(zip(d["stops"], d["legs"]), 1):
        also = (" (also here: " + ", ".join(s["also"]) + ")") if s.get("also") else ""
        addr = s["address"] + (f", {s['city']}" if s["city"].lower() not in s["address"].lower() else "") + (" (map point approximate)" if s.get("approx") else "")
        who = (s['owner'] or 'the manager') + (f", {s['phone']}" if s['phone'] else "")
        L.append(f"| {n} | {s['name']}{' (top pick)' if s['top'] else ''}{also} | {s['industry']} | {tier(s['score'])} | {addr} | {who} | {s['hook']} | {round(leg)} min from {HOME_LABEL if n == 1 else 'stop ' + str(n-1)} |")
if far_by_town:
    L.append(""); L.append("## Far trips: more than two hours round trip"); L.append("")
    L.append(f"These are beyond a two-hour loop from {HOME_LABEL.split(' (')[0]}. Plan each town as a half day, or visit when you are already there.")
    L.append("")
    for town, bs in sorted(far_by_town.items(), key=lambda kv: -len(kv[1])):
        L.append(f"- **{town}** ({len(bs)}): " + "; ".join(f"{b['name']} ({tier(b['score'])}{', ' + b['owner'] if b['owner'] else ''})" for b in bs))
if singles:
    L.append(""); L.append("## On their own: pair with an errand"); L.append("")
    L.append("Each of these would be a trip for one business. Visit when you are already in that town, or add one to a nearby day if you have time left.")
    L.append("")
    for d in singles:
        for s in d["stops"]: L.append(f"- {s['name']} ({s['industry']}, {tier(s['score'])}): {s['address']}, {s['city']}. Ask for {s['owner'] or 'the manager'}{', ' + s['phone'] if s['phone'] else ''}.")
if email_first:
    L.append(""); L.append("## Email first, do not walk in"); L.append("")
    for b in sorted(email_first, key=lambda b: b["name"]): L.append(f"- {b['name']}: {b['owner'] or 'athletics office'}{', ' + b['email'] if b['email'] else ''}{', ' + b['phone'] if b['phone'] else ''}")
if need_address:
    L.append(""); L.append("## Worth a visit, but the address could not be pinned on the map"); L.append("")
    for b in sorted(need_address, key=lambda b: -b["score"]): L.append(f"- {b['name']} ({b['industry']}, {tier(b['score'])}), {b['city']}{': ' + b['address'] if b.get('address') else ''}: {b['owner']}{', ' + b['phone'] if b['phone'] else ''}. {'The map could only place this address at the street or town, so it is kept off the loops; confirm the address and it will route next time.' if b.get('approx') else 'Find the address and add it to a nearby day.'}")
if skipped:
    L.append(""); L.append("## Not on any route, and why"); L.append("")
    for name, why in sorted(skipped): L.append(f"- {name}: {why}")
open(CFG["out_md"], "w").write("\n".join(L) + "\n")

# ---------- Workbook ----------
wbo = openpyxl.Workbook(); ho = wbo.active; ho.title = "Read me first"
for line in [f"Start and end point for every day: {HOME_LABEL}. 'Door to door' time = drive out + {STOP} minutes per business + driving between stops + drive home. Every day fits in about {MAXM//60} hours.",
             "Days sheet: one row per outing, ranked by best bets per hour. Days with no best bet come last. Businesses = stops that day; Best bets = how many of those stops are the kinds of business most likely to sign; Route = tap to open the day in Google Maps.",
             "Stops sheet: one row per business, grouped by Day in visiting order. The Map link on the Days sheet opens the same order in Google Maps, starting and ending at home.",
             "Chance of a yes: Best bet = the kind of business most likely to sign (recovery, cryo, float, sauna, IV, stretch studios, performance gyms). Good fit = worth the stop. Also nearby = on the way.",
             "Top pick = a business the list critique singled out. Good to know = one fact to open with.",
             "Other sheets: Far trips (over two hours round trip), On their own (pair with an errand), Email first (college athletics and pro teams), Needs an address, Not on any route (with the reason)."]:
    ho.append([line])
ho.column_dimensions["A"].width = 150
ds = wbo.create_sheet("Days"); ds.append(["Day", "Area", "Businesses (stops that day)", "Best bets (stops most likely to sign)", "Door to door", "Out from home (min)", "Back home (min)", "Pamphlets to take", "Which pamphlets", "Route"])
for i, d in enumerate(ordered_days, 1):
    ds.append([i, d["area"], len(d["stops"]), d["best"], hm(d["minutes"]), round(d["home_out"]), round(d["home_back"]), d["pamphlets_total"], d["pamphlets_by"], f"Open Day {i} in Google Maps"])
    c = ds.cell(row=ds.max_row, column=10); c.hyperlink = d["maps"]; c.font = Font(color="1F4E79", underline="single")
so = wbo.create_sheet("Stops"); so.append(["Day", "Stop", "Business", "Also at this address", "Kind of business", "Chance of a yes", "Address", "City", "ZIP", "Ask for", "Phone", "Top pick", "Good to know", "Drive to get here (min)", "Map point approximate"])
for i, d in enumerate(ordered_days, 1):
    for n, (s, leg) in enumerate(zip(d["stops"], d["legs"]), 1):
        so.append([i, n, s["name"], ", ".join(s.get("also", [])), s["industry"], tier(s["score"]), s["address"], s["city"], s["zip"], s["owner"] or "the manager", s["phone"], "Yes" if s["top"] else "", s["hook"], round(leg), "Yes" if s.get("approx") else ""])
ft = wbo.create_sheet("Far trips"); ft.append(["Town", "Business", "Kind of business", "Chance of a yes", "Address", "Ask for", "Phone", "Good to know"])
for town, bs in sorted(far_by_town.items()):
    for b in bs: ft.append([town, b["name"], b["industry"], tier(b["score"]), b["address"], b["owner"], b["phone"], b["hook"]])
sg = wbo.create_sheet("On their own"); sg.append(["Business", "Kind of business", "Chance of a yes", "Address", "City", "Ask for", "Phone", "Good to know"])
for d in singles:
    for s in d["stops"]: sg.append([s["name"], s["industry"], tier(s["score"]), s["address"], s["city"], s["owner"], s["phone"], s["hook"]])
ef = wbo.create_sheet("Email first"); ef.append(["Business", "Contact", "Email", "Phone"])
for b in sorted(email_first, key=lambda b: b["name"]): ef.append([b["name"], b["owner"], b["email"], b["phone"]])
na = wbo.create_sheet("Needs an address"); na.append(["Business", "Kind of business", "Chance of a yes", "City", "Ask for", "Phone"])
for b in need_address: na.append([b["name"], b["industry"], tier(b["score"]), b["city"], b["owner"], b["phone"]])
sk = wbo.create_sheet("Not on any route"); sk.append(["Business", "Reason"]); [sk.append(list(x)) for x in sorted(skipped)]
for sh, widths in [(ds, [5, 34, 14, 18, 14, 10, 10, 10, 44, 26]), (so, [5, 5, 32, 24, 28, 12, 30, 16, 8, 24, 16, 8, 50, 10, 8]), (ft, [14, 32, 28, 12, 30, 24, 16, 50]), (sg, [32, 28, 12, 30, 16, 24, 16, 50]), (ef, [36, 30, 30, 16]), (na, [32, 28, 12, 16, 24, 16]), (sk, [40, 60])]:
    for c in sh[1]: c.font = Font(bold=True, color="FFFFFF"); c.fill = PatternFill("solid", fgColor="2B2320")
    for i, w in enumerate(widths, 1): sh.column_dimensions[get_column_letter(i)].width = w
    sh.freeze_panes = "A2"
wbo.save(CFG["out_xlsx"])

# ---------- JSON for the admin's Driving paths tab (optional: config key out_json) ----------
if CFG.get("out_json"):
    import json as _json, hashlib as _hashlib
    def _stop_id(s): return _hashlib.sha1((s["name"] + "|" + s["address"] + "|" + s["city"]).encode("utf8")).hexdigest()[:12]
    plan = {
        "market": CFG["market_label"], "state": CFG["state_abbrev"], "generated": datetime.date.today().isoformat(), "home_label": HOME_LABEL.split(" (")[0], "home": list(HOME),
        "cost_model": {"miles": "haversine", "road_factor": {"under_5_miles": RF, "5_to_12_miles": 1.2, "over_12_miles": 1.15}, "mph": {"under_5_miles": MPH, "5_to_12_miles": 35, "over_12_miles": 50}, "stop_minutes": STOP},
        "days": [{
            "n": i, "area": d["area"], "minutes": round(d["minutes"]), "best": d["best"], "maps": d["maps"],
            "stops": [{"id": _stop_id(s), "stop": n, "name": s["name"], "also": s.get("also", []), "industry": s["industry"], "tier": tier(s["score"]),
                       "address": s["address"], "city": s["city"], "zip": s["zip"], "lat": s["pt"][0], "lon": s["pt"][1], "owner": s["owner"] or "", "phone": s["phone"] or "", "top": bool(s["top"]), "note": s["hook"] or "",
                       "drive_min": round(leg)} for n, (s, leg) in enumerate(zip(d["stops"], d["legs"]), 1)],
        } for i, d in enumerate(ordered_days, 1)],
    }
    _json.dump(plan, open(CFG["out_json"], "w"), indent=1)
    print(f"json -> {CFG['out_json']}")
print(f"{len(days)} days ({len(main_days)} with a best bet), {tot_stops} stops, far {len(far)}, singles {sum(len(d['stops']) for d in singles)}, email-first {len(email_first)}, need address {len(need_address)}, skipped {len(skipped)} -> {CFG['out_md']}")
