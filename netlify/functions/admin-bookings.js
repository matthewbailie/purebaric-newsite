const {
  listBookings,
  listRentals,
  getBooking,
  getRental,
  createBooking,
  updateBooking,
  store,
  STORES,
} = require("./_lib/storage");
const { cleanRentalType, cleanBusinessName } = require("./_lib/rental-type");
const { requireAuth, parseBody, parsePathSegments, json } = require("./_lib/admin");
const { sendRentalConfirmed } = require("./_lib/analytics");

exports.handler = async (event, context) => {
  const authErr = await requireAuth(event, context);
  if (authErr) return authErr;

  const { id } = parsePathSegments(event, "bookings");
  const method = event.httpMethod;
  const q = event.queryStringParameters || {};

  try {
    if (method === "GET" && !id) {
      const bookings = await listBookings({ status: q.status || undefined });
      return json(200, { bookings });
    }

    // Admin-entered request (a signed paper agreement, a phone call): same record shape as the public form,
    // no customer emails or alerts.
    if (method === "POST" && !id) {
      const body = parseBody(event);
      const firstName = String(body.firstName || "").trim();
      if (!firstName) return json(400, { error: "first name is required" });
      const rentalType = cleanRentalType(body.rentalType);
      const booking = await createBooking({
        firstName, lastName: String(body.lastName || "").trim(),
        email: String(body.email || "").trim().toLowerCase(),
        rentalType,
        businessName: rentalType === "business" ? cleanBusinessName(body.businessName) : "",
        phone: String(body.phone || "").trim(),
        zip: String(body.zip || "").trim(),
        streetAddress: String(body.streetAddress || "").trim(),
        city: String(body.city || "").trim(),
        state: String(body.state || "").trim(),
        startDate: String(body.startDate || "").trim(),
        rentalLength: String(body.rentalLength || "").trim(),
        requestedType: String(body.requestedType || "").trim(),
        reason: String(body.reason || "").trim(),
        adminNotes: String(body.adminNotes || "").trim(),
        source: "admin",
        outOfArea: false,
      });
      return json(201, { booking });
    }

    if (method === "PATCH" && id) {
      const existing = await getBooking(id);
      if (!existing) return json(404, { error: "not_found" });
      const body = parseBody(event);
      const patch = {};
      if (["new", "contacted", "approved", "rejected", "converted", "lead"].includes(body.status)) {
        patch.status = body.status;
      }
      if (typeof body.adminNotes === "string") patch.adminNotes = body.adminNotes;
      if (typeof body.rentalType !== "undefined") {
        patch.rentalType = cleanRentalType(body.rentalType);
        patch.businessName = patch.rentalType === "business" ? cleanBusinessName(body.businessName) : "";
      }
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
