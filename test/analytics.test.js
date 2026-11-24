const test = require("node:test");
const assert = require("node:assert/strict");

process.env.GA4_API_SECRET = "test-secret";
const {
  cleanClientId,
  cleanSessionId,
  cleanGclid,
  sendBookingLeadSubmitted,
  sendRentalConfirmed,
} = require("../netlify/functions/_lib/analytics");

test("accepts GA identifiers and rejects arbitrary text", () => {
  assert.equal(cleanClientId("123.456"), "123.456");
  assert.equal(cleanClientId("person@example.com"), null);
  assert.equal(cleanSessionId("1780012345"), "1780012345");
  assert.equal(cleanSessionId("session value"), null);
});

test("close_convert_lead sends value without customer PII", async () => {
  let request;
  global.fetch = async (url, options) => {
    request = { url: String(url), body: JSON.parse(options.body) };
    return { ok: true, status: 204 };
  };

  const result = await sendRentalConfirmed({
    booking: {
      id: "booking-1",
      analytics: { consentGranted: true, clientId: "123.456", sessionId: "789" },
    },
    rental: {
      id: "rental-1",
      startDate: "2026-09-25",
      endDate: "2027-01-24",
      monthlyRate: 579,
    },
  });

  assert.deepEqual(result, { sent: true, event: "close_convert_lead" });
  assert.match(request.url, /^https:\/\/www\.google-analytics\.com\/mp\/collect\?/);
  assert.equal(request.body.client_id, "123.456");
  assert.deepEqual(request.body.events, [{
    name: "close_convert_lead",
    params: {
      engagement_time_msec: 1,
      currency: "USD",
      value: 2316,
      rental_months: 4,
      transaction_id: "rental-1",
      booking_id: "booking-1",
      source: "admin_confirmed",
      session_id: "789",
    },
  }]);
  assert.equal(JSON.stringify(request.body).includes("person@example.com"), false);
});

test("booking_lead_submit sends the lead event without customer PII", async () => {
  let request;
  global.fetch = async (url, options) => {
    request = { url: String(url), body: JSON.parse(options.body) };
    return { ok: true, status: 204 };
  };

  const result = await sendBookingLeadSubmitted({
    booking: {
      id: "booking-1",
      rentalLength: "4 months",
      rentalType: "residential",
      analytics: { consentGranted: true, clientId: "123.456", sessionId: "789" },
    },
  });

  assert.deepEqual(result, { sent: true, event: "booking_lead_submit" });
  assert.match(request.url, /^https:\/\/www\.google-analytics\.com\/mp\/collect\?/);
  assert.equal(request.body.client_id, "123.456");
  assert.deepEqual(request.body.events, [{
    name: "booking_lead_submit",
    params: {
      engagement_time_msec: 1,
      device: "unknown", // metrics.md section 2 funnel params; no client value on this record
      variant: "none",
      form_name: "lead_capture",
      rental_months: 4,
      rental_type: "residential",
      page_location: "https://purebaric.com/book",
      booking_id: "booking-1",
      source: "booking_api",
      session_id: "789",
    },
  }]);
  assert.equal(JSON.stringify(request.body).includes("person@example.com"), false);
});

test("visitor opt-out prevents server-side analytics", async () => {
  let called = false;
  global.fetch = async () => { called = true; };
  const result = await sendRentalConfirmed({
    booking: {
      id: "booking-2",
      analytics: { consentGranted: false, clientId: "123.456", sessionId: "789" },
    },
    rental: { id: "rental-2", startDate: "2026-09-25", endDate: "2026-10-24", monthlyRate: 729 },
  });
  assert.deepEqual(result, { sent: false, reason: "analytics_opt_out" });
  assert.equal(called, false);
});

test("cleanGclid accepts Google's opaque click id and rejects anything else, capped at 100 chars", () => {
  assert.equal(cleanGclid("Cj0KCQjw_ab-CD_efGHIJ"), "Cj0KCQjw_ab-CD_efGHIJ");
  assert.equal(cleanGclid("has space"), "");
  assert.equal(cleanGclid("<script>"), "");
  assert.equal(cleanGclid(""), "");
  assert.equal(cleanGclid(null), "");
  assert.equal(cleanGclid("a".repeat(150)).length, 100);
});
