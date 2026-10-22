// Promotions list for the admin Outreach tab.
//   GET    /api/admin/promo-list        -> { subscribers: [{ id, email, name, phone, source, createdAt }] }
//   DELETE /api/admin/promo-list/<email> -> { ok: true }   (someone asked to be removed)
const { requireAuth, parsePathSegments, json } = require("./_lib/admin");
const { listPromoSubscribers, removePromoSubscriber } = require("./_lib/storage");

exports.handler = async (event, context) => {
  const authErr = await requireAuth(event, context);
  if (authErr) return authErr;
  const { id } = parsePathSegments(event, "promo-list");
  try {
    if (event.httpMethod === "GET") return json(200, { subscribers: await listPromoSubscribers() });
    if (event.httpMethod === "DELETE" && id) {
      const ok = await removePromoSubscriber(decodeURIComponent(id));
      return ok ? json(200, { ok: true }) : json(400, { error: "invalid_email" });
    }
    return json(405, { error: "method_not_allowed" });
  } catch (err) {
    console.error("admin-promo-list error", err);
    return json(500, { error: err.message || "promo_list_failed" });
  }
};
