const { test } = require("node:test");
const assert = require("node:assert/strict");
const {
  addCalendarMonthsInclusive,
  matchingCalendarMonths,
} = require("../rental-dates");

test("calendar-month rental ends the day before its monthly anniversary", () => {
  assert.equal(addCalendarMonthsInclusive("2026-09-25", 4), "2027-01-24");
  assert.equal(matchingCalendarMonths("2026-09-25", "2027-01-24", 12), 4);
});

test("calendar-month rental naturally includes leap day", () => {
  assert.equal(addCalendarMonthsInclusive("2023-11-30", 4), "2024-03-29");
  assert.equal(matchingCalendarMonths("2023-11-30", "2024-03-29", 12), 4);
});

test("month-end anniversaries clamp without overflowing into the next month", () => {
  assert.equal(addCalendarMonthsInclusive("2024-01-31", 1), "2024-02-28");
  assert.equal(addCalendarMonthsInclusive("2023-01-31", 1), "2023-02-27");
});

test("custom ranges do not masquerade as a whole-month term", () => {
  assert.equal(matchingCalendarMonths("2026-09-25", "2027-01-20", 12), null);
});
