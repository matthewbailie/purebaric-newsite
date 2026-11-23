// Scheduled (see netlify.toml): the safety net behind the Stripe webhook. Compares every open rental
// with its Stripe subscription and fixes any drift in billing dates or rate, so a missed or
// unregistered webhook event can never leave the portal out of step with Stripe for long.
// Read-only on Stripe. The log lists rental ids and new dates only, never renter details.
const { runBillingSync } = require("./_lib/stripe-billing-job");

exports.handler = async () => {
  try {
    const summary = await runBillingSync({ budgetMs: 20000 });
    console.log("stripe-billing-sync done", JSON.stringify(summary));
    return { statusCode: 200, body: JSON.stringify(summary) };
  } catch (err) {
    console.error("stripe-billing-sync error", err);
    return { statusCode: 500, body: JSON.stringify({ error: "stripe_billing_sync_failed" }) };
  }
};
