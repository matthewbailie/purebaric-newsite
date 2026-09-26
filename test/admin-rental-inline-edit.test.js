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

test("historical rental checkbox unlocks every chamber and machine", () => {
  assert.match(adminHtml, /<input type="checkbox" name="historical" id="rentalHistorical"/);
  // Both dropdown builders skip the availability filter when historical.
  assert.match(adminHtml, /function populateChamberSelect\(keepChamberId, keepMachineId, historical = rentalIsHistorical\(\)\)/);
  assert.match(adminHtml, /function populateRentalMachineSelect\(keepMachineId, historical = rentalIsHistorical\(\)\)/);
  assert.equal((adminHtml.match(/if \(historical\) return true;/g) || []).length, 2);
  // Editing a saved historical rental unlocks the dropdowns before the form opens.
  assert.match(adminHtml, /populateChamberSelect\(r\.chamberId, r\.machineId, !!r\.historical\)/);
  assert.match(adminHtml, /getElementById\('rentalHistorical'\)\.checked = !!r\.historical/);
  // The flag is always sent, so unchecking it on edit clears it.
  assert.match(adminHtml, /data\.historical = form\.querySelector\('\[name="historical"\]'\)\.checked/);
});

test("rentals API stores the historical flag without changing conflict rules", () => {
  const src = fs.readFileSync(path.join(__dirname, "..", "netlify", "functions", "admin-rentals.js"), "utf8");
  assert.match(src, /historical: cleanHistorical\(body\.historical\)/);
  assert.match(src, /patch\.historical = cleanHistorical\(body\.historical\)/);
  assert.match(src, /function cleanHistorical\(value\) \{\s*return value === true \|\| value === "true" \|\| value === "on";/);
});

test("historical rentals can be saved without an email; other rentals still need one", () => {
  assert.match(adminHtml, /\(!data\['renter-email'\] && !data\.historical\)/);
  assert.match(adminHtml, /const noEmail = fromRental && !data\.id && !\(data\.email \|\| ''\)\.trim\(\) && rentalIsHistorical\(\)/);
  // The customer form's email stays required except for a new customer added from a historical rental.
  assert.match(adminHtml, /\[name="email"\]'\)\.required = !rentalIsHistorical\(\)/);
});

test("Home shows renewals for the next 7 days above Operations", () => {
  assert.ok(adminHtml.indexOf('id="renewalsList"') < adminHtml.indexOf('>Operations</h3>'));
  assert.match(adminHtml, /M\.upcomingRenewals\(_rentals \|\| \[\], today, 7\)/);
});

test("customer loyalty months pool weekly-billed weeks into whole months", () => {
  assert.match(adminHtml, /const weeklyMonths = Math\.floor\(weeklyWeeks \* 12 \/ 52\);/);
  assert.match(adminHtml, /rentalMonths\(r\), 0\) \+ weeklyMonths/);
});

test("Stripe cancel: deep link from the alert opens a confirm-before-cancel flow", () => {
  assert.match(adminHtml, /loadAll\(\)\.then\(openDeepLinks\)/);
  assert.match(adminHtml, /params\.get\('cancelRental'\)/);
  assert.match(adminHtml, /if \(!confirm\(`Stop Stripe subscription/);
  assert.match(adminHtml, /key:'rental_ending'/);
  assert.match(adminHtml, /params\.get\('endingSoon'\)/);
});
