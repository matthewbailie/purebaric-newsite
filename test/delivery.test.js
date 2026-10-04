// Delivery availability: owner calendar rules and chamber/machine capacity over a rental window.
const { test } = require("node:test");
const assert = require("node:assert/strict");
const d = require("../netlify/functions/_lib/delivery");

const chambers = [{ id: "c1", name: "LC-001", style: "lying", status: "active" }, { id: "c2", name: "LC-002", style: "lying", status: "active" },
  { id: "c3", name: "SC-001", style: "sitting", status: "active" }, { id: "c4", name: "LC-004", style: "lying", status: "maintenance" }];
const machines = [{ id: "m1", status: "active" }, { id: "m2", status: "active" }, { id: "m3", status: "maintenance" }];
const rentals = [{ id: "r1", chamberId: "c1", machineId: "m1", status: "active", startDate: "2026-09-20", endDate: "2026-11-19" }];
const base = { config: { weekdaysOff: [0, 6], blockedDates: ["2026-10-14"], leadDays: 2, horizonDays: 30 }, chambers, machines, rentals, holds: [] };
const today = "2026-10-05"; // a Monday

test("normalizeConfig cleans days, dates, bounds and the mode", () => {
  const c = d.normalizeConfig({ mode: "book", weekdaysOff: "6,0,9", blockedDates: ["2026-10-14", "nope", "2026-02-30"], leadDays: "99", horizonDays: 3, deliveryNote: "" });
  assert.equal(c.mode, "book"); assert.deepEqual(c.weekdaysOff, [0, 6]); assert.deepEqual(c.blockedDates, ["2026-10-14"]);
  assert.equal(c.leadDays, 60); assert.equal(c.horizonDays, 7); assert.match(c.deliveryNote, /9 p\.m\./);
  assert.equal(d.normalizeConfig({ mode: "x" }).mode, "request");
});

test("addMonthsInclusive matches the rental rule (start + N months - 1 day, clamped)", () => {
  assert.equal(d.addMonthsInclusive("2026-10-07", 1), "2026-11-06");
  assert.equal(d.addMonthsInclusive("2026-01-31", 1), "2026-02-27");
  assert.equal(d.addMonthsInclusive("2026-10-07", 12), "2027-10-06");
});

test("weekends and blocked days are never delivery days", () => {
  const c = d.normalizeConfig(base.config);
  assert.equal(d.isDeliveryDay(c, "2026-10-10"), false, "Saturday");
  assert.equal(d.isDeliveryDay(c, "2026-10-14"), false, "blocked");
  assert.equal(d.isDeliveryDay(c, "2026-10-13"), true);
});

test("capacity counts free chamber+machine pairs of the style over the whole window", () => {
  // c1/m1 busy until Nov 19; c2 and m2 free: one lying pair
  assert.equal(d.capacity(base, "lying", "2026-10-07", "2026-11-06"), 1);
  // after Nov 19 both pairs are free
  assert.equal(d.capacity(base, "lying", "2026-11-20", "2026-12-19"), 2);
  // sitting: one chamber, but only one free machine while r1 runs
  assert.equal(d.capacity(base, "sitting", "2026-10-07", "2026-11-06"), 1);
  // a hold on the only free pair removes it
  const held = { ...base, holds: [{ style: "lying", startDate: "2026-10-20", endDate: "2026-11-19" }] };
  assert.equal(d.capacity(held, "lying", "2026-10-07", "2026-11-06"), 0);
  assert.equal(d.capacity(held, "sitting", "2026-10-07", "2026-11-06"), 0, "the hold also takes the last machine");
});

test("availableDates respects lead time, horizon, days off and capacity", () => {
  const list = d.availableDates({ ...base, style: "lying", months: 1, today });
  assert.equal(list[0].date, "2026-10-07"); assert.equal(list[list.length - 1].date, "2026-11-04");
  const byDate = Object.fromEntries(list.map(x => [x.date, x.ok]));
  assert.equal(byDate["2026-10-07"], true);
  assert.equal(byDate["2026-10-10"], false, "Saturday");
  assert.equal(byDate["2026-10-14"], false, "blocked");
  const none = d.availableDates({ ...base, rentals: [...rentals, { chamberId: "c2", machineId: "m2", status: "scheduled", startDate: "2026-10-01", endDate: "2026-12-31" }], style: "lying", months: 1, today });
  assert.ok(none.every(x => !x.ok), "no lying pair free anywhere in the window");
});

test("dateAvailable rejects bad, early, late, off and full days and returns the end date otherwise", () => {
  const ok = d.dateAvailable({ ...base, style: "lying", months: 2, today, date: "2026-10-13" });
  assert.deepEqual(ok, { ok: true, endDate: "2026-12-12" });
  assert.equal(d.dateAvailable({ ...base, style: "lying", months: 1, today, date: "2026-10-06" }).reason, "too soon");
  assert.equal(d.dateAvailable({ ...base, style: "lying", months: 1, today, date: "2026-12-01" }).reason, "beyond the booking window");
  assert.equal(d.dateAvailable({ ...base, style: "lying", months: 1, today, date: "2026-10-11" }).reason, "no deliveries that day");
  assert.equal(d.dateAvailable({ ...base, style: "lying", months: 1, today, date: "junk" }).reason, "invalid date");
});

test("holdsFrom only takes book-mode bookings still awaiting the owner", () => {
  const hs = d.holdsFrom([
    { bookingMode: "book", status: "new", chamberStyle: "sitting", startDate: "2026-10-20", endDate: "2026-11-19" },
    { bookingMode: "book", status: "converted", chamberStyle: "lying", startDate: "2026-10-20", endDate: "2026-11-19" },
    { bookingMode: "request", status: "new", startDate: "2026-10-20", endDate: "2026-11-19" },
  ]);
  assert.equal(hs.length, 1); assert.equal(hs[0].style, "sitting");
});

test("mountainToday returns a date string", () => {
  assert.match(d.mountainToday(new Date("2026-10-04T05:30:00Z")), /^2026-10-03$/, "11:30 p.m. Mountain the night before");
});
