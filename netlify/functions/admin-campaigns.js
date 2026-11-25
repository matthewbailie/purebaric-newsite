// /api/admin/campaigns — the campaign list behind admin "Leads by Campaign" (stored server-side in the
// settings Blobs doc "campaignList"). Add and end only: there is no delete, and lead records are never
// touched. Spend is typed in by hand (Meta and Google, from Demand Gen's daily check); nothing here calls
// an ad platform.
//   GET                                   → { campaigns }
//   POST { action: "add", ...fields }     → add a row (duplicate UTM campaign tag rejected)
//   POST { action: "end", id, end }       → set or bring forward the end date
//   POST { action: "spend", id, day, amount } → record one day's spend (re-entering a day replaces it)
const { requireAuth, json, parseBody } = require("./_lib/admin");
const storage = require("./_lib/storage");
const C = require("./_lib/constellation");
const L = require("./_lib/campaign-leads");

exports.handler = async (event, context) => {
  const authErr = await requireAuth(event, context);
  if (authErr) return authErr;
  try {
    if (event.httpMethod === "GET") {
      const rows = await storage.getCampaignList();
      return json(200, { campaigns: rows.map(L.publicRow) });
    }
    if (event.httpMethod !== "POST") return json(405, { error: "method_not_allowed" });
    let body;
    try { body = parseBody(event) || {}; } catch { return json(400, { error: "bad_json", message: "Could not read the request." }); }
    const rows = await storage.getCampaignList();
    const nowIso = new Date().toISOString();
    const today = C.mtDayOfMs(Date.now());
    let result;
    if (body.action === "add") {
      const r = L.newCampaign(body, rows, { nowIso });
      result = r.error ? r : { rows: rows.concat(r.row) };
    } else if (body.action === "end") {
      result = L.endCampaign(rows, String(body.id || ""), String(body.end || today), { nowIso });
    } else if (body.action === "spend") {
      result = L.setSpend(rows, String(body.id || ""), String(body.day || ""), body.amount, { nowIso, today });
    } else {
      return json(400, { error: "bad_action", message: "Unknown action." });
    }
    if (result.error) return json(400, { error: "invalid", message: result.error });
    const saved = await storage.setCampaignList(result.rows);
    return json(200, { campaigns: saved.map(L.publicRow) });
  } catch (err) {
    console.error("admin-campaigns error", err);
    return json(500, { error: "internal_error" });
  }
};
