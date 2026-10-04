const test = require("node:test");
const assert = require("node:assert/strict");
const ga = require("../netlify/functions/_lib/ga-traffic.js");

const rows = [
  { dimensionValues: [{ value: "20261001" }], metricValues: [{ value: "10" }, { value: "8" }] },
  { dimensionValues: [{ value: "20261003" }], metricValues: [{ value: "30" }, { value: "20" }] },
  { dimensionValues: [{ value: "20260915" }], metricValues: [{ value: "6" }, { value: "5" }] },
  { dimensionValues: [{ value: "20251003" }], metricValues: [{ value: "4" }, { value: "4" }] },
  { dimensionValues: [{ value: "20250102" }], metricValues: [{ value: "2" }, { value: "2" }] },
];

test("GA rows become a date map; missing days count as zero up to today and null after", () => {
  const byDate = ga.rowsToMap(rows);
  assert.equal(byDate["2026-10-03"].sessions, 30);
  const s = ga.yearSeries(byDate, 2026, "2026-10-04", "sessions");
  assert.equal(s.length, 365);
  assert.equal(s[ga.dayIndex("2026-10-01")], 10);
  assert.equal(s[ga.dayIndex("2026-10-02")], 0, "no row = 0 visits");
  assert.equal(s[ga.dayIndex("2026-10-04")], 0, "today so far");
  assert.equal(s[ga.dayIndex("2026-10-05")], null, "future days are gaps");
});

test("month and year-to-date daily averages compare against last month and last year", () => {
  const byDate = ga.rowsToMap(rows);
  const sm = ga.summarize(byDate, "2026-10-04");
  assert.equal(sm.thisMonth.days, 4);
  assert.equal(sm.thisMonth.total, 40);
  assert.equal(sm.thisMonth.avgPerDay, 10);
  assert.equal(sm.lastMonth.days, 30);
  assert.equal(sm.lastMonth.total, 6);
  assert.equal(sm.monthChangePct, Math.round(((10 - 6 / 30) / (6 / 30)) * 100));
  assert.equal(sm.ytd.days, ga.dayIndex("2026-10-04") + 1);
  assert.equal(sm.ytd.total, 46);
  assert.equal(sm.lastYtd.total, 6, "same days last year: Jan 2 and Oct 3");
  assert.equal(sm.lastYearHasData, true);
  const none = ga.summarize(ga.rowsToMap(rows.slice(0, 3)), "2026-10-04");
  assert.equal(none.lastYearHasData, false);
  assert.equal(none.yearChangePct, null);
});

test("chart data has a label per day and a tick at each month start", () => {
  const c = ga.chartData(ga.rowsToMap(rows), "2026-10-04");
  assert.equal(c.labels.length, 365);
  assert.equal(c.labels[0], "1 Jan");
  assert.equal(c.ticks.length, 12);
  assert.deepEqual(c.ticks[9], { i: ga.dayIndex("2026-10-01"), label: "Oct" });
  assert.equal(c.lastYear.length, 365);
  assert.equal(c.lastYear[ga.dayIndex("2025-10-03")], 4);
});
