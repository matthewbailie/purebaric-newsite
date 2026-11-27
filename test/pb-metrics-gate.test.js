// pb-metrics.js privacy gate, first-touch capture, internal suppression and the
// metrics.md section 2 hooks, run in a sandboxed fake browser.
const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const SRC = fs.readFileSync(path.join(__dirname, "..", "pb-metrics.js"), "utf8");

function storage(init = {}) {
  const m = new Map(Object.entries(init));
  return {
    getItem: (k) => (m.has(k) ? m.get(k) : null),
    setItem: (k, v) => m.set(k, String(v)),
    removeItem: (k) => m.delete(k),
    dump: () => Object.fromEntries(m),
  };
}

function throwingStore() {
  const boom = () => { throw new Error("storage denied"); };
  return { getItem: boom, setItem: boom, removeItem: boom };
}

function browser({ nav = {}, win = {}, local = {}, session = {}, search = "", pathname = "/", referrer = "", width = 1280, throwStorage = false } = {}) {
  const scripts = [];
  const listeners = {};
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
    },
    setTimeout: (fn) => { fn(); return 1; },
    clearTimeout: () => {},
    ...win,
  };
  const ctx = vm.createContext({ window, URLSearchParams, URL, JSON, Date, Math, Promise, setTimeout: window.setTimeout, clearTimeout: () => {} });
  vm.runInContext(SRC, ctx);
  return { window, scripts, listeners };
}

const loadedTags = (scripts) => ({
  ga: scripts.some((s) => /googletagmanager/.test(s)),
  meta: scripts.some((s) => /fbevents/.test(s)),
});

test("default visitor: GA4 and the Meta pixel both load", () => {
  const { scripts, window } = browser();
  assert.deepEqual(loadedTags(scripts), { ga: true, meta: true });
  assert.equal(window.PBMetrics.isBlocked(), false);
});

for (const [label, opts, reason] of [
  ["Global Privacy Control", { nav: { globalPrivacyControl: true } }, "gpc"],
  ["navigator.doNotTrack = 1", { nav: { doNotTrack: "1" } }, "dnt"],
  ["window.doNotTrack = 1", { win: { doNotTrack: "1" } }, "dnt"],
  ["/privacy opt-out", { local: { pb_cookie: "decline" } }, "opt_out"],
  ["legacy opt-out", { local: { purebaric_cookie_consent: "declined" } }, "opt_out"],
  ["internal flag (localStorage)", { local: { pb_internal: "1" } }, "internal"],
  ["?internal=1", { search: "?internal=1" }, "internal"],
]) {
  test(`${label}: neither tag loads, every tracking call is a no-op, nothing is captured`, () => {
    const b = browser({ ...opts, search: opts.search || "?utm_source=fb&utm_medium=paid&fbclid=AbC123&gclid=G1" });
    assert.deepEqual(loadedTags(b.scripts), { ga: false, meta: false });
    assert.equal(b.window.PBMetrics.blockReason(), reason);
    assert.equal(b.window.purebaricAnalyticsLoaded, undefined);
    assert.equal(b.window.purebaricMetaLoaded, undefined);
    const before = b.window.dataLayer.length;
    b.window.trackPurebaricEvent("booking_form_start", { a: 1 });
    b.window.gtag("event", "x");
    b.window.trackPurebaricMeta("Lead", { value: 1 });
    assert.equal(b.window.dataLayer.length, before, "no event queued");
    assert.equal(b.window.dataLayer.length, 0, "not even consent defaults are queued");
    assert.equal(b.window.localStorage.getItem("pb_ft"), null, "no first-touch capture");
    assert.equal(b.window.localStorage.getItem("pb_vn"), null, "no visit clock");
    assert.equal(b.window.sessionStorage.getItem("pb_gclid"), null, "no gclid capture");
    assert.equal(b.window.getPurebaricGclid(), "");
    const data = new URLSearchParams();
    b.window.appendPurebaricLeadSource(data, { name: "Jane Doe", email: "jane@example.com" });
    assert.equal(data.get("ls_utm_source"), null);
    assert.equal(data.get("pb_device"), null);
  });
}

test("?internal=1 persists in both storages; ?internal=0 clears it", () => {
  const a = browser({ search: "?internal=1" });
  assert.equal(a.window.localStorage.getItem("pb_internal"), "1");
  assert.equal(a.window.sessionStorage.getItem("pb_internal"), "1");
  const b = browser({ search: "?internal=0", local: { pb_internal: "1" }, session: { pb_internal: "1" } });
  assert.equal(b.window.localStorage.getItem("pb_internal"), null);
  assert.deepEqual(loadedTags(b.scripts), { ga: true, meta: true });
});

test("first touch: utm, click ids, external referrer (no query), landing path; first touch wins; no PII", () => {
  const b = browser({
    search: "?utm_source=fb&utm_medium=paid&utm_campaign=30d_home_v1&utm_content=sitting&utm_term=x&fbclid=AbC123&gclid=G1&email=a@b.com",
    pathname: "/book",
    referrer: "https://l.facebook.com/l.php?u=https%3A%2F%2Fpurebaric.com&h=secret",
  });
  const ft = JSON.parse(b.window.localStorage.getItem("pb_ft"));
  assert.equal(ft.s, "fb"); assert.equal(ft.m, "paid"); assert.equal(ft.c, "30d_home_v1");
  assert.equal(ft.ct, "sitting"); assert.equal(ft.t, "x");
  assert.equal(ft.fb, "AbC123"); assert.equal(ft.gc, "G1");
  assert.equal(ft.r, "https://l.facebook.com/l.php", "referrer query string is dropped");
  assert.equal(ft.l, "/book", "landing path has no query string");
  assert.ok(!JSON.stringify(ft).includes("a@b.com"), "other query params are never stored");
  const data = new URLSearchParams();
  const internal = b.window.appendPurebaricLeadSource(data, { firstName: "Jane", lastName: "Doe", email: "jane@example.com" });
  assert.equal(internal, false);
  assert.equal(data.get("ls_utm_source"), "fb");
  assert.equal(data.get("ls_fbclid"), "AbC123");
  assert.equal(data.get("ls_landing"), "/book");
  assert.equal(data.get("pb_internal"), null);
  assert.equal(data.get("pb_device"), "desktop");
  assert.equal(data.get("pb_variant"), "none");
  // A later visit keeps the first touch.
  const later = browser({ local: b.window.localStorage.dump(), search: "?utm_source=google" });
  assert.equal(JSON.parse(later.window.localStorage.getItem("pb_ft")).s, "fb");
});

test("first touch is skipped when personalization is turned off on /privacy; expires after 90 days", () => {
  const off = browser({ local: { pb_pz_off: "1" }, search: "?utm_source=fb" });
  assert.equal(off.window.localStorage.getItem("pb_ft"), null);
  const old = JSON.stringify({ v: 1, ts: new Date(Date.now() - 91 * 864e5).toISOString(), s: "old" });
  const b = browser({ local: { pb_ft: old }, search: "?utm_source=new" });
  assert.equal(JSON.parse(b.window.localStorage.getItem("pb_ft")).s, "new");
});

test("TEST names, test emails and the owner's email are internal: flagged and tracking stops", () => {
  for (const who of [
    { firstName: "TEST", lastName: "Booking", email: "x@example.com" },
    { name: "Jane test", email: "x@example.com" },
    { name: "Jane Doe", email: "test@example.com" },
    { name: "Jane Doe", email: "jane+test1@example.com" },
    { name: "Matthew", email: "matthewbailie@gmail.com" },
    { name: "Matthew", email: "Matthew.Bailie+promo@gmail.com" },
  ]) {
    const b = browser();
    const data = new URLSearchParams();
    assert.equal(b.window.appendPurebaricLeadSource(data, who), true, JSON.stringify(who));
    assert.equal(data.get("pb_internal"), "1");
    assert.equal(b.window.sessionStorage.getItem("pb_internal"), "1");
    const n = b.window.dataLayer.length;
    b.window.trackPurebaricEvent("generate_lead", { value: 1 });
    assert.equal(b.window.dataLayer.length, n, "no GA event after an internal lead");
    let fbqCalls = 0; const real = b.window.fbq; b.window.fbq = function () { fbqCalls++; return real.apply(this, arguments); };
    b.window.trackPurebaricMeta("Lead", { value: 1 });
    assert.equal(fbqCalls, 0, "no Meta event after an internal lead");
  }
  for (const who of [{ name: "Celeste Testa", email: "celeste@contest.com" }, { name: "Jane Doe", email: "jane@example.com" }]) {
    assert.equal(browser().window.appendPurebaricLeadSource(new URLSearchParams(), who), false, JSON.stringify(who));
  }
});

test("Meta events carry an eventID when given one", () => {
  const b = browser();
  const calls = [];
  b.window.fbq = function () { calls.push([...arguments]); };
  b.window.trackPurebaricMeta("Lead", { value: 729, currency: "USD" }, { eventID: "abc" });
  assert.deepEqual(JSON.parse(JSON.stringify(calls[0])), ["track", "Lead", { value: 729, currency: "USD" }, { eventID: "abc" }]);
});

test("declining on /privacy stops tracking immediately and erases first touch", () => {
  const b = browser({ search: "?utm_source=fb" });
  assert.ok(b.window.localStorage.getItem("pb_ft"));
  b.window.declinePurebaricAnalytics();
  assert.equal(b.window.localStorage.getItem("pb_cookie"), "decline");
  assert.equal(b.window.localStorage.getItem("pb_ft"), null);
  assert.equal(b.window.localStorage.getItem("pb_vn"), null);
  const n = b.window.dataLayer.length;
  b.window.trackPurebaricEvent("x");
  assert.equal(b.window.dataLayer.length, n);
});

test("hooks: device/variant funnel params and scroll_depth at 25/50/75/90 once each on tracked pages", () => {
  const b = browser({ pathname: "/book", width: 390, local: { pb_pz: JSON.stringify({ g: "c" }) } });
  assert.deepEqual(JSON.parse(JSON.stringify(b.window.PBMetrics.funnelParams({ source: "book_page" }))), { device: "mobile", variant: "control", source: "book_page", visit_number: "1", days_since_first_visit: "0", def_v: 1 });
  const events = () => JSON.parse(JSON.stringify(b.window.dataLayer.filter((a) => a[0] === "event" && a[1] === "scroll_depth").map((a) => a[2])));
  b.window.pageYOffset = 1300; // (1300+800)/4000 = 52.5%
  b.listeners.scroll.forEach((f) => f());
  assert.deepEqual(events().map((e) => e.percent), [25, 50]);
  b.window.pageYOffset = 4000;
  b.listeners.scroll.forEach((f) => f());
  b.listeners.scroll.forEach((f) => f());
  assert.deepEqual(events().map((e) => e.percent), [25, 50, 75, 90]);
  assert.deepEqual(events()[0], { device: "mobile", variant: "control", percent: 25, page_path: "/book", visit_number: "1", days_since_first_visit: "0", def_v: 1 });
  // Untracked pages and blocked visitors get no listener.
  assert.equal(browser({ pathname: "/faq" }).listeners.scroll, undefined);
  assert.equal(browser({ pathname: "/book", nav: { globalPrivacyControl: true } }).listeners.scroll, undefined);
  let ran = false;
  browser({ nav: { doNotTrack: "1" } }).window.PBMetrics.onReady(() => { ran = true; });
  assert.equal(ran, false, "onReady never runs when tracking is blocked");
});

test("?internal=1 blocks every GA and Meta event even when storage is unavailable", () => {
  const b = browser({ search: "?internal=1", throwStorage: true });
  assert.deepEqual(loadedTags(b.scripts), { ga: false, meta: false });
  assert.equal(b.window.PBMetrics.isBlocked(), true);
  assert.equal(b.window.PBMetrics.blockReason(), "internal");
  const before = b.window.dataLayer.length;
  let fbqCalls = 0;
  b.window.fbq = function () { fbqCalls++; };
  for (const name of ["service_area_check", "booking_step1_save", "waitlist_join", "generate_lead"]) {
    b.window.trackPurebaricEvent(name, { in_area: true });
  }
  b.window.trackPurebaricMeta("InitiateCheckout", { content_category: "residential" });
  b.window.trackPurebaricMeta("Subscribe", { content_category: "waitlist" });
  b.window.gtag("event", "service_area_check", { in_area: true });
  assert.equal(b.window.dataLayer.length, before, "no GA event queued");
  assert.equal(fbqCalls, 0, "no Meta event sent");
});
