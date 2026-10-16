const { listReviews, updateReview, nowIso } = require("./_lib/storage");
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
      // Reviews move between pending, published and archived. There is no delete.
      const status = body.status === "rejected" ? "archived" : body.status;
      if (["pending", "published", "archived"].includes(status)) {
        patch.status = status;
        // Stamp/clear the publish time so the public list can sort by it.
        patch.publishedAt = body.status === "published" ? nowIso() : null;
      }
      if (typeof body.text === "string") patch.text = body.text.trim().slice(0, 1500);
      if (typeof body.firstName === "string") patch.firstName = body.firstName.trim().slice(0, 40);
      if (typeof body.lastInitial === "string") patch.lastInitial = body.lastInitial.trim().slice(0, 1).toUpperCase();
      if (typeof body.city === "string") patch.city = body.city.trim().slice(0, 60);
      const stars = parseInt(body.stars, 10);
      if (stars >= 1 && stars <= 5) patch.stars = stars;
      const updated = await updateReview(id, patch);
      if (!updated) return json(404, { error: "not_found" });
      return json(200, { review: updated });
    }

    if (method === "DELETE") {
      // Owner rule (2026-10-12): reviews are archived, never deleted.
      return json(405, { error: "reviews_cannot_be_deleted" });
    }

    return json(405, { error: "method_not_allowed" });
  } catch (err) {
    console.error("admin-reviews error", err);
    return json(500, { error: err.message || "internal_error", stack: err.stack });
  }
};
