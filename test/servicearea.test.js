const { test } = require("node:test");
const assert = require("node:assert/strict");
const { zipServed, normalizeServiceArea, DEFAULT_SERVICE_AREA } = require("../netlify/functions/_lib/servicearea");

test("default area serves the historic prefixes and explicit ZIPs", () => {
  assert.equal(zipServed("84101", DEFAULT_SERVICE_AREA), true); // 841xx prefix
  assert.equal(zipServed("84044", DEFAULT_SERVICE_AREA), true); // 840xx prefix
  assert.equal(zipServed("84651", DEFAULT_SERVICE_AREA), true); // explicit
  assert.equal(zipServed("90210", DEFAULT_SERVICE_AREA), false); // out of area
  assert.equal(zipServed("8410", DEFAULT_SERVICE_AREA), false); // not 5 digits
  assert.equal(zipServed("", DEFAULT_SERVICE_AREA), false);
});

test("default area serves Morgan, Juab, and Sanpete counties (added 2026-09-26)", () => {
  assert.equal(zipServed("84050", DEFAULT_SERVICE_AREA), true); // Morgan
  assert.equal(zipServed("84018", DEFAULT_SERVICE_AREA), true); // Morgan
  assert.equal(zipServed("84648", DEFAULT_SERVICE_AREA), true); // Juab (Nephi)
  assert.equal(zipServed("84642", DEFAULT_SERVICE_AREA), true); // Sanpete (Manti)
  assert.equal(zipServed("84627", DEFAULT_SERVICE_AREA), true); // Sanpete (Ephraim)
  assert.equal(zipServed("84636", DEFAULT_SERVICE_AREA), false); // Tooele's Vernon, 846xx but NOT in our explicit list — must stay excluded
});

test("admin edits take effect: adding a ZIP and removing a prefix", () => {
  const area = { prefixes: ["841"], zips: ["90210"] };
  assert.equal(zipServed("90210", area), true); // added
  assert.equal(zipServed("84101", area), true); // still via 841 prefix
  assert.equal(zipServed("84044", area), false); // 840 prefix removed
});

test("normalize drops malformed entries and de-dupes", () => {
  const out = normalizeServiceArea({ prefixes: ["840", "840", "84", "abc"], zips: ["84651", "84651", "123", "84660"] });
  assert.deepEqual(out.prefixes, ["840"]);
  assert.deepEqual(out.zips, ["84651", "84660"]);
});

test("empty configured area serves nothing", () => {
  assert.equal(zipServed("84101", { prefixes: [], zips: [] }), false);
});
