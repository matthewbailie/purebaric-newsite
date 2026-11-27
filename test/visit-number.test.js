// Visit-number clock (O&P contract event-contract-visit-number.md, 11:27 AM MT amendment).
// Client clock, buckets, privacy skips, form ls_* fields, and server allowlist.
// Fixtures only; no network.
const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");
const vm = require("vm");
const Module = require("module");

const SRC = fs.readFileSync(path.join(__dirname, "..", "pb-metrics.js"), "utf8");
const PZ_SRC = fs.readFileSync(path.join(__dirname, "..", "pb-personalize.js"), "utf8");
const LS = require("../netlify/functions/_lib/lead-source");
const analytics = require("../netlify/functions/_lib/analytics");

const FN = path.join(__dirname, "..", "netlify", "functions");
const DAY = 864e5;
const MIN = 60 * 1000;
const VN = ["1", "2", "3", "4-5", "6+"];
const DAYS = ["0", "1-3", "4-7", "8-30", "31+"];
const VISIT_EVENTS = [
  "booking_form_start",
  "booking_form_abandon",
  "booking_step1_save",
  "generate_lead",
  "booking_thank_you",
  "waitlist_join",
  "contact_submit",
  "contact_click",
  "pz_check",
];

function storage(init = {}) {
  const m = new Map(Object.entries(init));
  return {
    getItem: (k) => (m.has(k) ? m.get(k) : null),
    setItem: (k, v) => m.set(k, String(v)),
    removeItem: (k) => m.delete(k),
    dump: () => Object.fromEntries(m),
    has: (k) => m.has(k),
  };
}

function throwingStore() {
  const boom = () => { throw new Error("storage denied"); };
  return { getItem: boom, setItem: boom, removeItem: boom, dump: () => ({}), has: () => false };
}

function clock({ n = 1, c, u, v = 1, now = Date.now() } = {}) {
  return JSON.stringify({ v, n, c: c ?? now, u: u ?? now });
}

function browser({ nav = {}, win = {}, local = {}, session = {}, search = "", pathname = "/", referrer = "", width = 1280, throwStorage = false, now } = {}) {
  const scripts = [];
  const listeners = {};
  const docListeners = {};
  const RealDate = Date;
  const frozen = now;
  function FakeDate(...args) {
    if (!args.length) return new RealDate(frozen ?? RealDate.now());
    return new RealDate(...args);
  }
  FakeDate.now = () => (frozen != null ? frozen : RealDate.now());
  FakeDate.parse = RealDate.parse;
  FakeDate.UTC = RealDate.UTC;
  const DateCtor = frozen != null ? FakeDate : Date;
  const window = {
    navigator: { ...nav },
    localStorage: throwStorage ? throwingStore() : storage(local),
    sessionStorage: throwStorage ? throwingStore() : storage(session),
    location: { search, pathname, hostname: "purebaric.com" },
    innerWidth: width,
    innerHeight: 800,
    pageYOffset: 0,
    addEventListener: (t, fn) => { (listeners[t] = listeners[t] || []).push(fn); },
    document: {
      referrer,
      head: { appendChild: (s) => scripts.push(s.src) },
      createElement: () => ({}),
      documentElement: { scrollHeight: 4000, clientHeight: 800, clientWidth: width, scrollTop: 0 },
      body: { scrollHeight: 4000 },
      addEventListener: (t, fn) => { (docListeners[t] = docListeners[t] || []).push(fn); },
    },
    setTimeout: (fn) => { fn(); return 1; },
    clearTimeout: () => {},
    ...win,
  };
  const ctx = vm.createContext({
    window,
    document: window.document,
    URLSearchParams,
    URL,
    JSON,
    Date: DateCtor,
    Math,
    Promise,
    setTimeout: window.setTimeout,
    clearTimeout: () => {},
  });
  vm.runInContext(SRC, ctx);
  return { window, scripts, listeners, docListeners, now: DateCtor.now() };
}

function eventsOf(b, name) {
  return (b.window.dataLayer || [])
    .filter((a) => a[0] === "event" && a[1] === name)
    .map((a) => JSON.parse(JSON.stringify(a[2] || {})));
}

function fire(b, name, params) {
  const before = (b.window.dataLayer || []).length;
  b.window.trackPurebaricEvent(name, params || {});
  return (b.window.dataLayer || []).slice(before).filter((a) => a[0] === "event" && a[1] === name).map((a) => a[2] || {});
}

function readClock(b) {
  const raw = b.window.localStorage.getItem("pb_vn");
  return raw ? JSON.parse(raw) : null;
}

function formData(b, who = { name: "Jane Doe", email: "jane@example.com" }) {
  const data = new URLSearchParams();
  const internal = b.window.appendPurebaricLeadSource(data, who);
  return { data, internal, obj: Object.fromEntries(data) };
}

// ───────── clock: first visit, 30-minute rollover, in-window load ─────────
test("first load writes pb_vn n=1 and conversion events send visit_number=1, days_since_first_visit=0, def_v=1", () => {
  const t0 = Date.UTC(2026, 10, 27, 18, 0, 0);
  const b = browser({ now: t0 });
  const vn = readClock(b);
  assert.ok(vn);
  assert.equal(vn.v, 1);
  assert.equal(vn.n, 1);
  assert.equal(vn.c, t0);
  assert.equal(vn.u, t0);
  assert.equal(b.window.sessionStorage.getItem("pb_vn"), null, "never uses sessionStorage for the clock");
  const params = fire(b, "generate_lead")[0];
  assert.equal(params.visit_number, "1");
  assert.equal(params.days_since_first_visit, "0");
  assert.equal(params.def_v, 1);
  assert.equal(typeof params.visit_number, "string");
  assert.equal(typeof params.days_since_first_visit, "string");
  assert.ok(!("n" in params) && !("c" in params) && !("u" in params), "raw counters never go out");
});

test("a load inside 30 minutes does not increment n; only u is bumped", () => {
  const t0 = Date.UTC(2026, 10, 27, 18, 0, 0);
  const first = browser({ now: t0 });
  const later = t0 + 29 * MIN + 55 * 1000;
  const b = browser({ now: later, local: first.window.localStorage.dump() });
  const vn = readClock(b);
  assert.equal(vn.n, 1);
  assert.equal(vn.c, t0, "first-visit time is unchanged");
  assert.equal(vn.u, later, "last activity is bumped");
  assert.equal(fire(b, "contact_submit")[0].visit_number, "1");
});

test("a load at or after a 30-minute idle gap increments n (visit 2, then 3)", () => {
  const t0 = Date.UTC(2026, 10, 27, 18, 0, 0);
  const first = browser({ now: t0 });
  const t1 = t0 + 30 * MIN;
  const second = browser({ now: t1, local: first.window.localStorage.dump() });
  assert.equal(readClock(second).n, 2);
  assert.equal(readClock(second).c, t0);
  assert.equal(fire(second, "waitlist_join")[0].visit_number, "2");

  const t2 = t1 + 30 * MIN;
  const third = browser({ now: t2, local: second.window.localStorage.dump() });
  assert.equal(readClock(third).n, 3);
  assert.equal(fire(third, "booking_thank_you")[0].visit_number, "3");
});

test("exactly 30 minutes idle is a new visit; 29 minutes 59 seconds is not", () => {
  const t0 = Date.UTC(2026, 10, 27, 18, 0, 0);
  const seed = { local: { pb_vn: clock({ n: 2, c: t0, u: t0, now: t0 }) } };
  const under = browser({ ...seed, now: t0 + 30 * MIN - 1 });
  assert.equal(readClock(under).n, 2);
  const at = browser({ ...seed, now: t0 + 30 * MIN });
  assert.equal(readClock(at).n, 3);
});

// ───────── 90-day expiry ─────────
test("a clock older than 90 days (from first visit c) resets to n=1 with a fresh c", () => {
  const t0 = Date.UTC(2026, 7, 1, 12, 0, 0);
  const now = t0 + 91 * DAY;
  // last activity was recent, but c is 91 days old — the window still expires
  const b = browser({
    now,
    local: { pb_vn: clock({ n: 8, c: t0, u: now - 5 * MIN, now }) },
  });
  const vn = readClock(b);
  assert.equal(vn.n, 1);
  assert.equal(vn.c, now, "fresh first-visit time");
  assert.equal(vn.u, now);
  assert.equal(fire(b, "generate_lead")[0].visit_number, "1");
  assert.equal(fire(b, "generate_lead")[0].days_since_first_visit, "0");
});

test("a clock at exactly 90 days is kept; one millisecond past 90 days resets", () => {
  const t0 = Date.UTC(2026, 8, 1, 0, 0, 0);
  const at = browser({ now: t0 + 90 * DAY, local: { pb_vn: clock({ n: 4, c: t0, u: t0 + 90 * DAY - MIN, now: t0 }) } });
  assert.equal(readClock(at).n, 4, "exactly 90 days is not expired (same rule as pb_ft)");
  assert.equal(readClock(at).c, t0);
  const past = browser({ now: t0 + 90 * DAY + 1, local: { pb_vn: clock({ n: 4, c: t0, u: t0 + 90 * DAY, now: t0 }) } });
  assert.equal(readClock(past).n, 1);
  assert.equal(readClock(past).c, t0 + 90 * DAY + 1);
});

// ───────── bucket boundaries ─────────
test("visit_number bucket boundaries: 1, 2, 3, 4-5, 6+", () => {
  const t0 = Date.UTC(2026, 10, 27, 18, 0, 0);
  const cases = [
    [1, "1"],
    [2, "2"],
    [3, "3"],
    [4, "4-5"],
    [5, "4-5"],
    [6, "6+"],
    [7, "6+"],
    [20, "6+"],
  ];
  for (const [n, bucket] of cases) {
    const b = browser({ now: t0, local: { pb_vn: clock({ n, c: t0, u: t0 }) } });
    assert.equal(readClock(b).n, n, `n=${n} is not incremented inside the window`);
    assert.equal(fire(b, "contact_submit")[0].visit_number, bucket, `n=${n}`);
  }
});

test("days_since_first_visit bucket boundaries: 0, 1-3, 4-7, 8-30, 31+", () => {
  const now = Date.UTC(2026, 10, 27, 18, 0, 0);
  const cases = [
    [0, "0"],
    [1, "1-3"],
    [3, "1-3"],
    [4, "4-7"],
    [7, "4-7"],
    [8, "8-30"],
    [30, "8-30"],
    [31, "31+"],
    [90, "31+"],
  ];
  for (const [days, bucket] of cases) {
    const c = now - days * DAY;
    const b = browser({ now, local: { pb_vn: clock({ n: 2, c, u: now }) } });
    assert.equal(fire(b, "booking_form_start")[0].days_since_first_visit, bucket, `days=${days}`);
    assert.equal(typeof fire(b, "booking_form_start")[0].days_since_first_visit, "string");
  }
});

// ───────── privacy: send nothing, write no key, erase an existing clock ─────────
for (const [label, opts] of [
  ["GPC", { nav: { globalPrivacyControl: true } }],
  ["DNT", { nav: { doNotTrack: "1" } }],
  ["window DNT", { win: { doNotTrack: "1" } }],
  ["/privacy opt-out", { local: { pb_cookie: "decline" } }],
  ["legacy opt-out", { local: { purebaric_cookie_consent: "declined" } }],
  ["personalization opt-out pb_pz_off", { local: { pb_pz_off: "1" } }],
  ["internal flag", { local: { pb_internal: "1" } }],
  ["?internal=1", { search: "?internal=1" }],
]) {
  test(`${label}: no visit params are sent and no pb_vn key is written (existing clock is erased)`, () => {
    const t0 = Date.UTC(2026, 10, 27, 18, 0, 0);
    const existing = clock({ n: 4, c: t0 - DAY, u: t0 - MIN, now: t0 });
    const b = browser({ now: t0, ...opts, local: { ...(opts.local || {}), pb_vn: existing } });
    assert.equal(b.window.localStorage.getItem("pb_vn"), null, "pb_vn erased");
    assert.equal(b.window.sessionStorage.getItem("pb_vn"), null);
    const sent = fire(b, "generate_lead", { value: 1 })[0];
    if (label === "personalization opt-out pb_pz_off") {
      // Tags still load; the event fires, but visit fields are omitted.
      assert.ok(sent);
      assert.equal(sent.visit_number, undefined);
      assert.equal(sent.days_since_first_visit, undefined);
    } else {
      assert.equal(sent, undefined, "blocked visitors send no event");
    }
    const { data } = formData(b);
    assert.equal(data.get("ls_visit_number"), null);
    assert.equal(data.get("ls_days_since_first_visit"), null);
  });
}

test("declining on /privacy erases a pb_vn clock written this page view", () => {
  const b = browser();
  assert.ok(b.window.localStorage.getItem("pb_vn"));
  b.window.declinePurebaricAnalytics();
  assert.equal(b.window.localStorage.getItem("pb_vn"), null);
  assert.equal(fire(b, "contact_submit")[0], undefined);
});

// ───────── p.n / personalization untouched ─────────
test("pb-metrics never changes pb_pz or p.n; personalization source is untouched", () => {
  const now = Date.UTC(2026, 10, 27, 18, 0, 0);
  const profile = { v: 1, g: "p", n: 7, c: now - 3 * DAY, ss: now - 3 * DAY, u: now - MIN };
  const raw = JSON.stringify(profile);
  const b = browser({ now, local: { pb_pz: raw } });
  fire(b, "pz_check", { qualified: "yes" });
  fire(b, "generate_lead");
  formData(b);
  assert.equal(b.window.localStorage.getItem("pb_pz"), raw, "pb_pz JSON is byte-for-byte unchanged");
  assert.equal(JSON.parse(b.window.localStorage.getItem("pb_pz")).n, 7);
  assert.doesNotMatch(SRC, /localStorage\)?, ['"]pb_pz['"]/);
  assert.doesNotMatch(SRC, /['"]pb_pz['"]\s*,/);
  assert.equal(PZ_SRC, fs.readFileSync(path.join(__dirname, "..", "pb-personalize.js"), "utf8"));
});

// ───────── event attachment ─────────
test("trackPurebaricEvent and funnelParams attach buckets on every listed conversion event, contact_click and pz_check", () => {
  const t0 = Date.UTC(2026, 10, 27, 18, 0, 0);
  const b = browser({ now: t0, local: { pb_vn: clock({ n: 5, c: t0 - 10 * DAY, u: t0 }) } });
  const fp = b.window.PBMetrics.funnelParams({ source: "book_page" });
  assert.equal(fp.visit_number, "4-5");
  assert.equal(fp.days_since_first_visit, "8-30");
  assert.equal(fp.def_v, 1);
  assert.equal(fp.device, "desktop");
  assert.equal(fp.source, "book_page");
  for (const name of VISIT_EVENTS) {
    const ev = fire(b, name, { foo: "bar" })[0];
    assert.equal(ev.visit_number, "4-5", name);
    assert.equal(ev.days_since_first_visit, "8-30", name);
    assert.equal(ev.foo, "bar", name);
    assert.equal(typeof ev.visit_number, "string", name);
  }
});

test("funnelParams and trackPurebaricEvent do not overwrite an existing def_v (book-funnel stays at 2)", () => {
  const b = browser();
  const fp = b.window.PBMetrics.funnelParams({ def_v: 2, form_id: "leadForm" });
  assert.equal(fp.def_v, 2);
  assert.equal(fp.visit_number, "1");
  const ev = fire(b, "booking_form_start", { def_v: 2, first_field: "zip_code" })[0];
  assert.equal(ev.def_v, 2);
  assert.equal(ev.visit_number, "1");
});

test("test_traffic still attaches as it does today, alongside the visit buckets", () => {
  const b = browser({ search: "?pbtest=1" });
  const ev = fire(b, "contact_click", { method: "tel", source: "book", page_path: "/book", def_v: 1, test_traffic: 1 })[0];
  assert.equal(ev.test_traffic, 1);
  assert.equal(ev.visit_number, "1");
  assert.equal(ev.def_v, 1);
});

test("unlisted events do not pick up visit buckets from trackPurebaricEvent when they skip funnelParams", () => {
  const b = browser();
  const ev = fire(b, "service_area_check", { in_area: true })[0];
  assert.equal(ev.visit_number, undefined);
  assert.equal(ev.days_since_first_visit, undefined);
  assert.equal(ev.in_area, true);
});

// ───────── form posts ─────────
test("appendPurebaricLeadSource sends ls_* as the same bucket strings when capture is allowed, never raw counters", () => {
  const t0 = Date.UTC(2026, 10, 27, 18, 0, 0);
  const b = browser({ now: t0 + 12 * DAY, local: { pb_vn: clock({ n: 6, c: t0, u: t0 + 12 * DAY }) } });
  const { data, internal } = formData(b);
  assert.equal(internal, false);
  assert.equal(data.get("ls_visit_number"), "6+");
  assert.equal(data.get("ls_days_since_first_visit"), "8-30");
  const blob = data.toString();
  assert.match(blob, /ls_visit_number=6(?:\+|%2B)/);
  assert.doesNotMatch(blob, /ls_visit_number=6(?:&|$)/);
  assert.doesNotMatch(blob, new RegExp(String(t0)));
  assert.equal(data.get("n"), null);
  assert.equal(data.get("c"), null);
  assert.equal(data.get("u"), null);
});

test("form posts omit ls_visit_number and ls_days_since_first_visit when capture is not allowed", () => {
  for (const opts of [
    { nav: { globalPrivacyControl: true } },
    { nav: { doNotTrack: "1" } },
    { local: { pb_cookie: "decline" } },
    { local: { pb_pz_off: "1" } },
    { search: "?internal=1" },
  ]) {
    const b = browser(opts);
    const { data } = formData(b);
    assert.equal(data.get("ls_visit_number"), null, JSON.stringify(opts));
    assert.equal(data.get("ls_days_since_first_visit"), null, JSON.stringify(opts));
  }
});

// ───────── empty / no-data / corrupt paths ─────────
test("corrupt, wrong-version and incomplete pb_vn clocks are treated as a new visit (n=1)", () => {
  const t0 = Date.UTC(2026, 10, 27, 18, 0, 0);
  for (const raw of [
    "{not json",
    JSON.stringify({ v: 2, n: 9, c: t0, u: t0 }),
    JSON.stringify({ v: 1 }),
    JSON.stringify({ v: 1, n: "2", c: t0, u: t0 }),
    JSON.stringify({ v: 1, n: 3, c: "2026-11-01T00:00:00.000Z", u: t0 }),
    "null",
    "",
  ]) {
    const local = raw === "" ? {} : { pb_vn: raw };
    const b = browser({ now: t0, local });
    const vn = readClock(b);
    assert.ok(vn, `should start a fresh clock for ${raw}`);
    assert.equal(vn.n, 1, raw);
    assert.equal(vn.v, 1);
    assert.equal(vn.c, t0);
    assert.equal(fire(b, "generate_lead")[0].visit_number, "1");
  }
});

test("when localStorage throws, no pb_vn key is written to sessionStorage and events omit visit params", () => {
  const b = browser({ throwStorage: true });
  assert.equal(fire(b, "generate_lead")[0].visit_number, undefined);
  assert.equal(fire(b, "generate_lead")[0].days_since_first_visit, undefined);
  const { data } = formData(b);
  assert.equal(data.get("ls_visit_number"), null);
  assert.equal(data.get("ls_days_since_first_visit"), null);
});

test("an empty append (no clock, capture somehow empty) omits ls_* rather than sending blanks", () => {
  // pb_pz_off leaves tags on but capture off: already covered. This asserts
  // lead-source cleaning of empty strings does not invent a stored field.
  const fields = LS.leadSourceFields({ ls_visit_number: "", ls_days_since_first_visit: "" }, { name: "Jane", email: "jane@example.com" });
  assert.equal(fields.ls_visit_number, undefined);
  assert.equal(fields.ls_days_since_first_visit, undefined);
});

// ───────── server allowlist ─────────
test("lead-source allowlists bucket strings and drops bad values or raw integers", () => {
  const ok = LS.cleanLeadSource({ ls_visit_number: "4-5", ls_days_since_first_visit: "8-30" });
  assert.equal(ok.visitNumber, "4-5");
  assert.equal(ok.daysSinceFirstVisit, "8-30");
  const fields = LS.leadSourceFields({ ls_visit_number: "1", ls_days_since_first_visit: "0" }, { name: "Jane", email: "jane@example.com" });
  assert.equal(fields.ls_visit_number, "1");
  assert.equal(fields.ls_days_since_first_visit, "0");
  assert.equal(fields.internal, false);

  const dropped = [
    { ls_visit_number: "6" },
    { ls_visit_number: 6 },
    { ls_visit_number: "4" },
    { ls_visit_number: "5+" },
    { ls_visit_number: "7" },
    { ls_visit_number: "1-2" },
    { ls_days_since_first_visit: "8-14" },
    { ls_days_since_first_visit: "15-30" },
    { ls_days_since_first_visit: "31" },
    { ls_days_since_first_visit: "90" },
    { ls_days_since_first_visit: "2026-11-27T18:00:00.000Z" },
    { ls_visit_number: String(Date.UTC(2026, 10, 27)) },
    { ls_visit_number: "<script>" },
    { ls_days_since_first_visit: "4" },
    { ls_visit_number: " 4-5 " }, // trim keeps the allowlisted value — tested separately below
  ];
  // The last one with spaces should PASS after trim. Split it out.
  dropped.pop();
  for (const body of dropped) {
    const r = LS.cleanLeadSource(body);
    if ("ls_visit_number" in body) assert.equal(r.visitNumber, "", JSON.stringify(body));
    if ("ls_days_since_first_visit" in body) assert.equal(r.daysSinceFirstVisit, "", JSON.stringify(body));
    const f = LS.leadSourceFields(body, { name: "Jane", email: "j@example.com" });
    if ("ls_visit_number" in body) assert.equal(f.ls_visit_number, undefined, JSON.stringify(body));
    if ("ls_days_since_first_visit" in body) assert.equal(f.ls_days_since_first_visit, undefined, JSON.stringify(body));
  }
  const trimmed = LS.leadSourceFields({ ls_visit_number: " 4-5 ", ls_days_since_first_visit: " 31+ " }, { name: "Jane", email: "j@example.com" });
  assert.equal(trimmed.ls_visit_number, "4-5");
  assert.equal(trimmed.ls_days_since_first_visit, "31+");

  for (const v of VN) assert.equal(LS.cleanLeadSource({ ls_visit_number: v }).visitNumber, v);
  for (const v of DAYS) assert.equal(LS.cleanLeadSource({ ls_days_since_first_visit: v }).daysSinceFirstVisit, v);
});

// ───────── form handlers persist ls_* through leadSourceFields ─────────
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
  try {
    const file = path.join(FN, handlerFile);
    delete require.cache[file];
    return require(file);
  } finally {
    Module._load = orig;
  }
}
const form = (obj, headers = {}) => ({
  httpMethod: "POST",
  headers: { "content-type": "application/x-www-form-urlencoded", ...headers },
  body: new URLSearchParams(obj).toString(),
});

test("all four handlers store ls_* when capture sent allowlisted buckets, and omit them when it did not", async () => {
  const buckets = { ls_visit_number: "2", ls_days_since_first_visit: "1-3" };
  const sent = [];
  const db = new Map();
  const booking = loadWithStubs("booking-submit.js", {
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
      ...analytics,
      sendBookingLeadSubmitted: async ({ booking }) => { sent.push(["lead", booking]); return { sent: false }; },
      sendBookingRequestSubmitted: async ({ booking }) => { sent.push(["request", booking]); return { sent: false }; },
    },
  }).handler;
  const base = { lead_stage: "step1", "first-name": "Jane", "last-name": "Doe", customer_email: "jane@example.com", zip_code: "84043", rental_type: "residential" };
  let r = await booking(form({ ...base, ...buckets }));
  const lead = db.get(JSON.parse(r.body).id);
  assert.equal(lead.ls_visit_number, "2");
  assert.equal(lead.ls_days_since_first_visit, "1-3");

  // Step 2 without re-sending the buckets keeps the step-1 values.
  r = await booking(form({ "first-name": "Jane", "last-name": "Doe", customer_email: "jane@example.com", zip_code: "84043", lead_id: lead.id }));
  const conv = db.get(lead.id);
  assert.equal(conv.ls_visit_number, "2");
  assert.equal(conv.ls_days_since_first_visit, "1-3");

  // A post with no ls_* (opted out / old page) stores no visit fields.
  r = await booking(form({ ...base }));
  const bare = db.get(JSON.parse(r.body).id);
  assert.equal(bare.ls_visit_number, undefined);
  assert.equal(bare.ls_days_since_first_visit, undefined);

  // Bad values are dropped, not stored as raw integers.
  r = await booking(form({ ...base, ls_visit_number: "6", ls_days_since_first_visit: "15-30" }));
  const bad = db.get(JSON.parse(r.body).id);
  assert.equal(bad.ls_visit_number, undefined);
  assert.equal(bad.ls_days_since_first_visit, undefined);

  const saved = [];
  const wl = loadWithStubs("waitlist-join.js", {
    "_lib/storage": { createWaitlistEntry: async (d) => { saved.push(d); return { id: "w1", ...d }; }, addPromoSubscriber: async () => null },
    "_lib/email": { notifyAdminWaitlistJoin: async () => {} },
  }).handler;
  await wl(form({ first_name: "Jane", last_name: "Doe", email: "jane@example.com", ...buckets }));
  assert.equal(saved[0].ls_visit_number, "2");
  await wl(form({ first_name: "Jane", last_name: "Doe", email: "jane@example.com" }));
  assert.equal(saved[1].ls_visit_number, undefined);

  const aw = loadWithStubs("area-waitlist.js", {
    "_lib/storage": { createWaitlistEntry: async (d) => { saved.push(d); return { id: "w2", ...d }; } },
    "_lib/email": { notifyAdminWaitlistJoin: async () => {} },
  }).handler;
  await aw(form({ name: "Jane Doe", phone: "801", zip: "84043", ...buckets }));
  assert.equal(saved[2].ls_days_since_first_visit, "1-3");
  await aw(form({ name: "Jane Doe", phone: "801", zip: "84043" }));
  assert.equal(saved[3].ls_days_since_first_visit, undefined);

  const contacts = [];
  const cs = loadWithStubs("contact-submit.js", {
    "_lib/storage": { createContactMessage: async (d) => { const c = { id: "c1", ...d }; contacts.push(c); return c; } },
    "_lib/email": { send: async () => {} },
  }).handler;
  await cs(form({ name: "Scott B", email: "scott@example.com", message: "Hi", ...buckets }));
  assert.equal(contacts[0].ls_visit_number, "2");
  assert.equal(contacts[0].ls_days_since_first_visit, "1-3");
  await cs(form({ name: "Scott B", email: "scott@example.com", message: "Hi" }));
  assert.equal(contacts[1].ls_visit_number, undefined);
});

// ───────── analytics.js Measurement Protocol ─────────
test("booking_lead_submit and booking_request_submit include allowlisted visit buckets and omit missing or bad values; close_convert_lead never does", async () => {
  process.env.GA4_API_SECRET = "s";
  let request;
  global.fetch = async (url, options) => {
    request = { url: String(url), body: JSON.parse(options.body) };
    return { ok: true, status: 204 };
  };
  const base = { id: "booking-1", rentalLength: "4 months", rentalType: "residential", analytics: { consentGranted: true, clientId: "123.456", sessionId: "789" } };

  await analytics.sendBookingLeadSubmitted({ booking: { ...base, ls_visit_number: "4-5", ls_days_since_first_visit: "8-30" } });
  assert.equal(request.body.events[0].name, "booking_lead_submit");
  assert.equal(request.body.events[0].params.visit_number, "4-5");
  assert.equal(request.body.events[0].params.days_since_first_visit, "8-30");
  assert.equal(typeof request.body.events[0].params.visit_number, "string");

  await analytics.sendBookingRequestSubmitted({ booking: { ...base, ls_visit_number: "6+", ls_days_since_first_visit: "31+" } });
  assert.equal(request.body.events[0].name, "booking_request_submit");
  assert.equal(request.body.events[0].params.visit_number, "6+");
  assert.equal(request.body.events[0].params.days_since_first_visit, "31+");

  await analytics.sendBookingLeadSubmitted({ booking: base });
  assert.equal(request.body.events[0].params.visit_number, undefined);
  assert.equal(request.body.events[0].params.days_since_first_visit, undefined);

  await analytics.sendBookingRequestSubmitted({ booking: { ...base, ls_visit_number: 6, ls_days_since_first_visit: "15-30" } });
  assert.equal(request.body.events[0].params.visit_number, undefined);
  assert.equal(request.body.events[0].params.days_since_first_visit, undefined);

  await analytics.sendRentalConfirmed({
    booking: { ...base, ls_visit_number: "3", ls_days_since_first_visit: "1-3" },
    rental: { id: "rental-1", startDate: "2026-09-25", endDate: "2027-01-24", monthlyRate: 579 },
  });
  assert.equal(request.body.events[0].name, "close_convert_lead");
  assert.equal(request.body.events[0].params.visit_number, undefined);
  assert.equal(request.body.events[0].params.days_since_first_visit, undefined);
});
