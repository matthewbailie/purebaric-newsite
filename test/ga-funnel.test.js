// Booking funnel rows (eventName + pagePathPlusQueryString + date) split into home vs
// business by the booking page URL (/book vs /book?type=business), per day, and sliced into
// the same windows the Site analytics range picker offers.
const test = require("node:test");
const assert = require("node:assert/strict");
const ga = require("../netlify/functions/_lib/ga-traffic.js");

const row = (ev, path, date, n) => ({ dimensionValues: [{ value: ev }, { value: path }, { value: date }], metricValues: [{ value: String(n) }] });
const rows = [
  row("booking_form_start", "/book", "20261016", 20), row("booking_form_start", "/book", "20261015", 100),
  row("select_rental_plan", "/book", "20261016", 10), row("select_rental_plan", "/book", "20261015", 70),
  row("booking_request_submit", "/book", "20261016", 5), row("booking_request_submit", "/book", "20261001", 20),
  row("booking_form_start", "/book?type=business", "20261016", 30),
  row("booking_request_submit", "/book?type=business", "20261016", 12),
  row("booking_form_abandon", "/BOOK?TYPE=BUSINESS", "20261016", 5),
  row("booking_form_start", "/book?utm_source=x", "20261016", 1), // another query string on the home page still counts
  // Not funnel events, not on the booking page, or no usable date: ignored.
  row("page_view", "/book", "20261016", 999), row("booking_form_start", "/pricing", "20261016", 7),
  row("waitlist_join", "/waitlist", "20261016", 3), row("booking_form_start", "/book", "(other)", 50),
];

test("funnel rows split into home vs business by booking page URL, per day", () => {
  const f = ga.funnelRowsToMap(rows);
  assert.deepEqual(f.home.booking_form_start, { "2026-10-16": 21, "2026-10-15": 100 });
  assert.deepEqual(f.home.booking_request_submit, { "2026-10-16": 5, "2026-10-01": 20 });
  assert.equal(f.business.booking_form_start["2026-10-16"], 30);
  assert.equal(f.business.booking_form_abandon["2026-10-16"], 5, "matching is case-insensitive");
  assert.equal(f.home.page_view, undefined, "non-funnel events are ignored");
  assert.equal(f.home.waitlist_join, undefined, "other pages are ignored");
});

test("windows: today vs yesterday, and the last N days vs the N before", () => {
  const f = ga.funnelRowsToMap(rows);
  const today = ga.funnelWindow(f.home, 1, "2026-10-16");
  assert.deepEqual([today.from, today.to, today.prevFrom, today.prevTo], ["2026-10-16", "2026-10-16", "2026-10-15", "2026-10-15"]);
  assert.equal(today.cur.booking_form_start, 21);
  assert.equal(today.prev.booking_form_start, 100);
  assert.equal(today.cur.booking_request_submit, 5);
  const week = ga.funnelWindow(f.home, 7, "2026-10-16");
  assert.deepEqual([week.from, week.prevFrom, week.prevTo], ["2026-10-10", "2026-10-03", "2026-10-09"]);
  assert.equal(week.cur.booking_form_start, 121);
  assert.equal(week.cur.booking_request_submit, 5, "1 Oct is outside the week");
  const month = ga.funnelWindow(f.home, 30, "2026-10-16");
  assert.equal(month.cur.booking_request_submit, 25);
  assert.equal(month.prev.booking_request_submit, 0);
  assert.deepEqual(ga.funnelWindow({}, 7, "2026-10-16").cur, {});
});

test("funnel stage order matches the booking flow", () => {
  assert.deepEqual(ga.FUNNEL_EVENTS, ["booking_form_start", "service_area_check", "select_rental_plan", "booking_lead_submit", "select_delivery_date", "booking_request_submit"]);
});

test("empty or missing rows map to empty segments", () => {
  assert.deepEqual(ga.funnelRowsToMap([]), { home: {}, business: {} });
  assert.deepEqual(ga.funnelRowsToMap(null), { home: {}, business: {} });
});
