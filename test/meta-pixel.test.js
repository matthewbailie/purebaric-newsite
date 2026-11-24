// Meta pixel after the Nov 2026 tracking fix:
//  - step-1 save (a PARTIAL lead) = InitiateCheckout, once per new lead
//  - completed step-2 request = Lead with value + USD + eventID (the booking id),
//    plus CompleteRegistration (eventID id:complete) and GA4 generate_lead
//  - waitlist and promo sign-ups = Subscribe, never Lead
//  - out-of-area submits fire nothing
//  - neither tag loads under GPC, DNT, the /privacy opt-out, or the internal flag
const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");

const read = (p) => fs.readFileSync(path.join(__dirname, "..", p), "utf8");
const metrics = read("pb-metrics.js");
const book = read("book.html");

test("the Meta pixel loads only with a numeric id and never when tracking is blocked", () => {
  assert.match(metrics, /var META_PIXEL_ID = '(\d{10,20})?';/);
  assert.match(metrics, /if \(!META_READY \|\| blocked \|\| window\.purebaricMetaLoaded\) return;/);
  assert.match(metrics, /if \(!READY \|\| blocked \|\| window\.purebaricAnalyticsLoaded\) return;/);
  assert.match(metrics, /window\.trackPurebaricMeta = function/);
  assert.match(metrics, /connect\.facebook\.net\/en_US\/fbevents\.js/);
  assert.match(metrics, /navigator\.globalPrivacyControl === true/);
  assert.match(metrics, /navigator\.doNotTrack === '1'/);
  assert.match(metrics, /window\.doNotTrack === '1'/);
});

test("step 1 is InitiateCheckout; the completed request is the only Lead, with value, USD and eventID", () => {
  const step1 = book.slice(book.indexOf("j&&j.lead"), book.indexOf("document.getElementById('backBtn')"));
  assert.match(step1, /if\(!existingLead\)window\.trackPurebaricMeta\?\.\('InitiateCheckout',\{content_category:[^}]*\},\{eventID:j\.id\+':step1'\}\)/);
  assert.doesNotMatch(step1, /'Lead'/);
  const ok = book.slice(book.indexOf("j.success||j.ok"), book.indexOf("}else{", book.indexOf("j.success||j.ok")));
  assert.match(ok, /trackPurebaricMeta\?\.\('Lead',\{content_category:rtype,value:Number\(leadValue\)\|\|0,currency:'USD'\},\{eventID:leadEventId\}\)/);
  assert.match(ok, /var leadEventId=String\(j\.id\|\|leadIdVal\|\|''\)/);
  assert.match(ok, /trackPurebaricMeta\?\.\('CompleteRegistration',\{content_category:rtype\},\{eventID:leadEventId\+':complete'\}\)/);
  assert.match(ok, /trackPurebaricEvent\?\.\('generate_lead',pbFunnel\(\{value:Number\(leadValue\)\|\|0,currency:'USD'/);
  // The value is the selected plan's monthly rate (home rate() or business rateBiz()).
  assert.match(book, /var leadValue=BIZ\?rb:r;/);
  // generate_lead fires on step-2 success only.
  assert.equal((book.match(/'generate_lead'/g) || []).length, 1);
  const outOfArea = book.slice(book.indexOf("j&&j.outOfArea"), book.indexOf("j.success||j.ok"));
  assert.doesNotMatch(outOfArea, /trackPurebaricMeta/);
  assert.equal((book.match(/trackPurebaricMeta/g) || []).length, 3);
  assert.equal((book.match(/trackPurebaricMeta\?\.\('Lead'/g) || []).length, 1);
});

test("waitlist and promo sign-ups are Subscribe, never Lead", () => {
  for (const page of ["index.html", "waitlist.html"]) {
    const html = read(page);
    assert.doesNotMatch(html, /trackPurebaricMeta\?\.\('Lead'/, page);
    assert.match(html, /trackPurebaricMeta\?\.\('Subscribe'/, page);
  }
});

test("every lead form sends the first touch and the internal flag with the submission", () => {
  for (const page of ["book.html", "waitlist.html", "contact.html", "index.html"]) {
    assert.match(read(page), /window\.appendPurebaricLeadSource\(/, page);
  }
  assert.equal((book.match(/appendPurebaricLeadSource\(data/g) || []).length, 2, "step 1 and step 2");
});
