const { getRental, updateRental, listRentals, getStripeConfig } = require("./_lib/storage");
const { stripeClientFrom } = require("./_lib/stripe");
const { syncRentalPayments, pickRental } = require("./_lib/stripe-sync");

// POST /api/stripe-webhook — Stripe payment events. Verifies the signature with the webhook
// secret, works out which rental the payment belongs to (the rental_id tag on payment links, else
// the renter's email), then re-totals that rental's payments straight from Stripe. Because the
// total is recomputed from Stripe every time, redelivered or replayed events are harmless.
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
    const hint = await paymentHint(stripe, evt);
    if (hint) await reconcile(stripe, hint);
    return { statusCode: 200, body: JSON.stringify({ received: true }) };
  } catch (err) {
    console.error("stripe webhook handler error", err);
    return { statusCode: 500, body: "handler_error" };
  }
};

// Which rental (and renter email) does this event concern? null for events we don't act on.
async function paymentHint(stripe, evt) {
  const o = evt.data && evt.data.object;
  if (!o) return null;
  const emailOfCustomer = async (id) => {
    if (!id) return "";
    try { const c = await stripe.customers.retrieve(id); return (c && !c.deleted && c.email) || ""; } catch (err) { return ""; }
  };
  switch (evt.type) {
    case "payment_intent.succeeded":
      return { rentalId: o.metadata && o.metadata.rental_id, email: o.receipt_email || (await emailOfCustomer(o.customer)) };
    case "charge.refunded":
      return { rentalId: o.metadata && o.metadata.rental_id, email: (o.billing_details && o.billing_details.email) || o.receipt_email || (await emailOfCustomer(o.customer)) };
    case "checkout.session.completed":
    case "checkout.session.async_payment_succeeded":
      if (o.payment_status !== "paid") return null;
      return { rentalId: o.metadata && o.metadata.rental_id, email: (o.customer_details && o.customer_details.email) || o.customer_email || (await emailOfCustomer(o.customer)) };
    case "invoice.paid":
      return { rentalId: null, email: o.customer_email || (await emailOfCustomer(o.customer)) };
    default:
      return null;
  }
}

async function reconcile(stripe, { rentalId, email }) {
  const today = new Date().toISOString().slice(0, 10);
  let rental = rentalId ? await getRental(rentalId) : null;
  if (!rental && email) rental = pickRental(await listRentals({}), email, today);
  if (!rental) {
    console.warn("stripe webhook: no rental matched", rentalId || "(no rental_id)", email ? "email on file" : "(no email)");
    return;
  }
  const { patch } = await syncRentalPayments(stripe, rental, today);
  await updateRental(rental.id, patch);
}
