// pb-metrics.js privacy gate and internal suppression, run in a sandboxed fake browser.
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

function browser({ nav = {}, win = {}, local = {}, session = {}, search = "", pathname = "/", referrer = "", width = 1280 } = {}) {
  const scripts = [];
  const listeners = {};
  const window = {
    navigator: { ...nav },
    localStorage: storage(local),
    sessionStorage: storage(session),
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
    assert.equal(b.window.sessionStorage.getItem("pb_gclid"), null, "no gclid capture");
    assert.equal(b.window.getPurebaricGclid(), "");
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
    assert.equal(b.window.markPurebaricInternalLead(data, who), true, JSON.stringify(who));
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
    assert.equal(browser().window.markPurebaricInternalLead(new URLSearchParams(), who), false, JSON.stringify(who));
  }
});

test("Meta events carry an eventID when given one", () => {
  const b = browser();
  const calls = [];
  b.window.fbq = function () { calls.push([...arguments]); };
  b.window.trackPurebaricMeta("Lead", { value: 729, currency: "USD" }, { eventID: "abc" });
  assert.deepEqual(JSON.parse(JSON.stringify(calls[0])), ["track", "Lead", { value: 729, currency: "USD" }, { eventID: "abc" }]);
});

test("declining on /privacy stops tracking immediately and forgets the session gclid", () => {
  const b = browser({ search: "?gclid=G1" });
  assert.equal(b.window.getPurebaricGclid(), "G1");
  b.window.declinePurebaricAnalytics();
  assert.equal(b.window.localStorage.getItem("pb_cookie"), "decline");
  assert.equal(b.window.getPurebaricGclid(), "");
  const n = b.window.dataLayer.length;
  b.window.trackPurebaricEvent("x");
  assert.equal(b.window.dataLayer.length, n);
});


test("/privacy carries the Proof-reader's final GPC/DNT, Meta and remarketing text", () => {
  const privacy = fs.readFileSync(path.join(__dirname, "..", "privacy.html"), "utf8");
  const text = privacy.replace(/<[^>]+>/g, "").replace(/\s+/g, " ");
  for (const s of [
    "We honor Global Privacy Control and Do Not Track. If your browser sends either signal, or you turn off analytics on this device, Google Analytics and the Meta (Facebook) pixel don't load at all.",
    "We may use the Meta pixel to show our own ads again, on Facebook and Instagram, to people who've visited our site. If your browser sends Global Privacy Control or Do Not Track, or you turn off analytics on this device, the pixel doesn't load and you won't be included. Purebaric does not send names, email addresses, phone numbers, addresses, ZIP codes, health information, notes, or form contents to Google Analytics or Google Ads.",
    "Meta (Facebook), through its pixel, unless you opt out, so we can measure whether our Facebook and Instagram ads led to a request, and show our ads again to past visitors. It doesn't receive your name, email, phone, address, ZIP, city, or the contents of your messages.",
  ]) assert.ok(text.includes(s), s.slice(0, 60));
  // The GPC/DNT sentence sits right after the opt-out button.
  assert.match(privacy, /Turn off analytics on this device<\/button><\/p>\s*<p>We honor Global Privacy Control/);
  for (const bad of ["turn analytics off below", "cookie banner", "does not enable personalized advertising or remarketing"]) {
    assert.ok(!text.toLowerCase().includes(bad), bad);
  }
});
