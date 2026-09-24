const { getRental, updateRental, getStripeConfig } = require("./_lib/storage");
const { stripeClientFrom } = require("./_lib/stripe");

// POST /api/stripe-webhook — Stripe payment events. Verifies the signature with
// the webhook secret, then auto-reconciles the rental identified by the
// rental_id metadata set when the payment link was created.
exports.handler = async (event) => {
  const cfg = await getStripeConfig();
  const stripe = stripeClientFrom(cfg);
  const secret = (cfg.webhookSecret || "").trim();
  if (!stripe || !secret) return { statusCode: 503, body: "stripe not configured" };

  const sig = event.headers["stripe-signature"] || event.headers["Stripe-Signature"];
  let evt;
  try {
    const raw = event.isBase64Encoded ? Buffer.from(event.body, "base64") : event.body;
    evt = stripe.webhooks.constructEvent(raw, sig, secret);
  } catch (err) {
    console.error("stripe webhook signature failed", err.message);
    return { statusCode: 400, body: `Webhook Error: ${err.message}` };
  }

  try {
    if (evt.type === "payment_intent.succeeded") {
      const pi = evt.data.object;
      await applyPayment(pi.metadata && pi.metadata.rental_id, pi.amount_received || pi.amount, {
        paymentIntentId: pi.id,
      });
    } else if (evt.type === "checkout.session.completed" || evt.type === "checkout.session.async_payment_succeeded") {
      const session = evt.data.object;
      if (session.payment_status === "paid") {
        await applyPayment(session.metadata && session.metadata.rental_id, session.amount_total, {
          sessionId: session.id,
          paymentIntentId: session.payment_intent,
        });
      }
    }
    return { statusCode: 200, body: JSON.stringify({ received: true }) };
  } catch (err) {
    console.error("stripe webhook handler error", err);
    return { statusCode: 500, body: "handler_error" };
  }
};

// Idempotent: marks the rental paid with the Stripe amount. Re-processing the
// same payment (Stripe may deliver an event more than once) just re-sets it.
async function applyPayment(rentalId, amountCents, refs = {}) {
  if (!rentalId) return;
  const rental = await getRental(rentalId);
  if (!rental) {
    console.warn("stripe webhook: rental not found for", rentalId);
    return;
  }
  await updateRental(rentalId, {
    paymentStatus: "paid",
    paidAmount: (Number(amountCents) || 0) / 100,
    paymentDate: new Date().toISOString().slice(0, 10),
    paymentMethod: "stripe",
    stripeSessionId: refs.sessionId || rental.stripeSessionId || null,
    stripePaymentIntentId: refs.paymentIntentId || rental.stripePaymentIntentId || null,
  });
}
