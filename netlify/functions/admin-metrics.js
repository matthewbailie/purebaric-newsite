// GET /api/admin/metrics?period=day|week|month|quarter|year[&date=YYYY-MM-DD] — the admin "OKRs, KPIs, and
// Metrics" sub-tab: constellation OKRs, KPIs and leading metrics for one America/Denver calendar period.
// Live at request time: Stripe subscriptions, the portal stores, GA4 (existing GA4_SERVICE_ACCOUNT key;
// no cache) and Meta spend (only when META_ADS_TOKEN and META_AD_ACCOUNT_ID are both set; 5-minute
// in-memory cache). Read-only: it never writes to Blobs, Stripe, GA or Meta. The response is aggregates
// only (no names, emails, phones, addresses or notes); every rule lives in _lib/constellation.js.
const { requireAuth, json } = require("./_lib/admin");
const storage = require("./_lib/storage");
const { stripeClientFrom } = require("./_lib/stripe");
const C = require("./_lib/constellation");
const S = require("./_lib/static-metrics");
const { platformOf, metaChannelOf } = require("./_lib/campaign-platform");
const gaTraffic = require("./_lib/ga-traffic");
const gaOkr = require("./_lib/ga-okr");
const meta = require("./_lib/meta-ads");

const PROPERTY = (process.env.GA4_PROPERTY_ID || "555169638").trim();

// Every subscription (any status) with its customer expanded, so the lead → rental match can compare
// emails on the server. Read-only list call.
async function listSubscriptions(stripe) {
  return stripe.subscriptions.list({ status: "all", limit: 100, expand: ["data.customer"] }).autoPagingToArray({ limit: 2000 });
}

// UTM campaign tags that count as paid: the config list plus every Meta or Google row in the campaign list.
function paidCampaignTags(config, campaigns) {
  const tags = new Set(((config.metrics.paidFormStartRate || {}).campaigns || []).map((t) => String(t).toLowerCase()));
  // Paid campaigns only: Google Ads, and Meta rows whose Channel is Paid (Rev 2 platform + channel; old rows read too).
  for (const r of campaigns || []) if ((platformOf(r) === "Google Ads" || metaChannelOf(r) === "Paid") && r.utmCampaign) tags.add(String(r.utmCampaign).toLowerCase());
  return [...tags];
}

// GA4 and Meta reads for the report's range. Never throws; failures come back as { ok:false, reason }.
async function liveSources({ range, paidCampaigns, env = process.env, fetchFn = fetch }) {
  const sa = gaTraffic.parseServiceAccount(env.GA4_SERVICE_ACCOUNT);
  const metaCfg = meta.metaEnv(env);
  if (!range) {
    const reason = "This period hasn't started yet.";
    return { ga: { ok: false, reason }, meta: { ok: false, configured: !!metaCfg, reason } };
  }
  const [ga, m] = await Promise.all([
    gaOkr.fetchOkrGa({ sa, propertyId: PROPERTY, from: range.from, to: range.to, paidCampaigns, fetchFn }),
    metaCfg ? meta.fetchMetaSpend({ ...metaCfg, from: range.from, to: range.to, fetchFn }) : Promise.resolve({ ok: false, reason: "Meta isn't connected." }),
  ]);
  return { ga, meta: { ...m, configured: !!metaCfg, byCampaign: undefined } };
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
    const [bookings, waitlist, customers, contacts, machines, rentals, stripeCfg, campaigns, staticDoc] = await Promise.all([
      storage.listBookings(),
      storage.listWaitlist(),
      storage.listManualCustomers(),
      storage.listContactMessages(),
      storage.listMachines(),
      storage.listRentals(),
      storage.getStripeConfig(),
      storage.getCampaignList(),
      storage.getStaticMetrics(),
    ]);
    const portalMs = Date.now();
    const stripe = stripeClientFrom(stripeCfg);
    const paidCampaigns = paidCampaignTags(config, campaigns);
    let subs = [];
    let stripeMs = null;
    let stripeError = null;
    const stripeRead = stripe
      ? listSubscriptions(stripe).then((s) => { subs = s; stripeMs = Date.now(); }, (e) => { stripeError = e.message || "stripe_error"; console.error("admin-metrics stripe read failed", stripeError); })
      : Promise.resolve();
    const [live] = await Promise.all([liveSources({ range: C.reportRange(period, date, Date.now()), paidCampaigns }), stripeRead]);
    if (!live.ga.ok) console.error("admin-metrics GA4:", live.ga.reason);
    if (live.meta.configured && !live.meta.ok) console.error("admin-metrics Meta:", live.meta.reason);
    const report = C.buildReport({
      period, date, nowMs: Date.now(), subs, fetchedAt: { portalMs, stripeMs },
      stripe: { configured: !!stripe, error: stripeError },
      bookings, waitlist, customers, contacts, machines, rentals, config,
      campaigns, staticValues: S.publicValues(staticDoc), ga: live.ga, meta: live.meta, paidCampaigns,
    });
    return json(200, report);
  } catch (err) {
    console.error("admin-metrics error", err);
    return json(500, { error: "internal_error" });
  }
};

exports._test = { listSubscriptions, paidCampaignTags, liveSources };
