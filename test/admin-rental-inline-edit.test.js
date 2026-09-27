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

test("Customers tab: compact tap-to-expand cards with a Close button", () => {
  assert.match(adminHtml, /<details class="customer-card">\s*<summary class="customer-summary">/);
  assert.match(adminHtml, /onclick="closeCustomerCard\(this\)"/);
  // one open at a time
  assert.match(adminHtml, /addEventListener\('toggle'[\s\S]*details\.customer-card\[open\]/);
});

test("Customers tab: Active/All filter and a Copy address button", () => {
  assert.match(adminHtml, /id="customerFilter"[\s\S]*data-f="active"[\s\S]*data-f="all"/);
  assert.match(adminHtml, /const isActiveCustomer = \(c\) => rankOf\(c\)\[0\] <= 1;/); // current or upcoming
  assert.match(adminHtml, /data-copy="\$\{escape\(addressLine\)\}" onclick="copyAddress\(this\)"/);
  assert.match(adminHtml, /navigator\.clipboard\.writeText\(text\)/);
});

test("expanded customer card lists each fact once (name, paid, rate and totals live in the summary row)", () => {
  const start = adminHtml.indexOf('<div class="customer-body">');
  const body = adminHtml.slice(start, adminHtml.indexOf('</details>', start));
  assert.ok(!/<h4>/.test(body), "no repeated name");
  assert.ok(!/Lifetime paid/.test(body), "no repeated paid amount");
  assert.ok(!/Current rate/.test(body), "no repeated rate");
  assert.ok(!/rental request\${c\.bookings/.test(body), "no repeated rental count line");
  assert.match(adminHtml, /details\.customer-card\[open\] \.cs-line \{ display: none; \}/);
});

test("the signed-in account name is always shown (passkey sessions get it from the server)", () => {
  assert.match(adminHtml, /Signed in as <strong>\$\{escape\(\(passkeyMe && passkeyMe\.email\) \|\| 'admin'\)\}<\/strong>/);
  assert.ok(!/Signed in with passkey/.test(adminHtml));
  assert.match(adminHtml, /passkeyMe = await hasPasskeySession\(\)/);
});

test("Home shows average revenue per rental for the last 12 months and a rolling 30 days", () => {
  assert.match(adminHtml, /id="kpiRpr12"[\s\S]*id="kpiRpr30"/);
  assert.match(adminHtml, /M\.revenuePerRental\(_rentals \|\| \[\], today\)/);
});
