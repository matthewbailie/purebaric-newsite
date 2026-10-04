const {
  listWaitlist,
  createWaitlistEntry,
  updateWaitlistEntry,
  STORES,
  store,
} = require("./_lib/storage");
const { notifyWaitlistChamberAvailable, waitlistHoldSmsText } = require("./_lib/email");
const { getTwilioConfig } = require("./_lib/storage");
const { sendSms, isComplete } = require("./_lib/sms");
// Requested monthly price: a whole-dollar amount, or null when none was given.
function parsePrice(v) { const n = Math.round(Number(v)); return Number.isFinite(n) && n > 0 ? n : null; }
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
        discountPrice: body.wantsDiscount ? parsePrice(body.discountPrice) : null,
        rentalType: body.rentalType === "business" ? "business" : "residential",
        businessName: body.rentalType === "business" ? str(body.businessName) : "",
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

      // Tell them by email and, when we have a number and Twilio is set up, by text. Both quote the
      // monthly rate they asked for when they are flagged as requesting a discount.
      // The result of each is reported back so the admin can see when a notice did not go out.
      const notified = { email: updated.email ? "pending" : "no email on file", sms: updated.phone ? "pending" : "no phone on file" };
      const sends = [];
      if (updated.email) sends.push(notifyWaitlistChamberAvailable(updated, chamber).then(() => { notified.email = "sent"; }, (err) => { notified.email = "failed: " + (err.message || "error"); console.error("waitlist email failed", err); }));
      if (updated.phone) sends.push(getTwilioConfig().then((cfg) => (isComplete(cfg) ? sendSms(updated.phone, waitlistHoldSmsText(updated, chamber), cfg) : { sent: false, reason: "twilio_not_configured" }))
        .then((r) => { notified.sms = r && r.sent ? "sent" : "failed: " + ((r && r.reason) || "error"); }, (err) => { notified.sms = "failed: " + (err.message || "error"); console.error("waitlist sms failed", err); }));
      await Promise.allSettled(sends);

      return json(200, { entry: updated, notified });
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
      if (typeof body.name === "string" && body.name.trim()) patch.name = body.name.trim();
      if (typeof body.email === "string") patch.email = body.email.trim().toLowerCase();
      if (typeof body.phone === "string") patch.phone = body.phone.trim();
      if (typeof body.zip === "string") patch.zip = body.zip.trim();
      if (typeof body.preferredStartDate === "string") patch.preferredStartDate = /^\d{4}-\d{2}-\d{2}$/.test(body.preferredStartDate) ? body.preferredStartDate : "";
      if (typeof body.adminNotes === "string") patch.adminNotes = body.adminNotes;
      if (typeof body.wantsDiscount === "boolean") patch.wantsDiscount = body.wantsDiscount;
      if ("discountPrice" in body) patch.discountPrice = parsePrice(body.discountPrice);
      if (body.wantsDiscount === false) patch.discountPrice = null;
      if (body.rentalType === "business" || body.rentalType === "residential") patch.rentalType = body.rentalType;
      if (typeof body.businessName === "string") patch.businessName = body.businessName.trim();
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
