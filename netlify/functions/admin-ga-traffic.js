// GET /api/admin/ga-traffic[?refresh=1] — daily website visits (GA4 sessions) for the Home tab:
// this year vs last year by day, plus month-to-date and year-to-date daily averages.
// Results are cached in the settings store for about 5 minutes so the Google API is not hit on every click.
const { requireAuth, json } = require("./_lib/admin");
const { store, STORES } = require("./_lib/storage");
const { mountainToday } = require("./_lib/delivery");
const ga = require("./_lib/ga-traffic");

const CACHE_KEY = "gaTraffic";
const CACHE_MS = 5 * 60 * 1000; // about 5 minutes: close to live without calling Google on every click
const PROPERTY = (process.env.GA4_PROPERTY_ID || "555169638").trim();

exports.handler = async (event, context) => {
  const authErr = await requireAuth(event, context);
  if (authErr) return authErr;
  if (event.httpMethod !== "GET") return json(405, { error: "method_not_allowed" });
  const sa = ga.parseServiceAccount(process.env.GA4_SERVICE_ACCOUNT);
  if (!sa) return json(200, { configured: false, propertyId: PROPERTY });
  const today = mountainToday();
  const refresh = (event.queryStringParameters || {}).refresh === "1";
  const s = store(STORES.settings);
  try {
    let cached = null;
    try { cached = await s.get(CACHE_KEY, { type: "json" }); } catch (e) { cached = null; }
    let byDate = cached && cached.byDate, byPage = cached && cached.byPage, fetchedAt = cached && cached.fetchedAt, stale = false;
    if (refresh || !byDate || !byPage || !fetchedAt || Date.now() - new Date(fetchedAt).getTime() > CACHE_MS || cached.today !== today) {
      try {
        const year = +today.slice(0, 4);
        [byDate, byPage] = await Promise.all([ga.fetchDaily(sa, PROPERTY, year), ga.fetchPagesDaily(sa, PROPERTY, year)]);
        fetchedAt = new Date().toISOString();
        await s.setJSON(CACHE_KEY, { byDate, byPage, fetchedAt, today });
      } catch (e) {
        if (!byDate) return json(200, { configured: true, error: e.message, propertyId: PROPERTY });
        stale = e.message; // serve the last good copy and say so
      }
    }
    const pages = ga.summarizePages(byPage || {}, today);
    const pageCharts = {};
    for (const p of pages) pageCharts[p.label] = ga.chartData(byPage[p.label], today, "views");
    return json(200, { configured: true, propertyId: PROPERTY, fetchedAt, stale, today, metric: "sessions",
      summary: ga.summarize(byDate, today), chart: ga.chartData(byDate, today), pages, pageCharts });
  } catch (err) {
    console.error("admin-ga-traffic error", err);
    return json(500, { error: err.message || "internal_error" });
  }
};
