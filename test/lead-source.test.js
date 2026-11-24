// Server side of lead-source tracking: sanitising, internal detection, the
// customer type / use case allowlists, and the booking + waitlist + contact
// handlers persisting the fields (storage, email and analytics stubbed).
const { test } = require("node:test");
const assert = require("node:assert/strict");
const path = require("path");
const fs = require("fs");
const Module = require("module");

const FN = path.join(__dirname, "..", "netlify", "functions");
const LS = require("../netlify/functions/_lib/lead-source");
const realAnalytics = require("../netlify/functions/_lib/analytics");

function loadWithStubs(handlerFile, stubs) {
  const resolved = {};
  for (const [rel, impl] of Object.entries(stubs)) resolved[path.join(FN, rel.endsWith(".js") ? rel : rel + ".js")] = impl;
  const orig = Module._load;
  Module._load = function (req, parent, ...rest) {
    if (parent && parent.filename) {
      let full = path.resolve(path.dirname(parent.filename), req);
      if (!full.endsWith(".js") && !full.endsWith(".json")) full += ".js";
      if (resolved[full]) return resolved[full];
    }
    return orig.call(this, req, parent, ...rest);
  };
  try { const file = path.join(FN, handlerFile); delete require.cache[file]; return require(file); }
  finally { Module._load = orig; }
}
const form = (obj, headers = {}) => ({ httpMethod: "POST", headers: { "content-type": "application/x-www-form-urlencoded", ...headers }, body: new URLSearchParams(obj).toString() });
const FT = { ls_utm_source: "fb", ls_utm_medium: "paid", ls_utm_campaign: "30d_home_v1", ls_fbclid: "AbC_123", ls_referrer: "https://l.facebook.com/l.php", ls_landing: "/book", ls_ts: "2026-11-24T19:00:00.000Z" };

test("cleanLeadSource keeps allowlisted, sanitised values and labels the channel", () => {
  const r = LS.cleanLeadSource({ ...FT, heard_about: "Google search", customer_type: "gym", use_case: "recovery" });
  assert.equal(r.leadSource.utmSource, "fb");
  assert.equal(r.leadSource.fbclid, "AbC_123");
  assert.equal(r.leadSource.channel, "Meta paid");
  assert.equal(r.heardAbout, "Google search");
  assert.equal(r.customerType, "gym");
  assert.equal(r.useCase, "recovery");
  const bad = LS.cleanLeadSource({ ls_fbclid: "<script>", ls_referrer: "javascript:alert(1)", ls_landing: "/x?email=a@b.com", ls_ts: "yesterday", customer_type: "Hospital", use_case: "treatment", heard_about: "spam" });
  assert.equal(bad.leadSource, null);
  assert.equal(bad.customerType, ""); assert.equal(bad.useCase, ""); assert.equal(bad.heardAbout, "");
  assert.equal(LS.cleanLeadSource({ ls_referrer: "https://www.google.com/search?q=x" }).leadSource.referrer, "https://www.google.com/search");
  assert.equal(LS.channelOf({ referrer: "https://www.google.com/" }), "Organic search");
  assert.equal(LS.channelOf({ gclid: "x" }), "Google Ads");
  assert.equal(LS.channelOf({ utmSource: "fb_marketplace" }), "Facebook Marketplace");
  assert.equal(LS.channelOf({}), "Direct");
});

test("customer type values are home, athlete, gym, clinic, salon, other (visible: Home user, Athlete, Gym, Clinic, Salon, Other); use cases use no medical wording", () => {
  assert.deepEqual(Object.values(LS.CUSTOMER_TYPE_LABELS), ["Home", "Athlete", "Gym", "Clinic", "Salon", "Other"]);
  const words = Object.values(LS.USE_CASE_LABELS).join(" ").toLowerCase();
  assert.doesNotMatch(words, /treat|cure|heal|therap|diagnos|fda|medical|disease|surgery|pain/);
  for (const page of ["book.html", "waitlist.html", "contact.html"]) {
    const html = fs.readFileSync(path.join(__dirname, "..", page), "utf8");
    const sel = html.match(/<select[^>]*name="customer_type"[^>]*>([\s\S]*?)<\/select>/);
    assert.ok(sel, `${page} has the customer type field`);
    assert.deepEqual([...sel[1].matchAll(/<option value="([a-z]+)">([^<]+)<\/option>/g)].map((m) => [m[1], m[2]]), [["home", "Home user"], ["athlete", "Athlete"], ["gym", "Gym"], ["clinic", "Clinic"], ["salon", "Salon"], ["other", "Other"]]);
    assert.match(html, /name="use_case"/);
    assert.match(html, /name="heard_about"/);
    assert.doesNotMatch(sel[0], /required/);
  }
});

test("customer type and use case never reach GA, Meta or browser storage", () => {
  const metrics = fs.readFileSync(path.join(__dirname, "..", "pb-metrics.js"), "utf8");
  assert.doesNotMatch(metrics, /customer_type|use_case|customerType|useCase/);
  for (const page of ["book.html", "waitlist.html", "contact.html"]) {
    const html = fs.readFileSync(path.join(__dirname, "..", page), "utf8");
    for (const call of html.match(/track(?:PurebaricEvent|PurebaricMeta)\?*\.?\([^;]*\)/g) || []) {
      assert.doesNotMatch(call, /ctype|cuse|wlType|wlUse|cType|cUse|customer_type|use_case/, `${page}: ${call}`);
    }
    assert.doesNotMatch(html, /(localStorage|sessionStorage)\.setItem\([^)]*(customer|use_case|ctype|cuse)/i);
  }
  const analytics = fs.readFileSync(path.join(FN, "_lib", "analytics.js"), "utf8");
  assert.doesNotMatch(analytics, /customerType|useCase|heardAbout/);
});

test("isInternalLead: TEST names, test emails, the owner; not real people with 'test' inside a word", () => {
  assert.equal(LS.isInternalLead({ firstName: "TEST", lastName: "x", email: "a@b.com" }), true);
  assert.equal(LS.isInternalLead({ name: "jane", email: "qa.test@b.com" }), true);
  assert.equal(LS.isInternalLead({ name: "M", email: "matthewbailie@gmail.com" }), true);
  assert.equal(LS.isInternalLead({ name: "M", email: "matthew.bailie+x@gmail.com" }), true);
  assert.equal(LS.isInternalLead({ name: "Jane", email: "j@b.com", flag: "1" }), true);
  assert.equal(LS.isInternalLead({ name: "Celeste Testa", email: "celeste@contest.com" }), false);
  assert.equal(LS.isInternalLead({ name: "Jane Doe", email: "jane@example.com" }), false);
});

test("GA4 Measurement Protocol never sends for an internal record", async () => {
  process.env.GA4_API_SECRET = "s";
  let calls = 0;
  global.fetch = async () => { calls++; return { ok: true, status: 204 }; };
  const r = await realAnalytics.sendBookingRequestSubmitted({ booking: { id: "b", internal: true, analytics: { consentGranted: true, clientId: "1.2" } } });
  assert.deepEqual(r, { sent: false, reason: "internal" });
  assert.equal(calls, 0);
  const ok = await realAnalytics.sendBookingRequestSubmitted({ booking: { id: "b", analytics: { consentGranted: true, clientId: "1.2", device: "mobile", variant: "control" } } });
  assert.equal(ok.sent, true);
});

function bookingStubs(rec) {
  const db = new Map();
  return {
    db,
    stubs: {
      "_lib/storage": {
        getServiceArea: async () => ({ prefixes: ["840"], zips: [] }),
        getNotifications: async () => ({}),
        getTwilioConfig: async () => ({}),
        getBooking: async (id) => db.get(id) || null,
        createBooking: async (d) => { const b = { id: "bk-" + (db.size + 1), createdAt: "x", ...d }; db.set(b.id, b); return b; },
        updateBooking: async (id, patch) => { const b = { ...db.get(id), ...patch, id }; db.set(id, b); return b; },
      },
      "_lib/email": { notifyAdminBooking: async () => {}, notifyAdminOutOfArea: async () => {}, notifyAdminSms: async () => {} },
      "_lib/analytics": {
        ...realAnalytics,
        sendBookingLeadSubmitted: async ({ booking }) => { rec.push(["lead", booking.id]); return { sent: false }; },
        sendBookingRequestSubmitted: async ({ booking }) => { rec.push(["request", booking.id]); return { sent: false }; },
      },
    },
  };
}

test("booking-submit step 1 saves lead source, answers and device; TEST leads skip the GA4 send", async () => {
  const sent = [];
  const { db, stubs } = bookingStubs(sent);
  const h = loadWithStubs("booking-submit.js", stubs).handler;
  const base = { lead_stage: "step1", "first-name": "Jane", "last-name": "Doe", customer_email: "jane@example.com", zip_code: "84043", rental_type: "residential" };
  let r = await h(form({ ...base, ...FT, heard_about: "Friend or family", customer_type: "athlete", use_case: "performance", pb_device: "mobile", pb_variant: "personalized" }));
  assert.equal(r.statusCode, 200);
  const lead = db.get(JSON.parse(r.body).id);
  assert.equal(lead.leadSource.utmCampaign, "30d_home_v1");
  assert.equal(lead.leadSource.channel, "Meta paid");
  assert.equal(lead.heardAbout, "Friend or family");
  assert.equal(lead.customerType, "athlete");
  assert.equal(lead.useCase, "performance");
  assert.equal(lead.internal, false);
  assert.equal(lead.analytics.device, "mobile");
  assert.equal(lead.analytics.variant, "personalized");
  assert.deepEqual(sent, [["lead", lead.id]]);

  // Step 2 converts the lead and keeps the step-1 attribution even if it is not re-sent.
  r = await h(form({ "first-name": "Jane", "last-name": "Doe", customer_email: "jane@example.com", zip_code: "99999", lead_id: lead.id }, { "user-agent": "Mozilla/5.0 (iPhone)" }));
  const conv = db.get(lead.id);
  assert.equal(conv.leadSource.fbclid, "AbC_123");
  assert.equal(conv.customerType, "athlete");
  assert.equal(conv.analytics.device, "mobile", "UA fallback");

  // TEST lead: saved and flagged internal, no Measurement Protocol send.
  sent.length = 0;
  r = await h(form({ ...base, "first-name": "TEST" }));
  const t = db.get(JSON.parse(r.body).id);
  assert.equal(t.internal, true);
  assert.deepEqual(sent, []);
  r = await h(form({ ...base, pb_internal: "1" }));
  assert.equal(db.get(JSON.parse(r.body).id).internal, true);
  assert.deepEqual(sent, []);
});

test("waitlist-join, area-waitlist and contact-submit persist lead source and answers", async () => {
  const saved = [];
  const wl = loadWithStubs("waitlist-join.js", {
    "_lib/storage": { createWaitlistEntry: async (d) => { saved.push(d); return { id: "w1", ...d }; }, addPromoSubscriber: async () => null },
    "_lib/email": { notifyAdminWaitlistJoin: async () => {} },
  }).handler;
  await wl(form({ first_name: "Jane", last_name: "Doe", email: "jane@example.com", ...FT, customer_type: "salon", use_case: "business_amenity", heard_about: "Google Maps" }));
  assert.equal(saved[0].leadSource.utmSource, "fb");
  assert.equal(saved[0].customerType, "salon");
  assert.equal(saved[0].useCase, "business_amenity");
  assert.equal(saved[0].heardAbout, "Google Maps");
  assert.equal(saved[0].internal, false);

  const aw = loadWithStubs("area-waitlist.js", {
    "_lib/storage": { createWaitlistEntry: async (d) => { saved.push(d); return { id: "w2", ...d }; } },
    "_lib/email": { notifyAdminWaitlistJoin: async () => {} },
  }).handler;
  await aw(form({ name: "Test Person", phone: "801", zip: "84043", ...FT }));
  assert.equal(saved[1].leadSource.landingPath, "/book");
  assert.equal(saved[1].internal, true);

  const contacts = []; const mails = [];
  const cs = loadWithStubs("contact-submit.js", {
    "_lib/storage": { createContactMessage: async (d) => { const c = { id: "c1", ...d }; contacts.push(c); return c; } },
    "_lib/email": { send: async (m) => { mails.push(m); } },
  }).handler;
  const r = await cs(form({ name: "Scott B", email: "scott@example.com", message: "Hi", topic: "Business rental", ...FT, customer_type: "gym", use_case: "business_amenity" }));
  assert.equal(JSON.parse(r.body).id, "c1");
  assert.equal(contacts[0].leadSource.channel, "Meta paid");
  assert.equal(contacts[0].customerType, "gym");
  assert.match(mails[0].html, /Customer type:<\/strong> Gym/);
  assert.match(mails[0].subject, /^Contact: Scott B/);

  // A storage failure never blocks the owner's email.
  const cs2 = loadWithStubs("contact-submit.js", {
    "_lib/storage": { createContactMessage: async () => { throw new Error("blobs down"); } },
    "_lib/email": { send: async (m) => { mails.push(m); } },
  }).handler;
  const r2 = await cs2(form({ name: "A", email: "a@example.com", message: "Hi" }));
  assert.equal(r2.statusCode, 200);
  assert.equal(mails.length, 2);
});

test("admin shows lead source next to Ad click ID, in the waitlist list and details", () => {
  const admin = fs.readFileSync(path.join(__dirname, "..", "admin.html"), "utf8");
  const i = admin.indexOf("<strong>Ad click ID</strong>");
  assert.ok(i > 0 && admin.indexOf("${leadSourceRows(b)}", i) - i < 400, "lead source rows follow Ad click ID");
  assert.match(admin, /\$\{leadSourceRows\(w\)\}/);
  assert.match(admin, /leadSourceSummary\(w\)/);
  assert.match(admin, /Internal \/ TEST/);
  assert.match(admin, /row\('Customer type', customerTypeLabel\(r\.customerType\)\)/);
  assert.match(admin, /row\('Use case', useCaseLabel\(r\.useCase\)\)/);
});
