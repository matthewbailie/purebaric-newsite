// GET /api/admin/campaign-leads?from=YYYY-MM-DD&to=YYYY-MM-DD[&campaign=<id>] — admin "Leads by Campaign":
// real and partial leads grouped by the campaign or source that brought them, with hand-entered spend.
// Read-only: it lists Stripe subscriptions and reads the portal stores and the campaign list, and never
// writes. The response is aggregates and campaign-list rows only; every rule lives in _lib/campaign-leads.js.
const { requireAuth, json } = require("./_lib/admin");
const storage = require("./_lib/storage");
const { stripeClientFrom } = require("./_lib/stripe");
const C = require("./_lib/constellation");
const L = require("./_lib/campaign-leads");

async function listSubscriptions(stripe) {
  return stripe.subscriptions.list({ status: "all", limit: 100, expand: ["data.customer"] }).autoPagingToArray({ limit: 2000 });
}

exports.handler = async (event, context) => {
  const authErr = await requireAuth(event, context);
  if (authErr) return authErr;
  if (event.httpMethod !== "GET") return json(405, { error: "method_not_allowed" });
  const q = event.queryStringParameters || {};
  try {
    const config = C.loadConfig();
    const [bookings, waitlist, customers, contacts, campaigns, stripeCfg] = await Promise.all([
      storage.listBookings(),
      storage.listWaitlist(),
      storage.listManualCustomers(),
      storage.listContactMessages(),
      storage.getCampaignList(),
      storage.getStripeConfig(),
    ]);
    const portalMs = Date.now();
    const stripe = stripeClientFrom(stripeCfg);
    let subs = [];
    let stripeMs = null;
    let stripeError = null;
    if (stripe) {
      try { subs = await listSubscriptions(stripe); stripeMs = Date.now(); } catch (e) { stripeError = e.message || "stripe_error"; console.error("admin-campaign-leads stripe read failed", stripeError); }
    }
    const report = L.buildCampaignReport({
      bookings, waitlist, customers, contacts, campaigns, subs, config,
      stripe: { configured: !!stripe, error: stripeError },
      nowMs: Date.now(), fetchedAt: { portalMs, stripeMs },
      from: q.from, to: q.to, campaignId: q.campaign,
    });
    return json(200, report);
  } catch (err) {
    console.error("admin-campaign-leads error", err);
    return json(500, { error: "internal_error" });
  }
};
