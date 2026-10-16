// Booking funnel rows (eventName + pagePathPlusQueryString) split into home vs
// business by the booking page URL: /book vs /book?type=business.
const test = require("node:test");
const assert = require("node:assert/strict");
const ga = require("../netlify/functions/_lib/ga-traffic.js");

const rows = [
  { dimensionValues: [{ value: "booking_form_start" }, { value: "/book" }], metricValues: [{ value: "120" }] },
  { dimensionValues: [{ value: "select_rental_plan" }, { value: "/book" }], metricValues: [{ value: "80" }] },
  { dimensionValues: [{ value: "booking_request_submit" }, { value: "/book" }], metricValues: [{ value: "25" }] },
  { dimensionValues: [{ value: "booking_form_start" }, { value: "/book?type=business" }], metricValues: [{ value: "30" }] },
  { dimensionValues: [{ value: "booking_request_submit" }, { value: "/book?type=business" }], metricValues: [{ value: "12" }] },
  { dimensionValues: [{ value: "booking_form_abandon" }, { value: "/BOOK?TYPE=BUSINESS" }], metricValues: [{ value: "5" }] },
  // Not funnel events, or not on the booking page: ignored.
  { dimensionValues: [{ value: "page_view" }, { value: "/book" }], metricValues: [{ value: "999" }] },
  { dimensionValues: [{ value: "booking_form_start" }, { value: "/pricing" }], metricValues: [{ value: "7" }] },
  { dimensionValues: [{ value: "waitlist_join" }, { value: "/waitlist" }], metricValues: [{ value: "3" }] },
];

test("funnel rows split into home vs business by booking page URL", () => {
  const f = ga.funnelRowsToMap(rows);
  assert.equal(f.home["booking_form_start"], 120);
  assert.equal(f.home["select_rental_plan"], 80);
  assert.equal(f.home["booking_request_submit"], 25);
  assert.equal(f.business["booking_form_start"], 30);
  assert.equal(f.business["booking_request_submit"], 12);
  assert.equal(f.business["booking_form_abandon"], 5, "matching is case-insensitive");
  assert.equal(f.home["page_view"], undefined, "non-funnel events are ignored");
  assert.equal(f.home["waitlist_join"], undefined, "other pages are ignored");
});

test("funnel stage order matches the booking flow", () => {
  assert.deepEqual(ga.FUNNEL_EVENTS, [
    "booking_form_start",
    "service_area_check",
    "select_rental_plan",
    "select_delivery_date",
    "booking_request_submit",
  ]);
});

test("empty or missing rows map to empty segments", () => {
  assert.deepEqual(ga.funnelRowsToMap([]), { home: {}, business: {} });
  assert.deepEqual(ga.funnelRowsToMap(null), { home: {}, business: {} });
});
