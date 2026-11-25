// Live metrics on admin "Site OKRs & Analytics": GA4 key parsing, GA4 OKR mapping and auto-detected custom
// dimensions, Meta spend (mocked fetch), the spend fallback, static rows (" *", footnote, server-stamped
// "Last updated"), live Leads by Campaign spend, and the admin.html wiring. No network, Blobs or Stripe.
const { test } = require("node:test");
const assert = require("node:assert/strict");
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const Module = require("module");
const gaT = require("../netlify/functions/_lib/ga-traffic");
const G = require("../netlify/functions/_lib/ga-okr");
const Meta = require("../netlify/functions/_lib/meta-ads");
const S = require("../netlify/functions/_lib/static-metrics");
const C = require("../netlify/functions/_lib/constellation");
const L = require("../netlify/functions/_lib/campaign-leads");
const realConfig = require("../netlify/functions/_data/metrics-config.json");

const cfg = () => JSON.parse(JSON.stringify(realConfig));
const NOW = Date.parse("2026-11-25T19:40:00Z"); // Nov 25, 2026, 12:40 PM MT
const FOOT = "* Static: updated by the team; accurate only when kept current.";
const { privateKey } = crypto.generateKeyPairSync("rsa", { modulusLength: 1024 });
const SA = { client_email: "reader@test.iam.gserviceaccount.com", private_key: privateKey.export({ type: "pkcs8", format: "pem" }) };

// ───────── GA4 key ─────────
test("GA4_SERVICE_ACCOUNT: raw JSON, base64 and base64url all parse; junk and partial keys don't", () => {
  const raw = JSON.stringify(SA, null, 2);
  assert.equal(gaT.parseServiceAccount(raw).client_email, SA.client_email);
  const b64 = Buffer.from(raw).toString("base64");
  assert.equal(gaT.parseServiceAccount(b64).client_email, SA.client_email);
  assert.equal(gaT.parseServiceAccount(b64.replace(/(.{60})/g, "$1\n")).client_email, SA.client_email); // wrapped lines
  assert.equal(gaT.parseServiceAccount(b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "")).client_email, SA.client_email);
  assert.equal(gaT.parseServiceAccount("  " + raw + "\n").client_email, SA.client_email);
  for (const bad of [undefined, "", "not json!", "{bad", Buffer.from("hello").toString("base64"), JSON.stringify({ client_email: "x" }), Buffer.from(JSON.stringify({ private_key: "k" })).toString("base64")]) {
    assert.equal(gaT.parseServiceAccount(bad), null, String(bad));
  }
});

// ───────── GA4 OKR reports ─────────
const gaResp = (rows) => ({ rows: rows.map(([d, m]) => ({ dimensionValues: [].concat(d).map((value) => ({ value })), metricValues: [{ value: String(m) }] })) });
const FULL = {
  events: gaResp([["booking_form_start", 20], ["booking_request_submit", 4], ["scroll_depth", 11], ["personalization_exposure", 9]]),
  bookPage: gaResp([["/book", 40], ["/book/", 2], ["/booking-faq", 99]]),
  paidSessions: gaResp([["30d_home_v1", 12]]),
  paidStarts: gaResp([["30d_home_v1", 3]]),
  adsCost: gaResp([["Utah Search", 31.25], ["(not set)", 0], ["Brand", 8.75]]),
  scroll: gaResp([[["25", "/"], 5], [["50", "/"], 3], [["75", "/pricing"], 2], [["90", "/"], 1]]),
  device: gaResp([["mobile", 12], ["desktop", 7], ["unknown", 1]]),
  variant: gaResp([[["control", "personalization_exposure"], 4], [["personalized", "personalization_exposure"], 5], [["control", "booking_form_start"], 1], [["personalized", "booking_form_start"], 2], [["none", "booking_form_start"], 17]]),
};
const HAS = { percent: true, page_path: true, device: true, variant: true };

test("GA4 requests: custom-dimension reports only when the dimension is in the property metadata", () => {
  const none = G.okrRequests({ from: "2026-11-01", to: "2026-11-25" });
  assert.deepEqual(Object.keys(none).sort(), ["bookPage", "events"]);
  const all = G.okrRequests({ from: "2026-11-01", to: "2026-11-25", paidCampaigns: ["30d_home_v1"], has: HAS, adsCost: true });
  assert.deepEqual(Object.keys(all).sort(), ["adsCost", "bookPage", "device", "events", "paidSessions", "paidStarts", "scroll", "variant"]);
  assert.deepEqual(all.scroll.dimensions.map((d) => d.name), ["customEvent:percent", "customEvent:page_path"]);
  assert.equal(all.device.dimensions[0].name, "customEvent:device");
  assert.equal(all.variant.dimensions[0].name, "customEvent:variant");
  assert.deepEqual(all.events.dateRanges, [{ startDate: "2026-11-01", endDate: "2026-11-25" }]);
  // The parameter names match what the site sends with gtag.
  const pbm = fs.readFileSync(path.join(__dirname, "..", "pb-metrics.js"), "utf8");
  assert.match(pbm, /track\('scroll_depth', funnelParams\(\{ percent: m, page_path: path \}\)\)/);
  assert.match(pbm, /var p = \{ device: deviceType\(\), variant: variant\(\) \};/);
  assert.match(fs.readFileSync(path.join(__dirname, "..", "pb-personalize.js"), "utf8"), /trackPurebaricEvent\('personalization_exposure', \{\s*variant: dec\.variant/);
});

test("GA4 mapping: counts per row; /book page views only; (not set) ad cost dropped", () => {
  const m = G.mapOkrReports(FULL, HAS);
  assert.equal(m.formStarts, 20); assert.equal(m.bookPageViews, 42); assert.equal(m.exposures, 9);
  assert.deepEqual(m.paid, { sessions: 12, starts: 3 });
  assert.deepEqual(m.adsCost, { "Utah Search": 31.25, Brand: 8.75 });
  assert.deepEqual(m.scroll, { 25: 5, 50: 3, 75: 2, 90: 1 });
  assert.deepEqual(m.topScrollPage, { path: "/", count: 9 });
  assert.deepEqual(m.device, { mobile: 12, desktop: 7, unknown: 1 });
  assert.deepEqual(m.variant, { control: { exposures: 4, starts: 1 }, personalized: { exposures: 5, starts: 2 } });
  const bare = G.mapOkrReports({ events: FULL.events, bookPage: FULL.bookPage }, {});
  assert.equal(bare.scroll, null); assert.equal(bare.device, null); assert.equal(bare.variant, null); assert.equal(bare.paid, null); assert.equal(bare.adsCost, null);
});

function gaFetch({ dims = Object.values(G.CUSTOM), fail = null } = {}) {
  const calls = [];
  const fn = async (url, opts) => {
    calls.push({ url, opts });
    const ok = (j) => ({ ok: true, status: 200, json: async () => j });
    if (url.startsWith("https://oauth2.googleapis.com/token")) return ok({ access_token: "ya29.test" });
    if (url.endsWith("/metadata")) return ok({ dimensions: ["eventName", "pagePath", ...dims].map((apiName) => ({ apiName })), metrics: [{ apiName: "advertiserAdCost" }] });
    if (fail) return { ok: false, status: 403, json: async () => ({ error: { message: fail } }) };
    const body = JSON.parse(opts.body);
    const key = Object.entries(G.okrRequests({ from: body.dateRanges[0].startDate, to: body.dateRanges[0].endDate, paidCampaigns: ["30d_home_v1"], has: HAS, adsCost: true }))
      .find(([, b]) => JSON.stringify(b) === JSON.stringify(body));
    return ok(key ? FULL[key[0]] : { rows: [] });
  };
  return { fn, calls };
}

test("fetchOkrGa: token → metadata → reports, read-only GETs/POSTs to Google only; never throws", async () => {
  const { fn, calls } = gaFetch();
  const r = await G.fetchOkrGa({ sa: SA, propertyId: "555169638", from: "2026-11-01", to: "2026-11-25", paidCampaigns: ["30d_home_v1"], fetchFn: fn });
  assert.equal(r.ok, true); assert.equal(r.formStarts, 20); assert.deepEqual(r.has, HAS);
  assert.ok(calls.every((c) => /^https:\/\/(oauth2|analyticsdata)\.googleapis\.com\//.test(c.url)));
  assert.ok(calls.filter((c) => c.url.includes(":runReport")).every((c) => c.url.includes("properties/555169638:runReport")));
  // Not registered yet → no custom-dimension reports.
  const partial = await G.fetchOkrGa({ sa: SA, propertyId: "555169638", from: "2026-11-01", to: "2026-11-25", fetchFn: gaFetch({ dims: [] }).fn });
  assert.deepEqual(partial.has, { percent: false, page_path: false, device: false, variant: false });
  const noKey = await G.fetchOkrGa({ sa: null, propertyId: "1", from: "a", to: "b" });
  assert.equal(noKey.ok, false); assert.match(noKey.reason, /GA4_SERVICE_ACCOUNT is missing/);
  const err = await G.fetchOkrGa({ sa: SA, propertyId: "1", from: "2026-11-01", to: "2026-11-25", fetchFn: gaFetch({ fail: "User does not have sufficient permissions" }).fn });
  assert.equal(err.ok, false); assert.equal(err.reason, "Google Analytics could not be read: User does not have sufficient permissions");
});

// ───────── Report rows ─────────
const report = (over = {}) => C.buildReport({ period: "month", nowMs: NOW, subs: [], stripe: { configured: true }, machines: [], rentals: [], bookings: [], waitlist: [], customers: [], contacts: [], config: cfg(), ...over });
const gaOk = (has = HAS) => ({ ok: true, readMs: NOW, ...G.mapOkrReports(FULL, has) });

test("GA4 rows read live when the key works; custom-dimension rows auto-detect and fall back to Not connected", () => {
  const by = Object.fromEntries(report({ ga: gaOk(), paidCampaigns: ["30d_home_v1"] }).rows.map((r) => [r.id, r]));
  assert.equal(by.form_starts.value, 20); assert.equal(by.form_starts.status, null); assert.equal(by.form_starts.static, false);
  assert.equal(by.booking_page_visits.display, "42");
  assert.equal(by.booking_completion_rate.display, "0 completed of 20 form starts"); assert.equal(by.booking_completion_rate.value, 0);
  assert.equal(by.paid_form_start_rate.display, "3 form starts of 12 paid sessions"); assert.equal(by.paid_form_start_rate.value, 0.25);
  assert.equal(by.scroll_depth.display, "25%: 5 · 50%: 3 · 75%: 2 · 90%: 1"); assert.match(by.scroll_depth.note, /Most scroll events: \/ \(9\)/);
  assert.equal(by.device_split.display, "12 mobile · 7 desktop · 1 unknown");
  assert.equal(by.personalization.display, "Control 4 · personalized 5 exposures"); assert.equal(by.personalization.status, "too_thin");
  for (const id of ["form_starts", "booking_page_visits", "scroll_depth", "device_split", "personalization"]) assert.equal(by[id].static, false, id);
  const noDims = Object.fromEntries(report({ ga: gaOk({}) }).rows.map((r) => [r.id, r]));
  for (const [id, param] of [["scroll_depth", "percent"], ["device_split", "device"], ["personalization", "variant"]]) {
    assert.equal(noDims[id].status, "not_connected", id);
    assert.equal(noDims[id].static, false, id);
    assert.match(noDims[id].note, new RegExp(`customEvent:${param}`), id);
  }
  const noPaid = Object.fromEntries(report({ ga: { ...gaOk(), paid: null } }).rows.map((r) => [r.id, r]));
  assert.equal(noPaid.paid_form_start_rate.display, "No paid campaigns listed");
  const down = Object.fromEntries(report({ ga: { ok: false, reason: "Google Analytics could not be read: quota" } }).rows.map((r) => [r.id, r]));
  assert.equal(down.form_starts.status, "not_connected"); assert.equal(down.form_starts.note, "Google Analytics could not be read: quota");
});

test("collecting-since note follows the config date once set", () => {
  const c = cfg(); c.ga4CustomDimensionsSince = "2026-11-25";
  const by = Object.fromEntries(report({ ga: gaOk(), config: c }).rows.map((r) => [r.id, r]));
  assert.match(by.device_split.note, /Collecting since 2026-11-25; GA doesn't backfill\./);
});

// ───────── Spend: live vs hand-entered ─────────
const CAMPAIGNS = [
  { id: "m", channel: "Meta", spendSource: "manual", spend: [{ day: "2026-11-20", amount: 10, enteredAt: "2026-11-20T16:00:00Z" }, { day: "2026-11-21", amount: 15.5, enteredAt: "2026-11-21T16:05:00Z" }] },
  { id: "g", channel: "Google", spendSource: "manual", spend: [{ day: "2026-11-21", amount: 7, enteredAt: "2026-11-22T01:00:00Z" }] },
  { id: "old", channel: "Meta", spendSource: "manual", spend: [{ day: "2026-10-30", amount: 99, enteredAt: "2026-10-30T16:00:00Z" }] },
];

test("spend switch: GA4 Ads cost and Meta replace hand-entered spend when live; otherwise static with the entry time", () => {
  const manual = C.periodSpend({ ga: null, meta: null, campaigns: CAMPAIGNS, from: "2026-11-01", to: "2026-11-25" });
  assert.deepEqual([manual.google.amount, manual.meta.amount, manual.total, manual.static], [7, 25.5, 32.5, true]);
  assert.equal(manual.lastUpdatedAt, "2026-11-22T01:00:00.000Z");
  const live = C.periodSpend({ ga: gaOk(), meta: { ok: true, total: 50 }, campaigns: CAMPAIGNS, from: "2026-11-01", to: "2026-11-25" });
  assert.deepEqual([live.google.amount, live.meta.amount, live.total, live.static, live.lastUpdatedAt], [40, 50, 90, false, null]);
  const half = C.periodSpend({ ga: gaOk(), meta: { ok: false, configured: true }, campaigns: CAMPAIGNS, from: "2026-11-01", to: "2026-11-25" });
  assert.equal(half.static, true); assert.equal(half.lastUpdatedAt, "2026-11-21T16:05:00.000Z");
});

test("CPL and CAC: static with ' *' and Last updated on hand-entered spend, live when both platforms are", () => {
  const leads = [{ id: "b1", createdAt: "2026-11-10T17:00:00Z", email: "ann@example.org", firstName: "Ann", step: "complete", status: "new" },
    { id: "b2", createdAt: "2026-11-12T17:00:00Z", email: "bo@example.org", firstName: "Bo", step: "complete", status: "new" }];
  const by = Object.fromEntries(report({ campaigns: CAMPAIGNS, bookings: leads }).rows.map((r) => [r.id, r]));
  assert.equal(by.cpl.static, true);
  assert.equal(by.cpl.display, "$16.25 (2 real leads)");
  assert.equal(by.cpl.lastUpdated.label, "Last updated Nov 21, 2026, 6:00 PM MT");
  assert.match(by.cpl.note, /^Spend \$32\.50: Google \$7\.00 \(entered by hand, 1 day\) \+ Meta \$25\.50 \(entered by hand, 2 days\)\./);
  assert.equal(S.staticLabel(by.cpl.label, by.cpl.static), "Cost per real lead *");
  const live = Object.fromEntries(report({ campaigns: CAMPAIGNS, bookings: leads, ga: gaOk(), meta: { ok: true, configured: true, total: 50 } }).rows.map((r) => [r.id, r]));
  assert.equal(live.cpl.static, false); assert.equal(live.cpl.lastUpdated, null);
  assert.equal(live.cpl.display, "$45.00 (2 real leads)");
  assert.match(live.cpl.note, /Google \$40\.00 \(live from Google Ads\) \+ Meta \$50\.00 \(live from Meta\)/);
  assert.equal(S.staticLabel(live.cpl.label, live.cpl.static), "Cost per real lead");
  assert.equal(live.cac.display, "No new paid starts yet");
});

// ───────── Meta ─────────
test("Meta switch: on only when META_ADS_TOKEN and META_AD_ACCOUNT_ID are both set and well-formed", () => {
  assert.equal(Meta.metaConfigured({}), false);
  assert.equal(Meta.metaConfigured({ META_ADS_TOKEN: "t" }), false);
  assert.equal(Meta.metaConfigured({ META_AD_ACCOUNT_ID: "act_123456" }), false);
  assert.equal(Meta.metaConfigured({ META_ADS_TOKEN: "t", META_AD_ACCOUNT_ID: "not-an-id" }), false);
  assert.deepEqual(Meta.metaEnv({ META_ADS_TOKEN: " t ", META_AD_ACCOUNT_ID: "123456" }), { token: "t", accountId: "act_123456" });
  assert.equal(Meta.metaEnv({ META_ADS_TOKEN: "t", META_AD_ACCOUNT_ID: "act_123456" }).accountId, "act_123456");
});

test("Meta spend read: GET insights with the token in the header only, pages followed, cached 5 minutes", async () => {
  const TOKEN = "EAAB-secret-token";
  const calls = [];
  const fetchFn = async (url, opts) => {
    calls.push({ url, opts });
    if (!url.includes("after=")) return { ok: true, status: 200, json: async () => ({ data: [{ campaign_name: "H-13 home", spend: "12.30" }, { campaign_name: "Retarget", spend: "1.20" }], paging: { next: `https://graph.facebook.com/v23.0/act_1234/insights?access_token=${TOKEN}&after=abc` } }) };
    return { ok: true, status: 200, json: async () => ({ data: [{ campaign_name: "H-13 home", spend: "0.50" }] }) };
  };
  Meta._cache.clear();
  const r = await Meta.fetchMetaSpend({ token: TOKEN, accountId: "1234", from: "2026-11-01", to: "2026-11-25", fetchFn, nowMs: NOW });
  assert.deepEqual(r, { ok: true, readMs: NOW, total: 14, byCampaign: { "H-13 home": 12.8, Retarget: 1.2 } });
  assert.equal(calls.length, 2);
  for (const c of calls) {
    assert.equal(c.opts.method, "GET");
    assert.equal(c.opts.headers.Authorization, `Bearer ${TOKEN}`);
    assert.ok(!c.url.includes(TOKEN), "token leaked into a URL");
  }
  assert.match(calls[0].url, /^https:\/\/graph\.facebook\.com\/v23\.0\/act_1234\/insights\?level=campaign&fields=campaign_name%2Cspend&time_range=/);
  assert.ok(decodeURIComponent(calls[0].url).includes('{"since":"2026-11-01","until":"2026-11-25"}'));
  await Meta.fetchMetaSpend({ token: TOKEN, accountId: "1234", from: "2026-11-01", to: "2026-11-25", fetchFn, nowMs: NOW + 60000 });
  assert.equal(calls.length, 2, "served from cache");
  await Meta.fetchMetaSpend({ token: TOKEN, accountId: "1234", from: "2026-11-01", to: "2026-11-25", fetchFn, nowMs: NOW + Meta.CACHE_MS + 1 });
  assert.equal(calls.length, 4, "cache expired");
  Meta._cache.clear();
});

test("Meta errors fall back with a reason that never contains the token", async () => {
  const TOKEN = "EAAB-secret-token";
  const bad = await Meta.fetchMetaSpend({ token: TOKEN, accountId: "act_99999", from: "2026-11-01", to: "2026-11-02", useCache: false,
    fetchFn: async () => ({ ok: false, status: 400, json: async () => ({ error: { message: `Invalid OAuth access token - ${TOKEN} (access_token=${TOKEN})` } }) }) });
  assert.equal(bad.ok, false);
  assert.ok(!bad.reason.includes(TOKEN)); assert.match(bad.reason, /^Meta spend could not be read: /);
  const thrown = await Meta.fetchMetaSpend({ token: TOKEN, accountId: "act_99999", from: "a", to: "b", useCache: false, fetchFn: async () => { throw new Error("network down"); } });
  assert.equal(thrown.reason, "Meta spend could not be read: network down");
  const off = await Meta.fetchMetaSpend({ token: "", accountId: "act_99999", from: "a", to: "b" });
  assert.match(off.reason, /META_ADS_TOKEN and META_AD_ACCOUNT_ID/);
});

test("admin-metrics liveSources: no network without keys; Meta read only when both vars are set", async () => {
  const { _test } = require("../netlify/functions/admin-metrics");
  let n = 0;
  const none = await _test.liveSources({ range: { from: "2026-11-01", to: "2026-11-25" }, paidCampaigns: [], env: {}, fetchFn: async () => { n++; throw new Error("no"); } });
  assert.equal(n, 0); assert.equal(none.ga.ok, false); assert.equal(none.meta.configured, false);
  const future = await _test.liveSources({ range: null, env: {} });
  assert.equal(future.ga.reason, "This period hasn't started yet.");
  Meta._cache.clear();
  const urls = [];
  const fetchFn = async (url) => { urls.push(url); return { ok: true, status: 200, json: async () => ({ data: [{ campaign_name: "x", spend: "3" }] }) }; };
  const m = await _test.liveSources({ range: { from: "2026-11-01", to: "2026-11-25" }, paidCampaigns: [], env: { META_ADS_TOKEN: "tok", META_AD_ACCOUNT_ID: "act_555" }, fetchFn });
  assert.equal(m.meta.ok, true); assert.equal(m.meta.total, 3); assert.equal(m.meta.byCampaign, undefined);
  assert.ok(urls.every((u) => u.startsWith("https://graph.facebook.com/")));
  Meta._cache.clear();
  assert.deepEqual(_test.paidCampaignTags(cfg(), [{ channel: "Meta", utmCampaign: "H13_X" }, { channel: "KSL", utmCampaign: "ksl1" }]).sort(), ["30d_home_v1", "h13_x"]);
});

// ───────── Static values ─────────
test("static rows: renewal touch and reply time stay, carry ' *', and show the server-stamped Last updated", () => {
  const save = S.saveStatic({ values: {} }, "renewal_touch", { value: " 1 of 1 on time ", note: "1 <check-in> sent Dec 1" }, { nowIso: "2026-12-01T17:05:00.000Z" });
  assert.deepEqual(save.doc.values.renewal_touch, { value: "1 of 1 on time", note: "1 check-in sent Dec 1", updatedAt: "2026-12-01T17:05:00.000Z" });
  assert.equal(save.doc.updatedAt, "2026-12-01T17:05:00.000Z");
  assert.deepEqual(S.saveStatic({}, "paying_rentals", { value: "9" }), { error: "That metric can't be edited here." });
  assert.deepEqual(S.saveStatic({}, "reply_time", { value: "  " }), { error: "Enter a value." });
  assert.equal(S.saveStatic({}, "reply_time", { value: "x".repeat(200) }).doc.values.reply_time.value.length, 80);
  const pub = S.publicValues(save.doc);
  assert.equal(pub.renewal_touch.lastUpdated.label, "Last updated Dec 1, 2026, 10:05 AM MT");
  assert.equal(pub.reply_time.lastUpdated, null);
  const by = Object.fromEntries(report({ staticValues: pub }).rows.map((r) => [r.id, r]));
  assert.equal(by.renewal_touch.display, "1 of 1 on time");
  assert.equal(by.renewal_touch.lastUpdated.label, "Last updated Dec 1, 2026, 10:05 AM MT");
  assert.equal(by.renewal_touch.editable, true); assert.equal(by.renewal_touch.static, true);
  assert.equal(S.staticLabel(by.renewal_touch.label, true), "Renewal touch on time *");
  assert.equal(by.reply_time.display, "Not entered yet");
  // Live rows never get the asterisk.
  assert.equal(by.paying_rentals.static, false);
  assert.equal(S.staticLabel("Paying rentals on rent (North Star)", false), "Paying rentals on rent (North Star)");
});

test("targets config is static with a stored Last updated; every report carries the exact footnote", () => {
  const r = report();
  assert.equal(r.staticFootnote, FOOT);
  assert.equal(r.config.static, true);
  assert.match(r.config.lastUpdated.label, /^Last updated [A-Z][a-z]{2} \d{1,2}, \d{4}, \d{1,2}:\d{2} [AP]M MT$/);
  assert.ok(!Number.isNaN(Date.parse(realConfig.updatedAt)));
});

const FN = path.join(__dirname, "..", "netlify", "functions");
function loadWith(file, stubs) {
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
  try { const f = path.join(FN, file); delete require.cache[f]; return require(f); } finally { Module._load = orig; }
}
const realAdmin = require("../netlify/functions/_lib/admin");

test("/api/admin/metrics-static: 401 without auth; saves stamp the server time; unknown ids rejected", async () => {
  let doc = { id: "staticMetrics", values: {} };
  const writes = [];
  const storage = { getStaticMetrics: async () => doc, setStaticMetrics: async (d) => { writes.push(d); doc = d; return d; } };
  const denied = loadWith("admin-metrics-static.js", { "_lib/storage": storage });
  assert.equal((await denied.handler({ httpMethod: "POST", headers: {}, body: "{}" }, {})).statusCode, 401);
  const { handler } = loadWith("admin-metrics-static.js", { "_lib/storage": storage, "_lib/admin": { ...realAdmin, requireAuth: async () => null } });
  const before = Date.now();
  const res = await handler({ httpMethod: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ id: "reply_time", value: "3.5 hours median", note: "From hello@, Nov 18 to 24", updatedAt: "1999-01-01T00:00:00Z" }) }, {});
  assert.equal(res.statusCode, 200);
  assert.equal(writes.length, 1);
  const at = Date.parse(writes[0].values.reply_time.updatedAt);
  assert.ok(at >= before && at <= Date.now(), "stamped by the server, not the request");
  assert.match(JSON.parse(res.body).values.reply_time.lastUpdated.label, /^Last updated .+ MT$/);
  const bad = await handler({ httpMethod: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ id: "mrr", value: "1" }) }, {});
  assert.equal(bad.statusCode, 400); assert.equal(writes.length, 1);
  assert.equal((await handler({ httpMethod: "DELETE", headers: {} }, {})).statusCode, 405);
  const get = await handler({ httpMethod: "GET", headers: {} }, {});
  assert.equal(JSON.parse(get.body).values.reply_time.value, "3.5 hours median");
});

// ───────── Leads by Campaign spend ─────────
const LROWS = [
  { id: "cmp_g", name: "Google search", utmCampaign: "g_search", channel: "Google", owner: "Demand Gen", start: "2026-11-01", end: null, spendSource: "manual", portalTag: "campaign-g-search",
    adsCampaignName: "Utah Search", spend: [{ day: "2026-11-20", amount: 5, enteredAt: "2026-11-20T16:00:00Z" }], createdAt: "2026-11-01T16:00:00Z" },
  { id: "cmp_m", name: "H-13", utmCampaign: "30d_home_v1", channel: "Meta", owner: "Demand Gen", start: "2026-11-01", end: null, spendSource: "manual", portalTag: "campaign-30d-home-v1",
    spend: [{ day: "2026-11-21", amount: 9.5, enteredAt: "2026-11-21T23:30:00Z" }], createdAt: "2026-11-01T16:00:00Z" },
];
const leadsReport = (liveSpend) => L.buildCampaignReport({ bookings: [], waitlist: [], customers: [], contacts: [], campaigns: LROWS, subs: [], stripe: { configured: false },
  nowMs: NOW, from: "2026-11-01", to: "2026-11-25", config: cfg(), liveSpend });

test("Leads by Campaign: ad platform campaign name reads spend live; rows without one stay static with Last updated", () => {
  const r = leadsReport({ google: { ok: true, byCampaign: { "utah search": 31.25, Brand: 8.75 } }, meta: null });
  const g = r.groups.find((x) => x.campaignId === "cmp_g"), m = r.groups.find((x) => x.campaignId === "cmp_m");
  assert.equal(g.spendDisplay, "$31.25 (live from Google Ads)"); assert.equal(g.spendStatic, false); assert.equal(g.spendUpdated, null);
  assert.equal(m.spendDisplay, "$9.50 (1 day entered)"); assert.equal(m.spendStatic, true);
  assert.equal(m.spendUpdated.label, "Last updated Nov 21, 2026, 4:30 PM MT");
  assert.equal(r.staticFootnote, FOOT);
  // GA down → the Google row falls back to its hand-entered days.
  const down = leadsReport({ google: { ok: false, reason: "x" } }).groups.find((x) => x.campaignId === "cmp_g");
  assert.equal(down.spendDisplay, "$5.00 (1 day entered)"); assert.equal(down.spendStatic, true);
  // No live input at all (the existing behaviour) is unchanged.
  assert.equal(leadsReport(undefined).groups.find((x) => x.campaignId === "cmp_g").spendDisplay, "$5.00 (1 day entered)");
  // Meta live by name.
  const rows2 = LROWS.map((x) => (x.id === "cmp_m" ? { ...x, adsCampaignName: "H-13 home" } : x));
  const mr = L.buildCampaignReport({ bookings: [], waitlist: [], customers: [], contacts: [], campaigns: rows2, subs: [], stripe: { configured: false }, nowMs: NOW, from: "2026-11-01", to: "2026-11-25", config: cfg(),
    liveSpend: { meta: { ok: true, byCampaign: { "H-13 home": 12.8 } } } }).groups.find((x) => x.campaignId === "cmp_m");
  assert.equal(mr.spendDisplay, "$12.80 (live from Meta)"); assert.equal(mr.cplDisplay, "No real leads yet");
});

test("campaign list: optional ad platform campaign name, Meta/Google only, isolated from grouping; rows show Last updated", () => {
  const add = L.newCampaign({ name: "G", utmCampaign: "g1", channel: "Google", owner: "DG", start: "2026-11-26", adsCampaignName: " Utah <Search> " }, [], { nowIso: "2026-11-25T20:00:00.000Z" });
  assert.equal(add.row.adsCampaignName, "Utah Search");
  assert.equal(L.newCampaign({ name: "K", utmCampaign: "k1", channel: "KSL", owner: "DG", start: "2026-11-26" }, []).row.adsCampaignName, null);
  const set = L.setAdsName(LROWS, "cmp_m", "H-13 home", { nowIso: "2026-11-25T21:00:00.000Z" });
  assert.equal(set.rows.find((r) => r.id === "cmp_m").adsCampaignName, "H-13 home");
  assert.equal(L.setAdsName(LROWS, "cmp_m", "  ").rows.find((r) => r.id === "cmp_m").adsCampaignName, null);
  assert.deepEqual(L.setAdsName([{ id: "k", channel: "KSL" }], "k", "x"), { error: "Only Meta and Google campaigns have an ad platform campaign name." });
  assert.deepEqual(L.setAdsName(LROWS, "nope", "x"), { error: "Campaign not found." });
  const pub = L.publicRow(set.rows.find((r) => r.id === "cmp_m"));
  assert.equal(pub.adsCampaignName, "H-13 home");
  assert.equal(pub.lastUpdated.label, "Last updated Nov 25, 2026, 2:00 PM MT");
  // Grouping ignores the ad name: same attribution with or without it.
  const rec = [{ kind: "booking", at: "2026-11-22T18:00:00Z", raw: { createdAt: "2026-11-22T18:00:00Z", leadSource: { utmCampaign: "30d_home_v1" } } }];
  assert.deepEqual(L.attribute(rec, set.rows, Date.parse(realConfig.leadSourceCutoff)), L.attribute(rec, LROWS, Date.parse(realConfig.leadSourceCutoff)));
});

test("admin-campaigns: ads_name action saves through the list; admin-campaign-leads asks GA only when a Google row has a name", async () => {
  let rows = LROWS.map((r) => ({ ...r }));
  const storage = { getCampaignList: async () => rows, setCampaignList: async (r) => { rows = r; return r; } };
  const { handler } = loadWith("admin-campaigns.js", { "_lib/storage": storage, "_lib/admin": { ...realAdmin, requireAuth: async () => null } });
  const res = await handler({ httpMethod: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "ads_name", id: "cmp_m", adsCampaignName: "H-13 home" }) }, {});
  assert.equal(res.statusCode, 200);
  assert.equal(rows.find((r) => r.id === "cmp_m").adsCampaignName, "H-13 home");
  const { _test } = require("../netlify/functions/admin-campaign-leads");
  let n = 0;
  const none = await _test.liveSpend([{ channel: "Meta", adsCampaignName: "x" }], { from: "2026-11-01", to: "2026-11-25" }, { env: {}, fetchFn: async () => { n++; } });
  assert.equal(n, 0); assert.deepEqual(none, { google: null, meta: null });
  const orig = console.error; console.error = () => {};
  try {
    const g = await _test.liveSpend(LROWS, { from: "2026-11-01", to: "2026-11-25" }, { env: {}, fetchFn: async () => { n++; } });
    assert.equal(g.google.ok, false); assert.equal(n, 0);
  } finally { console.error = orig; }
});

// ───────── admin.html ─────────
test("admin.html: asterisk, footnote, Last updated, static editor, MT stamp on Analytics & Data; no portal log buttons", () => {
  const html = fs.readFileSync(path.join(__dirname, "..", "admin.html"), "utf8");
  assert.match(html, /function mxLabel\(r\) \{ return r\.static \? r\.label \+ ' \*' : r\.label; \}/);
  assert.match(html, /<p class="mx-static-foot" id="mxStaticFoot"><\/p>/);
  assert.ok(html.includes(`<p class="mx-static-foot" id="lcStaticFoot">${FOOT}</p>`));
  assert.match(html, /mxStamp\(r\.lastUpdated\)/);
  assert.match(html, /'\/api\/admin\/metrics-static', \{ method: 'POST'/);
  assert.match(html, /timeZone: 'America\/Denver', month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' \}\) \+ ' MT'/);
  assert.match(html, /' · Last updated ' \+ escape\(when\)/);
  assert.doesNotMatch(html, /' · updated ' \+ escape\(when\)/);
  assert.doesNotMatch(html, /Google Analytics and ads are not connected on this tab yet/);
  assert.match(html, /<h3 class="inv-heading">Campaign list \*<\/h3>/);
  assert.match(html, /name="adsCampaignName"/);
  for (const gone of ["Log renewal check-in", "Log first reply", "firstContactedAt"]) assert.ok(!html.includes(gone), gone);
  for (const f of fs.readdirSync(FN).filter((x) => x.endsWith(".js"))) assert.ok(!fs.readFileSync(path.join(FN, f), "utf8").includes("firstContactedAt"), f);
  // Nothing new goes into browser storage.
  const metricsJs = html.slice(html.indexOf("function mxLabel"), html.indexOf("async function loadTraffic"));
  assert.doesNotMatch(metricsJs, /localStorage|sessionStorage|document\.cookie/);
});

test("GA panel caches are about 5 minutes; netlify.toml routes the static endpoint", () => {
  for (const f of ["admin-ga-traffic.js", "admin-ga-funnel.js"]) assert.match(fs.readFileSync(path.join(FN, f), "utf8"), /const CACHE_MS = 5 \* 60 \* 1000;/, f);
  const toml = fs.readFileSync(path.join(__dirname, "..", "netlify.toml"), "utf8");
  assert.match(toml, /from = "\/api\/admin\/metrics-static"\n  to = "\/\.netlify\/functions\/admin-metrics-static"/);
});
