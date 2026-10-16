// Website traffic from Google Analytics 4 (the "Purebaric Website" property) for the admin Home tab.
//
// Auth is a Google service account whose JSON key sits in the GA4_SERVICE_ACCOUNT env var and which has
// Viewer access on the property. Everything that is pure (shaping GA rows into daily series and the
// month / year-to-date comparisons) is kept here so it can be unit-tested without Google.
const crypto = require("crypto");

const DAY = 86400000;
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function daysInYear(y) { return (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0 ? 366 : 365; }
function dayIndex(iso) { // 0 for Jan 1 of that year
  const y = +iso.slice(0, 4), m = +iso.slice(5, 7), d = +iso.slice(8, 10);
  return Math.round((Date.UTC(y, m - 1, d) - Date.UTC(y, 0, 1)) / DAY);
}
function isoFromIndex(year, i) { return new Date(Date.UTC(year, 0, 1) + i * DAY).toISOString().slice(0, 10); }
function gaDateToIso(v) { return `${v.slice(0, 4)}-${v.slice(4, 6)}-${v.slice(6, 8)}`; }

// GA rows -> { "2026-10-04": { sessions, users } } for every date returned.
function rowsToMap(rows) {
  const out = {};
  for (const r of rows || []) {
    const date = r.dimensionValues && r.dimensionValues[0] && r.dimensionValues[0].value;
    if (!/^\d{8}$/.test(String(date || ""))) continue;
    const m = r.metricValues || [];
    out[gaDateToIso(date)] = { sessions: Number(m[0] && m[0].value) || 0, users: Number(m[1] && m[1].value) || 0 };
  }
  return out;
}

// The first day Analytics has any row for (tracking started partway through 2026): days before it are
// "no data", not zero visits, so averages and the chart line begin there.
function firstDataDay(byDate) {
  const days = Object.keys(byDate).sort();
  return days.length ? days[0] : null;
}
// Daily series for one year: null before tracking began, a number for every day from then up to `today`
// (0 when GA had no row for the day), null after today.
function yearSeries(byDate, year, today, key) {
  const n = daysInYear(year);
  const last = +today.slice(0, 4) > year ? n - 1 : +today.slice(0, 4) < year ? -1 : dayIndex(today);
  const first = firstDataDay(byDate);
  const start = !first ? n : +first.slice(0, 4) < year ? 0 : +first.slice(0, 4) > year ? n : dayIndex(first);
  const out = new Array(n).fill(null);
  for (let i = start; i <= last && i < n; i += 1) { const d = byDate[isoFromIndex(year, i)]; out[i] = d ? d[key] : 0; }
  return out;
}

function avg(values) { const v = values.filter((x) => x != null); return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null; }
function sum(values) { return values.filter((x) => x != null).reduce((a, b) => a + b, 0); }
function pct(now, before) { return before > 0 && now != null ? Math.round(((now - before) / before) * 100) : null; }

// Month-to-date vs the whole previous month, and year-to-date vs the same days last year, as daily averages.
function summarize(byDate, today, key = "sessions") {
  const y = +today.slice(0, 4), m = +today.slice(5, 7), d = +today.slice(8, 10);
  const inMonth = (yy, mm, upToDay) => {
    const out = [];
    const days = new Date(Date.UTC(yy, mm, 0)).getUTCDate();
    for (let dd = 1; dd <= (upToDay || days); dd += 1) { const r = byDate[`${yy}-${String(mm).padStart(2, "0")}-${String(dd).padStart(2, "0")}`]; out.push(r ? r[key] : 0); }
    return out;
  };
  // Months before tracking began have no data rather than zero visits.
  const first = firstDataDay(byDate);
  const monthOrNull = (yy, mm, upToDay) => (first && `${yy}-${String(mm).padStart(2, "0")}-31` >= first ? inMonth(yy, mm, upToDay) : []);
  const thisMonth = monthOrNull(y, m, d);
  const [py, pm] = m === 1 ? [y - 1, 12] : [y, m - 1];
  const lastMonth = monthOrNull(py, pm);
  const idx = dayIndex(today);
  const ytd = yearSeries(byDate, y, today, key).slice(0, idx + 1);
  const lastYtd = yearSeries(byDate, y - 1, `${y - 1}-12-31`, key).slice(0, idx + 1);
  const lastYearHasData = Object.keys(byDate).some((k) => k.startsWith(`${y - 1}-`));
  return {
    thisMonth: { avgPerDay: avg(thisMonth), total: sum(thisMonth), days: thisMonth.length, label: `${MONTHS[m - 1]} ${y}` },
    lastMonth: { avgPerDay: avg(lastMonth), total: sum(lastMonth), days: lastMonth.length, label: `${MONTHS[pm - 1]} ${py}` },
    monthChangePct: pct(avg(thisMonth), avg(lastMonth)),
    ytd: { avgPerDay: avg(ytd), total: sum(ytd), days: ytd.filter((v) => v != null).length, label: `${y} to date`, since: first && first.slice(0, 4) === String(y) ? first : null },
    lastYtd: { avgPerDay: lastYearHasData ? avg(lastYtd) : null, total: lastYearHasData ? sum(lastYtd) : null, days: lastYtd.filter((v) => v != null).length, label: `same days in ${y - 1}` },
    yearChangePct: lastYearHasData ? pct(avg(ytd), avg(lastYtd)) : null,
    lastYearHasData,
  };
}

// Chart inputs: both years as daily series plus x-axis ticks at month starts and a label per day.
function chartData(byDate, today, key = "sessions") {
  const y = +today.slice(0, 4);
  const n = daysInYear(y);
  const labels = []; const ticks = [];
  for (let i = 0; i < n; i += 1) {
    const iso = isoFromIndex(y, i);
    labels.push(`${+iso.slice(8, 10)} ${MONTHS[+iso.slice(5, 7) - 1]}`);
    if (iso.slice(8, 10) === "01") ticks.push({ i, label: MONTHS[+iso.slice(5, 7) - 1] });
  }
  return { year: y, labels, ticks, thisYear: yearSeries(byDate, y, today, key), lastYear: yearSeries(byDate, y - 1, `${y - 1}-12-31`, key).slice(0, n) };
}

// ---- Per-page views ----
// GA reports page paths with their query string; fold them into the pages the owner thinks in.
const PAGE_LABELS = [
  ["/", "Home"], ["/business", "For businesses"], ["/pricing", "Pricing"], ["/chambers", "Chambers"],
  ["/how-it-works", "How it works"], ["/about", "About"], ["/reviews", "Reviews"], ["/faq", "FAQ"],
  ["/contact", "Contact"], ["/service-area", "Service area"], ["/waitlist", "Waitlist"], ["/safety", "Safety"],
  ["/terms", "Terms"], ["/privacy", "Privacy"], ["/sms-consent", "SMS consent"], ["/waitlist-confirm", "Waitlist confirmation"],
];
function normalizePage(pathPlusQuery) {
  const raw = String(pathPlusQuery || "").toLowerCase();
  const q = raw.indexOf("?");
  let path = (q === -1 ? raw : raw.slice(0, q)).replace(/\.html$/, "").replace(/\/+$/, "") || "/";
  const query = q === -1 ? "" : raw.slice(q + 1);
  if (path === "/index") path = "/";
  if (path.startsWith("/admin")) return null; // the owner's own visits
  if (path === "/book") return /(^|&)type=business(&|$)/.test(query) ? "Business booking" : "Booking";
  const hit = PAGE_LABELS.find(([p]) => p === path);
  return hit ? hit[1] : "Other";
}
// GA rows (dimensions: date, pagePathPlusQueryString; metrics: screenPageViews, activeUsers)
// -> { "Home": { "2026-10-04": { views, users } }, ... }
function pageRowsToMap(rows) {
  const out = {};
  for (const r of rows || []) {
    const dv = r.dimensionValues || [], mv = r.metricValues || [];
    const date = dv[0] && dv[0].value, label = normalizePage(dv[1] && dv[1].value);
    if (!label || !/^\d{8}$/.test(String(date || ""))) continue;
    const iso = gaDateToIso(date);
    const page = out[label] || (out[label] = {});
    const cur = page[iso] || (page[iso] = { views: 0, users: 0 });
    cur.views += Number(mv[0] && mv[0].value) || 0;
    cur.users += Number(mv[1] && mv[1].value) || 0;
  }
  return out;
}
// One compact row per page, busiest first.
function summarizePages(byPage, today) {
  const order = ["Home", "Booking", "For businesses", "Business booking"];
  return Object.keys(byPage).map((label) => {
    const s = summarize(byPage[label], today, "views");
    return { label, thisMonthAvg: s.thisMonth.avgPerDay, thisMonthTotal: s.thisMonth.total, lastMonthAvg: s.lastMonth.avgPerDay, monthChangePct: s.monthChangePct,
      ytdAvg: s.ytd.avgPerDay, ytdTotal: s.ytd.total, lastYtdAvg: s.lastYtd.avgPerDay, yearChangePct: s.yearChangePct, lastYearHasData: s.lastYearHasData };
  }).sort((a, b) => {
    const ia = order.indexOf(a.label), ib = order.indexOf(b.label);
    if (ia !== -1 || ib !== -1) return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
    if (a.label === "Other") return 1; if (b.label === "Other") return -1;
    return b.ytdTotal - a.ytdTotal;
  });
}

// ---- Google auth + report (not unit-tested; needs the network) ----
function parseServiceAccount(raw) {
  if (!raw) return null;
  try { const sa = JSON.parse(raw); return sa && sa.client_email && sa.private_key ? sa : null; } catch (e) { return null; }
}
const b64url = (buf) => Buffer.from(buf).toString("base64").replace(/=+$/, "").replace(/\+/g, "-").replace(/\//g, "_");
async function accessToken(sa, fetchFn = fetch) {
  const now = Math.floor(Date.now() / 1000);
  const header = b64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const claims = b64url(JSON.stringify({ iss: sa.client_email, scope: "https://www.googleapis.com/auth/analytics.readonly", aud: "https://oauth2.googleapis.com/token", iat: now, exp: now + 3600 }));
  const sig = b64url(crypto.sign("sha256", Buffer.from(`${header}.${claims}`), sa.private_key));
  const res = await fetchFn("https://oauth2.googleapis.com/token", {
    method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion: `${header}.${claims}.${sig}` }).toString(),
  });
  const j = await res.json();
  if (!res.ok || !j.access_token) throw new Error(`Google token error: ${j.error_description || j.error || res.status}`);
  return j.access_token;
}
async function fetchDaily(sa, propertyId, year, fetchFn = fetch) {
  const token = await accessToken(sa, fetchFn);
  const body = {
    dimensions: [{ name: "date" }],
    metrics: [{ name: "sessions" }, { name: "activeUsers" }],
    dateRanges: [{ startDate: `${year - 1}-01-01`, endDate: "today" }],
    limit: 1000,
  };
  const res = await fetchFn(`https://analyticsdata.googleapis.com/v1beta/properties/${propertyId}:runReport`, {
    method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }, body: JSON.stringify(body),
  });
  const j = await res.json();
  if (!res.ok) throw new Error(`Google Analytics error: ${(j.error && j.error.message) || res.status}`);
  return rowsToMap(j.rows);
}

async function fetchPagesDaily(sa, propertyId, year, fetchFn = fetch) {
  const token = await accessToken(sa, fetchFn);
  const body = {
    dimensions: [{ name: "date" }, { name: "pagePathPlusQueryString" }],
    metrics: [{ name: "screenPageViews" }, { name: "activeUsers" }],
    dateRanges: [{ startDate: `${year - 1}-01-01`, endDate: "today" }],
    limit: 100000,
  };
  const res = await fetchFn(`https://analyticsdata.googleapis.com/v1beta/properties/${propertyId}:runReport`, {
    method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }, body: JSON.stringify(body),
  });
  const j = await res.json();
  if (!res.ok) throw new Error(`Google Analytics error: ${(j.error && j.error.message) || res.status}`);
  return pageRowsToMap(j.rows);
}

// ---- Booking funnel drop-off ----
// The reservation funnel on /book, in the order a visitor normally moves through it.
// Home vs business is split by the page URL (/book vs /book?type=business), so no
// custom GA4 dimensions are needed.
const FUNNEL_EVENTS = [
  "booking_form_start",
  "service_area_check",
  "select_rental_plan",
  "select_delivery_date",
  "booking_request_submit",
];
const FUNNEL_SIDE_EVENTS = ["booking_form_abandon", "booking_request_error"];
const FUNNEL_ALL_EVENTS = FUNNEL_EVENTS.concat(FUNNEL_SIDE_EVENTS);

// GA rows (dimensions: eventName, pagePathPlusQueryString; metric: eventCount)
// -> { home: {eventName: count}, business: {eventName: count} }
function funnelRowsToMap(rows) {
  const out = { home: {}, business: {} };
  for (const r of rows || []) {
    const dv = r.dimensionValues || [], mv = r.metricValues || [];
    const event = dv[0] && dv[0].value;
    const path = String((dv[1] && dv[1].value) || "").toLowerCase();
    if (!FUNNEL_ALL_EVENTS.includes(event)) continue;
    if (path.indexOf("/book") === -1) continue;
    const seg = path.indexOf("type=business") !== -1 ? "business" : "home";
    const count = Number(mv[0] && mv[0].value) || 0;
    out[seg][event] = (out[seg][event] || 0) + count;
  }
  return out;
}

async function fetchFunnel(sa, propertyId, fetchFn = fetch) {
  const token = await accessToken(sa, fetchFn);
  const body = {
    dimensions: [{ name: "eventName" }, { name: "pagePathPlusQueryString" }],
    metrics: [{ name: "eventCount" }],
    dateRanges: [{ startDate: "30daysAgo", endDate: "today" }],
    dimensionFilter: {
      andGroup: { expressions: [
        { filter: { fieldName: "eventName", inListFilter: { values: FUNNEL_ALL_EVENTS } } },
        { filter: { fieldName: "pagePathPlusQueryString", stringFilter: { matchType: "CONTAINS", value: "/book" } } },
      ] },
    },
    limit: 10000,
  };
  const res = await fetchFn(`https://analyticsdata.googleapis.com/v1beta/properties/${propertyId}:runReport`, {
    method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }, body: JSON.stringify(body),
  });
  const j = await res.json();
  if (!res.ok) throw new Error(`Google Analytics error: ${(j.error && j.error.message) || res.status}`);
  return funnelRowsToMap(j.rows);
}

module.exports = { rowsToMap, firstDataDay, yearSeries, summarize, chartData, normalizePage, pageRowsToMap, summarizePages, parseServiceAccount, accessToken, fetchDaily, fetchPagesDaily, fetchFunnel, funnelRowsToMap, FUNNEL_EVENTS, FUNNEL_SIDE_EVENTS, dayIndex, daysInYear };
