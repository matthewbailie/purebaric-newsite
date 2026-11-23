// Runs the Stripe billing reconciliation over every rental and remembers when it last ran.
// Shared by the scheduled check (stripe-billing-sync.js) and the admin rentals list, which runs it
// first when the last check is older than STALE_MS so the portal never shows stale billing dates.
const { listRentals, updateRental, getStripeConfig, store, STORES, nowIso } = require("./storage");
const { stripeClientFrom } = require("./stripe");
const { syncAllRentalBilling } = require("./stripe-billing");
const { mountainToday } = require("./delivery");

const STALE_MS = 30 * 60 * 1000;
const KEY = "stripe-billing-sync";

async function lastRun() {
  try { return (await store(STORES.settings).get(KEY, { type: "json" })) || null; } catch (err) { return null; }
}

async function isStale(now = Date.now()) {
  const last = await lastRun();
  return !last || !last.at || now - Date.parse(last.at) > STALE_MS;
}

// budgetMs: stop starting new rentals after this long (the rest are picked up next run).
async function runBillingSync({ budgetMs = 20000 } = {}) {
  const stripe = stripeClientFrom(await getStripeConfig());
  if (!stripe) return { skipped: "stripe_not_configured" };
  const rentals = await listRentals({});
  const summary = await syncAllRentalBilling(stripe, rentals, {
    today: mountainToday(),
    save: (id, patch) => updateRental(id, patch),
    deadline: Date.now() + budgetMs,
  });
  await store(STORES.settings).setJSON(KEY, { id: KEY, at: nowIso(), checked: summary.checked, changed: summary.changed.length, unmatched: summary.unmatched, errors: summary.errors });
  return summary;
}

module.exports = { STALE_MS, lastRun, isStale, runBillingSync };
