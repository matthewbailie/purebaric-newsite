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
  const late = ga.yearSeries(ga.rowsToMap(rows.slice(0, 3)), 2026, "2026-10-04", "sessions"); // tracking began 2026-09-15
  assert.equal(late[ga.dayIndex("2026-09-14")], null, "before tracking began is no data, not zero");
  assert.equal(late[ga.dayIndex("2026-09-16")], 0, "a tracked day without a row is zero");
});

test("averages start on the first tracked day", () => {
  const sm = ga.summarize(ga.rowsToMap(rows.slice(0, 3)), "2026-10-04"); // rows from 2026-09-15 on
  assert.equal(sm.ytd.days, ga.dayIndex("2026-10-04") - ga.dayIndex("2026-09-15") + 1);
  assert.equal(sm.ytd.since, "2026-09-15");
  assert.equal(sm.lastMonth.days, 30, "September is tracked in full for the month comparison");
  const aug = ga.summarize(ga.rowsToMap(rows.slice(0, 3)), "2026-09-20");
  assert.equal(aug.lastMonth.avgPerDay, null, "August was before tracking: no comparison");
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

test("page paths fold into the pages the owner thinks in", () => {
  assert.equal(ga.normalizePage("/"), "Home");
  assert.equal(ga.normalizePage("/index.html"), "Home");
  assert.equal(ga.normalizePage("/book"), "Booking");
  assert.equal(ga.normalizePage("/book?type=business"), "Business booking");
  assert.equal(ga.normalizePage("/book?type=business&v=2"), "Business booking");
  assert.equal(ga.normalizePage("/book?v=2"), "Booking");
  assert.equal(ga.normalizePage("/business/"), "For businesses");
  assert.equal(ga.normalizePage("/admin?v=1"), null, "owner's admin visits are left out");
  assert.equal(ga.normalizePage("/some-old-page"), "Other");
});

test("per-page rows sum by page and day, and pages summarize busiest-first after the key pages", () => {
  const rows = [
    { dimensionValues: [{ value: "20261003" }, { value: "/" }], metricValues: [{ value: "5" }, { value: "4" }] },
    { dimensionValues: [{ value: "20261003" }, { value: "/index.html" }], metricValues: [{ value: "2" }, { value: "2" }] },
    { dimensionValues: [{ value: "20261003" }, { value: "/book?type=business" }], metricValues: [{ value: "3" }, { value: "3" }] },
    { dimensionValues: [{ value: "20261002" }, { value: "/pricing" }], metricValues: [{ value: "9" }, { value: "6" }] },
    { dimensionValues: [{ value: "20261002" }, { value: "/admin" }], metricValues: [{ value: "40" }, { value: "1" }] },
  ];
  const byPage = ga.pageRowsToMap(rows);
  assert.equal(byPage.Home["2026-10-03"].views, 7);
  assert.equal(byPage["Business booking"]["2026-10-03"].views, 3);
  assert.equal(byPage.Pricing["2026-10-02"].views, 9);
  assert.equal(byPage.Other, undefined);
  const pages = ga.summarizePages(byPage, "2026-10-04");
  assert.deepEqual(pages.map((p) => p.label), ["Home", "Business booking", "Pricing"]);
  assert.equal(pages[0].thisMonthTotal, 7);
  assert.equal(pages[2].ytdTotal, 9);
});
