#!/usr/bin/env python3
"""Checks each prospect's website for the words "hyperbaric" or "HBOT" and writes a
"Hyperbaric on website" column (Yes / No / Unknown) into prospect workbooks.

    python3 hbot_site_check.py check  <workbook.xlsx> [...]   # crawl every Website in the Prospects sheet, cache results
    python3 hbot_site_check.py apply  <workbook.xlsx> [...]   # insert/refresh the column from the cache

Cache: hbot_site_check_cache.json next to this script, keyed by normalized domain. Fetches the homepage and up to
4 same-site links whose URL or text mentions services, recovery, therapy, wellness, amenities, treatments or pricing.
"Unknown" = no website on the row, or the site could not be fetched. Research tooling only; not part of the website.
"""
import json, os, re, sys, time, concurrent.futures as cf
from urllib.parse import urljoin, urlparse
import requests
from openpyxl import load_workbook
from openpyxl.styles import Font, PatternFill, Alignment

HERE = os.path.dirname(os.path.abspath(__file__))
CACHE = os.path.join(HERE, "hbot_site_check_cache.json")
UA = {"User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0 Safari/537.36"}
WORD = re.compile(r"hyperbaric|\bhbot\b|\bmhbot\b", re.I)
LINK = re.compile(r'href=["\']([^"\']+)["\'][^>]*>(.{0,80}?)<', re.I | re.S)
TOPICS = re.compile(r"service|recover|therap|wellness|amenit|treatment|pricing|menu|offer|modalit", re.I)
SKIP_HOSTS = ("facebook.com", "instagram.com", "yelp.com", "fresha.com", "vagaro.com", "classpass.com", "crossfit.com",
              "lantern.llc", "knoxvillechamber.com", "blountpartnership.com", "mindbodyonline.com", "linkedin.com", "google.com")

def norm_site(w):
    w = (w or "").strip()
    if not w: return ""
    if not w.startswith("http"): w = "https://" + w
    p = urlparse(w); host = p.netloc.lower().replace("www.", "")
    return host + (p.path.rstrip("/") if p.path and p.path != "/" else "")

def fetch(url, timeout=12):
    r = requests.get(url, headers=UA, timeout=timeout, allow_redirects=True)
    if r.status_code >= 400: raise RuntimeError("HTTP %s" % r.status_code)
    return r.url, r.text[:600000]

def check_site(site):
    key = norm_site(site)
    if not key: return {"result": "Unknown", "why": "no website"}
    if any(h in key for h in SKIP_HOSTS): return {"result": "Unknown", "why": "directory or social link, not the business's own site"}
    base = "https://" + key
    try:
        final, html = fetch(base)
    except Exception as e1:
        try:
            final, html = fetch("http://" + key)
        except Exception as e2:
            return {"result": "Unknown", "why": "fetch failed: %s" % str(e2)[:80]}
    pages = [final]
    if WORD.search(html):
        return {"result": "Yes", "why": "found on " + final, "pages": pages}
    host = urlparse(final).netloc
    seen, cands = set(), []
    for href, text in LINK.findall(html):
        u = urljoin(final, href.split("#")[0])
        if urlparse(u).netloc != host or u in seen or not (TOPICS.search(u) or TOPICS.search(re.sub("<[^>]+>", "", text))):
            continue
        seen.add(u); cands.append(u)
        if len(cands) >= 4: break
    for u in cands:
        try:
            f2, h2 = fetch(u, timeout=10); pages.append(f2)
            if WORD.search(h2): return {"result": "Yes", "why": "found on " + f2, "pages": pages}
        except Exception:
            continue
    return {"result": "No", "why": "not found on %d page(s) checked" % len(pages), "pages": pages}

def load_cache():
    return json.load(open(CACHE)) if os.path.exists(CACHE) else {}

def sites_in(wb):
    out = []
    for name in wb.sheetnames:
        ws = wb[name]; hdr = [c.value for c in ws[1]]
        if "Website" not in hdr: continue
        wi = hdr.index("Website")
        for r in ws.iter_rows(min_row=2, values_only=True):
            if r[wi]: out.append(str(r[wi]))
    return out

def cmd_check(paths):
    cache = load_cache(); todo = []
    for p in paths:
        for s in sites_in(load_workbook(p)):
            k = norm_site(s)
            if k and k not in cache and k not in todo: todo.append(k)
    print(f"{len(todo)} sites to check ({len(cache)} cached)")
    done = 0
    with cf.ThreadPoolExecutor(max_workers=12) as ex:
        for k, res in zip(todo, ex.map(check_site, todo)):
            cache[k] = {**res, "checked": time.strftime("%Y-%m-%d")}
            done += 1
            if done % 25 == 0:
                json.dump(cache, open(CACHE, "w"), indent=1); print(done, "checked")
    json.dump(cache, open(CACHE, "w"), indent=1)
    from collections import Counter; print(Counter(v["result"] for v in cache.values()))

def cmd_apply(paths):
    cache = load_cache(); COL = "Hyperbaric on website"
    for p in paths:
        wb = load_workbook(p); n = 0
        for name in wb.sheetnames:
            ws = wb[name]; hdr = [c.value for c in ws[1]]
            if "Website" not in hdr or "Business" not in hdr: continue
            wi = hdr.index("Website") + 1
            if COL in hdr:
                ci = hdr.index(COL) + 1
            else:
                ci = hdr.index("Industry") + 2 if "Industry" in hdr else 3
                ws.insert_cols(ci); c = ws.cell(row=1, column=ci, value=COL)
                ref = ws.cell(row=1, column=1); c.font = Font(bold=True, color="FFFFFF"); c.fill = PatternFill("solid", fgColor="2B2320")
                ws.column_dimensions[c.column_letter].width = 14
                hdr = [c.value for c in ws[1]]; wi = hdr.index("Website") + 1
            for row in range(2, ws.max_row + 1):
                site = ws.cell(row=row, column=wi).value
                res = cache.get(norm_site(str(site or "")), {"result": "Unknown"})["result"] if site else "Unknown"
                ws.cell(row=row, column=ci, value=res).alignment = Alignment(wrap_text=True, vertical="top"); n += 1
            if ws.auto_filter.ref: ws.auto_filter.ref = ws.dimensions
        wb.save(p); print(p, n, "rows updated")

if __name__ == "__main__":
    cmd, paths = sys.argv[1], sys.argv[2:]
    {"check": cmd_check, "apply": cmd_apply}[cmd](paths)
