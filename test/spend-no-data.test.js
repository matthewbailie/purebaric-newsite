// Dec 1 batch: a spend read that is missing, empty or errored must never show as $0.
// Show "No data yet" for that spend cell, and "—" for cost per lead and CAC when spend
// is unknown. A real live $0 for a matched campaign may still show $0. No new
// hand-entered spend fallback. Fixtures only; no network, Blobs or Stripe.
const { test } = require("node:test");
const assert = require("node:assert/strict");
const crypto = require("crypto");
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
const META = (total, byCampaign) => {
  const out = { ok: true, configured: true, total };
  if (byCampaign !== undefined) out.byCampaign = byCampaign;
  return out;
};

const report = (over = {}) => C.buildReport({
  period: "month", nowMs: NOW, subs: [], stripe: { configured: true }, machines: [], rentals: [],
  bookings: [], waitlist: [], customers: [], contacts: [], config: cfg(), campaigns: [noHand(G_ROW), noHand(M_ROW)], ...over,
});
const leadsReport = (liveSpend, rows = [noHand(G_ROW), noHand(M_ROW)], extra = {}) => L.buildCampaignReport({
  bookings: [], waitlist: [], customers: [], contacts: [], campaigns: rows, subs: [], stripe: { configured: false },
  nowMs: NOW, from: FROM, to: "2026-11-24", config: cfg(), liveSpend, ...extra,
});

function noZero(s) { assert.ok(!/\$0(?:\.00)?/.test(String(s)), String(s)); }

// ───────── empty object ─────────
test("empty adsCost {} is not live data: No data yet, never $0, no hand-entered fallback", () => {
  const s = C.periodSpend({ ga: GA({}), meta: META(12, { "H-13 home": 12 }), campaigns: [G_ROW, M_ROW], from: FROM, to: TO });
  assert.equal(s.google.unknown, true);
  assert.equal(s.google.live, false);
  assert.equal(s.google.amount, null);
  assert.equal(s.total, null, "one unknown platform makes the total unknown");
  assert.equal(s.meta.live, true);
  assert.equal(s.meta.amount, 12);
  const line = C.spendLine(s, GA({}), META(12, { "H-13 home": 12 }));
  assert.match(line, /No data yet/);
  noZero(line);
  // Hand-entered Google $5 must not be used just because the live read was empty
  assert.ok(s.google.amount !== 5);

  const emptyMeta = C.periodSpend({ ga: GA({ "Utah Search": 30 }), meta: META(0, {}), campaigns: [G_ROW, M_ROW], from: FROM, to: "2026-11-24" });
  assert.equal(emptyMeta.meta.unknown, true);
  assert.equal(emptyMeta.meta.amount, null);
  assert.equal(emptyMeta.total, null);
  assert.ok(emptyMeta.meta.amount !== 9.5);

  const both = C.periodSpend({ ga: GA({}), meta: META(0, {}), campaigns: [G_ROW, M_ROW], from: FROM, to: TO });
  assert.equal(both.google.unknown, true);
  assert.equal(both.meta.unknown, true);
  assert.equal(both.total, null);

  const r = report({ ga: GA({}), meta: META(0, {}), campaigns: [G_ROW, M_ROW] });
  assert.notEqual(r.sources.googleAds, "live");
  const g = leadsReport({ google: { ok: true, byCampaign: {} }, meta: { ok: true, byCampaign: {} } }).groups.find((x) => x.campaignId === "cmp_g");
  assert.equal(g.spend, null);
  assert.equal(g.spendDisplay, "No data yet");
  noZero(g.spendDisplay);
});

// ───────── missing platform ─────────
test("missing platform on a live read: No data yet, never $0, no hand-entered fallback", () => {
  // GA ran but adsCost is missing
  const s = C.periodSpend({ ga: GA(null), meta: META(10, { "H-13 home": 10 }), campaigns: [G_ROW, M_ROW], from: FROM, to: "2026-11-24" });
  assert.equal(s.google.unknown, true);
  assert.equal(s.google.amount, null);
  assert.equal(s.total, null);
  noZero(C.spendLine(s, GA(null), META(10, { "H-13 home": 10 })));

  // Leads: live payload has Meta only; the Google row is missing its platform
  const missing = leadsReport({ meta: { ok: true, byCampaign: { "H-13 home": 12.8 } } });
  const g = missing.groups.find((x) => x.campaignId === "cmp_g");
  const m = missing.groups.find((x) => x.campaignId === "cmp_m");
  assert.equal(g.spendDisplay, "No data yet");
  assert.equal(g.spend, null);
  assert.equal(m.spendDisplay, "$12.80 (live from Meta)");
  noZero(g.spendDisplay);

  // Unmatched campaign name is not a live $0
  const unmatched = L.liveSpendFor(G_ROW, { google: { ok: true, byCampaign: { Brand: 8.75 } }, meta: { ok: true, byCampaign: {} } });
  assert.equal(unmatched && unmatched.amount, undefined);
  assert.equal(unmatched && unmatched.unknown, true);
  const ug = leadsReport({ google: { ok: true, byCampaign: { Brand: 8.75 } }, meta: { ok: true, byCampaign: { Other: 3 } } }).groups.find((x) => x.campaignId === "cmp_g");
  assert.equal(ug.spendDisplay, "No data yet");
  assert.equal(ug.spend, null);
});

// ───────── errored read ─────────
test("errored spend read: No data yet, never $0, no hand-entered fallback", () => {
  const s = C.periodSpend({
    ga: { ok: false, reason: "Google Analytics could not be read: quota" },
    meta: { ok: false, configured: true, reason: "Meta spend could not be read: HTTP 500" },
    campaigns: [G_ROW, M_ROW], from: FROM, to: TO,
  });
  assert.equal(s.google.unknown, true);
  assert.equal(s.meta.unknown, true);
  assert.equal(s.google.amount, null);
  assert.equal(s.meta.amount, null);
  assert.equal(s.total, null);
  const line = C.spendLine(s, { ok: false, reason: "quota" }, { ok: false, configured: true });
  assert.match(line, /No data yet/);
  noZero(line);
  // Existing hand entries must not be substituted for an error
  assert.ok(s.google.amount !== 5 && s.meta.amount !== 9.5);

  const leads = leadsReport({ google: { ok: false, reason: "quota" }, meta: { ok: false, configured: true, reason: "HTTP 500" } });
  assert.equal(leads.groups.find((x) => x.campaignId === "cmp_g").spendDisplay, "No data yet");
  assert.equal(leads.groups.find((x) => x.campaignId === "cmp_m").spendDisplay, "No data yet");
});

// ───────── today-only range with Google's ~1-day lag ─────────
test("today-only range with Google's ~1-day lag: No data yet for Google, never $0, no hand-entered fallback", async () => {
  assert.equal(G.mtYesterday(NOW), "2026-11-24");
  assert.equal(G.mtYesterday(Date.parse("2026-11-25T06:30:00Z")), "2026-11-23"); // 11:30 PM MT Nov 24
  const month = G.okrRequests({ from: FROM, to: TO, adsCost: true, adsTo: "2026-11-24" });
  assert.deepEqual(month.adsCost.dateRanges, [{ startDate: FROM, endDate: "2026-11-24" }]);
  assert.deepEqual(month.events.dateRanges, [{ startDate: FROM, endDate: TO }]);
  assert.equal(G.okrRequests({ from: TO, to: TO, adsCost: true, adsTo: "2026-11-24" }).adsCost, undefined);

  const bodies = [];
  const fetchFn = async (url, opts) => {
    if (String(url).includes("oauth2")) return { ok: true, json: async () => ({ access_token: "t", expires_in: 3600 }) };
    bodies.push(JSON.parse(opts.body));
    return { ok: true, json: async () => ({ rows: [{ dimensionValues: [{ value: "Utah Search" }], metricValues: [{ value: "30" }] }] }) };
  };
  const { privateKey } = crypto.generateKeyPairSync("rsa", { modulusLength: 1024 });
  const sa = { client_email: "r@test.iam.gserviceaccount.com", private_key: privateKey.export({ type: "pkcs8", format: "pem" }) };
  const g = await G.fetchAdsCost({ sa, propertyId: "1", from: FROM, to: "2026-12-31", fetchFn, nowMs: NOW });
  assert.equal(g.ok, true);
  assert.equal(g.costTo, "2026-11-24");
  assert.deepEqual(bodies[0].dateRanges, [{ startDate: FROM, endDate: "2026-11-24" }]);
  const todayOnly = await G.fetchAdsCost({ sa, propertyId: "1", from: TO, to: TO, fetchFn, nowMs: NOW });
  assert.equal(todayOnly.ok, false);
  assert.equal(todayOnly.costTo, "2026-11-24");
  assert.equal(bodies.length, 1, "no GA call for a today-only range");

  // Day view of today: Google cost isn't available yet → unknown, not $0, not today's hand entry
  const todayRow = { ...G_ROW, spend: [{ day: TO, amount: 4, enteredAt: "2026-11-25T17:00:00Z" }] };
  const day = C.periodSpend({ ga: GA(null, { adsCostTo: "2026-11-24" }), meta: META(3, { "H-13 home": 3 }), campaigns: [todayRow], from: TO, to: TO });
  assert.equal(day.google.unknown, true);
  assert.equal(day.google.amount, null);
  assert.equal(day.meta.live, true);
  assert.equal(day.meta.amount, 3);
  assert.equal(day.total, null);
  noZero(C.spendLine(day, GA(null, { adsCostTo: "2026-11-24" }), META(3, { "H-13 home": 3 })));

  const dayLeads = L.buildCampaignReport({
    bookings: [], waitlist: [], customers: [], contacts: [], campaigns: [todayRow, noHand(M_ROW)],
    subs: [], stripe: { configured: false }, nowMs: NOW, from: TO, to: TO, config: cfg(),
    liveSpend: { google: todayOnly, meta: { ok: true, byCampaign: { "H-13 home": 3 } } },
  }).groups;
  assert.equal(dayLeads.find((x) => x.campaignId === "cmp_g").spendDisplay, "No data yet");
  assert.equal(dayLeads.find((x) => x.campaignId === "cmp_m").spendDisplay, "$3.00 (live from Meta)");
});

// ───────── CPL / CAC dash ─────────
test("cost per lead and CAC show — when spend is unknown, never $0", () => {
  const lead = { id: "b1", createdAt: "2026-11-10T18:00:00Z", status: "new", firstName: "Ana", lastName: "Ruiz", email: "ana@example.com" };
  const sub = { id: "s1", livemode: true, status: "active", start_date: Date.parse("2026-11-12T18:00:00Z") / 1000, customer: { email: "ana@example.com" },
    items: { data: [{ price: { unit_amount: 57900, recurring: { interval: "month" } } }] } };
  const base = { period: "month", nowMs: NOW, subs: [sub], stripe: { configured: true }, machines: [], rentals: [], bookings: [lead], waitlist: [], customers: [], contacts: [], config: cfg() };
  for (const [ga, meta] of [[GA({}), META(12, { "H-13 home": 12 })], [GA({ "Utah Search": 20 }), META(0, {})], [{ ok: false, reason: "quota" }, { ok: false, configured: true }]]) {
    const by = Object.fromEntries(C.buildReport({ ...base, ga, meta, campaigns: [G_ROW, M_ROW] }).rows.map((x) => [x.id, x]));
    assert.equal(by.cpl.value, null);
    assert.equal(by.cpl.display, "—");
    assert.equal(by.cac.value, null);
    assert.equal(by.cac.display, "—");
    noZero(by.cpl.note);
    noZero(by.cac.note);
  }
  // known spend still divides
  const by = Object.fromEntries(C.buildReport({ ...base, ga: GA({ "Utah Search": 20 }, { adsCostTo: "2026-11-24" }), meta: META(10, { "H-13 home": 10 }), campaigns: [] }).rows.map((x) => [x.id, x]));
  assert.equal(by.cpl.display, "$30.00 (1 real lead)");
  assert.equal(by.cac.display, "$30.00 (1 new paid start)");

  const g = leadsReport({ google: { ok: true, byCampaign: {} }, meta: { ok: true, byCampaign: {} } }, [G_ROW], { bookings: [lead] }).groups.find((x) => x.campaignId === "cmp_g");
  assert.equal(g.cplDisplay, "—");
  assert.equal(g.cpl, null);
});

// ───────── a real matched live $0 may still show $0 ─────────
test("a real live $0 that the API returned for a matched campaign may still show $0", () => {
  const s = C.periodSpend({ ga: GA({ "Utah Search": 0, Brand: 0 }), meta: META(0, { "H-13 home": 0 }), campaigns: [noHand(G_ROW), noHand(M_ROW)], from: FROM, to: "2026-11-24" });
  assert.equal(s.google.live, true);
  assert.equal(s.google.unknown, false);
  assert.equal(s.google.amount, 0);
  assert.equal(s.meta.live, true);
  assert.equal(s.meta.amount, 0);
  assert.equal(s.total, 0);

  const live = L.liveSpendFor(G_ROW, { google: { ok: true, byCampaign: { "Utah Search": 0 } }, meta: { ok: true, byCampaign: { "H-13 home": 0 } } });
  assert.equal(live.amount, 0);
  assert.equal(live.from, "Google Ads");
  assert.ok(!live.unknown);
  const g = leadsReport({ google: { ok: true, byCampaign: { "utah search": 0 } }, meta: { ok: true, byCampaign: { "H-13 home": 0 } } }).groups.find((x) => x.campaignId === "cmp_g");
  assert.equal(g.spend, 0);
  assert.equal(g.spendDisplay, "$0.00 (live from Google Ads)");
});

// ───────── existing no-live-source path is unchanged ─────────
test("when no live source is attempted, existing hand-entered spend is left as is", () => {
  const s = C.periodSpend({ ga: null, meta: null, campaigns: [G_ROW, M_ROW], from: FROM, to: TO });
  assert.equal(s.google.live, false);
  assert.equal(s.google.amount, 5);
  assert.equal(s.meta.amount, 9.5);
  assert.equal(s.total, 14.5);
  assert.equal(s.google.unknown, false);
  const none = leadsReport(undefined, [G_ROW]);
  assert.equal(none.groups.find((x) => x.campaignId === "cmp_g").spendDisplay, "$5.00 (1 day entered)");
});
