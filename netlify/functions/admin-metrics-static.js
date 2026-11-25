// /api/admin/metrics-static — team-entered values for the static rows on "OKRs, KPIs, and Metrics" that
// have no other source (renewal touch on time, lead reply time). Stored in the settings Blobs doc
// "staticMetrics"; the server stamps updatedAt on every save (shown as "Last updated <date time MT>").
//   GET                              → { values }
//   POST { id, value, note }         → save one value (only ids in _lib/static-metrics.js STATIC_IDS)
// Aggregate text only: no names, emails or phones belong in a value or note.
const { requireAuth, json, parseBody } = require("./_lib/admin");
const storage = require("./_lib/storage");
const S = require("./_lib/static-metrics");

exports.handler = async (event, context) => {
  const authErr = await requireAuth(event, context);
  if (authErr) return authErr;
  try {
    if (event.httpMethod === "GET") return json(200, { values: S.publicValues(await storage.getStaticMetrics()) });
    if (event.httpMethod !== "POST") return json(405, { error: "method_not_allowed" });
    let body;
    try { body = parseBody(event) || {}; } catch { return json(400, { error: "bad_json", message: "Could not read the request." }); }
    const doc = await storage.getStaticMetrics();
    const r = S.saveStatic(doc, String(body.id || ""), body, { nowIso: new Date().toISOString() });
    if (r.error) return json(400, { error: "invalid", message: r.error });
    const saved = await storage.setStaticMetrics(r.doc);
    return json(200, { values: S.publicValues(saved) });
  } catch (err) {
    console.error("admin-metrics-static error", err);
    return json(500, { error: "internal_error" });
  }
};
