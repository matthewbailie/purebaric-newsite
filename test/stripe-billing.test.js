const { test } = require("node:test");
const assert = require("node:assert/strict");
const B = require("../netlify/functions/_lib/stripe-billing");
const M = require("../dashboard-metrics");
const S = require("../netlify/functions/_lib/stripe-sync");
const { _test: webhook } = require("../netlify/functions/stripe-webhook");

// Noon in Utah on a calendar day, as a Stripe timestamp.
const ts = (iso) => Math.floor(Date.parse(iso + "T12:00:00-07:00") / 1000);
const sub = (over = {}) => ({
  id: "sub_cassie",
  customer: "cus_cassie",
  status: "active",
  start_date: ts("2026-10-05"),
  created: ts("2026-10-05"),
  billing_cycle_anchor: ts("2026-10-05"),
  current_period_start: ts("2026-11-05"),
  current_period_end: ts("2026-12-05"),
  cancel_at: null,
  cancel_at_period_end: false,
  items: { data: [{ quantity: 1, price: { unit_amount: 92900, recurring: { interval: "month", interval_count: 1 } } }] },
  ...over,
});
// The portal reserved Cassie's chamber from Oct 3 for two months; Stripe billing started on delivery, Oct 5.
const cassie = {
  id: "r_cassie", status: "active", chamberId: "c1", rentalType: "business", startDate: "2026-10-03", endDate: "2026-12-02",
  monthlyRate: 829, rateType: "monthly", renter: { name: "Cassie Johnson", email: "cassie@example.com" },
};
const TODAY = "2026-11-28";

test("billingFromSubscription reads Stripe's dates in Utah time, the rate and the interval", () => {
  const b = B.billingFromSubscription(sub());
  assert.equal(b.startDate, "2026-10-05");
  assert.equal(b.anchorDate, "2026-10-05");
  assert.equal(b.currentPeriodStart, "2026-11-05");
  assert.equal(b.currentPeriodEnd, "2026-12-05");
  assert.equal(b.stopsOn, "");
  assert.equal(b.amount, 929);
  assert.equal(b.interval, "month");
  // A late-evening Utah start is still that day, not the next UTC day.
  assert.equal(B.mtDay(Math.floor(Date.parse("2026-10-05T23:30:00-06:00") / 1000)), "2026-10-05");
});

test("Cassie: the portal's reserved dates move to Stripe's billing cycle, end Dec 5", () => {
  const patch = B.billingPatch(cassie, B.billingFromSubscription(sub()), TODAY);
  assert.equal(patch.startDate, "2026-10-05");
  assert.equal(patch.endDate, "2026-12-05");
  assert.equal(patch.monthlyRate, 929);
  assert.equal(patch.stripeSubscriptionId, "sub_cassie");
  assert.equal(patch.reservedStartDate, "2026-10-03");
  assert.equal(patch.reservedEndDate, "2026-12-02");
  assert.equal(patch.reservedMonthlyRate, 829);
  assert.equal(patch.stripeBilling.currentPeriodEnd, "2026-12-05");

  const synced = { ...cassie, ...patch };
  assert.equal(B.billingPatch(synced, B.billingFromSubscription(sub()), TODAY), null, "re-syncing an up-to-date rental changes nothing");

  // Home tab: end of contract and the renewal charge come from Stripe.
  assert.deepEqual(M.startsAndEnds([synced], TODAY, 10).map((x) => [x.kind, x.date]), [["end", "2026-12-05"]]);
  assert.deepEqual(M.upcomingRenewals([synced], TODAY, 7).map((x) => [x.date, x.amount]), [["2026-12-05", 929]]);
});

test("a price change in Stripe flows to the rate, keeping the first portal rate on record", () => {
  const synced = { ...cassie, ...B.billingPatch(cassie, B.billingFromSubscription(sub()), TODAY) };
  const raised = sub({ items: { data: [{ quantity: 1, price: { unit_amount: 97900, recurring: { interval: "month", interval_count: 1 } } }] } });
  const patch = B.billingPatch(synced, B.billingFromSubscription(raised), TODAY);
  assert.equal(patch.monthlyRate, 979);
  assert.equal(patch.reservedMonthlyRate, undefined, "original rate is already recorded");
  assert.equal(patch.startDate, undefined);
  assert.equal(patch.stripeBilling.amount, 979);
});

test("subscriptionAmount sums items and applies only a lasting discount", () => {
  const two = sub({ items: { data: [
    { quantity: 1, price: { unit_amount: 50000, recurring: { interval: "month" } } },
    { quantity: 2, price: { unit_amount: 10000, recurring: { interval: "month" } } },
  ] } });
  assert.equal(B.subscriptionAmount(two), 700);
  assert.equal(B.subscriptionAmount({ ...two, discount: { coupon: { duration: "forever", percent_off: 10 } } }), 630);
  assert.equal(B.subscriptionAmount({ ...two, discount: { coupon: { duration: "once", amount_off: 20000 } } }), 700);
});

test("a subscription set to stop ends the rental that day with no renewal charge", () => {
  const stopping = sub({ cancel_at_period_end: true });
  const synced = { ...cassie, ...B.billingPatch(cassie, B.billingFromSubscription(stopping), TODAY) };
  assert.equal(synced.endDate, "2026-12-05");
  assert.equal(synced.stripeBilling.stopsOn, "2026-12-05");
  assert.deepEqual(M.upcomingRenewals([synced], TODAY, 7), []);
  // Payments due: Oct 5 and Nov 5, not the stop day.
  assert.equal(S.amountDueToDate(synced, "2026-12-10"), 929 * 2);

  const ended = sub({ status: "canceled", ended_at: ts("2026-11-20"), canceled_at: ts("2026-11-20") });
  assert.equal(B.billingPatch(cassie, B.billingFromSubscription(ended), TODAY).endDate, "2026-11-20");
});

test("longer terms keep their length; Stripe still billing past the term extends the end", () => {
  const four = { ...cassie, endDate: "2027-02-02" };
  assert.equal(B.billingPatch(four, B.billingFromSubscription(sub()), TODAY).endDate, "2027-02-05");

  // Portal closed the rental on Nov 24, but Stripe is still billing month to month.
  const charity = { ...cassie, id: "r_ch", status: "completed", startDate: "2026-08-25", endDate: "2026-11-24", stripeSubscriptionId: "sub_ch" };
  const still = sub({ id: "sub_ch", start_date: ts("2026-08-25"), billing_cycle_anchor: ts("2026-08-25"), current_period_start: ts("2026-11-25"), current_period_end: ts("2026-12-25") });
  const patch = B.billingPatch(charity, B.billingFromSubscription(still), "2026-11-26");
  assert.equal(patch.endDate, "2026-12-25");
  assert.equal(patch.status, "active");
});

test("weekly subscriptions renew every 7 days from the anchor", () => {
  const weekly = sub({ items: { data: [{ quantity: 1, price: { unit_amount: 20000, recurring: { interval: "week", interval_count: 1 } } }] },
    current_period_start: ts("2026-11-23"), current_period_end: ts("2026-11-30") });
  const r = { ...cassie, startDate: "2026-10-05", endDate: "2026-12-13", rateType: "weekly", monthlyRate: 200 };
  const synced = { ...r, ...B.billingPatch(r, B.billingFromSubscription(weekly), TODAY) };
  assert.equal(synced.rateType, "weekly");
  assert.equal(synced.endDate, "2026-12-14");
  assert.deepEqual(M.upcomingRenewals([synced], TODAY, 7).map((x) => x.date), ["2026-11-30"]);
});

test("rentals without a subscription keep the portal's own dates", () => {
  const mike = { id: "r_mike", status: "active", startDate: "2026-10-25", endDate: "2027-01-24", monthlyRate: 579, rateType: "monthly", renter: {} };
  assert.deepEqual(M.upcomingRenewals([mike], "2026-11-23", 7).map((x) => x.date), ["2026-11-25"]);
});

const fakeStripe = ({ customers = [], byName = [], subs = {}, byId = {} } = {}) => ({
  customers: {
    list: async ({ email }) => ({ data: customers.filter((c) => c.email.toLowerCase() === email.toLowerCase()) }),
    search: async () => ({ data: byName }),
  },
  subscriptions: {
    list: async ({ customer }) => ({ data: subs[customer] || [] }),
    retrieve: async (id) => { if (!byId[id]) { const e = new Error("No such subscription"); e.statusCode = 404; throw e; } return byId[id]; },
  },
});

test("syncAllRentalBilling links each rental to its own subscription and saves the changes", async () => {
  const second = { ...cassie, id: "r_cassie2", chamberId: "c2", startDate: "2026-11-20", endDate: "2027-01-19", monthlyRate: 729 };
  const subs = {
    cus_cassie: [
      sub(),
      sub({ id: "sub_second", start_date: ts("2026-11-22"), billing_cycle_anchor: ts("2026-11-22"), current_period_start: ts("2026-11-22"), current_period_end: ts("2026-12-22"),
        items: { data: [{ quantity: 1, price: { unit_amount: 72900, recurring: { interval: "month", interval_count: 1 } } }] } }),
      sub({ id: "sub_old", status: "canceled" }),
    ],
  };
  const stripe = fakeStripe({ customers: [{ id: "cus_cassie", email: "Cassie@example.com", name: "Cassie Johnson" }], subs });
  const saved = {};
  const other = { id: "r_x", status: "active", startDate: "2026-11-01", endDate: "2026-12-31", monthlyRate: 500, renter: { name: "Nobody", email: "nobody@example.com" } };
  const summary = await B.syncAllRentalBilling(stripe, [second, cassie, other], { today: TODAY, save: async (id, patch) => { saved[id] = patch; } });
  assert.equal(summary.checked, 3);
  assert.equal(summary.unmatched, 1);
  assert.equal(saved.r_cassie.stripeSubscriptionId, "sub_cassie");
  assert.equal(saved.r_cassie.endDate, "2026-12-05");
  assert.equal(saved.r_cassie2.stripeSubscriptionId, "sub_second");
  assert.equal(saved.r_cassie2.startDate, "2026-11-22");
  assert.equal(saved.r_cassie2.endDate, "2027-01-22");
  assert.equal(saved.r_x, undefined);
  assert.equal(JSON.stringify(summary).includes("Cassie"), false, "summary carries no renter details");
});

test("a name-only match needs dates that line up; a remembered subscription is used directly", async () => {
  const stranger = { id: "cus_other", email: "other@example.com", name: "Cassie Johnson" };
  const far = sub({ start_date: ts("2026-03-01"), billing_cycle_anchor: ts("2026-03-01") });
  const stripe = fakeStripe({ byName: [stranger], subs: { cus_other: [far] } });
  assert.equal(await B.subscriptionForRental(stripe, cassie), null);
  const near = fakeStripe({ byName: [stranger], subs: { cus_other: [sub()] } });
  assert.equal((await B.subscriptionForRental(near, cassie)).id, "sub_cassie");

  const remembered = fakeStripe({ byId: { sub_cassie: sub() } });
  assert.equal((await B.subscriptionForRental(remembered, { ...cassie, stripeSubscriptionId: "sub_cassie" })).id, "sub_cassie");
  assert.equal(await B.subscriptionForRental(remembered, { ...cassie, stripeSubscriptionId: "sub_gone" }), null);
});

test("rentalForSubscription prefers the linked rental, else the renter's best open rental", () => {
  const linked = { ...cassie, id: "r_linked", stripeSubscriptionId: "sub_cassie" };
  assert.equal(B.rentalForSubscription([cassie, linked], sub(), null).id, "r_linked");
  const customer = { email: "cassie@example.com", name: "Cassie Johnson" };
  assert.equal(B.rentalForSubscription([cassie, { ...cassie, id: "r_done", status: "completed" }], sub(), customer).id, "r_cassie");
  assert.equal(B.rentalForSubscription([cassie], sub(), { email: "someone@else.com", name: "Someone" }), null);
});

test("webhook picks the subscription out of subscription and invoice events", () => {
  assert.equal(webhook.subscriptionIdOf({ type: "customer.subscription.updated", data: { object: { id: "sub_1" } } }), "sub_1");
  assert.equal(webhook.subscriptionIdOf({ type: "customer.subscription.deleted", data: { object: { id: "sub_1" } } }), "sub_1");
  assert.equal(webhook.subscriptionIdOf({ type: "invoice.paid", data: { object: { subscription: "sub_2" } } }), "sub_2");
  assert.equal(webhook.subscriptionIdOf({ type: "invoice.paid", data: { object: { parent: { subscription_details: { subscription: "sub_3" } } } } }), "sub_3");
  assert.equal(webhook.subscriptionIdOf({ type: "invoice.paid", data: { object: { subscription: null } } }), null);
  assert.equal(webhook.subscriptionIdOf({ type: "payment_intent.succeeded", data: { object: { id: "pi_1" } } }), null);
});
