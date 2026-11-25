// GA4 reads for the admin "OKRs, KPIs, and Metrics" sub-tab, made at request time (no cache) with the
// existing GA4_SERVICE_ACCOUNT key and GA4_PROPERTY_ID default (see _lib/ga-traffic.js for auth).
// Read-only: Data API runReport + metadata calls only. Aggregates only, no user-level data.
//
// Custom dimensions (event scope, registered on property 555169638): the event parameter names below
// are exactly what pb-metrics.js / pb-personalize.js send with gtag:
//   scroll_depth           → percent, page_path, device, variant   (pb-metrics.js funnelParams)
//   booking_form_start     → device, variant                       (book-funnel-events.js via funnelParams)
//   personalization_exposure → variant                              (pb-personalize.js)
// Each custom-dimension row auto-detects its dimension in the property metadata. Until GA lists it, the row
// says "Not connected" with the reason; once listed, it reads live and notes that GA does not backfill.

const ga = require("./ga-traffic");

const EVENTS = ["booking_form_start", "booking_request_submit", "scroll_depth", "personalization_exposure"];
const CUSTOM = { percent: "customEvent:percent", page_path: "customEvent:page_path", device: "customEvent:device", variant: "customEvent:variant" };
const BOOK_PATHS = new Set(["/book", "/book/", "/book.html"]);

const inList = (fieldName, values) => ({ filter: { fieldName, inListFilter: { values } } });
const eq = (fieldName, value) => ({ filter: { fieldName, stringFilter: { matchType: "EXACT", value } } });

// The report bodies for one MT date range (the property's time zone is America/Denver, so GA's dates are
// the same calendar days as the portal's). `has` = { [customParam]: true } from metadata; `adsCost` = the
// property exposes advertiserAdCost (Google Ads link).
function okrRequests({ from, to, paidCampaigns = [], has = {}, adsCost = false }) {
  const dateRanges = [{ startDate: from, endDate: to }];
  const req = {
    events: { dimensions: [{ name: "eventName" }], metrics: [{ name: "eventCount" }], dateRanges, dimensionFilter: inList("eventName", EVENTS), limit: 50 },
    bookPage: { dimensions: [{ name: "pagePath" }], metrics: [{ name: "screenPageViews" }], dateRanges,
      dimensionFilter: { filter: { fieldName: "pagePath", stringFilter: { matchType: "BEGINS_WITH", value: "/book" } } }, limit: 50 },
  };
  if (paidCampaigns.length) {
    req.paidSessions = { dimensions: [{ name: "sessionCampaignName" }], metrics: [{ name: "sessions" }], dateRanges, dimensionFilter: inList("sessionCampaignName", paidCampaigns), limit: 50 };
    req.paidStarts = { dimensions: [{ name: "sessionCampaignName" }], metrics: [{ name: "eventCount" }], dateRanges,
      dimensionFilter: { andGroup: { expressions: [eq("eventName", "booking_form_start"), inList("sessionCampaignName", paidCampaigns)] } }, limit: 50 };
  }
  if (adsCost) req.adsCost = { dimensions: [{ name: "sessionGoogleAdsCampaignName" }], metrics: [{ name: "advertiserAdCost" }], dateRanges, limit: 200 };
  if (has.percent) {
    const dims = [{ name: CUSTOM.percent }].concat(has.page_path ? [{ name: CUSTOM.page_path }] : []);
    req.scroll = { dimensions: dims, metrics: [{ name: "eventCount" }], dateRanges, dimensionFilter: eq("eventName", "scroll_depth"), limit: 500 };
  }
  if (has.device) req.device = { dimensions: [{ name: CUSTOM.device }], metrics: [{ name: "eventCount" }], dateRanges, dimensionFilter: eq("eventName", "booking_form_start"), limit: 20 };
  if (has.variant) req.variant = { dimensions: [{ name: CUSTOM.variant }, { name: "eventName" }], metrics: [{ name: "eventCount" }], dateRanges,
    dimensionFilter: inList("eventName", ["personalization_exposure", "booking_form_start"]), limit: 50 };
  return req;
}

const rowsOf = (resp) => ((resp && resp.rows) || []).map((r) => ({ d: (r.dimensionValues || []).map((x) => x.value), m: (r.metricValues || []).map((x) => Number(x.value) || 0) }));
const sumBy = (resp, i = 0) => { const out = {}; for (const r of rowsOf(resp)) out[r.d[i]] = (out[r.d[i]] || 0) + r.m[0]; return out; };
const total = (obj) => Object.values(obj).reduce((t, v) => t + v, 0);

// Pure: raw runReport responses → the numbers the rows need. Missing reports map to null.
function mapOkrReports(resp, has = {}) {
  const ev = sumBy(resp.events);
  const book = rowsOf(resp.bookPage).filter((r) => BOOK_PATHS.has(String(r.d[0] || "").toLowerCase())).reduce((t, r) => t + r.m[0], 0);
  const out = {
    formStarts: ev.booking_form_start || 0,
    requestSubmits: ev.booking_request_submit || 0,
    scrollEvents: ev.scroll_depth || 0,
    exposures: ev.personalization_exposure || 0,
    bookPageViews: book,
    paid: resp.paidSessions ? { sessions: total(sumBy(resp.paidSessions)), starts: total(sumBy(resp.paidStarts)) } : null,
    adsCost: resp.adsCost ? Object.fromEntries(Object.entries(sumBy(resp.adsCost)).filter(([k]) => k && k !== "(not set)")) : null,
    has: { percent: !!has.percent, page_path: !!has.page_path, device: !!has.device, variant: !!has.variant },
    scroll: null, topScrollPage: null, device: null, variant: null,
  };
  if (resp.scroll) {
    const byPct = {}; const byPage = {};
    for (const r of rowsOf(resp.scroll)) { byPct[r.d[0]] = (byPct[r.d[0]] || 0) + r.m[0]; if (r.d[1]) byPage[r.d[1]] = (byPage[r.d[1]] || 0) + r.m[0]; }
    out.scroll = { 25: byPct["25"] || 0, 50: byPct["50"] || 0, 75: byPct["75"] || 0, 90: byPct["90"] || 0 };
    const top = Object.entries(byPage).sort((a, b) => b[1] - a[1])[0];
    out.topScrollPage = top ? { path: top[0], count: top[1] } : null;
  }
  if (resp.device) { const d = sumBy(resp.device); out.device = { mobile: d.mobile || 0, desktop: d.desktop || 0, unknown: total(d) - (d.mobile || 0) - (d.desktop || 0) }; }
  if (resp.variant) {
    const v = { control: { exposures: 0, starts: 0 }, personalized: { exposures: 0, starts: 0 } };
    for (const r of rowsOf(resp.variant)) {
      const arm = v[r.d[0]]; if (!arm) continue;
      if (r.d[1] === "personalization_exposure") arm.exposures += r.m[0]; else arm.starts += r.m[0];
    }
    out.variant = v;
  }
  return out;
}

// Network: token, metadata, then every report in parallel. Never throws: returns { ok:false, reason } instead.
async function fetchOkrGa({ sa, propertyId, from, to, paidCampaigns = [], fetchFn = fetch }) {
  if (!sa) return { ok: false, reason: "Google Analytics is not set up: GA4_SERVICE_ACCOUNT is missing or unreadable." };
  try {
    const token = await ga.accessToken(sa, fetchFn);
    const meta = await ga.getMetadata(token, propertyId, fetchFn);
    const dims = new Set(meta.dimensions);
    const has = Object.fromEntries(Object.entries(CUSTOM).map(([k, api]) => [k, dims.has(api)]));
    const reqs = okrRequests({ from, to, paidCampaigns, has, adsCost: meta.metrics.includes("advertiserAdCost") });
    const keys = Object.keys(reqs);
    const resps = await Promise.all(keys.map((k) => ga.runReport(token, propertyId, reqs[k], fetchFn)));
    const resp = Object.fromEntries(keys.map((k, i) => [k, resps[i]]));
    return { ok: true, readMs: Date.now(), from, to, ...mapOkrReports(resp, has) };
  } catch (e) {
    return { ok: false, reason: `Google Analytics could not be read: ${String((e && e.message) || "error").replace(/^Google Analytics error: /, "")}` };
  }
}

// Google Ads cost by Google Ads campaign name for a range (Leads by Campaign spend). Never throws.
async function fetchAdsCost({ sa, propertyId, from, to, fetchFn = fetch }) {
  if (!sa) return { ok: false, reason: "Google Analytics is not set up." };
  try {
    const token = await ga.accessToken(sa, fetchFn);
    const resp = await ga.runReport(token, propertyId, okrRequests({ from, to, adsCost: true }).adsCost, fetchFn);
    return { ok: true, readMs: Date.now(), byCampaign: mapOkrReports({ adsCost: resp }).adsCost || {} };
  } catch (e) {
    return { ok: false, reason: String((e && e.message) || "error") };
  }
}

module.exports = { EVENTS, CUSTOM, okrRequests, mapOkrReports, fetchOkrGa, fetchAdsCost };
