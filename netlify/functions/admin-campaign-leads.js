// GET /api/admin/campaign-leads?from=YYYY-MM-DD&to=YYYY-MM-DD[&campaign=<id>] — admin "Leads by Campaign":
// real and partial leads grouped by the campaign or source that brought them, with spend: live from
// Google Ads (through GA4) and Meta for rows with an ad platform campaign name, else hand-entered.
// Read-only: it lists Stripe subscriptions, reads the portal stores and the campaign list, and makes
// read-only GA4 / Meta calls; it never writes. The response is aggregates and campaign-list rows only; every rule lives in _lib/campaign-leads.js.
const { requireAuth, json } = require("./_lib/admin");
const storage = require("./_lib/storage");
const { stripeClientFrom } = require("./_lib/stripe");
const C = require("./_lib/constellation");
const L = require("./_lib/campaign-leads");
const gaTraffic = require("./_lib/ga-traffic");
const gaOkr = require("./_lib/ga-okr");
const meta = require("./_lib/meta-ads");

const PROPERTY = (process.env.GA4_PROPERTY_ID || "555169638").trim();

// Live spend by ad platform campaign name for the range, only for platforms some row asks for. Never throws.
async function liveSpend(campaigns, range, { env = process.env, fetchFn = fetch } = {}) {
  const wants = (ch) => (campaigns || []).some((r) => r.channel === ch && r.adsCampaignName);
  const metaCfg = meta.metaEnv(env);
  const [google, fb] = await Promise.all([
    wants("Google") ? gaOkr.fetchAdsCost({ sa: gaTraffic.parseServiceAccount(env.GA4_SERVICE_ACCOUNT), propertyId: PROPERTY, from: range.from, to: range.to, fetchFn }) : null,
    wants("Meta") && metaCfg ? meta.fetchMetaSpend({ ...metaCfg, from: range.from, to: range.to, fetchFn }) : null,
  ]);
  if (google && !google.ok) console.error("admin-campaign-leads Google Ads cost:", google.reason);
  if (fb && !fb.ok) console.error("admin-campaign-leads Meta:", fb.reason);
  return { google, meta: fb };
}

async function listSubscriptions(stripe) {
  return stripe.subscriptions.list({ status: "all", limit: 100, expand: ["data.customer"] }).autoPagingToArray({ limit: 2000 });
}

exports._test = { liveSpend };

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
    const today = C.mtDayOfMs(Date.now());
    const r0 = L.resolveRange({ from: q.from, to: q.to, campaignId: q.campaign, rows: campaigns, today });
    const live = await liveSpend(campaigns, { from: r0.from, to: r0.to < today ? r0.to : today });
    const report = L.buildCampaignReport({
      bookings, waitlist, customers, contacts, campaigns, subs, config,
      stripe: { configured: !!stripe, error: stripeError },
      nowMs: Date.now(), fetchedAt: { portalMs, stripeMs },
      from: q.from, to: q.to, campaignId: q.campaign, liveSpend: live,
    });
    return json(200, report);
  } catch (err) {
    console.error("admin-campaign-leads error", err);
    return json(500, { error: "internal_error" });
  }
};
