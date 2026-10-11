"""Geocode prospect addresses with OpenStreetMap Nominatim (1 request per second, cached).

Usage: python3 geocode_prospects.py <workbook.xlsx> <state_abbrev> [--skip-industry "High schools and colleges (athletics)"]
Cache: geocode_cache.json next to this script, keyed by the normalized "address, city, ST" string.
"""
import json, os, re, sys, time, urllib.parse, urllib.request
import openpyxl

HERE = os.path.dirname(os.path.abspath(__file__))
CACHE = os.path.join(HERE, "geocode_cache.json")
UA = "PurebaricRoutePlanner/1.0 (matthewbailie@gmail.com)"

def key(addr, city, st):
    a = re.sub(r"\s+", " ", (addr or "").split(",")[0].strip())
    a = re.sub(r"\b(suite|ste|unit|bldg|building|#)\s*[A-Za-z0-9-]+\b", "", a, flags=re.I).strip(" ,")
    return f"{a}, {city}, {st}".lower()

def geocode(q):
    url = "https://nominatim.openstreetmap.org/search?" + urllib.parse.urlencode({"format": "json", "limit": 1, "q": q, "countrycodes": "us"})
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    with urllib.request.urlopen(req, timeout=30) as r:
        data = json.load(r)
    if data:
        return {"lat": float(data[0]["lat"]), "lon": float(data[0]["lon"]), "display": data[0].get("display_name", "")}
    return None

def main():
    wb_path, st = sys.argv[1], sys.argv[2]
    skip = set()
    if "--skip-industry" in sys.argv:
        skip.add(sys.argv[sys.argv.index("--skip-industry") + 1])
    cache = json.load(open(CACHE)) if os.path.exists(CACHE) else {}
    wb = openpyxl.load_workbook(wb_path, read_only=True); ws = [w for w in wb.worksheets if "rospect" in w.title][0]
    rows = list(ws.iter_rows(values_only=True)); h = list(rows[0])
    todo = []
    for r in rows[1:]:
        d = dict(zip(h, r))
        if not d.get("Business") or not d.get("Address") or d.get("Industry") in skip: continue
        k = key(d["Address"], d.get("City") or "", st)
        if k not in cache: todo.append(k)
    todo = sorted(set(todo)); print("to geocode:", len(todo), "cached:", len(cache))
    for i, k in enumerate(todo, 1):
        try:
            res = geocode(k)
        except Exception as e:
            res = None; print("error", k, e)
        if res is None:
            # retry with the city only so the row still lands in the right town (flagged)
            city = k.split(", ")[-2] if k.count(", ") >= 2 else ""
            try:
                res = geocode(f"{city}, {st}") if city else None
            except Exception:
                res = None
            if res: res["approx"] = True
        cache[k] = res or {"lat": None, "lon": None}
        if i % 10 == 0:
            json.dump(cache, open(CACHE, "w"), indent=0); print(i, "done")
        time.sleep(1.05)
    json.dump(cache, open(CACHE, "w"), indent=0)
    print("finished; cache size", len(cache))

if __name__ == "__main__":
    main()
