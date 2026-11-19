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
const { notifyArchivedBulk } = require("./_lib/email");

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

    // Bulk email to every archived rental requester with an email address.
    // One individual email per person (never a group send), paced under the
    // Resend 2/sec limit; a failed send is reported, not fatal to the batch.
    // Each emailed booking gets lastBulkEmailedAt stamped so the admin portal
    // can show who was already emailed.
    if (method === "POST" && id === "email-archived") {
      const body = parseBody(event);
      const subject = String(body.subject || "").trim();
      const message = String(body.message || "").trim();
      if (!subject || !message) return json(400, { error: "subject_and_message_required" });
      if (message.length > 5000) return json(400, { error: "message_too_long" });
      const archived = await listBookings({ status: "archived" });
      const sent = [], skipped = [], failed = [];
      for (const b of archived) {
        if (!b.email) { skipped.push({ id: b.id, reason: "no_email" }); continue; }
        try {
          await notifyArchivedBulk(b, subject, message);
          const updated = await updateBooking(b.id, { lastBulkEmailedAt: new Date().toISOString() });
          sent.push({ id: b.id, email: b.email, lastBulkEmailedAt: updated.lastBulkEmailedAt });
        } catch (err) {
          console.error("archived bulk email failed", b.id, err.message);
          failed.push({ id: b.id, email: b.email, reason: err.message || "send_failed" });
        }
        await new Promise((r) => setTimeout(r, 600));
      }
      return json(200, { sent, skipped, failed });
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
      if (["new", "contacted", "approved", "rejected", "converted", "lead", "archived"].includes(body.status)) {
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

      // Archiving stamps the date; unarchiving clears it so the stamp always
      // means "archived right now, since this date".
      if (patch.status === "archived" && existing.status !== "archived") {
        patch.archivedAt = new Date().toISOString();
      }
      if (patch.status && patch.status !== "archived" && existing.status === "archived") {
        patch.archivedAt = null;
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
