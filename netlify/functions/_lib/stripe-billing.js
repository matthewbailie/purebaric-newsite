// Keeps each rental's billing dates and rate in line with its Stripe subscription. Stripe is the
// source of truth: a chamber can be reserved in the portal days or weeks before it is delivered and
// the subscription starts, so the portal's own dates are only a fallback for rentals with no
// subscription. Read-only on the Stripe side: it never creates, changes or cancels anything there.
//
// Used by the Stripe webhook (subscription and invoice events), the scheduled reconciliation
// (stripe-billing-sync.js), the admin rentals list (when the last check is stale) and the rental
// form's "Sync payments from Stripe" button. Pure apart from the `stripe` client passed in, so it is
// unit-tested with a fake in test/stripe-billing.test.js.
//
// Conventions once a rental is linked to a subscription:
//  - startDate   = the day the subscription started (Mountain time, the business's day).
//  - endDate     = the Stripe period end at the close of the rental's term (start + N months, the
//                  date Stripe would bill next), never earlier than the current period end while
//                  Stripe is still billing. If the subscription is set to stop or has ended, the day
//                  it stops.
//  - monthlyRate = what the subscription bills each period; rateType follows its interval.
//  - stripeBilling holds the raw Stripe dates (anchor, current period, stop date) for renewals.
//  - reservedStartDate / reservedEndDate / reservedMonthlyRate keep the portal's original values.

const DAY = 86400000;
const LIVE = new Set(["active", "past_due", "trialing", "paused", "unpaid"]);
const LINKABLE = new Set(["active", "scheduled"]);

const MT = new Intl.DateTimeFormat("en-US", { timeZone: "America/Denver", year: "numeric", month: "2-digit", day: "2-digit" });
function mtDay(seconds) {
  if (!seconds) return "";
  const p = Object.fromEntries(MT.formatToParts(new Date(seconds * 1000)).map((x) => [x.type, x.value]));
  return `${p.year}-${p.month}-${p.day}`;
}
const day10 = (v) => String(v || "").slice(0, 10);
const utc = (d) => { const [y, m, dd] = d.split("-").map(Number); return Date.UTC(y, m - 1, dd); };
const addDays = (d, n) => new Date(utc(d) + n * DAY).toISOString().slice(0, 10);
const daysBetween = (a, b) => Math.round((utc(b) - utc(a)) / DAY);
function addMonths(d, k) {
  const [y, m, dd] = d.split("-").map(Number);
  const idx = m - 1 + k, year = y + Math.floor(idx / 12), month = ((idx % 12) + 12) % 12;
  return new Date(Date.UTC(year, month, Math.min(dd, new Date(Date.UTC(year, month + 1, 0)).getUTCDate()))).toISOString().slice(0, 10);
}
const norm = (s) => String(s || "").trim().toLowerCase().replace(/\s+/g, " ");

// k-th billing date after the anchor. Stripe keeps the anchor's day of month (Jan 31 -> Feb 28 -> Mar 31).
function anniversary(anchor, interval, count, k) {
  return interval === "week" ? addDays(anchor, 7 * count * k) : addMonths(anchor, count * k);
}

// What the subscription bills each period, in dollars: every item's price x quantity, less a
// discount that applies for good (a one-off or limited-time promo is not the ongoing rate).
function subscriptionAmount(sub) {
  const items = (sub.items && sub.items.data) || [];
  let cents = 0;
  for (const it of items) {
    const price = it.price || it.plan || {};
    const unit = price.unit_amount != null ? price.unit_amount : price.amount;
    if (unit == null) continue;
    cents += unit * (it.quantity == null ? 1 : it.quantity);
  }
  const coupon = sub.discount && sub.discount.coupon;
  if (coupon && coupon.duration === "forever") {
    if (coupon.percent_off) cents = Math.round(cents * (1 - coupon.percent_off / 100));
    else if (coupon.amount_off) cents = Math.max(0, cents - coupon.amount_off);
  }
  return Math.round(cents) / 100;
}

// The Stripe facts the portal keeps, from a subscription object.
function billingFromSubscription(sub) {
  const item = ((sub.items && sub.items.data) || [])[0] || {};
  const recurring = (item.price && item.price.recurring) || item.plan || {};
  const periodStart = sub.current_period_start || item.current_period_start;
  const periodEnd = sub.current_period_end || item.current_period_end;
  const live = LIVE.has(sub.status);
  let stopsOn = "";
  if (!live) stopsOn = mtDay(sub.ended_at || sub.canceled_at || periodEnd);
  else if (sub.cancel_at) stopsOn = mtDay(sub.cancel_at);
  else if (sub.cancel_at_period_end) stopsOn = mtDay(periodEnd);
  return {
    subscriptionId: sub.id,
    customerId: typeof sub.customer === "string" ? sub.customer : (sub.customer && sub.customer.id) || "",
    status: sub.status,
    live,
    startDate: mtDay(sub.start_date || sub.created),
    anchorDate: mtDay(sub.billing_cycle_anchor || sub.start_date || sub.created),
    currentPeriodStart: mtDay(periodStart),
    currentPeriodEnd: mtDay(periodEnd),
    stopsOn,
    interval: recurring.interval === "week" ? "week" : "month",
    intervalCount: Number(recurring.interval_count) || 1,
    amount: subscriptionAmount(sub),
  };
}

// How many billing periods the rental's term covers, from its current dates. Rounding makes this
// the same for the portal's convention (end = day before the anniversary) and Stripe's (end = the
// anniversary), so re-syncing never drifts the term.
function termPeriods(rental, interval) {
  const start = day10(rental.startDate), end = day10(rental.endDate);
  if (!start || !end || end < start) return 1;
  const days = daysBetween(start, end);
  return Math.max(1, Math.round(days / (interval === "week" ? 7 : 30.44)));
}

// The fields to change on the rental so it matches Stripe, or null when it already does.
function billingPatch(rental, billing, today) {
  const start = billing.startDate || day10(rental.startDate);
  const periods = termPeriods(rental, billing.interval);
  // The anchor anniversary closest to start + term (they are the same day unless the anchor was moved).
  const target = billing.interval === "week" ? addDays(start, 7 * periods) : addMonths(start, periods);
  const anchor = billing.anchorDate || start;
  let termEnd = target, best = Infinity;
  const steps = Math.ceil(periods / billing.intervalCount) + 3;
  for (let k = 1; k <= steps; k += 1) {
    const d = anniversary(anchor, billing.interval, billing.intervalCount, k);
    const diff = Math.abs(daysBetween(d, target));
    if (diff < best) { best = diff; termEnd = d; }
  }
  let end;
  if (billing.stopsOn) end = billing.stopsOn;
  else end = billing.currentPeriodEnd && billing.currentPeriodEnd > termEnd ? billing.currentPeriodEnd : termEnd;
  if (end < start) end = start;

  const stored = {
    subscriptionId: billing.subscriptionId,
    status: billing.status,
    startDate: billing.startDate,
    anchorDate: billing.anchorDate,
    currentPeriodStart: billing.currentPeriodStart,
    currentPeriodEnd: billing.currentPeriodEnd,
    stopsOn: billing.stopsOn,
    interval: billing.interval,
    intervalCount: billing.intervalCount,
    amount: billing.amount,
  };
  const want = { startDate: start, endDate: end, stripeSubscriptionId: billing.subscriptionId };
  if (billing.amount > 0) want.monthlyRate = billing.amount;
  if (billing.intervalCount === 1) want.rateType = billing.interval === "week" ? "weekly" : "monthly";
  // A rental the old portal dates had already closed comes back while Stripe is still billing it.
  if (billing.live && rental.status === "completed" && end >= today) want.status = start > today ? "scheduled" : "active";

  const patch = {};
  for (const [k, v] of Object.entries(want)) {
    const cur = k === "monthlyRate" ? Number(rental[k]) : k === "rateType" ? (rental[k] === "weekly" ? "weekly" : "monthly") : rental[k];
    if (cur !== v) patch[k] = v;
  }
  const prev = rental.stripeBilling || {};
  const billingChanged = Object.keys(stored).some((k) => prev[k] !== stored[k]);
  if (!Object.keys(patch).length && !billingChanged) return null;

  if (patch.startDate && !rental.reservedStartDate) patch.reservedStartDate = rental.startDate;
  if (patch.endDate && !rental.reservedEndDate) patch.reservedEndDate = rental.endDate;
  if (patch.monthlyRate != null && rental.reservedMonthlyRate == null) patch.reservedMonthlyRate = Number(rental.monthlyRate) || 0;
  patch.stripeBilling = { ...stored, syncedAt: new Date().toISOString() };
  return patch;
}

// How well a subscription fits a rental. null when it should not be linked at all.
function matchScore(rental, billing, { emailMatch, nameMatch }) {
  if (!emailMatch && !nameMatch) return null;
  const gap = billing.startDate && day10(rental.startDate) ? Math.abs(daysBetween(day10(rental.startDate), billing.startDate)) : 999;
  if (!emailMatch && gap > 60) return null; // a name alone is too weak unless the dates line up
  const rateMatch = billing.amount > 0 && Math.round(Number(rental.monthlyRate) * 100) === Math.round(billing.amount * 100);
  return (emailMatch ? 1000 : 0) + (rateMatch ? 200 : 0) - Math.min(gap, 199);
}

// Live subscriptions belonging to the renter (by email, and by name because the waiver email and the
// Stripe email can differ). Each comes with whether it matched by email or by name.
async function renterSubscriptions(stripe, rental, cache) {
  const renter = rental.renter || {};
  const email = norm(renter.email), name = norm(renter.name);
  const key = `${email}|${name}`;
  if (cache && cache.has(key)) return cache.get(key);
  const customers = new Map();
  if (email) {
    const found = await stripe.customers.list({ email: String(renter.email).trim(), limit: 20 });
    (found.data || []).forEach((c) => customers.set(c.id, c));
  }
  if (name) {
    try {
      const found = await stripe.customers.search({ query: `name:"${String(renter.name).trim().replace(/["\\]/g, "")}"`, limit: 20 });
      (found.data || []).forEach((c) => customers.set(c.id, c));
    } catch (err) { console.error("stripe customer search failed", err.message); }
  }
  const out = [];
  for (const c of customers.values()) {
    if (c.deleted) continue;
    const subs = await stripe.subscriptions.list({ customer: c.id, status: "all", limit: 20 });
    for (const s of subs.data || []) {
      if (!LIVE.has(s.status)) continue;
      out.push({ sub: s, emailMatch: !!email && norm(c.email) === email, nameMatch: !!name && norm(c.name) === name });
    }
  }
  if (cache) cache.set(key, out);
  return out;
}

// The rental's subscription: the one remembered on it, else the best unclaimed match for the renter.
async function subscriptionForRental(stripe, rental, { taken = new Set(), cache } = {}) {
  if (rental.stripeSubscriptionId) {
    try {
      return await stripe.subscriptions.retrieve(rental.stripeSubscriptionId);
    } catch (err) {
      if (err && (err.statusCode === 404 || err.code === "resource_missing")) return null;
      throw err;
    }
  }
  const candidates = await renterSubscriptions(stripe, rental, cache);
  let best = null, bestScore = -Infinity;
  for (const c of candidates) {
    if (taken.has(c.sub.id)) continue;
    const score = matchScore(rental, billingFromSubscription(c.sub), c);
    if (score != null && score > bestScore) { best = c.sub; bestScore = score; }
  }
  return best;
}

// Which rental a subscription belongs to: the one already linked to it, else the best match among
// the renter's open rentals that have no subscription yet.
function rentalForSubscription(rentals, sub, customer) {
  const linked = (rentals || []).find((r) => r.stripeSubscriptionId === sub.id);
  if (linked) return linked;
  const billing = billingFromSubscription(sub);
  const email = norm(customer && customer.email), name = norm(customer && customer.name);
  let best = null, bestScore = -Infinity;
  for (const r of rentals || []) {
    if (!LINKABLE.has(r.status) || r.stripeSubscriptionId) continue;
    const renter = r.renter || {};
    const score = matchScore(r, billing, { emailMatch: !!email && norm(renter.email) === email, nameMatch: !!name && norm(renter.name) === name });
    if (score != null && score > bestScore) { best = r; bestScore = score; }
  }
  return best;
}

// Which rentals the reconciliation looks at: open ones, plus closed ones still linked to a
// subscription (so a rental closed by stale portal dates comes back while Stripe still bills it).
// Running rentals first, so they claim a renter's subscription before a later booking does.
function rentalsToCheck(rentals) {
  const rank = { active: 0, scheduled: 1, completed: 2 };
  return (rentals || [])
    .filter((r) => r && (LINKABLE.has(r.status) || (r.status === "completed" && r.stripeSubscriptionId)))
    .sort((a, b) => rank[a.status] - rank[b.status] || day10(a.startDate).localeCompare(day10(b.startDate)) || String(a.id).localeCompare(String(b.id)));
}

// Check every open rental against Stripe and save any differences. Returns a summary without
// renter details (safe for logs). `save(id, patch)` persists a change; `deadline` (ms epoch) stops
// early when a function's time is nearly up, the next run carries on.
async function syncAllRentalBilling(stripe, rentals, { today, save, deadline } = {}) {
  const taken = new Set((rentals || []).map((r) => r.stripeSubscriptionId).filter(Boolean));
  const cache = new Map();
  const summary = { checked: 0, changed: [], unmatched: 0, errors: 0, stoppedEarly: false };
  for (const rental of rentalsToCheck(rentals)) {
    if (deadline && Date.now() > deadline) { summary.stoppedEarly = true; break; }
    summary.checked += 1;
    try {
      const sub = await subscriptionForRental(stripe, rental, { taken, cache });
      if (!sub) { summary.unmatched += 1; continue; }
      taken.add(sub.id);
      const patch = billingPatch(rental, billingFromSubscription(sub), today);
      if (!patch) continue;
      if (save) await save(rental.id, patch);
      summary.changed.push({ id: rental.id, startDate: patch.startDate, endDate: patch.endDate, monthlyRate: patch.monthlyRate, status: patch.status });
    } catch (err) {
      summary.errors += 1;
      console.error("stripe billing sync failed for a rental", rental.id, err.message);
    }
  }
  return summary;
}

module.exports = {
  LIVE,
  mtDay,
  subscriptionAmount,
  billingFromSubscription,
  termPeriods,
  billingPatch,
  matchScore,
  subscriptionForRental,
  rentalForSubscription,
  rentalsToCheck,
  syncAllRentalBilling,
};
