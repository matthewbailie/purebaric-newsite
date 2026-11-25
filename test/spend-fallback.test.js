// fix/spend-empty-fallback: a live spend read that returns nothing (no rows, missing or $0 total, no matching
// campaign, or GA4's one-day cost lag) is "not connected", never a live $0. Covers GA4/Google and Meta on
// the OKRs tab (constellation periodSpend / spendLine / CPL / CAC) and on Leads by Campaign (liveSpendFor,
// spend cell, spend-but-no-leads footnote). Fixtures only; no network, Blobs or Stripe.
const { test } = require("node:test");
const assert = require("node:assert/strict");
const C = require("../netlify/functions/_lib/constellation");
const L = require("../netlify/functions/_lib/campaign-leads");
const G = require("../netlify/functions/_lib/ga-okr");
const realConfig = require("../netlify/functions/_data/metrics-config.json");

const cfg = () => JSON.parse(JSON.stringify(realConfig));
const NOW = Date.parse("2026-11-25T19:40:00Z"); // Wed Nov 25, 2026, 12:40 PM MT
const FROM = "2026-11-01", TO = "2026-11-25";
const G_ROW = { id: "cmp_g", name: "Google search", utmCampaign: "g_search", platform: "Google Ads", channel: null, owner: "DG", start: "2026-11-01", end: null, spendSource: "manual",
  portalTag: "campaign-g-search", adsCampaignName: "Utah Search", spend: [{ day: "2026-11-20", amount: 5, enteredAt: "2026-11-20T16:00:00Z" }], createdAt: "2026-11-01T16:00:00Z" };
const M_ROW = { id: "cmp_m", name: "H-13", utmCampaign: "30d_home_v1", platform: "Meta", channel: "Paid", owner: "DG", start: "2026-11-01", end: null, spendSource: "manual",
  portalTag: "campaign-30d-home-v1", adsCampaignName: "H-13 home", spend: [{ day: "2026-11-21", amount: 9.5, enteredAt: "2026-11-21T23:30:00Z" }], createdAt: "2026-11-01T16:00:00Z" };
const noHand = (r) => ({ ...r, spend: [] });
const GA = (adsCost, extra = {}) => ({ ok: true, readMs: NOW, ...G.mapOkrReports({}, {}), adsCost, ...extra });
const META = (total, byCampaign = {}) => ({ ok: true, configured: true, total, byCampaign });

// ───────── (1) empty live reads fall back to hand-entered spend ─────────
test("(1) GA4 and Meta: no rows, missing total or $0 total → not connected, hand-entered spend with the asterisk", () => {
  const empties = { google: [GA({}), GA(null), GA({ "Utah Search": 0 }), GA({ "(not set)": 0 })], meta: [META(0), META(undefined), META(null), META(NaN)] };
  for (const ga of empties.google) {
    const s = C.periodSpend({ ga, meta: META(12), campaigns: [G_ROW, M_ROW], from: FROM, to: TO });
    assert.deepEqual([s.google.live, s.google.amount, s.google.days, s.google.unknown], [false, 5, 1, false], JSON.stringify(ga.adsCost));
    assert.equal(s.static, true); assert.equal(s.total, 17);
    assert.equal(s.lastUpdatedAt, "2026-11-20T16:00:00.000Z");
  }
  for (const meta of empties.meta) {
    const s = C.periodSpend({ ga: GA({ "Utah Search": 30 }), meta, campaigns: [G_ROW, M_ROW], from: FROM, to: "2026-11-24" });
    assert.deepEqual([s.meta.live, s.meta.amount, s.meta.days], [false, 9.5, 1], String(meta.total));
    assert.equal(s.static, true); assert.equal(s.total, 39.5);
  }
  // the page sources follow: no "live" badge for an empty read
  const r = C.buildReport({ period: "month", nowMs: NOW, subs: [], stripe: { configured: true }, machines: [], rentals: [], bookings: [], waitlist: [], customers: [], contacts: [],
    config: cfg(), ga: GA({}), meta: META(0), campaigns: [G_ROW, M_ROW] });
  assert.equal(r.sources.googleAds, "not_connected"); assert.equal(r.sources.meta, "not_connected");
  const cpl = r.rows.find((x) => x.id === "cpl");
  assert.equal(cpl.static, true); assert.ok(cpl.lastUpdated && /^Last updated /.test(cpl.lastUpdated.label));
  assert.match(cpl.note, /^Spend \$14\.50: Google \$5\.00 \(entered by hand for 1 day\) \+ Meta \$9\.50 \(entered by hand for 1 day\)\. Google Ads cost isn't available in GA4\. Meta spend is entered by hand\./);
  // a real live read still reads live
  const live = C.periodSpend({ ga: GA({ "Utah Search": 31.25 }, { adsCostTo: TO }), meta: META(12.8), campaigns: [G_ROW, M_ROW], from: FROM, to: TO });
  assert.deepEqual([live.google.live, live.google.amount, live.meta.live, live.meta.amount, live.static, live.total], [true, 31.25, true, 12.8, false, 44.05]);
});

test("(1) Leads by Campaign: unmatched name or $0 live → the row's hand-entered spend (static), never a live $0", () => {
  const rep = (liveSpend, rows = [G_ROW, M_ROW]) => L.buildCampaignReport({ bookings: [], waitlist: [], customers: [], contacts: [], campaigns: rows, subs: [], stripe: { configured: false },
    nowMs: NOW, from: FROM, to: "2026-11-24", config: cfg(), liveSpend });
  for (const live of [
    { google: { ok: true, byCampaign: {} }, meta: { ok: true, byCampaign: {} } },
    { google: { ok: true, byCampaign: { Brand: 8.75 } }, meta: { ok: true, byCampaign: { Other: 3 } } },
    { google: { ok: true, byCampaign: { "Utah Search": 0 } }, meta: { ok: true, byCampaign: { "H-13 home": 0 } } },
  ]) {
    assert.equal(L.liveSpendFor(G_ROW, live), null); assert.equal(L.liveSpendFor(M_ROW, live), null);
    const g = rep(live).groups.find((x) => x.campaignId === "cmp_g"), m = rep(live).groups.find((x) => x.campaignId === "cmp_m");
    assert.deepEqual([g.spend, g.spendDisplay, g.spendStatic], [5, "$5.00 (1 day entered)", true]);
    assert.deepEqual([m.spend, m.spendDisplay, m.spendStatic], [9.5, "$9.50 (1 day entered)", true]);
    assert.equal(g.spendUpdated.label, "Last updated Nov 20, 2026, 9:00 AM MT");
  }
  const ok = rep({ google: { ok: true, byCampaign: { "utah search": 31.25 } }, meta: { ok: true, byCampaign: { "H-13 home": 12.8 } } });
  assert.equal(ok.groups.find((x) => x.campaignId === "cmp_g").spendDisplay, "$31.25 (live from Google Ads)");
  assert.equal(ok.groups.find((x) => x.campaignId === "cmp_m").spendDisplay, "$12.80 (live from Meta)");
});

// ───────── (2) no hand entry either → not connected, never $0 ─────────
test("(2) GA4 and Meta empty with no hand entry: spend unknown, shown as not connected, never $0", () => {
  const s = C.periodSpend({ ga: GA({}), meta: META(0), campaigns: [noHand(G_ROW), noHand(M_ROW)], from: FROM, to: TO });
  assert.deepEqual([s.google.unknown, s.google.amount, s.meta.unknown, s.meta.amount, s.total], [true, null, true, null, null]);
  const line = C.spendLine(s, GA({}), META(0));
  assert.equal(line, "Google (no spend entered yet) + Meta (no spend entered yet). Google Ads cost isn't available in GA4. Meta spend is entered by hand.");
  assert.doesNotMatch(line, /\$0/);
  // one side unknown is enough to make the total unknown
  const half = C.periodSpend({ ga: GA({ "Utah Search": 20 }), meta: META(0), campaigns: [noHand(M_ROW)], from: FROM, to: "2026-11-24" });
  assert.equal(half.total, null);
  assert.equal(C.spendLine(half, GA({}), META(0)), "Google $20.00 (live from Google Ads) + Meta (no spend entered yet). Meta spend is entered by hand.");
  // Leads: the row falls to its existing approved fallback text, never "$0.00 (live …)"
  const r = L.buildCampaignReport({ bookings: [], waitlist: [], customers: [], contacts: [], campaigns: [noHand(G_ROW), { ...noHand(M_ROW), spendSource: "none" }], subs: [], stripe: { configured: false },
    nowMs: NOW, from: FROM, to: "2026-11-24", config: cfg(), liveSpend: { google: { ok: true, byCampaign: {} }, meta: { ok: true, byCampaign: { "H-13 home": 0 } } } });
  const g = r.groups.find((x) => x.campaignId === "cmp_g"), m = r.groups.find((x) => x.campaignId === "cmp_m");
  assert.deepEqual([g.spend, g.spendDisplay, g.cplDisplay], [null, "No spend entered for this range", null]);
  assert.deepEqual([m.spend, m.spendDisplay, m.cplDisplay], [null, "No spend source", null]);
  assert.ok(!JSON.stringify(r.groups).includes("$0.00"));
});

// ───────── (3) CPL and CAC blank when spend is unknown ─────────
test("(3) cost per real lead and CAC are blank (not $0) when GA4 or Meta spend is unknown", () => {
  const lead = { id: "b1", createdAt: "2026-11-10T18:00:00Z", status: "new", firstName: "Ana", lastName: "Ruiz", email: "ana@example.com" };
  const sub = { id: "s1", livemode: true, status: "active", start_date: Date.parse("2026-11-12T18:00:00Z") / 1000, customer: { email: "ana@example.com" },
    items: { data: [{ price: { unit_amount: 57900, recurring: { interval: "month" } } }] } };
  const base = { period: "month", nowMs: NOW, subs: [sub], stripe: { configured: true }, machines: [], rentals: [], bookings: [lead], waitlist: [], customers: [], contacts: [], config: cfg() };
  for (const [ga, meta] of [[GA({}), META(12)], [GA({ "Utah Search": 20 }), META(0)]]) {
    const by = Object.fromEntries(C.buildReport({ ...base, ga, meta, campaigns: [noHand(G_ROW), noHand(M_ROW)] }).rows.map((x) => [x.id, x]));
    assert.equal(by.cpl.value, null); assert.equal(by.cpl.display, null);
    assert.equal(by.cac.value, null); assert.equal(by.cac.display, null);
    assert.ok(!/\$0\.00/.test(by.cpl.note), by.cpl.note);
  }
  // known spend still divides
  const by = Object.fromEntries(C.buildReport({ ...base, ga: GA({ "Utah Search": 20 }, { adsCostTo: "2026-11-24" }), meta: META(10), campaigns: [] }).rows.map((x) => [x.id, x]));
  assert.equal(by.cpl.display, "$30.00 (1 real lead)"); assert.equal(by.cac.display, "$30.00 (1 new paid start)");
});

// ───────── (4) GA4 cost lag ─────────
test("(4) GA4 lag: a range ending today reads Google cost through yesterday; today alone uses the fallback", () => {
  assert.equal(G.mtYesterday(NOW), "2026-11-24");
  assert.equal(G.mtYesterday(Date.parse("2026-11-25T06:30:00Z")), "2026-11-23"); // 11:30 PM MT Nov 24
  // request: the cost report stops at yesterday; a today-only range has no cost report at all
  const month = G.okrRequests({ from: FROM, to: TO, adsCost: true, adsTo: "2026-11-24" });
  assert.deepEqual(month.adsCost.dateRanges, [{ startDate: FROM, endDate: "2026-11-24" }]);
  assert.deepEqual(month.events.dateRanges, [{ startDate: FROM, endDate: TO }]); // other reports still include today
  assert.equal(G.okrRequests({ from: TO, to: TO, adsCost: true, adsTo: "2026-11-24" }).adsCost, undefined);
  // spend: live through yesterday + today's hand entry (static); no hand entry today → live only
  const today = { ...G_ROW, spend: [{ day: "2026-11-24", amount: 99, enteredAt: "2026-11-24T16:00:00Z" }, { day: TO, amount: 4, enteredAt: "2026-11-25T17:00:00Z" }] };
  const s = C.periodSpend({ ga: GA({ "Utah Search": 30 }, { adsCostTo: "2026-11-24" }), meta: META(10), campaigns: [today], from: FROM, to: TO });
  assert.deepEqual([s.google.live, s.google.amount, s.static, s.total], [true, 34, true, 44]);
  assert.equal(s.lastUpdatedAt, "2026-11-25T17:00:00.000Z");
  assert.equal(C.spendLine(s, GA({}), META(10)), "Spend $44.00: Google $30.00 (live from Google Ads) + $4.00 (entered by hand for 1 day) + Meta $10.00 (live from Meta).");
  const noToday = C.periodSpend({ ga: GA({ "Utah Search": 30 }, { adsCostTo: "2026-11-24" }), meta: META(10), campaigns: [G_ROW], from: FROM, to: TO });
  assert.deepEqual([noToday.google.amount, noToday.static], [30, false]);
  // Day view of today: GA4 skipped the cost report (adsCost null), so Google is the fallback, never $0
  const day = C.periodSpend({ ga: GA(null, { adsCostTo: "2026-11-24" }), meta: META(3), campaigns: [today], from: TO, to: TO });
  assert.deepEqual([day.google.live, day.google.amount, day.google.days], [false, 4, 1]);
  const dayNone = C.periodSpend({ ga: GA(null, { adsCostTo: "2026-11-24" }), meta: META(3), campaigns: [], from: TO, to: TO });
  assert.equal(dayNone.google.unknown, true); assert.equal(dayNone.total, null);
  // Meta has no lag: a today-only Meta read is used live
  assert.equal(day.meta.live, true);
});

test("(4) GA4 lag on Leads by Campaign: fetchAdsCost stops at yesterday; today's hand entry is added; today alone falls back", async () => {
  const bodies = [];
  const fetchFn = async (url, opts) => {
    if (String(url).includes("oauth2")) return { ok: true, json: async () => ({ access_token: "t", expires_in: 3600 }) };
    bodies.push(JSON.parse(opts.body));
    return { ok: true, json: async () => ({ rows: [{ dimensionValues: [{ value: "Utah Search" }], metricValues: [{ value: "30" }] }] }) };
  };
  const crypto = require("crypto");
  const { privateKey } = crypto.generateKeyPairSync("rsa", { modulusLength: 1024 });
  const sa = { client_email: "r@test.iam.gserviceaccount.com", private_key: privateKey.export({ type: "pkcs8", format: "pem" }) };
  const g = await G.fetchAdsCost({ sa, propertyId: "1", from: FROM, to: "2026-12-31", fetchFn, nowMs: NOW });
  assert.equal(g.ok, true); assert.equal(g.costTo, "2026-11-24");
  assert.deepEqual(bodies[0].dateRanges, [{ startDate: FROM, endDate: "2026-11-24" }]);
  const todayOnly = await G.fetchAdsCost({ sa, propertyId: "1", from: TO, to: TO, fetchFn, nowMs: NOW });
  assert.equal(todayOnly.ok, false); assert.equal(bodies.length, 1, "no GA call for a today-only range");

  const row = { ...G_ROW, spend: [{ day: TO, amount: 4, enteredAt: "2026-11-25T17:00:00Z" }] };
  const rep = (live, from = FROM) => L.buildCampaignReport({ bookings: [], waitlist: [], customers: [], contacts: [], campaigns: [row, M_ROW], subs: [], stripe: { configured: false },
    nowMs: NOW, from, to: TO, config: cfg(), liveSpend: live });
  const grp = rep({ google: { ok: true, costTo: "2026-11-24", byCampaign: { "Utah Search": 30 } }, meta: { ok: true, byCampaign: { "H-13 home": 7 } } }).groups;
  const gg = grp.find((x) => x.campaignId === "cmp_g");
  assert.deepEqual([gg.spend, gg.spendDisplay, gg.spendStatic], [34, "$30.00 (live from Google Ads) + $4.00 (1 day entered)", true]);
  assert.equal(grp.find((x) => x.campaignId === "cmp_m").spendDisplay, "$7.00 (live from Meta)");
  const day = rep({ google: todayOnly, meta: { ok: true, byCampaign: { "H-13 home": 0 } } }, TO).groups;
  assert.equal(day.find((x) => x.campaignId === "cmp_g").spendDisplay, "$4.00 (1 day entered)");
  assert.equal(day.find((x) => x.campaignId === "cmp_m").spendDisplay, "No spend entered for this range");
});

// ───────── (5) spend-but-no-leads footnote ─────────
test("(5) spend-but-no-leads footnote: any campaign with spend above $0, live or hand-entered, matched or not", () => {
  const rows = [G_ROW, M_ROW, { ...noHand(M_ROW), id: "cmp_z", name: "Zero", utmCampaign: "z1", portalTag: "campaign-z1", adsCampaignName: "Zero ad" }];
  const rep = (live) => L.buildCampaignReport({ bookings: [], waitlist: [], customers: [], contacts: [], campaigns: rows, subs: [], stripe: { configured: false },
    nowMs: NOW, from: FROM, to: "2026-11-24", config: cfg(), liveSpend: live }).spendNoLeadsFootnote;
  // live Google matched, Meta unmatched → Meta's hand entry still listed; $0 "Zero" never listed
  assert.equal(rep({ google: { ok: true, byCampaign: { "Utah Search": 30 } }, meta: { ok: true, byCampaign: { Other: 5, "Zero ad": 0 } } }),
    "Campaigns with spend but no leads in this range: Google search ($30.00), H-13 ($9.50)");
  // both live reads empty → both fall back to hand entries and stay listed
  assert.equal(rep({ google: { ok: true, byCampaign: {} }, meta: { ok: true, byCampaign: {} } }),
    "Campaigns with spend but no leads in this range: Google search ($5.00), H-13 ($9.50)");
  // live Meta matched for H-13
  assert.equal(rep({ google: null, meta: { ok: true, byCampaign: { "H-13 home": 12.8 } } }),
    "Campaigns with spend but no leads in this range: Google search ($5.00), H-13 ($12.80)");
  // nothing above $0 → no footnote
  assert.equal(L.buildCampaignReport({ bookings: [], waitlist: [], customers: [], contacts: [], campaigns: rows.map(noHand), subs: [], stripe: { configured: false },
    nowMs: NOW, from: FROM, to: "2026-11-24", config: cfg(), liveSpend: { google: { ok: true, byCampaign: {} }, meta: { ok: true, byCampaign: {} } } }).spendNoLeadsFootnote, null);
});
