const { getRental, updateRental, getStripeConfig } = require("./_lib/storage");
const { stripeClientFrom } = require("./_lib/stripe");
const { requireAuth, parseBody, json } = require("./_lib/admin");

// POST /api/admin/stripe-cancel  body { rentalId, subscriptionId? }
//  - without subscriptionId: looks up the renter's Stripe subscriptions and returns
//    { candidates } for the admin to choose from. Nothing is changed.
//  - with subscriptionId: sets that subscription to stop at the END of its current billing
//    period (cancel_at_period_end): no further charges, paid time is kept. Remembers the id on the rental.
// Rentals aren't linked to Stripe subscriptions in our data, so the admin always confirms which one.

const LIVE = new Set(["active", "past_due", "trialing", "paused", "unpaid"]);
const quote = (s) => String(s || "").replace(/["\\]/g, "");

async function findCandidates(stripe, rental) {
  const renter = rental.renter || {};
  const email = quote(renter.email).toLowerCase();
  const name = quote(renter.name);
  const customers = new Map();
  if (email) {
    (await stripe.customers.list({ email, limit: 20 })).data.forEach((c) => customers.set(c.id, c));
  }
  // The email on the waiver and in Stripe can differ, so also match on the name.
  if (name) {
    try {
      (await stripe.customers.search({ query: `name:"${name}"`, limit: 20 })).data.forEach((c) => customers.set(c.id, c));
    } catch (err) { console.error("stripe customer search failed", err.message); }
  }
  const out = [];
  for (const c of customers.values()) {
    const subs = await stripe.subscriptions.list({ customer: c.id, status: "all", limit: 20, expand: ["data.items.data.price.product"] });
    for (const s of subs.data) {
      if (!LIVE.has(s.status)) continue;
      const item = s.items.data[0] || {};
      const price = item.price || {};
      const cents = price.unit_amount;
      out.push({
        id: s.id,
        status: s.status,
        cancelAtPeriodEnd: !!s.cancel_at_period_end,
        customerName: c.name || "",
        customerEmail: c.email || "",
        product: (price.product && price.product.name) || price.nickname || "",
        amount: cents == null ? null : cents / 100,
        interval: (price.recurring && price.recurring.interval) || "",
        created: s.created ? new Date(s.created * 1000).toISOString().slice(0, 10) : "",
        currentPeriodEnd: s.current_period_end ? new Date(s.current_period_end * 1000).toISOString().slice(0, 10) : "",
        matchesRate: cents != null && Math.round(Number(rental.monthlyRate) * 100) === cents,
        remembered: rental.stripeSubscriptionId === s.id,
      });
    }
  }
  return out;
}

exports.handler = async (event, context) => {
  const authErr = await requireAuth(event, context);
  if (authErr) return authErr;
  if (event.httpMethod !== "POST") return json(405, { error: "method_not_allowed" });

  const stripe = stripeClientFrom(await getStripeConfig());
  if (!stripe) {
    return json(503, { error: "stripe_not_configured", message: "Add your Stripe secret key in admin → Pricing & Payments (or Netlify env) first. The key needs permission to read customers and update subscriptions." });
  }

  try {
    const body = parseBody(event);
    if (!body.rentalId) return json(400, { error: "rentalId required" });
    const rental = await getRental(body.rentalId);
    if (!rental) return json(404, { error: "rental_not_found" });

    if (!body.subscriptionId) {
      const candidates = await findCandidates(stripe, rental);
      candidates.sort((a, b) => Number(b.matchesRate) - Number(a.matchesRate) || b.created.localeCompare(a.created));
      return json(200, { candidates });
    }

    const sub = await stripe.subscriptions.update(String(body.subscriptionId), { cancel_at_period_end: true });
    const updated = await updateRental(rental.id, {
      stripeSubscriptionId: sub.id,
      stripeCancelRequestedAt: new Date().toISOString(),
    });
    return json(200, {
      subscription: {
        id: sub.id,
        status: sub.status,
        endsOn: sub.current_period_end ? new Date(sub.current_period_end * 1000).toISOString().slice(0, 10) : null,
      },
      rental: updated,
    });
  } catch (err) {
    console.error("admin-stripe-cancel error", err);
    return json(500, { error: err.message || "internal_error" });
  }
};
