const { getRental, updateRental, listRentals, getStripeConfig } = require("./_lib/storage");
const { stripeClientFrom } = require("./_lib/stripe");
const { syncRentalPayments } = require("./_lib/stripe-sync");
const { subscriptionForRental, billingFromSubscription, billingPatch } = require("./_lib/stripe-billing");
const { mountainToday } = require("./_lib/delivery");
const { requireAuth, parseBody, json } = require("./_lib/admin");

// POST /api/admin/stripe-sync  body { rentalId }
// Brings the rental's billing dates and rate in line with its Stripe subscription (when it has one),
// then re-totals its payments from Stripe and saves the paid total, payment status, last payment
// date and the payment list on the rental. Read-only on the Stripe side. Returns them.
exports.handler = async (event, context) => {
  const authErr = await requireAuth(event, context);
  if (authErr) return authErr;
  if (event.httpMethod !== "POST") return json(405, { error: "method_not_allowed" });

  const stripe = stripeClientFrom(await getStripeConfig());
  if (!stripe) return json(503, { error: "stripe_not_configured", message: "Add your Stripe secret key in admin → Pricing & Payments first." });
  try {
    const body = parseBody(event);
    if (!body.rentalId) return json(400, { error: "rentalId required" });
    let rental = await getRental(body.rentalId);
    if (!rental) return json(404, { error: "rental_not_found" });
    const today = mountainToday();
    const others = (await listRentals({})).filter((r) => r.id !== rental.id && r.stripeSubscriptionId);
    const sub = await subscriptionForRental(stripe, rental, { taken: new Set(others.map((r) => r.stripeSubscriptionId)) });
    const billing = sub ? billingPatch(rental, billingFromSubscription(sub), today) : null;
    if (billing) rental = await updateRental(rental.id, billing);
    const { payments, total, patch } = await syncRentalPayments(stripe, rental, today);
    const updated = await updateRental(rental.id, patch);
    return json(200, { rental: updated, payments, total, billingUpdated: !!billing, subscriptionId: sub ? sub.id : null });
  } catch (err) {
    console.error("admin-stripe-sync error", err);
    return json(500, { error: err.message || "internal_error" });
  }
};
