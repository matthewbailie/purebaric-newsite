const { listBookings, updateBooking, store, STORES } = require("./_lib/storage");
const { requireAuth, parseBody, parsePathSegments, json } = require("./_lib/admin");

exports.handler = async (event, context) => {
  const authErr = requireAuth(event, context);
  if (authErr) return authErr;

  const { id } = parsePathSegments(event, "bookings");
  const method = event.httpMethod;
  const q = event.queryStringParameters || {};

  try {
    if (method === "GET" && !id) {
      const bookings = await listBookings({ status: q.status || undefined });
      return json(200, { bookings });
    }

    if (method === "PATCH" && id) {
      const body = parseBody(event);
      const patch = {};
      if (["new", "contacted", "approved", "rejected", "converted"].includes(body.status)) {
        patch.status = body.status;
      }
      if (typeof body.adminNotes === "string") patch.adminNotes = body.adminNotes;
      if (typeof body.convertedRentalId === "string") patch.convertedRentalId = body.convertedRentalId;
      const updated = await updateBooking(id, patch);
      if (!updated) return json(404, { error: "not_found" });
      return json(200, { booking: updated });
    }

    if (method === "DELETE" && id) {
      await store(STORES.bookings).delete(id);
      return json(200, { ok: true });
    }

    return json(405, { error: "method_not_allowed" });
  } catch (err) {
    console.error("admin-bookings error", err);
    return json(500, { error: err.message || "internal_error", stack: err.stack });
  }
};
