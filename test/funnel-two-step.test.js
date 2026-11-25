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

test("out-of-area on /book joins the area waitlist, not a booking lead", () => {
  assert.match(bookHtml, /id="waitlistBtn"/);
  assert.match(bookHtml, /fetch\('\/api\/area-waitlist'/);
  assert.match(bookHtml, /new URLSearchParams\(\{name:name,phone:phone,zip:z,email:email,source:'book_page'\}\)/);
  assert.match(bookHtml, /appendPurebaricLeadSource\(awData,\{name:name,email:email\}\)/);
  assert.match(bookHtml, /pbTrack\('waitlist_join',pbFunnel\(\{source:'book_page',in_area:false\}\)\)/);
  assert.match(bookHtml, /pbMeta\('Subscribe',\{content_category:'waitlist'\}\)/);
  const wait = bookHtml.slice(bookHtml.indexOf("var _waitlistJoining"), bookHtml.indexOf("var _submitting"));
  assert.doesNotMatch(wait, /booking-submit/);
  assert.doesNotMatch(wait, /booking_step1_save/);
  assert.doesNotMatch(wait, /generate_lead/);
  assert.doesNotMatch(wait, /trackPurebaricMeta\?\.\('Lead'/);
  assert.doesNotMatch(wait, /InitiateCheckout/);
  assert.match(areaWaitlist, /body\.source \|\| ""\)\.trim\(\) === "book_page"/);
});

test("booking-submit handles step-1 leads and converts them on full submit", () => {
  assert.match(bookingSubmit, /body\.lead_stage === "step1"/);
  assert.match(bookingSubmit, /status: "lead", bookingMode: "lead"/);
  assert.match(bookingSubmit, /existingLead\.bookingMode === "lead"/);
  assert.match(bookingSubmit, /\{ \.\.\.keepAttribution\(existingLead, bookingFields\), status: "new" \}/);
  // A step-1 lead never fires the booking conversion event: the lead branch
  // returns before routing and before sendBookingRequestSubmitted. It does fire
  // the lead event booking_lead_submit, but only for a newly created lead, so a
  // back-button re-submit does not double-count in GA4.
  const leadBranch = bookingSubmit.slice(
    bookingSubmit.indexOf('body.lead_stage === "step1"'),
    bookingSubmit.indexOf("const analyticsConsent")
  );
  assert.doesNotMatch(leadBranch, /sendBookingRequestSubmitted/);
  assert.match(leadBranch, /sendBookingLeadSubmitted/);
  assert.match(leadBranch, /isNewLead/);
  assert.match(leadBranch, /analytics_client_id/);
  assert.doesNotMatch(leadBranch, /countAvailableToday/);
  // Out-of-area copy uses "if", not a guaranteed "when".
  assert.match(bookingSubmit, /We don't deliver to \$\{zip\} yet\. We've saved your request, and we'll reach out if we're able to deliver to your area\./);
});

test("step-1 lead admin email keeps the Booking request subject with a lead tag", () => {
  assert.match(emailLib, /Step 1 lead\./);
  assert.match(emailLib, /" \[step 1 lead\]"/);
});

test("admin can see and triage step-1 leads", () => {
  assert.match(adminBookings, /"archived"\]\.includes\(body\.status\)/);
  assert.match(adminHtml, /<option value="lead">Step 1 lead<\/option>/);
  assert.match(adminHtml, /const STATUSES = \['new', 'lead', 'contacted', 'approved', 'rejected', 'converted', 'archived'\]/);
  assert.match(adminHtml, /const leadBadge = b\.bookingMode === 'lead'/);
  assert.match(adminHtml, /Step 1 lead · step 2 not confirmed yet/);
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
  assert.match(areaWaitlist, /"Area waitlist via homepage ZIP checker"/);
  assert.match(areaWaitlist, /"Area waitlist via \/book"/);
});

test("booking page installs v2 funnel events and keeps pbFunnel", () => {
  assert.match(bookHtml, /src="\/book-funnel-events\.js"/);
  assert.match(bookHtml, /PBBookFunnel\)window\.PBBookFunnel\.install\(window,document\)/);
  assert.match(bookHtml, /function pbFunnel\(o\)\{return window\.PBMetrics&&window\.PBMetrics\.funnelParams\?window\.PBMetrics\.funnelParams\(o\):o;\}/);
  assert.match(bookHtml, /in_area:!!inArea/);
  assert.match(bookHtml, /PBBookFunnel\.step1Save\(window,!j\.outOfArea\)/);});

test("measurement fires for defaults: plan, area, and typed dates count", () => {
  assert.match(bookHtml, /var areaFired=false,planFired=false,dateFired=false/);
  assert.match(bookHtml, /fireServiceAreaCheck\(document\.getElementById\('zip'\)\.value\)/);
  assert.match(bookHtml, /if\(!planFired\)\{planFired=true/);
  assert.match(bookHtml, /if\(dateVal&&!dateFired\)\{dateFired=true/);
});

test("step-1 submit fires InitiateCheckout once, step 2 fires Lead and CompleteRegistration", () => {
  // A step-1 save is a partial lead: InitiateCheckout once per new lead; a
  // re-submit of an existing lead (back button, edit, re-submit) does not fire again.
  assert.match(bookHtml, /if\(!existingLead\)pbMeta\('InitiateCheckout',\{content_category:document\.getElementById\('rentalType'\)\.value\|\|'residential'\},\{eventID:j\.id\+':step1'\}\)/);
  // The completed request is the Lead (one per visitor), plus CompleteRegistration.
  assert.match(bookHtml, /pbMeta\('Lead',\{content_category:rtype,value:Number\(leadValue\)\|\|0,currency:'USD'\},\{eventID:leadEventId\}\)/);
  assert.match(bookHtml, /pbMeta\('CompleteRegistration',\{content_category:rtype\},\{eventID:leadEventId\+':complete'\}\)/);
  // Step 1 sends the anonymous GA identifiers so the backend can send the
  // server-side lead event for the new lead.
  assert.match(bookHtml, /data\.set\('analytics_client_id',analyticsContext\.clientId\)/);
});

test("homepage promo signup and area waitlist fire Meta Subscribe, not Lead", () => {
  assert.match(indexHtml, /trackPurebaricMeta\?\.\('Subscribe',\{content_category:window\.PB_BF\?'black-friday':'homepage'\}\)/);
  assert.match(indexHtml, /trackPurebaricEvent\?\.\('waitlist_join',\{source:'homepage'\}\)/);
  assert.match(indexHtml, /trackPurebaricMeta\?\.\('Subscribe',\{content_category:'waitlist'\}\)/);
  assert.doesNotMatch(indexHtml, /trackPurebaricMeta\?\.\('Lead'/);
  assert.match(indexHtml, /appendPurebaricLeadSource\(awData,\{name:name\}\)/);
});

test("step 1 is ZIP and contact only; address, date and optional answers are on step 2", () => {
  const lead = bookHtml.slice(bookHtml.indexOf('id="leadForm"'), bookHtml.indexOf('id="resForm"'));
  const step2 = bookHtml.slice(bookHtml.indexOf('id="resForm"'), bookHtml.indexOf('class="book-side"'));
  const at = (html, s) => { const i = html.indexOf(s); assert.ok(i >= 0, s); return i; };
  assert.ok(at(lead, 'id="zip"') < at(lead, 'id="cfn"'));
  assert.ok(at(lead, 'id="cfn"') < at(lead, 'id="ce"'));
  assert.ok(at(lead, 'id="ce"') < at(lead, 'id="cp"'));
  assert.ok(at(lead, 'id="cp"') < at(lead, 'id="leadBtn"'));
  assert.equal(lead.includes('id="addrRow"'), false);
  assert.equal(lead.includes('id="dateBookRow"'), false);
  assert.equal(lead.includes('id="dateReqRow"'), false);
  assert.equal(lead.includes('id="cstreet"'), false);
  assert.equal(lead.includes('id="cheard"'), false);
  assert.ok(at(step2, 'id="addrRow"') < at(step2, 'id="dateBookRow"'));
  assert.ok(at(step2, 'id="dateBookRow"') < at(step2, 'id="cbiz"'));
  assert.ok(at(step2, 'id="cheard"') < at(step2, 'id="cnotes"'));
  const leadSubmit = bookHtml.slice(bookHtml.indexOf("/* ───── Step 1:"), bookHtml.indexOf("document.getElementById('backBtn')"));
  assert.doesNotMatch(leadSubmit, /data\.set\('street-address'/);
  assert.doesNotMatch(leadSubmit, /data\.set\('preferred_date'/);
  assert.doesNotMatch(leadSubmit, /data\.set\('heard_about'/);
  assert.match(leadSubmit, /data\.set\('lead_stage','step1'\)/);
  assert.match(leadSubmit, /data\.set\('zip_code'/);
  // Server still accepts address and date on a step-1 post; the client no longer sends them.
  const leadBranch = bookingSubmit.slice(bookingSubmit.indexOf('body.lead_stage === "step1"'), bookingSubmit.indexOf("let lead = null"));
  assert.match(leadBranch, /streetAddress:/);
  assert.match(leadBranch, /startDate:/);
});

test("business savings count the waived fee, and the homepage carries the chamber", () => {
  assert.match(bookHtml, /money\(\(BASE_BIZ-r\)\*m\+\(BF\?BF_OFF\+BIZ_FEE:0\)\)/);
  assert.match(indexHtml, /&chamber=sitting/);
  assert.match(bookHtml, /get\('chamber'\)/);
  assert.match(read("business.html"), /<a href="\/book\?type=business" style="color:#e0b9a8/);
});
