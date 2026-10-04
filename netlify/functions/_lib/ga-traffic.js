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

// Daily series for one year: a number for every day up to `today` (0 when GA had no row), null after.
function yearSeries(byDate, year, today, key) {
  const n = daysInYear(year);
  const last = +today.slice(0, 4) > year ? n - 1 : +today.slice(0, 4) < year ? -1 : dayIndex(today);
  const out = new Array(n).fill(null);
  for (let i = 0; i <= last && i < n; i += 1) { const d = byDate[isoFromIndex(year, i)]; out[i] = d ? d[key] : 0; }
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
  const thisMonth = inMonth(y, m, d);
  const [py, pm] = m === 1 ? [y - 1, 12] : [y, m - 1];
  const lastMonth = inMonth(py, pm);
  const idx = dayIndex(today);
  const ytd = yearSeries(byDate, y, today, key).slice(0, idx + 1);
  const lastYtd = yearSeries(byDate, y - 1, `${y - 1}-12-31`, key).slice(0, idx + 1);
  const lastYearHasData = Object.keys(byDate).some((k) => k.startsWith(`${y - 1}-`));
  return {
    thisMonth: { avgPerDay: avg(thisMonth), total: sum(thisMonth), days: thisMonth.length, label: `${MONTHS[m - 1]} ${y}` },
    lastMonth: { avgPerDay: avg(lastMonth), total: sum(lastMonth), days: lastMonth.length, label: `${MONTHS[pm - 1]} ${py}` },
    monthChangePct: pct(avg(thisMonth), avg(lastMonth)),
    ytd: { avgPerDay: avg(ytd), total: sum(ytd), days: ytd.length, label: `${y} to date` },
    lastYtd: { avgPerDay: lastYearHasData ? avg(lastYtd) : null, total: lastYearHasData ? sum(lastYtd) : null, days: lastYtd.length, label: `same days in ${y - 1}` },
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

module.exports = { rowsToMap, yearSeries, summarize, chartData, parseServiceAccount, accessToken, fetchDaily, dayIndex, daysInYear };
