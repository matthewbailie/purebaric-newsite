const { test } = require("node:test");
const assert = require("node:assert/strict");
const M = require("../dashboard-metrics");

const r = (id, email, start, end, rate, extra = {}) => ({
  id, chamberId: `c${id}`, status: "active", startDate: start, endDate: end, monthlyRate: rate, rateType: "monthly",
  renter: { email }, ...extra,
});

const rentals = [
  r(1, "a@x.com", "2026-01-10", "2026-06-09", 600),
  r(2, "b@x.com", "2026-03-01", "2026-08-31", 500),
  r(3, "a@x.com", "2026-06-10", "2026-12-09", 600),
  r(4, "c@x.com", "2026-02-01", "2026-02-28", 700, { status: "cancelled" }),
  r(5, "d@x.com", "2025-11-01", "2026-01-31", 400),
  r(6, "e@x.com", "2026-05-01", "2026-07-31", 100, { rateType: "weekly" }),
];

test("monthlyEquivalent converts weekly rates and ignores bad values", () => {
  assert.equal(M.monthlyEquivalent(rentals[0]), 600);
  assert.equal(Math.round(M.monthlyEquivalent(rentals[5])), 433);
  assert.equal(M.monthlyEquivalent({ monthlyRate: "abc" }), 0);
});

test("cancelled rentals and out-of-window days do not count", () => {
  assert.equal(M.activeOn(rentals[3], "2026-02-10"), false);
  assert.equal(M.activeOn(rentals[0], "2026-06-09"), true);
  assert.equal(M.activeOn(rentals[0], "2026-06-10"), false);
});

test("scheduled rentals do not count as MRR before activation", () => {
  const scheduled = r(7, "future@x.com", "2026-10-03", "2026-11-02", 729, { status: "scheduled" });
  const completed = r(8, "past@x.com", "2026-09-01", "2026-09-30", 500, { status: "completed" });

  assert.equal(M.activeOn(scheduled, "2026-10-03"), false);
  assert.equal(M.snapshot([scheduled], "2026-10-03").mrr, 0);
  assert.equal(M.snapshot([completed], "2026-09-30").mrr, 500);
});

test("snapshot sums MRR, counts rentals and distinct subscribers, averages price", () => {
  const s = M.snapshot(rentals, "2026-03-31");
  assert.equal(s.rentals, 2);
  assert.equal(s.mrr, 1100);
  assert.equal(s.subscribers, 2);
  assert.equal(s.avgPrice, 550);
  const empty = M.snapshot(rentals, "2025-01-31");
  assert.equal(empty.mrr, 0);
  assert.equal(empty.avgPrice, null);
});

test("one customer with two rentals is one subscriber but two rentals", () => {
  const two = [r(1, "a@x.com", "2026-01-01", "2026-12-31", 600), r(2, "A@x.com", "2026-01-01", "2026-12-31", 500)];
  const s = M.snapshot(two, "2026-04-15");
  assert.equal(s.subscribers, 1);
  assert.equal(s.rentals, 2);
});

test("yearSeries measures month ends, uses today for the current month, nulls the future", () => {
  const s = M.yearSeries(rentals, 2026, "2026-06-15");
  assert.equal(s.length, 12);
  assert.equal(s[0].mrr, 600 + 400); // Jan 31: rentals 1 and 5
  assert.equal(s[1].mrr, 600); // Feb 28: rental 1 only (5 ended Jan 31, 4 cancelled)
  assert.equal(s[5].day, "2026-06-15"); // current month measured at today
  assert.equal(s[5].mrr, 600 + 500 + 433 + 0); // 1 ended Jun 9; 3 started Jun 10; 2 and 6 running
  assert.equal(s[6], null);
  assert.equal(M.seriesHasActivity(M.yearSeries(rentals, 2024, "2026-06-15")), false);
});

test("overview: MRR, deltas, new/lost subscribers, contracted revenue", () => {
  const o = M.overview({ rentals, bookings: [], chambers: [], today: "2026-06-15" });
  assert.equal(o.mrr, 600 + 500 + 433);
  assert.equal(o.arr, o.mrr * 12);
  assert.equal(o.prevMonth.day, "2026-05-31");
  assert.equal(o.mrrChangeMonth, o.mrr - o.prevMonth.mrr);
  // May 31: a (rental 1), b, e are subscribers; today: a (rental 3), b, e -> nobody new or lost
  assert.equal(o.newSubscribers, 0);
  assert.equal(o.lostSubscribers, 0);
  assert.ok(o.contractedRemaining > 0);
});

test("overview: new and lost subscribers are customer-level", () => {
  const o = M.overview({ rentals, bookings: [], chambers: [], today: "2026-03-15" });
  // Feb 28 subscribers: a; today: a, b -> b is new
  assert.equal(o.newSubscribers, 1);
  assert.equal(o.lostSubscribers, 0);
});

test("overview: renewals due skip customers who already have a follow-on rental", () => {
  const o = M.overview({ rentals, bookings: [], chambers: [], today: "2026-06-05" });
  // rental 1 ends 2026-06-09 but customer a's next rental starts 06-10 -> not a renewal to chase
  assert.equal(o.renewalsDue.count, 0);
  const o2 = M.overview({ rentals, bookings: [], chambers: [], today: "2026-07-25" });
  // rental 6 ends 07-31 and rental 2 is past; e has no follow-on
  assert.equal(o2.renewalsDue.count, 1);
  assert.equal(o2.renewalsDue.mrr, 433);
});

test("overview: starting soon, utilization and conversion", () => {
  const chambers = [{ id: "c1", status: "active" }, { id: "c2", status: "active" }, { id: "c9", status: "archived" }];
  const bookings = [
    { createdAt: "2026-06-01T10:00:00Z", status: "converted" },
    { createdAt: "2026-05-20T10:00:00Z", status: "new" },
    { createdAt: "2026-05-21T10:00:00Z", status: "new", outOfArea: true },
    { createdAt: "2025-01-01T10:00:00Z", status: "converted" },
  ];
  const o = M.overview({ rentals, bookings, chambers, today: "2026-02-20" });
  assert.equal(o.startingSoon.count, 1); // rental 2 starts 03-01
  assert.equal(o.startingSoon.mrr, 500);
  assert.equal(o.utilization.activeChambers, 2);
  assert.equal(o.utilization.inUse, 1); // rental 1 running in chamber c1
  assert.equal(o.utilization.pct, 50);
  const o2 = M.overview({ rentals: [], bookings, chambers, today: "2026-06-15" });
  assert.deepEqual(o2.conversion, { requests: 2, converted: 1, pct: 50 });
});

test("lifetimePaid matches the Customers tab rules", () => {
  assert.equal(M.lifetimePaid({ status: "active", startDate: "2026-01-01", endDate: "2026-03-31", monthlyRate: 500 }), 1500);
  assert.equal(M.lifetimePaid({ status: "active", paidAmount: 200, startDate: "2026-01-01", endDate: "2026-03-31", monthlyRate: 500 }), 200);
  assert.equal(M.lifetimePaid({ status: "cancelled", startDate: "2026-01-01", endDate: "2026-03-31", monthlyRate: 500 }), 0);
  assert.equal(M.lifetimePaid({ status: "active", rateType: "weekly", startDate: "2026-01-01", endDate: "2026-01-28", monthlyRate: 100 }), 400);
});

test("empty data gives zeros and nulls, not NaN", () => {
  const o = M.overview({ today: "2026-06-15" });
  assert.equal(o.mrr, 0);
  assert.equal(o.avgPrice, null);
  assert.equal(o.utilization.pct, null);
  assert.equal(o.avgTermMonths, null);
});

test("upcomingRenewals: monthly anniversaries in the window, never the first payment or past the end", () => {
  const rs = [
    r(1, "a@x.com", "2026-08-25", "2026-11-24", 549),   // 3 months: renews Sep 25, Oct 25 only
    r(2, "b@x.com", "2026-01-06", "2027-01-05", 529),   // renews on the 6th every month
    r(3, "c@x.com", "2026-09-30", "2026-12-29", 500),   // starts inside the window: not a renewal
  ];
  const at = (today, days) => M.upcomingRenewals(rs, today, days).map((x) => `${x.rental.id}@${x.date}:${x.amount}`);
  assert.deepEqual(at("2026-09-22", 7), ["1@2026-09-25:549"]);
  assert.deepEqual(at("2026-10-01", 7), ["2@2026-10-06:529"]);
  assert.deepEqual(at("2026-10-25", 0), ["1@2026-10-25:549"]);
  assert.deepEqual(at("2026-11-20", 7), []); // Nov 25 is past rental 1's end; rental 2 renews Dec 6
  assert.deepEqual(at("2026-09-26", 7), []);
});

test("upcomingRenewals: weekly rentals renew every 7 days, month ends clamp, dead rentals are skipped", () => {
  const rs = [
    r(1, "a@x.com", "2026-09-01", "2026-10-31", 164.75, { rateType: "weekly" }),
    r(2, "b@x.com", "2026-01-31", "2026-12-30", 600),
    r(3, "c@x.com", "2026-01-06", "2027-01-05", 529, { status: "cancelled" }),
    r(4, "d@x.com", "2026-01-06", "2027-01-05", 529, { status: "completed" }),
  ];
  const at = (today, days) => M.upcomingRenewals(rs, today, days).map((x) => `${x.rental.id}@${x.date}`);
  assert.deepEqual(at("2026-09-26", 7), ["1@2026-09-29", "2@2026-09-30"]); // Jan 31 anchor clamps to Sep 30
  assert.deepEqual(at("2026-02-25", 5), ["2@2026-02-28"]);
  assert.deepEqual(at("2026-10-03", 7), ["1@2026-10-06"]);
});

test('snapshot reports the running average rental length, the same figure as the Home card', () => {
  const M = require('../dashboard-metrics.js');
  const rentals = [
    { id: 'a', status: 'completed', startDate: '2026-01-01', endDate: '2026-03-31', monthlyRate: 500, rateType: 'monthly' },   // 3 months
    { id: 'b', status: 'active', startDate: '2026-02-01', endDate: '2026-02-28', monthlyRate: 500, rateType: 'monthly' },      // 1 month
    { id: 'c', status: 'cancelled', startDate: '2026-02-01', endDate: '2027-02-01', monthlyRate: 500, rateType: 'monthly' },
    { id: 'd', status: 'active', startDate: '2026-04-01', endDate: '2026-04-28', monthlyRate: 125, rateType: 'weekly' },
  ];
  assert.equal(M.snapshot(rentals, '2026-01-15').avgLength, 3, 'only the first rental had started');
  assert.equal(M.snapshot(rentals, '2026-02-15').avgLength, 2, 'both monthly rentals, cancelled excluded');
  assert.equal(M.snapshot(rentals, '2026-04-15').avgLength, 2, 'weekly rentals are not part of the average');
  assert.equal(M.snapshot(rentals, '2025-12-01').avgLength, null);
  assert.equal(M.overview({ rentals, bookings: [], chambers: [], today: '2026-04-15' }).avgTermMonths, M.snapshot(rentals, '2026-04-15').avgLength);
});
