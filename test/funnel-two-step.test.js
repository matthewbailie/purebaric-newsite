const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.join(__dirname, "..");
const read = (p) => fs.readFileSync(path.join(root, p), "utf8");

const bookHtml = read("book.html");
const indexHtml = read("index.html");
const adminHtml = read("admin.html");
const bookingSubmit = read("netlify/functions/booking-submit.js");
const emailLib = read("netlify/functions/_lib/email.js");
const adminBookings = read("netlify/functions/admin-bookings.js");
const areaWaitlist = read("netlify/functions/area-waitlist.js");
const netlifyToml = read("netlify.toml");

test("booking page is a two-step form: step 1 captures the lead, step 2 holds delivery details", () => {
  assert.match(bookHtml, /id="leadForm"/);
  assert.match(bookHtml, /id="resForm"/);
  assert.match(bookHtml, /id="leadId"/);
  assert.match(bookHtml, /id="leadBtn"/);
  assert.match(bookHtml, /id="backBtn"/);
  // Step 2 starts hidden; the Back button swaps back without losing values.
  assert.match(bookHtml, /id="resForm" class="frm" novalidate hidden/);
  assert.match(bookHtml, /document\.getElementById\('resForm'\)\.hidden=true/);
  // The shared result line lives outside both forms, so the submitted-state
  // CSS hides the forms but keeps the confirmation visible.
  assert.ok(bookHtml.indexOf('id="resResult"') < bookHtml.indexOf('id="leadForm"'));
  // Step 1 posts as a lead, and re-submitting step 1 updates the same record.
  assert.match(bookHtml, /data\.set\('lead_stage','step1'\)/);
  assert.match(bookHtml, /data\.set\('lead_id',existingLead\)/);
  // The full submit converts the lead instead of creating a second record.
  assert.match(bookHtml, /data\.set\('lead_id',leadIdVal\)/);
});

test("step-1 out-of-area is a confirmation only, with no second form", () => {
  assert.match(bookHtml, /Out-of-area is a confirmation only: no second form, no re-entry\./);
  assert.match(bookHtml, /we'll reach out if we're able to deliver to your area\./);
});

test("booking-submit handles step-1 leads and converts them on full submit", () => {
  assert.match(bookingSubmit, /body\.lead_stage === "step1"/);
  assert.match(bookingSubmit, /status: "lead", bookingMode: "lead"/);
  assert.match(bookingSubmit, /existingLead\.bookingMode === "lead"/);
  assert.match(bookingSubmit, /\{ \.\.\.bookingFields, status: "new" \}/);
  // A step-1 lead never fires the booking conversion event: the lead branch
  // returns before routing and before sendBookingRequestSubmitted.
  const leadBranch = bookingSubmit.slice(
    bookingSubmit.indexOf('body.lead_stage === "step1"'),
    bookingSubmit.indexOf("const analyticsConsent")
  );
  assert.doesNotMatch(leadBranch, /sendBookingRequestSubmitted/);
  assert.doesNotMatch(leadBranch, /countAvailableToday/);
  // Out-of-area copy uses "if", not a guaranteed "when".
  assert.match(bookingSubmit, /We don't deliver to \$\{zip\} yet\. We've saved your request, and we'll reach out if we're able to deliver to your area\./);
});

test("step-1 lead admin email keeps the Booking request subject with a lead tag", () => {
  assert.match(emailLib, /Step 1 lead\./);
  assert.match(emailLib, /" \[step 1 lead\]"/);
});

test("admin can see and triage step-1 leads", () => {
  assert.match(adminBookings, /"lead"\]\.includes\(body\.status\)/);
  assert.match(adminHtml, /<option value="lead">Step 1 lead<\/option>/);
  assert.match(adminHtml, /const STATUSES = \['new', 'lead', 'contacted', 'approved', 'rejected', 'converted'\]/);
  assert.match(adminHtml, /const leadBadge = b\.bookingMode === 'lead'/);
  assert.match(adminHtml, /Step 1 lead · no address, date, or consent yet/);
});

test("homepage ZIP checker offers a short area waitlist only when out of area", () => {
  assert.match(indexHtml, /id="areaWaitlist"/);
  assert.match(indexHtml, /id="areaWaitlist2"/);
  assert.match(indexHtml, /function submitAreaWaitlist\(s\)/);
  assert.match(indexHtml, /\/api\/area-waitlist/);
  assert.match(indexHtml, /if\(w\)w\.hidden=false/);
  assert.match(netlifyToml, /from = "\/api\/area-waitlist"/);
  assert.match(netlifyToml, /to = "\/.netlify\/functions\/area-waitlist"/);
  assert.match(areaWaitlist, /name, phone and zip are required/);
  assert.match(areaWaitlist, /reason: "Area waitlist via homepage ZIP checker"/);
});

test("measurement fires for defaults: plan, area, and typed dates count", () => {
  assert.match(bookHtml, /var areaFired=false,planFired=false,dateFired=false/);
  assert.match(bookHtml, /if\(!areaFired\)\{areaFired=true/);
  assert.match(bookHtml, /if\(!planFired\)\{planFired=true/);
  assert.match(bookHtml, /if\(dateVal&&!dateFired\)\{dateFired=true/);
});
