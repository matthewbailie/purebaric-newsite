const test = require("node:test");
const assert = require("node:assert");
const { buildFollowUpText, formatDeliveryDate, monthsFromLength } = require("../netlify/functions/_lib/followup");

test("formatDeliveryDate is timezone-stable and falls back to a placeholder", () => {
  assert.strictEqual(formatDeliveryDate("2026-10-03"), "Sat, Oct 3");
  assert.strictEqual(formatDeliveryDate("2026-01-01"), "Thu, Jan 1");
  assert.strictEqual(formatDeliveryDate(""), "[DELIVERY DATE]");
  assert.strictEqual(formatDeliveryDate("soon"), "[DELIVERY DATE]");
});

test("monthsFromLength reads the leading month count", () => {
  assert.strictEqual(monthsFromLength("4 months"), 4);
  assert.strictEqual(monthsFromLength("1 month"), 1);
  assert.strictEqual(monthsFromLength("custom"), null);
  assert.strictEqual(monthsFromLength(""), null);
});

test("buildFollowUpText fills name, term, price and delivery date", () => {
  const t = buildFollowUpText({ firstName: "Mike Harris", rentalLength: "4 months", startDate: "2026-10-03", monthlyRate: 579 });
  assert.match(t, /^Hi Mike, this is Matthew with Purebaric, hyperbaric chamber rentals\./);
  assert.match(t, /request for a 4-month chamber rental at \$579\/month\. I have a chamber ready for delivery Sat, Oct 3\./);
  assert.match(t, /anytime between \[TIMES\]\./);
  assert.match(t, /Card, Apple Pay, Amazon Pay, etc\.$/);
});

test("buildFollowUpText uses the [NAME] placeholder and 'an' before 8 and 11", () => {
  const t = buildFollowUpText({ rentalLength: "8 months", startDate: "2026-10-03", monthlyRate: 579 });
  assert.match(t, /^Hi \[NAME\],/);
  assert.match(t, /for an 8-month chamber rental/);
  assert.match(buildFollowUpText({ rentalLength: "11 months" }), /for an 11-month chamber rental/);
});

test("buildFollowUpText degrades gracefully when the term, price or date is missing", () => {
  const t = buildFollowUpText({ firstName: "Sam", rentalLength: "custom" });
  assert.match(t, /request for a chamber rental\. I have a chamber ready for delivery \[DELIVERY DATE\]\./);
  assert.doesNotMatch(t, /\$/);
});
