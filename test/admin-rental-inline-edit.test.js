const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const adminHtml = fs.readFileSync(path.join(__dirname, "..", "admin.html"), "utf8");

test("rental edits use the shared inline form under the selected rental", () => {
  assert.match(adminHtml, /id="rentalFormAnchor"/);
  assert.match(adminHtml, /<tr data-id="\$\{escape\(r\.id\)\}"/);
  assert.match(
    adminHtml,
    /placeInlineForm\('rentalForm', `#rentalsList tr\[data-id="\$\{CSS\.escape\(id\)\}"\]`, 8\)/
  );
  assert.match(adminHtml, /onclick="cancelRentalForm\(\)"/);
});

test("rental form is returned to its anchor before list replacement", () => {
  assert.match(
    adminHtml,
    /if \(document\.getElementById\('rentalFormInlineRow'\)\) \{\s*resetFormPosition\('rentalForm', 'rentalFormAnchor'\);\s*\}/
  );
  assert.match(
    adminHtml,
    /resetFormPosition\('rentalForm', 'rentalFormAnchor'\);\s*document\.getElementById\('rentalForm'\)\.classList\.remove\('open'\);\s*populateChamberSelect\(\);/
  );
});

test("rentals repaint after concurrent inventory loads settle", () => {
  const settled = adminHtml.indexOf("const results = await Promise.allSettled");
  const finalRentalRender = adminHtml.indexOf(
    "if (typeof renderRentals === 'function') renderRentals();",
    settled
  );

  assert.notEqual(settled, -1);
  assert.ok(finalRentalRender > settled);
});

test("rental grid lists chamber followed by machine in the first column", () => {
  assert.match(adminHtml, /<th>Chamber \/ machine<\/th>/);
  assert.match(
    adminHtml,
    /<strong>\$\{escape\(chamber \? chamber\.name : '\(chamber unavailable\)'\)\}<\/strong>\s*<div class="renter-line">\$\{escape\(machine \? machine\.name : '\(no machine assigned\)'\)\}<\/div>/
  );
});
