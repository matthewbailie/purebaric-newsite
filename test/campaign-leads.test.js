// Leads by Campaign (admin sub-tab): grouping rules, exclusions, reconciliation, spend and the campaign list.
// Fixtures only; nothing here touches Blobs or Stripe.
const { test } = require("node:test");
const assert = require("node:assert/strict");
const path = require("path");
const Module = require("module");
const L = require("../netlify/functions/_lib/campaign-leads");
const C = require("../netlify/functions/_lib/constellation");
const config = require("../netlify/functions/_data/metrics-config.json");

const NOW = Date.parse("2026-12-10T19:00:00Z"); // Dec 10, 2026, 12:00 PM MT
const CUTOFF = Date.parse(config.leadSourceCutoff);
const ls = (o) => ({ utmSource: "", utmMedium: "", utmCampaign: "", utmContent: "", utmTerm: "", fbclid: "", gclid: "", referrer: "", landingPath: "/", firstTouchAt: "", channel: "", ...o });
const rows = [
  { id: "cmp_30d_home_v1", name: "H-13 Meta 30-day home", utmCampaign: "30d_home_v1", channel: "Meta", owner: "Demand Gen", start: "2026-11-28", end: "2026-12-05", spendSource: "manual", portalTag: "campaign-30d-home-v1",
    spend: [{ day: "2026-11-28", amount: 20 }, { day: "2026-11-29", amount: 25.5 }] },
  { id: "cmp_h24", name: "KSL new listing", utmCampaign: "h24", channel: "KSL", owner: "Demand Gen", start: "2026-11-27", end: null, spendSource: "none", portalTag: "campaign-h24", spend: [] },
];
const rec = (kind, at, raw) => ({ kind, at, raw: { createdAt: at, ...raw } });
const attr = (records) => L.attribute(records, rows, CUTOFF);

test("rule 1: a UTM campaign tag that matches a list row inside its window credits that campaign", () => {
  const a = attr([rec("booking", "2026-11-30T18:00:00Z", { leadSource: ls({ utmCampaign: "30D_Home_v1", fbclid: "abc" }) })]);
  assert.equal(a.key, "campaign:cmp_30d_home_v1"); assert.equal(a.rule, "campaign");
  // end + 30 days still counts; one day later does not
  assert.equal(attr([rec("waitlist", "2027-01-04T18:00:00Z", { leadSource: ls({ utmCampaign: "30d_home_v1" }) })]).rule, "campaign");
  assert.equal(attr([rec("waitlist", "2027-01-05T18:00:00Z", { leadSource: ls({ utmCampaign: "30d_home_v1" }) })]).rule, "utm_unlisted");
});

test("out-of-window and unlisted UTM tags are never credited to a campaign", () => {
  const early = attr([rec("booking", "2026-11-27T18:00:00Z", { leadSource: ls({ utmCampaign: "30d_home_v1", fbclid: "x" }) })]);
  assert.equal(early.key, "utm:30d_home_v1"); assert.match(early.label, /outside the campaign window/);
  const unlisted = attr([rec("contact", "2026-12-01T18:00:00Z", { leadSource: ls({ utmCampaign: "b2b_v1" }) })]);
  assert.equal(unlisted.label, "UTM b2b_v1 (not in campaign list)");
});

test("rule 2: R&O's portal campaign tag at intake credits the campaign; an unknown campaign tag gets its own group", () => {
  const tagged = attr([rec("customer", "2026-12-01T18:00:00Z", { tags: ["lead", "source-ksl", "campaign-h24"] })]);
  assert.equal(tagged.key, "campaign:cmp_h24"); assert.equal(tagged.rule, "intake");
  const field = attr([rec("customer", "2026-12-01T18:00:00Z", { tags: ["lead"], campaign: "h24" })]);
  assert.equal(field.key, "campaign:cmp_h24");
  const loose = attr([rec("customer", "2026-12-01T18:00:00Z", { tags: ["lead", "source-ksl", "campaign-b2b-reengage"] })]);
  assert.equal(loose.key, "intake:campaign-b2b-reengage"); assert.match(loose.label, /not in campaign list/);
});

test("rule 3: click ids with no campaign tag; rule 4: referrer or landing page; rule 5: self-reported only", () => {
  assert.equal(attr([rec("booking", "2026-12-01T18:00:00Z", { leadSource: ls({ gclid: "g1" }) })]).label, "Google Ads (untagged)");
  assert.equal(attr([rec("booking", "2026-12-01T18:00:00Z", { leadSource: ls({ fbclid: "f1" }) })]).label, "Meta paid (untagged)");
  assert.equal(attr([rec("contact", "2026-12-01T18:00:00Z", { leadSource: ls({ referrer: "https://www.google.com/" }) })]).label, "Organic / referral");
  const self = attr([rec("waitlist", "2026-12-01T18:00:00Z", { leadSource: null, heardAbout: "Friend or family" })]);
  assert.equal(self.label, "Self-reported: Friend or family"); assert.equal(self.rule, "self");
});

test("off-site leads with an R&O source tag but no campaign tag get their own labeled group, not dropped", () => {
  assert.equal(attr([rec("customer", "2026-11-10T18:00:00Z", { tags: ["lead", "inquiry", "source-hello-email"] })]).label, "hello@ email, untagged");
  assert.equal(attr([rec("customer", "2026-12-02T18:00:00Z", { tags: ["lead", "source-phone-text"] })]).label, "Phone or text, untagged");
  assert.equal(attr([rec("customer", "2026-12-02T18:00:00Z", { tags: ["lead", "source-messenger"] })]).label, "Facebook Messenger, untagged");
  // a site-form source tag is not off-site
  assert.equal(attr([rec("customer", "2026-12-02T18:00:00Z", { tags: ["lead", "source-contact-form"] })]).key, "unattributed");
});

test("null leadSource: before the Release 3 cutoff is 'Before source tracking'; after it is Unattributed with a note (no privacy group)", () => {
  const before = attr([rec("contact", "2026-11-24T21:32:00Z", { leadSource: null })]);
  assert.equal(before.label, "Before source tracking");
  const after = attr([rec("contact", "2026-11-24T21:33:00Z", { leadSource: null })]);
  assert.equal(after.label, "Unattributed"); assert.equal(after.note, L.UNATTRIBUTED_NOTE);
  assert.ok(!Object.keys(L.RULES).some((k) => /privacy/i.test(k)));
});

// A month of portal data. Two TEST rows, one partial that later completed, one Stripe start.
function fixture() {
  return {
    bookings: [
      { id: "b1", createdAt: "2026-11-30T18:00:00Z", status: "new", firstName: "Ana", lastName: "Ruiz", email: "ana@example.com", leadSource: ls({ utmCampaign: "30d_home_v1", fbclid: "f" }) },
      { id: "b0", createdAt: "2026-11-29T18:00:00Z", status: "lead", bookingMode: "lead", firstName: "Ana", lastName: "Ruiz", email: "ana@example.com", leadSource: ls({ utmCampaign: "30d_home_v1" }) },
      { id: "b2", createdAt: "2026-12-01T18:00:00Z", status: "lead", bookingMode: "lead", firstName: "Bo", lastName: "Lee", email: "bo@example.com", leadSource: ls({ gclid: "g" }) },
      { id: "b3", createdAt: "2026-12-02T18:00:00Z", status: "new", firstName: "Test", lastName: "Person", email: "x@example.com", leadSource: ls({ utmCampaign: "30d_home_v1" }) },
      { id: "b4", createdAt: "2026-12-03T18:00:00Z", status: "lead", bookingMode: "lead", firstName: "Ivy", lastName: "Q", email: "ivy@example.com", internal: true, leadSource: null },
    ],
    waitlist: [
      { id: "w1", createdAt: "2026-11-20T18:00:00Z", name: "Old Signup", email: "old@example.com", leadSource: null },
      { id: "w2", createdAt: "2026-12-04T18:00:00Z", name: "Cy Doe", email: "cy@example.com", leadSource: null },
    ],
    customers: [
      { id: "c1", createdAt: "2026-12-05T18:00:00Z", name: "Dee Kay", email: "dee@example.com", tags: ["lead", "source-ksl", "campaign-h24"] },
      { id: "c2", createdAt: "2026-12-06T18:00:00Z", name: "Eli", phone: "801-555-0100", email: "", tags: ["lead", "source-phone-text"] },
      { id: "c3", createdAt: "2026-12-06T18:00:00Z", name: "Not a lead", email: "nl@example.com", tags: ["renter"] },
      { id: "c4", createdAt: "2026-12-07T18:00:00Z", name: "Matt", email: "matthew.bailie+x@gmail.com", tags: ["lead"] },
    ],
    contacts: [
      { id: "m1", createdAt: "2026-12-02T20:00:00Z", name: "Ana Ruiz", email: "ANA@example.com", leadSource: null },
      { id: "m2", createdAt: "2026-12-08T18:00:00Z", name: "Fay", email: "fay@example.com", leadSource: ls({ referrer: "https://www.bing.com/" }) },
    ],
    campaigns: rows,
    subs: [{ id: "s1", livemode: true, status: "active", start_date: Date.parse("2026-12-03T18:00:00Z") / 1000, customer: { email: "ana@example.com" }, items: { data: [{ price: { unit_amount: 57900, recurring: { interval: "month" } } }] } }],
    stripe: { configured: true, error: null },
    config, nowMs: NOW, fetchedAt: { portalMs: NOW, stripeMs: NOW },
  };
}
const byKey = (r) => Object.fromEntries(r.groups.map((g) => [g.key, g]));

test("report: groups reconcile with the OKRs tab's real-lead count; TEST/internal are a separate uncounted line", () => {
  const f = fixture();
  const r = L.buildCampaignReport({ ...f, from: "2026-11-01", to: "2026-12-31" });
  const g = byKey(r);
  assert.equal(g["campaign:cmp_30d_home_v1"].realLeads, 1); // Ana: booking + contact = one person
  assert.equal(g["campaign:cmp_h24"].realLeads, 1);
  assert.equal(g["offsite:phone-text"].realLeads, 1);
  assert.equal(g.organic.realLeads, 1);
  assert.equal(g.before.realLeads, 1);
  assert.equal(g.unattributed.realLeads, 1); // Cy: post-cutoff null
  assert.equal(r.totals.realLeads, 6);
  const okrs = C.dedupeLeads(C.leadRecords(f)).filter((l) => l.firstDay >= "2026-11-01" && l.firstDay <= "2026-12-31").length;
  assert.equal(r.totals.portalRealLeads, okrs);
  assert.equal(r.totals.reconciled, true);
  assert.deepEqual(r.internal, { realLeads: 2, partialLeads: 1 }); // Test Person, the owner; Ivy (internal flag)
});

test("report: partial leads are their own column and never added to real leads", () => {
  const r = L.buildCampaignReport({ ...fixture(), from: "2026-11-01", to: "2026-12-31" });
  const g = byKey(r);
  assert.equal(g["click:google"].partialLeads, 1); assert.equal(g["click:google"].realLeads, 0);
  assert.equal(g["campaign:cmp_30d_home_v1"].partialLeads, 1);
  assert.equal(r.totals.partialLeads, 2);
  assert.equal(r.totals.realLeads, 6);
});

test("report: paying rentals are matched on the server by email within 30 days, counts only; no Stripe means no column value", () => {
  const r = L.buildCampaignReport({ ...fixture(), from: "2026-11-01", to: "2026-12-31" });
  assert.equal(byKey(r)["campaign:cmp_30d_home_v1"].payingRentals, 1);
  assert.equal(r.totals.payingRentals, 1);
  const off = L.buildCampaignReport({ ...fixture(), stripe: { configured: false }, from: "2026-11-01", to: "2026-12-31" });
  assert.equal(off.totals.payingRentals, null);
  assert.equal(byKey(off)["campaign:cmp_30d_home_v1"].payingRentals, null);
});

test("report: spend and cost per real lead appear only where hand-entered spend exists for the range", () => {
  const r = L.buildCampaignReport({ ...fixture(), from: "2026-11-01", to: "2026-12-31" });
  const meta = byKey(r)["campaign:cmp_30d_home_v1"];
  assert.equal(meta.spend, 45.5); assert.equal(meta.spendDisplay, "$45.50 (2 days entered)");
  assert.equal(meta.cplDisplay, "$45.50 (n=1)");
  const ksl = byKey(r)["campaign:cmp_h24"];
  assert.equal(ksl.spend, null); assert.equal(ksl.spendDisplay, "No spend source"); assert.equal(ksl.cplDisplay, null);
  const later = L.buildCampaignReport({ ...fixture(), from: "2026-12-01", to: "2026-12-31" });
  assert.equal(byKey(later)["campaign:cmp_30d_home_v1"].spendDisplay, "No spend entered for this range");
  assert.equal(byKey(r).unattributed.spendDisplay, null);
  assert.ok(!JSON.stringify(r).includes("%"), "no percentages at this volume");
});

test("report: the range defaults to the last 30 MT days, or a campaign's run window; campaigns that ran show at zero", () => {
  const d = L.buildCampaignReport(fixture());
  assert.deepEqual([d.range.from, d.range.to], ["2026-11-11", "2026-12-10"]);
  const c = L.buildCampaignReport({ ...fixture(), campaignId: "cmp_30d_home_v1" });
  assert.deepEqual([c.range.from, c.range.to], ["2026-11-28", "2026-12-05"]);
  const open = L.buildCampaignReport({ ...fixture(), campaignId: "cmp_h24" });
  assert.deepEqual([open.range.from, open.range.to], ["2026-11-27", "2026-12-10"]);
  const early = L.buildCampaignReport({ ...fixture(), from: "2026-11-28", to: "2026-11-28" });
  assert.equal(byKey(early)["campaign:cmp_h24"].realLeads, 0);
  assert.equal(byKey(early).unattributed.realLeads, 0);
  assert.ok(early.updated.label.startsWith("Last updated ") && early.updated.label.endsWith(" MT"));
});

test("report payload carries no names, emails or phones", () => {
  const s = JSON.stringify(L.buildCampaignReport({ ...fixture(), from: "2026-11-01", to: "2026-12-31" }));
  for (const pii of ["ana@example.com", "Ruiz", "Dee Kay", "801-555", "fay@", "Cy Doe", "matthew.bailie"]) assert.ok(!s.toLowerCase().includes(pii.toLowerCase()), pii);
});

test("campaign list: required fields, lowercase unique UTM tag, add and end only, spend by hand", () => {
  const ok = L.newCampaign({ name: "B2B outreach", utmCampaign: "B2B_v1", channel: "outreach", owner: "Demand Gen", start: "2026-12-01" }, rows, { nowIso: "2026-12-01T00:00:00Z" });
  assert.equal(ok.row.utmCampaign, "b2b_v1"); assert.equal(ok.row.portalTag, "campaign-b2b-v1"); assert.equal(ok.row.spendSource, "none"); assert.equal(ok.row.end, null);
  assert.equal(L.newCampaign({ name: "x", utmCampaign: "30D_HOME_V1", channel: "Meta", owner: "DG", start: "2026-12-01" }, rows).error, "That UTM campaign tag is already in the list.");
  assert.match(L.newCampaign({ name: "x", utmCampaign: "has space", channel: "Meta", owner: "DG", start: "2026-12-01" }, rows).error, /lowercase/);
  assert.equal(L.newCampaign({ name: "x", utmCampaign: "g1", channel: "Google", owner: "DG", start: "2026-12-01" }, rows).row.spendSource, "manual");
  assert.equal(L.newCampaign({ name: "x", utmCampaign: "g2", channel: "TikTok", owner: "DG", start: "2026-12-01" }, rows).error, "Choose a channel.");
  assert.match(L.newCampaign({ name: "x", utmCampaign: "g3", channel: "Meta", owner: "DG", start: "2026-12-05", end: "2026-12-01" }, rows).error, /End date/);

  const ended = L.endCampaign(rows, "cmp_h24", "2026-12-09", { nowIso: "t" });
  assert.equal(ended.rows.find((r) => r.id === "cmp_h24").end, "2026-12-09");
  assert.match(L.endCampaign(rows, "cmp_30d_home_v1", "2026-12-20").error, /not extended/);
  assert.equal(L.endCampaign(rows, "nope", "2026-12-09").error, "Campaign not found.");

  const sp = L.setSpend(rows, "cmp_30d_home_v1", "2026-11-29", "30", { nowIso: "t", today: "2026-12-10" });
  assert.deepEqual(sp.rows[0].spend.map((s) => [s.day, s.amount]), [["2026-11-28", 20], ["2026-11-29", 30]]);
  assert.equal(L.setSpend(rows, "cmp_h24", "2026-11-29", 5).error, "This campaign has no spend source.");
  assert.match(L.setSpend(rows, "cmp_30d_home_v1", "2026-12-06", 5).error, /inside the campaign's run/);
  assert.match(L.setSpend(rows, "cmp_30d_home_v1", "2026-11-30", -1).error, /dollar amount/);
});

// ───────── Handlers (stubbed auth and storage) ─────────
const FN = path.join(__dirname, "..", "netlify", "functions");
function loadWithStubs(handlerFile, stubs) {
  const resolved = {};
  for (const [rel, impl] of Object.entries(stubs)) resolved[path.join(FN, rel + ".js")] = impl;
  const orig = Module._load;
  Module._load = function (req, parent, ...rest) {
    if (parent && parent.filename) {
      let full = path.resolve(path.dirname(parent.filename), req);
      if (!full.endsWith(".js") && !full.endsWith(".json")) full += ".js";
      if (resolved[full]) return resolved[full];
    }
    return orig.call(this, req, parent, ...rest);
  };
  try { const file = path.join(FN, handlerFile); delete require.cache[file]; return require(file); } finally { Module._load = orig; }
}
const adminStub = (authed = true) => ({
  requireAuth: async () => (authed ? null : { statusCode: 401, body: JSON.stringify({ error: "unauthorized" }) }),
  parseBody: (e) => (e.body ? JSON.parse(e.body) : {}),
  json: (statusCode, body) => ({ statusCode, body: JSON.stringify(body) }),
});
const call = (handler, method, body, query) => handler({ httpMethod: method, body: body && JSON.stringify(body), queryStringParameters: query || {}, headers: {} }, {});

test("handlers: unauthenticated requests get 401", async () => {
  for (const file of ["admin-campaign-leads.js", "admin-campaigns.js"]) {
    const { handler } = loadWithStubs(file, { "_lib/admin": adminStub(false), "_lib/storage": {} });
    assert.equal((await call(handler, "GET")).statusCode, 401);
  }
});

test("GET /api/admin/campaign-leads reads only and returns the report", async () => {
  const f = fixture();
  const writes = [];
  const storage = {
    listBookings: async () => f.bookings, listWaitlist: async () => f.waitlist, listManualCustomers: async () => f.customers,
    listContactMessages: async () => f.contacts, getCampaignList: async () => rows, getStripeConfig: async () => ({}),
    setCampaignList: async () => writes.push("campaignList"),
  };
  const { handler } = loadWithStubs("admin-campaign-leads.js", { "_lib/admin": adminStub(), "_lib/storage": storage, "_lib/stripe": { stripeClientFrom: () => null } });
  const res = await call(handler, "GET", null, { from: "2026-11-01", to: "2026-12-31" });
  assert.equal(res.statusCode, 200);
  const body = JSON.parse(res.body);
  assert.equal(body.range.from, "2026-11-01"); assert.equal(body.stripe.ok, false); assert.equal(body.totals.reconciled, true);
  assert.deepEqual(writes, []);
  assert.equal((await call(handler, "POST")).statusCode, 405);
});

test("/api/admin/campaigns adds, rejects duplicates, ends and records spend; there is no delete", async () => {
  let saved = [];
  const storage = { getCampaignList: async () => saved, setCampaignList: async (r) => { saved = r; return r; } };
  const { handler } = loadWithStubs("admin-campaigns.js", { "_lib/admin": adminStub(), "_lib/storage": storage });
  const add = await call(handler, "POST", { action: "add", name: "H-13 Meta", utmCampaign: "30d_home_v1", channel: "Meta", owner: "Demand Gen", start: "2026-11-20" });
  assert.equal(add.statusCode, 200); assert.equal(saved.length, 1);
  const dup = await call(handler, "POST", { action: "add", name: "Again", utmCampaign: "30d_home_v1", channel: "Meta", owner: "Demand Gen", start: "2026-11-28" });
  assert.equal(dup.statusCode, 400); assert.equal(saved.length, 1);
  assert.equal((await call(handler, "POST", { action: "spend", id: saved[0].id, day: "2026-11-21", amount: 12.5 })).statusCode, 200);
  assert.equal(saved[0].spend[0].amount, 12.5);
  assert.equal((await call(handler, "POST", { action: "end", id: saved[0].id, end: "2026-11-23" })).statusCode, 200);
  assert.equal(saved[0].end, "2026-11-23");
  assert.equal((await call(handler, "POST", { action: "delete", id: saved[0].id })).statusCode, 400);
  assert.equal((await call(handler, "DELETE")).statusCode, 405);
  assert.equal(saved.length, 1);
});

test("admin.html: Leads by Campaign keeps the 'Last updated … MT' stamp and stores nothing in the browser", () => {
  const html = require("fs").readFileSync(path.join(__dirname, "..", "admin.html"), "utf8");
  const panel = html.slice(html.indexOf('<div class="an-leads">'), html.indexOf('id="lcFoot"'));
  assert.equal((panel.match(/data-lc-updated/g) || []).length, 2);
  const start = html.indexOf("// ───────── Leads by Campaign");
  const block = html.slice(start, html.indexOf("// ───────── OKRs, KPIs, and Metrics", start));
  assert.ok(start > 0 && block.includes("renderLeadsByCampaign"));
  assert.doesNotMatch(block, /localStorage|sessionStorage|document\.cookie/);
  assert.match(block, /Not live: press Refresh to read again\./);
  const toml = require("fs").readFileSync(path.join(__dirname, "..", "netlify.toml"), "utf8");
  assert.match(toml, /from = "\/api\/admin\/campaign-leads"\n  to = "\/\.netlify\/functions\/admin-campaign-leads"/);
  assert.match(toml, /from = "\/api\/admin\/campaigns"\n  to = "\/\.netlify\/functions\/admin-campaigns"/);
});
