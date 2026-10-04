const {
  listWaitlist,
  createWaitlistEntry,
  updateWaitlistEntry,
  STORES,
  store,
} = require("./_lib/storage");
const { notifyWaitlistChamberAvailable } = require("./_lib/email");
const { requireAuth, parseBody, parsePathSegments, json } = require("./_lib/admin");

const HOLD_MS = 24 * 60 * 60 * 1000;

async function getEntry(id) {
  return store(STORES.waitlist).get(id, { type: "json" });
}
async function getChamber(id) {
  return store(STORES.chambers).get(id, { type: "json" });
}

exports.handler = async (event, context) => {
  const authErr = await requireAuth(event, context);
  if (authErr) return authErr;

  const { id, action } = parsePathSegments(event, "waitlist");
  const method = event.httpMethod;
  const q = event.queryStringParameters || {};

  try {
    if (method === "GET" && !id) {
      const entries = await listWaitlist({ status: q.status || undefined });
      return json(200, { waitlist: entries });
    }

    // POST (no id): an entry added by hand in the admin, e.g. someone asking for a discount
    // to be contacted when chambers are sitting idle. Name plus an email or phone is enough.
    if (method === "POST" && !id) {
      const body = parseBody(event);
      const str = (v) => String(v || "").trim();
      const name = str(body.name), email = str(body.email).toLowerCase(), phone = str(body.phone);
      if (!name || (!email && !phone)) return json(400, { error: "name and an email or phone are required" });
      const entry = await createWaitlistEntry({
        name, email, phone,
        zip: str(body.zip),
        reason: str(body.reason),
        preferredStartDate: /^\d{4}-\d{2}-\d{2}$/.test(str(body.preferredStartDate)) ? str(body.preferredStartDate) : "",
        wantsDiscount: !!body.wantsDiscount,
        adminNotes: str(body.adminNotes),
        source: "admin",
      });
      return json(201, { entry });
    }

    // POST /:id/hold, offer-hold a chamber to this entry
    if (method === "POST" && id && action === "hold") {
      const body = parseBody(event);
      if (!body.chamberId) return json(400, { error: "chamberId required" });
      const entry = await getEntry(id);
      if (!entry) return json(404, { error: "entry_not_found" });
      const chamber = await getChamber(body.chamberId);
      if (!chamber) return json(404, { error: "chamber_not_found" });

      const holdExpiresAt = new Date(Date.now() + HOLD_MS).toISOString();
      const updated = await updateWaitlistEntry(id, {
        status: "hold",
        notifiedChamberId: body.chamberId,
        notifiedAt: new Date().toISOString(),
        holdExpiresAt,
      });

      notifyWaitlistChamberAvailable(updated, chamber).catch((err) =>
        console.error("waitlist notify failed", err)
      );

      return json(200, { entry: updated });
    }

    // POST /:id/convert, mark converted (rentalId optional, for linking)
    if (method === "POST" && id && action === "convert") {
      const body = parseBody(event);
      const updated = await updateWaitlistEntry(id, {
        status: "converted",
        convertedRentalId: body.rentalId || null,
      });
      if (!updated) return json(404, { error: "not_found" });
      return json(200, { entry: updated });
    }

    if (method === "PATCH" && id) {
      const body = parseBody(event);
      const patch = {};
      if (["queued", "hold", "notified", "converted", "expired"].includes(body.status)) {
        patch.status = body.status;
      }
      if (typeof body.reason === "string") patch.reason = body.reason;
      if (typeof body.adminNotes === "string") patch.adminNotes = body.adminNotes;
      if (typeof body.wantsDiscount === "boolean") patch.wantsDiscount = body.wantsDiscount;
      if (typeof body.convertedRentalId === "string") patch.convertedRentalId = body.convertedRentalId;
      const updated = await updateWaitlistEntry(id, patch);
      if (!updated) return json(404, { error: "not_found" });
      return json(200, { entry: updated });
    }

    if (method === "DELETE" && id) {
      await store(STORES.waitlist).delete(id);
      return json(200, { ok: true });
    }

    return json(405, { error: "method_not_allowed" });
  } catch (err) {
    console.error("admin-waitlist error", err);
    return json(500, { error: err.message || "internal_error", stack: err.stack });
  }
};
