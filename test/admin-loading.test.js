const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const adminHtml = fs.readFileSync(path.join(__dirname, "..", "admin.html"), "utf8");

test("every admin tab can show the shared loading animation", () => {
  assert.match(adminHtml, /\.tab-loading-status/);
  assert.match(adminHtml, /className = 'tab-loading-status'/);
  assert.match(adminHtml, /class=\"admin-spin\"/);
  assert.match(adminHtml, /panel\.setAttribute\('aria-busy', 'true'\)/);
  assert.match(adminHtml, /const _panelLoadCounts = new Map\(\)/);
});

test("Home startup excludes unrelated slow admin endpoints", () => {
  const start = adminHtml.indexOf("async function loadAll()");
  const end = adminHtml.indexOf("// ───────── Keep the session fresh", start);
  const loadAll = adminHtml.slice(start, end);

  assert.match(loadAll, /withPanelLoading\(\['home', 'chambers', 'rentals'\], loadChambers\)/);
  assert.match(loadAll, /withPanelLoading\(\['home', 'chambers', 'rentals'\], loadRentals\)/);
  assert.doesNotMatch(loadAll, /loadOutreach\(\)/);
  assert.doesNotMatch(loadAll, /loadStripeConfig\(\)/);
  assert.doesNotMatch(loadAll, /loadTwilioConfig\(\)/);
  assert.doesNotMatch(loadAll, /loadServiceArea\(\)/);
});

test("route stops link their address to Google Maps directions", () => {
  assert.match(adminHtml, /class="rt-map"/);
  assert.match(adminHtml, /google\.com\/maps\/dir\/\?api=1&destination=/);
  assert.match(adminHtml, /encodeURIComponent\(addr\)/);
});

test("route saves are serialized per day, merge rapid ticks, and show a persistent error on failure", () => {
  assert.match(adminHtml, /_routePatchChains\[n\] = \(_routePatchChains\[n\] \|\| Promise\.resolve\(\)\)\.then\(run, run\)/);
  assert.match(adminHtml, /_routePending\[key\] = new Set/);
  assert.match(adminHtml, /id="rtErr\$\{d\.n\}"/);
  assert.match(adminHtml, /Save failed: \$\{err\.message\}\. Nothing was saved\./);
});

test("non-dashboard tabs load their data on demand", () => {
  assert.match(adminHtml, /outreach: \(\) => Promise\.all\(\[loadOutreach\(\), loadRoutes\(false\)\.catch\(\(\) => \{\}\)\]\)/);
  assert.match(adminHtml, /pricing: \(\) => Promise\.all\(\[loadPricing\(\), loadStripeConfig\(\)\]\)/);
  assert.match(adminHtml, /notifications: \(\) => Promise\.all\(\[loadNotifications\(\), loadTwilioConfig\(\)\]\)/);
  assert.match(adminHtml, /ensureTabData\(tab, \{ force: tab === 'customers' \}\)/);
});
