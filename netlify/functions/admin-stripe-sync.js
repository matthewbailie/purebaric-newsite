const { getRental, updateRental, getStripeConfig } = require("./_lib/storage");
const { stripeClientFrom } = require("./_lib/stripe");
const { syncRentalPayments } = require("./_lib/stripe-sync");
const { requireAuth, parseBody, json } = require("./_lib/admin");

// POST /api/admin/stripe-sync  body { rentalId }
// Re-totals the rental's payments from Stripe (read-only on the Stripe side) and saves the paid
// total, payment status, last payment date and the payment list on the rental. Returns them.
exports.handler = async (event, context) => {
  const authErr = await requireAuth(event, context);
  if (authErr) return authErr;
  if (event.httpMethod !== "POST") return json(405, { error: "method_not_allowed" });

  const stripe = stripeClientFrom(await getStripeConfig());
  if (!stripe) return json(503, { error: "stripe_not_configured", message: "Add your Stripe secret key in admin → Pricing & Payments first." });
  try {
    const body = parseBody(event);
    if (!body.rentalId) return json(400, { error: "rentalId required" });
    const rental = await getRental(body.rentalId);
    if (!rental) return json(404, { error: "rental_not_found" });
    const { payments, total, patch } = await syncRentalPayments(stripe, rental, new Date().toISOString().slice(0, 10));
    const updated = await updateRental(rental.id, patch);
    return json(200, { rental: updated, payments, total });
  } catch (err) {
    console.error("admin-stripe-sync error", err);
    return json(500, { error: err.message || "internal_error" });
  }
};
