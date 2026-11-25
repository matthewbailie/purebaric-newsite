// GET /api/admin/metrics?period=day|week|month|quarter|year[&date=YYYY-MM-DD] — the admin Metrics tab:
// constellation OKRs, KPIs and leading metrics for one America/Denver calendar period.
// Read-only: it lists Stripe subscriptions and reads the portal stores, and never writes to Blobs,
// Stripe or settings. The response is aggregates only (no names, emails, phones, addresses or notes);
// every rule lives in _lib/constellation.js. GA4 and ads rows are "not connected" in v1.
const { requireAuth, json } = require("./_lib/admin");
const storage = require("./_lib/storage");
const { stripeClientFrom } = require("./_lib/stripe");
const C = require("./_lib/constellation");

// Every subscription (any status) with its customer expanded, so the lead → rental match can compare
// emails on the server. Read-only list call.
async function listSubscriptions(stripe) {
  return stripe.subscriptions.list({ status: "all", limit: 100, expand: ["data.customer"] }).autoPagingToArray({ limit: 2000 });
}

exports.handler = async (event, context) => {
  const authErr = await requireAuth(event, context);
  if (authErr) return authErr;
  if (event.httpMethod !== "GET") return json(405, { error: "method_not_allowed" });
  const q = event.queryStringParameters || {};
  const period = C.PERIODS.includes(q.period) ? q.period : "day";
  const date = /^\d{4}-\d{2}-\d{2}$/.test(q.date || "") ? q.date : undefined;
  try {
    const config = C.loadConfig();
    const [bookings, waitlist, customers, contacts, machines, rentals, stripeCfg] = await Promise.all([
      storage.listBookings(),
      storage.listWaitlist(),
      storage.listManualCustomers(),
      storage.listContactMessages(),
      storage.listMachines(),
      storage.listRentals(),
      storage.getStripeConfig(),
    ]);
    const portalMs = Date.now();
    const stripe = stripeClientFrom(stripeCfg);
    let subs = [];
    let stripeMs = null;
    let stripeError = null;
    if (stripe) {
      try { subs = await listSubscriptions(stripe); stripeMs = Date.now(); } catch (e) { stripeError = e.message || "stripe_error"; console.error("admin-metrics stripe read failed", stripeError); }
    }
    const report = C.buildReport({
      period, date, nowMs: Date.now(), subs, fetchedAt: { portalMs, stripeMs },
      stripe: { configured: !!stripe, error: stripeError },
      bookings, waitlist, customers, contacts, machines, rentals, config,
    });
    return json(200, report);
  } catch (err) {
    console.error("admin-metrics error", err);
    return json(500, { error: "internal_error" });
  }
};

exports._test = { listSubscriptions };
