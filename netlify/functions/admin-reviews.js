const {
  listReviews,
  updateReview,
  store,
  STORES,
  nowIso,
} = require("./_lib/storage");
const { requireAuth, parseBody, parsePathSegments, json } = require("./_lib/admin");

exports.handler = async (event, context) => {
  const authErr = await requireAuth(event, context);
  if (authErr) return authErr;

  const { id } = parsePathSegments(event, "reviews");
  const method = event.httpMethod;
  const q = event.queryStringParameters || {};

  try {
    if (method === "GET" && !id) {
      const reviews = await listReviews({ status: q.status || undefined });
      return json(200, { reviews });
    }

    if (method === "PATCH" && id) {
      const body = parseBody(event);
      const patch = {};
      if (["pending", "published", "rejected"].includes(body.status)) {
        patch.status = body.status;
        // Stamp/clear the publish time so the public list can sort by it.
        patch.publishedAt = body.status === "published" ? nowIso() : null;
      }
      if (typeof body.text === "string") patch.text = body.text.trim().slice(0, 1500);
      if (typeof body.firstName === "string") patch.firstName = body.firstName.trim().slice(0, 40);
      if (typeof body.lastInitial === "string") patch.lastInitial = body.lastInitial.trim().slice(0, 1).toUpperCase();
      if (typeof body.city === "string") patch.city = body.city.trim().slice(0, 60);
      const updated = await updateReview(id, patch);
      if (!updated) return json(404, { error: "not_found" });
      return json(200, { review: updated });
    }

    if (method === "DELETE" && id) {
      await store(STORES.reviews).delete(id);
      return json(200, { ok: true });
    }

    return json(405, { error: "method_not_allowed" });
  } catch (err) {
    console.error("admin-reviews error", err);
    return json(500, { error: err.message || "internal_error", stack: err.stack });
  }
};
