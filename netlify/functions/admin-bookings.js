const {
  listBookings,
  listRentals,
  getBooking,
  getRental,
  updateBooking,
  store,
  STORES,
} = require("./_lib/storage");
const { requireAuth, parseBody, parsePathSegments, json } = require("./_lib/admin");
const { sendRentalConfirmed } = require("./_lib/analytics");

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
      const existing = await getBooking(id);
      if (!existing) return json(404, { error: "not_found" });
      const body = parseBody(event);
      const patch = {};
      if (["new", "contacted", "approved", "rejected", "converted"].includes(body.status)) {
        patch.status = body.status;
      }
      if (typeof body.adminNotes === "string") patch.adminNotes = body.adminNotes;
      if (typeof body.convertedRentalId === "string") patch.convertedRentalId = body.convertedRentalId;
      let analyticsResult = null;

      if (patch.status === "converted" && !existing.analytics?.rentalConfirmedAt) {
        let rentalId = patch.convertedRentalId || existing.convertedRentalId;

        // Legacy fallback for a rental created before the exact booking-to-rental
        // link was saved. Only auto-link when there is one unambiguous match.
        if (!rentalId && existing.email) {
          const email = existing.email.trim().toLowerCase();
          const matches = (await listRentals()).filter((rental) =>
            rental.renter?.email?.trim().toLowerCase() === email &&
            rental.status !== "cancelled"
          );
          if (matches.length === 1) {
            rentalId = matches[0].id;
            patch.convertedRentalId = rentalId;
          }
        }

        if (!rentalId) {
          return json(409, { error: "converted_rental_required" });
        }
        const rental = await getRental(rentalId);
        if (!rental) return json(404, { error: "rental_not_found" });

        try {
          analyticsResult = await sendRentalConfirmed({ booking: existing, rental });
        } catch (err) {
          console.error("rental confirmation analytics failed", err.message);
          analyticsResult = { sent: false, reason: "delivery_failed" };
        }

        const analytics = { ...(existing.analytics || {}) };
        if (analyticsResult.sent) {
          analytics.rentalConfirmedAt = new Date().toISOString();
          analytics.rentalConfirmedEvent = "close_convert_lead";
          delete analytics.rentalConfirmedPendingReason;
        } else {
          analytics.rentalConfirmedPendingReason = analyticsResult.reason;
        }
        patch.analytics = analytics;
      }

      const updated = await updateBooking(id, patch);
      return json(200, { booking: updated, analytics: analyticsResult });
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
