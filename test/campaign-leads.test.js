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
  assert.equal(early.key, "utm:30d_home_v1"); assert.equal(early.label, "UTM 30d_home_v1, outside the campaign window");
  assert.equal(early.platform, "Meta"); assert.equal(early.channel, "Paid");
  const unlisted = attr([rec("contact", "2026-12-01T18:00:00Z", { leadSource: ls({ utmCampaign: "b2b_v1", utmSource: "outreach" }) })]);
  assert.equal(unlisted.label, "UTM b2b_v1, no campaign in the list"); assert.equal(unlisted.platform, "Email outreach");
  assert.equal(attr([rec("contact", "2026-12-01T18:00:00Z", { leadSource: ls({ utmCampaign: "x1", utmSource: "tiktok" }) })]).platform, null);
});

test("rule 2: R&O's portal campaign tag at intake credits the campaign; an unknown campaign tag gets its own row", () => {
  const tagged = attr([rec("customer", "2026-12-01T18:00:00Z", { tags: ["lead", "source-ksl", "campaign-h24"] })]);
  assert.equal(tagged.key, "campaign:cmp_h24"); assert.equal(tagged.rule, "intake"); assert.equal(tagged.platform, "KSL"); assert.equal(tagged.label, "KSL new listing");
  const field = attr([rec("customer", "2026-12-01T18:00:00Z", { tags: ["lead"], campaign: "h24" })]);
  assert.equal(field.key, "campaign:cmp_h24");
  const loose = attr([rec("customer", "2026-12-01T18:00:00Z", { tags: ["lead", "source-ksl", "campaign-b2b-reengage"] })]);
  assert.equal(loose.key, "intake:campaign-b2b-reengage"); assert.equal(loose.label, "Portal tag campaign-b2b-reengage, no campaign in the list"); assert.equal(loose.platform, "KSL");
});

const one = (raw, kind = "booking", at = "2026-12-01T18:00:00Z") => attr([rec(kind, at, raw)]);
const pc = (a) => [a.label, a.platform, a.channel];

test("Rev 2 mapping: click ids, UTM source, referrer, landing page and self-reported answers get the signed-off names and platforms", () => {
  assert.deepEqual(pc(one({ leadSource: ls({ gclid: "g1" }) })), ["Google Ads, no campaign", "Google Ads", null]);
  assert.deepEqual(pc(one({ leadSource: ls({ fbclid: "f1" }) })), ["Meta, no campaign", "Meta", "Paid"]);
  assert.deepEqual(pc(one({ leadSource: ls({ utmSource: "ig", utmMedium: "social" }) })), ["Meta, no campaign", "Meta", "Organic"]);
  assert.deepEqual(pc(one({ leadSource: ls({ utmSource: "facebook", utmMedium: "paid_social" }) })), ["Meta, no campaign", "Meta", "Paid"]);
  assert.deepEqual(pc(one({ leadSource: ls({ utmSource: "google", utmMedium: "cpc" }) })), ["Google Ads, no campaign", "Google Ads", null]);
  assert.deepEqual(pc(one({ leadSource: ls({ utmSource: "gbp", utmMedium: "organic" }) })), ["Google Business Profile, no campaign", "Organic / Google search", null]);
  assert.deepEqual(pc(one({ leadSource: ls({ utmSource: "fb_marketplace" }) })), ["Facebook Marketplace, no campaign", "Facebook Marketplace", null]);
  assert.deepEqual(pc(one({ leadSource: ls({ utmSource: "ksl" }) })), ["KSL, no campaign", "KSL", null]);
  assert.deepEqual(pc(one({ leadSource: ls({ utmSource: "partner", utmMedium: "email" }) })), ["Email outreach, no campaign", "Email outreach", null]);
  assert.deepEqual(pc(one({ leadSource: ls({ channel: "Meta organic" }) })), ["Meta, no campaign", "Meta", "Organic"]);
  assert.deepEqual(pc(one({ leadSource: ls({ channel: "Organic search" }) })), ["Google search, no campaign", "Organic / Google search", null]);
  assert.deepEqual(pc(one({ leadSource: ls({ referrer: "https://www.google.com/" }) }, "contact")), ["Google search, no campaign", "Organic / Google search", null]);
  assert.deepEqual(pc(one({ leadSource: ls({ referrer: "https://l.facebook.com/" }) }, "contact")), ["Meta, no campaign", "Meta", "Organic"]);
  assert.deepEqual(pc(one({ leadSource: ls({ referrer: "https://www.bing.com/search" }) }, "contact")), ["Other website: bing.com", "Other website", null]);
  assert.deepEqual(pc(one({ leadSource: ls({ landingPath: "/rent" }) })), ["Direct visit, no campaign", null, null]);
  for (const [answer, platform, channel] of [["Friend or family", "Referral", null], ["Gym, studio, clinic or salon", "Referral", null], ["Google search", "Organic / Google search", null],
    ["Google Maps", "Organic / Google search", null], ["Facebook or Instagram", "Meta", "Organic"], ["Facebook Marketplace", "Facebook Marketplace", null], ["Other", null, null]]) {
    const a = one({ leadSource: null, heardAbout: answer }, "waitlist");
    assert.deepEqual(pc(a), [`Self-reported: ${answer}`, platform, channel]); assert.equal(a.rule, "self");
  }
});

test("Rev 2 mapping: off-site intake tags (hello@ = Email inbox, Messenger = Meta Organic, GBP = Organic / Google search)", () => {
  const c = (tag) => pc(one({ tags: ["lead", "source-" + tag] }, "customer"));
  assert.deepEqual(c("hello-email"), ["Email inbox (hello@), no campaign", "Email inbox", null]);
  assert.deepEqual(c("messenger"), ["Facebook Messenger, no campaign", "Meta", "Organic"]);
  assert.deepEqual(c("gbp"), ["Google Business Profile, no campaign", "Organic / Google search", null]);
  assert.deepEqual(c("phone-text"), ["Phone or text, no campaign", "Phone or text", null]);
  assert.deepEqual(c("referral"), ["Referral, no campaign", "Referral", null]);
  assert.deepEqual(c("marketplace"), ["Facebook Marketplace, no campaign", "Facebook Marketplace", null]);
  assert.deepEqual(c("ksl"), ["KSL, no campaign", "KSL", null]);
  assert.deepEqual(c("outreach"), ["Email outreach, no campaign", "Email outreach", null]);
  // site-form tags and tags with no approved name are no-source (footnote), never a row
  assert.deepEqual(one({ tags: ["lead", "source-contact-form"] }, "customer"), { noSource: "after" });
  assert.deepEqual(one({ tags: ["lead", "source-waitlist-email"] }, "customer"), { noSource: "after" });
  for (const a of [one({ leadSource: ls({ gclid: "g" }) }), one({ tags: ["lead", "source-gbp"] }, "customer")]) assert.ok(a.ruleLabel === undefined && L.RULES[a.rule]);
});

test("no source: before the Release 3 cutoff counts as M, after it as K; never a row, no privacy group", () => {
  assert.deepEqual(attr([rec("contact", "2026-11-24T21:32:00Z", { leadSource: null })]), { noSource: "before" });
  assert.deepEqual(attr([rec("contact", "2026-11-24T21:33:00Z", { leadSource: null })]), { noSource: "after" });
  assert.ok(!Object.keys(L.RULES).some((k) => /privacy|none|before/i.test(k)));
});

test("no-source footnote: signed-off singular and plural strings", () => {
  assert.equal(L.noSourceFootnote(1, 1, 0), "1 lead with no source (1 before tracking began Nov 24, 2:33 PM MT; 0 after, from a privacy setting or blocked storage).");
  assert.equal(L.noSourceFootnote(3, 1, 2), "3 leads with no source (1 before tracking began Nov 24, 2:33 PM MT; 2 after, from a privacy setting or blocked storage).");
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

test("report: visible rows plus the no-source footnote equal real leads; TEST/internal appear nowhere", () => {
  const f = fixture();
  const r = L.buildCampaignReport({ ...f, from: "2026-11-01", to: "2026-12-31" });
  const g = byKey(r);
  assert.equal(g["campaign:cmp_30d_home_v1"].realLeads, 1); // Ana: booking + contact = one person
  assert.equal(g["campaign:cmp_h24"].realLeads, 1);
  assert.equal(g["source:phone"].realLeads, 1);
  assert.equal(g["site:bing.com"].realLeads, 1);
  assert.deepEqual([r.noSource.total, r.noSource.before, r.noSource.after], [2, 1, 1]); // Old Signup; Cy
  assert.equal(r.noSource.footnote, "2 leads with no source (1 before tracking began Nov 24, 2:33 PM MT; 1 after, from a privacy setting or blocked storage).");
  const okrs = C.dedupeLeads(C.leadRecords(f)).filter((l) => l.firstDay >= "2026-11-01" && l.firstDay <= "2026-12-31").length;
  const visible = r.groups.filter((x) => !x.empty).reduce((t, x) => t + x.realLeads, 0);
  assert.equal(visible + r.noSource.total, okrs);
  assert.equal(r.totals.realLeads, 4); assert.equal(r.totals.portalRealLeads, okrs); assert.equal(r.totals.reconciled, true);
  // no placeholder rows; TEST/internal only in the internal counts, never a group
  for (const k of Object.keys(g)) assert.ok(!/unattributed|before|test|internal/i.test(k), k);
  for (const x of r.groups) assert.ok(!/^(Unattributed|Before source tracking|TEST)/.test(x.label), x.label);
  assert.ok(!JSON.stringify(r.groups).includes("Test Person"));
  assert.deepEqual(r.internal, { realLeads: 2, partialLeads: 1 }); // Test Person, the owner; Ivy (internal flag)
  // every group: human name, a known platform or none, a Meta-only channel, and a "Matched by" rule label
  const { PLATFORMS } = require("../netlify/functions/_lib/campaign-platform");
  for (const x of r.groups) {
    assert.ok(x.platform === null || PLATFORMS.includes(x.platform), x.platform);
    assert.ok(x.channel === null || (x.platform === "Meta" && ["Paid", "Organic"].includes(x.channel)));
    assert.ok(x.ruleLabel);
  }
  assert.deepEqual([g["campaign:cmp_30d_home_v1"].platform, g["campaign:cmp_30d_home_v1"].channel], ["Meta", "Paid"]);
});

test("report: one no-source lead uses the singular footnote; none means no footnote", () => {
  const f = fixture();
  const one1 = L.buildCampaignReport({ ...f, waitlist: f.waitlist.filter((w) => w.id !== "w1"), from: "2026-11-01", to: "2026-12-31" });
  assert.match(one1.noSource.footnote, /^1 lead with no source \(0 before tracking began Nov 24, 2:33 PM MT; 1 after/);
  const none = L.buildCampaignReport({ ...f, waitlist: [], from: "2026-11-01", to: "2026-12-31" });
  assert.equal(none.noSource.total, 0); assert.equal(none.noSource.footnote, null); assert.equal(none.totals.reconciled, true);
});

test("report: zero-count campaign rows are flagged empty (hidden unless 'Show empty campaigns')", () => {
  const r = L.buildCampaignReport({ ...fixture(), from: "2026-11-28", to: "2026-11-28" });
  assert.equal(byKey(r)["campaign:cmp_h24"].empty, true);
  assert.equal(byKey(L.buildCampaignReport({ ...fixture(), from: "2026-11-01", to: "2026-12-31" }))["campaign:cmp_h24"].empty, false);
});

test("report: 'Campaigns with spend but no leads' lists spend above $0 only, comma-separated", () => {
  const f = fixture();
  const extra = [
    { id: "cmp_g", name: "Google search test", utmCampaign: "g_search_v1", platform: "Google Ads", channel: null, owner: "DG", start: "2026-12-01", end: null, spendSource: "manual", portalTag: "campaign-g-search-v1", spend: [{ day: "2026-12-02", amount: 12 }] },
    { id: "cmp_z", name: "Zero spend", utmCampaign: "z_v1", platform: "Meta", channel: "Organic", owner: "DG", start: "2026-12-01", end: null, spendSource: "manual", portalTag: "campaign-z-v1", spend: [{ day: "2026-12-02", amount: 0 }] },
  ];
  const r = L.buildCampaignReport({ ...f, campaigns: rows.concat(extra), from: "2026-11-01", to: "2026-12-31" });
  assert.equal(r.spendNoLeadsFootnote, "Campaigns with spend but no leads in this range: Google search test ($12.00)");
  const live = L.buildCampaignReport({ ...f, campaigns: rows.concat(extra.map((x) => ({ ...x, adsCampaignName: x.name }))), liveSpend: { google: { ok: true, byCampaign: { "Google search test": 30 } }, meta: { ok: true, byCampaign: { "Zero spend": 5.5 } } }, from: "2026-11-01", to: "2026-12-31" });
  // live spend wins over hand-entered spend when it was read
  assert.equal(live.spendNoLeadsFootnote, "Campaigns with spend but no leads in this range: Google search test ($30.00), Zero spend ($5.50)");
  assert.equal(L.buildCampaignReport({ ...f, from: "2026-11-01", to: "2026-12-31" }).spendNoLeadsFootnote, null);
  assert.equal(byKey(r)["campaign:cmp_z"].channel, "Organic");
});

test("report: partial leads are their own column and never added to real leads", () => {
  const r = L.buildCampaignReport({ ...fixture(), from: "2026-11-01", to: "2026-12-31" });
  const g = byKey(r);
  assert.equal(g["source:google_ads"].partialLeads, 1); assert.equal(g["source:google_ads"].realLeads, 0); assert.equal(g["source:google_ads"].empty, false);
  assert.equal(g["campaign:cmp_30d_home_v1"].partialLeads, 1);
  assert.equal(r.totals.partialLeads, 2);
  assert.equal(r.totals.realLeads, 4);
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
  assert.equal(meta.cplDisplay, "$45.50 (1 real lead)");
  const two = L.buildCampaignReport({ ...fixture(), bookings: fixture().bookings.concat({ id: "b9", createdAt: "2026-11-30T19:00:00Z", status: "new", firstName: "Zed", lastName: "Y", email: "zed@example.com", leadSource: ls({ utmCampaign: "30d_home_v1" }) }), from: "2026-11-01", to: "2026-12-31" });
  assert.equal(byKey(two)["campaign:cmp_30d_home_v1"].cplDisplay, "$22.75 (2 real leads)");
  const ksl = byKey(r)["campaign:cmp_h24"];
  assert.equal(ksl.spend, null); assert.equal(ksl.spendDisplay, "No spend source"); assert.equal(ksl.cplDisplay, null);
  const later = L.buildCampaignReport({ ...fixture(), from: "2026-12-01", to: "2026-12-31" });
  assert.equal(byKey(later)["campaign:cmp_30d_home_v1"].spendDisplay, "No spend entered for this range");
  assert.equal(byKey(r)["source:phone"].spendDisplay, null);
  assert.ok(!JSON.stringify(r).includes("%"), "no percentages at this volume");
});

test("report: the range defaults to the last 30 MT days, or a campaign's run window; campaigns that ran come back at zero", () => {
  const d = L.buildCampaignReport(fixture());
  assert.deepEqual([d.range.from, d.range.to], ["2026-11-11", "2026-12-10"]);
  const c = L.buildCampaignReport({ ...fixture(), campaignId: "cmp_30d_home_v1" });
  assert.deepEqual([c.range.from, c.range.to], ["2026-11-28", "2026-12-05"]);
  const open = L.buildCampaignReport({ ...fixture(), campaignId: "cmp_h24" });
  assert.deepEqual([open.range.from, open.range.to], ["2026-11-27", "2026-12-10"]);
  const early = L.buildCampaignReport({ ...fixture(), from: "2026-11-28", to: "2026-11-28" });
  assert.equal(byKey(early)["campaign:cmp_h24"].realLeads, 0);
  assert.ok(early.updated.label.startsWith("Last updated ") && early.updated.label.endsWith(" MT"));
});

test("report payload carries no names, emails or phones", () => {
  const s = JSON.stringify(L.buildCampaignReport({ ...fixture(), from: "2026-11-01", to: "2026-12-31" }));
  for (const pii of ["ana@example.com", "Ruiz", "Dee Kay", "801-555", "fay@", "Cy Doe", "matthew.bailie"]) assert.ok(!s.toLowerCase().includes(pii.toLowerCase()), pii);
});

test("campaign list: required fields, lowercase unique UTM tag, add and end only, spend by hand", () => {
  const ok = L.newCampaign({ name: "B2B outreach", utmCampaign: "B2B_v1", platform: "Email outreach", owner: "Demand Gen", start: "2026-12-01" }, rows, { nowIso: "2026-12-01T00:00:00Z" });
  assert.equal(ok.row.platform, "Email outreach"); assert.equal(ok.row.channel, null);
  const meta = L.newCampaign({ name: "Meta organic post", utmCampaign: "m_org", platform: "Meta", channel: "Organic", owner: "DG", start: "2026-12-01" }, rows).row;
  assert.deepEqual([meta.platform, meta.channel, meta.spendSource], ["Meta", "Organic", "manual"]);
  assert.equal(L.newCampaign({ name: "x", utmCampaign: "m2", platform: "Meta", owner: "DG", start: "2026-12-01" }, rows).row.channel, "Paid");
  assert.equal(L.newCampaign({ name: "x", utmCampaign: "e1", platform: "Email inbox", channel: "Paid", owner: "DG", start: "2026-12-01" }, rows).row.channel, null);
  // pre-Rev 2 callers (old channel list) still map to a platform
  assert.equal(L.newCampaign({ name: "x", utmCampaign: "o1", channel: "outreach", owner: "DG", start: "2026-12-01" }, rows).row.platform, "Email outreach");
  assert.equal(ok.row.utmCampaign, "b2b_v1"); assert.equal(ok.row.portalTag, "campaign-b2b-v1"); assert.equal(ok.row.spendSource, "none"); assert.equal(ok.row.end, null);
  assert.equal(L.newCampaign({ name: "x", utmCampaign: "30D_HOME_V1", channel: "Meta", owner: "DG", start: "2026-12-01" }, rows).error, "That UTM campaign tag is already in the list.");
  assert.match(L.newCampaign({ name: "x", utmCampaign: "has space", channel: "Meta", owner: "DG", start: "2026-12-01" }, rows).error, /lowercase/);
  assert.equal(L.newCampaign({ name: "x", utmCampaign: "g1", channel: "Google", owner: "DG", start: "2026-12-01" }, rows).row.spendSource, "manual");
  assert.equal(L.newCampaign({ name: "x", utmCampaign: "g2", platform: "TikTok", owner: "DG", start: "2026-12-01" }, rows).error, "Choose a platform.");
  assert.match(L.newCampaign({ name: "x", utmCampaign: "g3", channel: "Meta", owner: "DG", start: "2026-12-05", end: "2026-12-01" }, rows).error, /End date/);

  const ended = L.endCampaign(rows, "cmp_h24", "2026-12-09", { nowIso: "t" });
  assert.equal(ended.rows.find((r) => r.id === "cmp_h24").end, "2026-12-09");
  assert.match(L.endCampaign(rows, "cmp_30d_home_v1", "2026-12-20").error, /not extended/);
  assert.equal(L.endCampaign(rows, "nope", "2026-12-09").error, "Campaign not found.");

  const sp = L.setSpend(rows, "cmp_30d_home_v1", "2026-11-29", "30", { nowIso: "t", today: "2026-12-10" });
  assert.deepEqual(sp.rows[0].spend.map((s) => [s.day, s.amount]), [["2026-11-28", 20], ["2026-11-29", 30]]);
  assert.equal(L.setSpend(rows, "cmp_h24", "2026-11-29", 5).error, "This campaign has no spend source.");
  assert.match(L.setSpend(rows, "cmp_30d_home_v1", "2026-12-06", 5).error, /inside the campaign's run/);
  assert.equal(L.setSpend(rows, "cmp_30d_home_v1", "2026-11-30", -1).error, "Spend must be between $0 and $100,000.");
  assert.equal(L.setSpend(rows, "cmp_30d_home_v1", "2026-11-30", 100000.01).error, "Spend must be between $0 and $100,000.");
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
  assert.match(block, /\}\. Refresh to update\./);
  const toml = require("fs").readFileSync(path.join(__dirname, "..", "netlify.toml"), "utf8");
  assert.match(toml, /from = "\/api\/admin\/campaign-leads"\n  to = "\/\.netlify\/functions\/admin-campaign-leads"/);
  assert.match(toml, /from = "\/api\/admin\/campaigns"\n  to = "\/\.netlify\/functions\/admin-campaigns"/);
});

test("admin.html (Proof-reader edits): portal tag placeholder, campaign-run option, singular/plural spend days", () => {
  const html = require("fs").readFileSync(path.join(__dirname, "..", "admin.html"), "utf8");
  assert.match(html, /id="lcPortalTag"[^>]*placeholder="e\.g\. campaign-30d-home-v1"/);
  assert.match(html, /c\.name \+ ' \(campaign run\)'/);
  assert.doesNotMatch(html, /\(run window\)/);
  const start = html.indexOf("// ───────── Leads by Campaign");
  const block = html.slice(start, html.indexOf("// ───────── OKRs, KPIs, and Metrics", start));
  const expr = block.match(/const spentLine = (.+);\n/)[1];
  const fn = new Function("c", "spent", "return " + expr);
  const c = (n) => ({ spendSource: "manual", spend: Array.from({ length: n }, () => ({ amount: 10 })) });
  assert.equal(fn(c(1), 10), "$10.00 over 1 day");
  assert.equal(fn(c(3), 30), "$30.00 over 3 days");
  assert.equal(fn(c(0), 0), "None yet");
  // A portal tag derived from a UTM tag turns "_" into "-", so it passes the portal-tag check; typed tags too.
  const r = L.newCampaign({ name: "x", utmCampaign: "a_b_c", channel: "Meta", owner: "DG", start: "2026-12-01", portalTag: "Campaign_A_B" }, []);
  assert.equal(r.row.portalTag, "campaign-a-b");
  assert.equal(L.newCampaign({ name: "x", utmCampaign: "a_b_c", channel: "Meta", owner: "DG", start: "2026-12-01" }, []).row.portalTag, "campaign-a-b-c");
});

test("admin.html (Rev 2): signed-off columns, platforms, toggle, footnotes, End campaign; no Matched by column, TEST row or unapproved placeholder", () => {
  const html = require("fs").readFileSync(path.join(__dirname, "..", "admin.html"), "utf8");
  assert.match(html, /<th>Campaign or source<\/th><th>Platform<\/th><th>Channel<\/th><th>Dates<\/th><th class="lc-num">Real leads<\/th><th class="lc-num">Partial leads<\/th><th class="lc-num">Paying rentals<\/th><th>Spend<\/th><th>Cost per real lead<\/th>/);
  assert.doesNotMatch(html, /<th>Matched by<\/th>/);
  const { PLATFORMS } = require("../netlify/functions/_lib/campaign-platform");
  const sel = html.match(/<select id="lcPlatform"[^>]*>([\s\S]*?)<\/select>/)[1];
  assert.deepEqual([...sel.matchAll(/<option>([^<]+)<\/option>/g)].map((m) => m[1]), PLATFORMS);
  assert.match(html, /<select id="lcChannel" name="channel"><option>Paid<\/option><option>Organic<\/option><\/select>/);
  assert.match(html, /<label for="lcAdsName">Ad platform campaign name \(optional\)<\/label><input id="lcAdsName" name="adsCampaignName" maxlength="120">/);
  assert.match(html, /> Show empty campaigns<\/label>/);
  assert.match(html, /No sourced leads in this range\./);
  assert.match(html, />End campaign<\/button>/);
  assert.match(html, /title="\$\{escape\('Matched by: ' \+/);
  const start = html.indexOf("// ───────── Leads by Campaign");
  const block = html.slice(start, html.indexOf("// ───────── OKRs, KPIs, and Metrics", start));
  assert.doesNotMatch(block, /TEST and internal|Unattributed|Before source tracking/);
  assert.doesNotMatch(block, /localStorage|sessionStorage|document\.cookie/);
});

test("campaign list: an ad platform campaign name is kept only for Meta and Google Ads rows", () => {
  const add = (platform) => L.newCampaign({ name: "x", utmCampaign: "t_" + platform.length, platform, owner: "DG", start: "2026-12-01", adsCampaignName: "H-13 home" }, []).row.adsCampaignName;
  assert.equal(add("Meta"), "H-13 home"); assert.equal(add("Google Ads"), "H-13 home"); assert.equal(add("KSL"), null);
  const legacyMeta = { id: "a", channel: "Meta", spendSource: "manual" };
  assert.ok(L.setAdsName([legacyMeta], "a", "n").rows);
  assert.equal(L.setAdsName([{ id: "b", platform: "Email inbox" }], "b", "n").error, "Only Meta and Google campaigns have an ad platform campaign name.");
});

test("admin.html (Rev 2 Proof-reader edits): Default for the platform, Stripe: live.", () => {
  const html = require("fs").readFileSync(path.join(__dirname, "..", "admin.html"), "utf8");
  assert.match(html, /<option value="">Default for the platform<\/option>/);
  assert.doesNotMatch(html, /Default for the channel|Stripe: live read\./);
  assert.match(html, /'Stripe: live\.'/);
});
