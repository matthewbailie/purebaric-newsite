const { test } = require("node:test");
const assert = require("node:assert/strict");
const S = require("../netlify/functions/_lib/stripe-sync");

const ts = (iso) => Math.floor(Date.parse(iso + "T12:00:00Z") / 1000);
const pi = (id, iso, cents, extra = {}) => ({ id, status: "succeeded", created: ts(iso), amount: cents, amount_received: cents, metadata: {}, latest_charge: { amount_refunded: 0 }, ...extra });
const fakeStripe = ({ customers = [{ id: "cus_1" }], byCustomer = {}, tagged = [], searchFails = false } = {}) => ({
  customers: { list: async () => ({ data: customers }) },
  paymentIntents: {
    list: async ({ customer }) => ({ data: byCustomer[customer] || [] }),
    search: async () => { if (searchFails) throw new Error("search unavailable"); return { data: tagged }; },
  },
});
const charity = { id: "r1", status: "active", startDate: "2026-08-15", endDate: "2026-12-14", monthlyRate: 529, rateType: "monthly", renter: { email: "Charity@x.com" } };

test("amountDueToDate counts the start date and each later billing date up to today or the end", () => {
  assert.equal(S.amountDueToDate(charity, "2026-08-14"), 0);
  assert.equal(S.amountDueToDate(charity, "2026-08-15"), 529);
  assert.equal(S.amountDueToDate(charity, "2026-09-26"), 1058);
  assert.equal(S.amountDueToDate(charity, "2027-06-01"), 529 * 4); // Aug 15, Sep 15, Oct 15, Nov 15 (Dec 15 is past the end)
  assert.equal(S.amountDueToDate({ ...charity, startDate: "2026-01-31", endDate: "2026-06-30" }, "2026-03-01"), 529 * 2); // Jan 31, Feb 28 (clamped)
  assert.equal(S.amountDueToDate({ startDate: "2026-09-01", endDate: "2026-09-28", monthlyRate: 100, rateType: "weekly" }, "2026-09-16"), 300);
});

test("statusFor: unpaid / partial / paid against what is due so far", () => {
  assert.equal(S.statusFor(charity, 0, "2026-09-26"), "unpaid");
  assert.equal(S.statusFor(charity, 529, "2026-09-26"), "partial");
  assert.equal(S.statusFor(charity, 1058, "2026-09-26"), "paid");
  assert.equal(S.statusFor(charity, 529, "2026-08-20"), "paid");
});

test("syncRentalPayments totals Stripe payments and moves partial to paid", async () => {
  const one = fakeStripe({ byCustomer: { cus_1: [pi("pi_a", "2026-08-15", 52900)] } });
  const first = await S.syncRentalPayments(one, charity, "2026-09-26");
  assert.equal(first.total, 529);
  assert.equal(first.patch.paymentStatus, "partial");
  const both = fakeStripe({ byCustomer: { cus_1: [pi("pi_a", "2026-08-15", 52900), pi("pi_b", "2026-09-26", 52900)] } });
  const second = await S.syncRentalPayments(both, charity, "2026-09-26");
  assert.equal(second.total, 1058);
  assert.equal(second.patch.paymentStatus, "paid");
  assert.equal(second.patch.paymentDate, "2026-09-26");
  assert.equal(second.patch.paymentMethod, "stripe");
  assert.equal(second.patch.stripePaymentIntentId, "pi_b");
  assert.equal(second.patch.stripePayments.length, 2);
});

test("syncRentalPayments ignores failed, out-of-window and other-rental payments, nets refunds, dedupes", async () => {
  const stripe = fakeStripe({
    byCustomer: { cus_1: [
      pi("pi_ok", "2026-09-15", 52900),
      pi("pi_failed", "2026-09-16", 52900, { status: "requires_payment_method" }),
      pi("pi_old", "2026-05-01", 99900),                                   // long before the rental
      pi("pi_other", "2026-09-17", 30000, { metadata: { rental_id: "r2" } }), // tagged for another rental
      pi("pi_refund", "2026-09-18", 10000, { latest_charge: { amount_refunded: 4000 } }),
    ] },
    tagged: [pi("pi_ok", "2026-09-15", 52900, { metadata: { rental_id: "r1" } }), pi("pi_link", "2026-01-01", 5000, { metadata: { rental_id: "r1" } })],
  });
  const r = await S.syncRentalPayments(stripe, charity, "2026-09-26");
  assert.deepEqual(r.payments.map((p) => [p.id, p.amount]), [["pi_link", 50], ["pi_ok", 529], ["pi_refund", 60]]);
  assert.equal(r.total, 639);
});

test("syncRentalPayments still works when payment search is unavailable, and with no payments", async () => {
  const r = await S.syncRentalPayments(fakeStripe({ searchFails: true }), charity, "2026-09-26");
  assert.equal(r.total, 0);
  assert.equal(r.patch.paymentStatus, "unpaid");
  assert.equal(r.patch.paymentMethod, "");
});

test("pickRental prefers the rental running on the payment date, then the next upcoming, then the latest", () => {
  const rs = [
    { id: "old", status: "completed", startDate: "2026-01-01", endDate: "2026-03-31", renter: { email: "A@x.com" } },
    { id: "now", status: "active", startDate: "2026-08-15", endDate: "2026-12-14", renter: { email: "a@x.com" } },
    { id: "next", status: "scheduled", startDate: "2027-01-01", endDate: "2027-03-31", renter: { email: "a@x.com" } },
    { id: "gone", status: "cancelled", startDate: "2026-08-01", endDate: "2026-12-31", renter: { email: "a@x.com" } },
    { id: "other", status: "active", startDate: "2026-08-15", endDate: "2026-12-14", renter: { email: "b@x.com" } },
  ];
  assert.equal(S.pickRental(rs, "a@X.com", "2026-09-26").id, "now");
  assert.equal(S.pickRental(rs, "a@x.com", "2026-12-20").id, "next");
  assert.equal(S.pickRental(rs, "a@x.com", "2027-09-01").id, "next");
  assert.equal(S.pickRental(rs, "nobody@x.com", "2026-09-26"), null);
});
