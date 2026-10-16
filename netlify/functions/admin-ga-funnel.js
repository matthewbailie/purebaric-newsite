// GET /api/admin/ga-funnel[?refresh=1] — booking funnel drop-off for the Site analytics tab:
// event counts per funnel stage over the last 30 days, split into home vs business
// rentals by the booking page URL (/book vs /book?type=business).
// Results are cached in the settings store for one hour so the Google API is not hit on every load.
const { requireAuth, json } = require("./_lib/admin");
const { store, STORES } = require("./_lib/storage");
const { mountainToday } = require("./_lib/delivery");
const ga = require("./_lib/ga-traffic");

const CACHE_KEY = "gaFunnel";
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
        funnel = await ga.fetchFunnel(sa, PROPERTY);
        fetchedAt = new Date().toISOString();
        await s.setJSON(CACHE_KEY, { funnel, fetchedAt, today });
      } catch (e) {
        if (!funnel) return json(200, { configured: true, error: e.message, propertyId: PROPERTY });
        stale = e.message; // serve the last good copy and say so
      }
    }
    return json(200, { configured: true, propertyId: PROPERTY, fetchedAt, stale, today,
      windowDays: 30, stages: ga.FUNNEL_EVENTS, funnel });
  } catch (err) {
    console.error("admin-ga-funnel error", err);
    return json(500, { error: err.message || "internal_error" });
  }
};
