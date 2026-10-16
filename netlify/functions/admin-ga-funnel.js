// GET /api/admin/ga-funnel[?refresh=1] — booking funnel drop-off for the Site analytics tab:
// per-day event counts per funnel stage since 1 Jan of last year, split into home vs business
// rentals by the booking page URL (/book vs /book?type=business), plus ready-made windows
// (today, 7, 30, 90, 365 days, each with the period before) so the card follows the tab's range picker.
// Results are cached in the settings store for one hour so the Google API is not hit on every load.
const { requireAuth, json } = require("./_lib/admin");
const { store, STORES } = require("./_lib/storage");
const { mountainToday } = require("./_lib/delivery");
const ga = require("./_lib/ga-traffic");

const CACHE_KEY = "gaFunnelDaily";
const RANGES = [1, 7, 30, 90, 365];
const CACHE_MS = 60 * 60 * 1000;
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
    let funnel = cached && cached.funnel, fetchedAt = cached && cached.fetchedAt, stale = false;
    if (refresh || !funnel || !fetchedAt || Date.now() - new Date(fetchedAt).getTime() > CACHE_MS || cached.today !== today) {
      try {
        funnel = await ga.fetchFunnel(sa, PROPERTY, +today.slice(0, 4));
        fetchedAt = new Date().toISOString();
        await s.setJSON(CACHE_KEY, { funnel, fetchedAt, today });
      } catch (e) {
        if (!funnel) return json(200, { configured: true, error: e.message, propertyId: PROPERTY });
        stale = e.message; // serve the last good copy and say so
      }
    }
    const windows = {};
    for (const seg of ["home", "business"]) {
      windows[seg] = {};
      for (const d of RANGES) windows[seg][d] = ga.funnelWindow(funnel[seg], d, today);
    }
    return json(200, { configured: true, propertyId: PROPERTY, fetchedAt, stale, today, ranges: RANGES,
      stages: ga.FUNNEL_EVENTS, sideEvents: ga.FUNNEL_SIDE_EVENTS, windows });
  } catch (err) {
    console.error("admin-ga-funnel error", err);
    return json(500, { error: err.message || "internal_error" });
  }
};
