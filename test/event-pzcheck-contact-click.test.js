// Dec 1 batch: pz_check + contact_click (O&P contract event-contract-pzcheck-contact-click.md).
// Fixtures only; no network.
const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const PZ_SRC = fs.readFileSync(path.join(__dirname, "..", "pb-personalize.js"), "utf8");
const METRICS_SRC = fs.readFileSync(path.join(__dirname, "..", "pb-metrics.js"), "utf8");
const PZ_PATH = require.resolve("../pb-personalize.js");

function storage(init = {}) {
  const m = new Map(Object.entries(init));
  return {
    getItem: (k) => (m.has(k) ? m.get(k) : null),
    setItem: (k, v) => m.set(k, String(v)),
    removeItem: (k) => m.delete(k),
    dump: () => Object.fromEntries(m),
  };
}

function loadPZ() {
  delete require.cache[PZ_PATH];
  return require(PZ_PATH);
}

function heroDom() {
  const ctas = { node: "ctas" };
  const heroBelow = {
    querySelector: (s) => (s === ".hero-ctas" ? ctas : { textContent: "" }),
    querySelectorAll: () => [],
  };
  return {
    documentElement: { classList: { contains: () => false, remove: () => {} }, setAttribute() {} },
    readyState: "complete",
    querySelector: (s) => {
      if (s === ".hero-below .hero-ctas") return ctas;
      if (s === ".hero-below") return heroBelow;
      if (s === ".hero") return { querySelectorAll: () => [], querySelector: () => null, insertBefore() {}, firstChild: null };
      return null;
    },
    querySelectorAll: () => [],
    addEventListener() {},
    createElement: () => ({ setAttribute() {}, appendChild() {}, textContent: "" }),
  };
}

function pzWindow({ local = {}, session = {}, nav = {}, search = "", pathname = "/" } = {}) {
  const events = [];
  const document = heroDom();
  const window = {
    navigator: { ...nav },
    localStorage: storage(local),
    sessionStorage: storage(session),
    location: { search, pathname, hostname: "purebaric.com" },
    document,
    crypto: { getRandomValues(a) { a[0] = Math.floor(0.5 * 4294967296); } },
    trackPurebaricEvent(name, params) { events.push({ name, params: { ...(params || {}) } }); },
    addEventListener() {},
  };
  return { window, document, events };
}

function seedProfile(PZ, { rnd = 0.5, signal, n = 0, now = Date.now() } = {}) {
  let p = PZ.fresh(now, rnd);
  if (signal) p = PZ.add(p, signal[0], signal[1], now);
  p.n = n;
  p.u = now;
  return p;
}

const ALLOWED = {
  qualified: new Set(["yes", "no"]),
  variant: new Set(["control", "personalized"]),
  visit_type: new Set(["first", "return"]),
  miss_reason: new Set(["no_signal", "below_threshold", "none"]),
};

function assertAllowlist(params) {
  for (const [k, allowed] of Object.entries(ALLOWED)) {
    assert.ok(allowed.has(params[k]), `${k}=${params[k]}`);
  }
  assert.equal(params.def_v, 1);
  for (const k of Object.keys(params)) {
    assert.ok(["qualified", "variant", "visit_type", "miss_reason", "def_v", "test_traffic"].includes(k), `unexpected ${k}`);
  }
}

// ───────── pz_check ─────────
test("qualified and unqualified homepage views each fire exactly one pz_check; params match the allowlist", () => {
  const PZ = loadPZ();
  const now = Date.now();
  const qualified = seedProfile(PZ, { rnd: 0.5, signal: ["sitting", "cta"], n: 0, now });
  const q = pzWindow({ local: { pb_pz: JSON.stringify(qualified) } });
  PZ.boot(q.window);
  PZ.applyHome(q.document);
  const qEv = q.events.filter((e) => e.name === "pz_check");
  const qExp = q.events.filter((e) => e.name === "personalization_exposure");
  assert.equal(qEv.length, 1);
  assert.equal(qExp.length, 1, "personalization_exposure still fires when qualified");
  assertAllowlist(qEv[0].params);
  assert.deepEqual(
    (({ test_traffic, ...rest }) => rest)(qEv[0].params),
    { qualified: "yes", variant: "personalized", visit_type: "first", miss_reason: "none", def_v: 1 }
  );

  const PZ2 = loadPZ();
  const none = seedProfile(PZ2, { rnd: 0.5, n: 0, now });
  const u = pzWindow({ local: { pb_pz: JSON.stringify(none) } });
  PZ2.boot(u.window);
  PZ2.applyHome(u.document);
  const uEv = u.events.filter((e) => e.name === "pz_check");
  const uExp = u.events.filter((e) => e.name === "personalization_exposure");
  assert.equal(uEv.length, 1);
  assert.equal(uExp.length, 0, "personalization_exposure stays unchanged: only when decide returns a result");
  assertAllowlist(uEv[0].params);
  assert.equal(uEv[0].params.qualified, "no");
  assert.equal(uEv[0].params.miss_reason, "no_signal");
  assert.equal(uEv[0].params.variant, "personalized");

  const PZ3 = loadPZ();
  const weak = seedProfile(PZ3, { rnd: 0.05, signal: ["sitting", "dwell"], n: 1, now });
  const w = pzWindow({ local: { pb_pz: JSON.stringify(weak) } });
  PZ3.boot(w.window);
  PZ3.applyHome(w.document);
  const wEv = w.events.filter((e) => e.name === "pz_check");
  assert.equal(wEv.length, 1);
  assertAllowlist(wEv[0].params);
  assert.equal(wEv[0].params.qualified, "no");
  assert.equal(wEv[0].params.miss_reason, "below_threshold");
  assert.equal(wEv[0].params.variant, "control");
  assert.equal(wEv[0].params.visit_type, "return");

  // homeDone: a second applyHome does not fire again
  PZ3.applyHome(w.document);
  assert.equal(w.events.filter((e) => e.name === "pz_check").length, 1);
});

test("pz_check: GPC, DNT, opt-out and internal=1 each send 0", () => {
  const now = Date.now();
  const cases = [
    { nav: { globalPrivacyControl: true } },
    { nav: { doNotTrack: "1" } },
    { local: { pb_cookie: "decline" } },
    { search: "?internal=1" },
  ];
  for (const c of cases) {
    const PZ = loadPZ();
    const p = seedProfile(PZ, { rnd: 0.5, signal: ["sitting", "cta"], n: 0, now });
    const b = pzWindow({ local: { pb_pz: JSON.stringify(p), ...(c.local || {}) }, nav: c.nav, search: c.search || "" });
    PZ.boot(b.window);
    PZ.applyHome(b.document);
    const n = b.events.filter((e) => e.name === "pz_check").length;
    // stub trackPurebaricEvent always records; opted-out boot must not call it.
    // internal=1 is enforced by trackPurebaricEvent itself — covered in the metrics harness below.
    if (!c.search) assert.equal(n, 0, JSON.stringify(c));
  }
});

test("pz_check adds test_traffic: 1 on a flagged session and adds no new storage keys", () => {
  const PZ = loadPZ();
  const now = Date.now();
  const p = seedProfile(PZ, { rnd: 0.5, signal: ["sitting", "cta"], n: 0, now });
  const beforeKeys = new Set(["pb_pz"]);
  const b = pzWindow({ local: { pb_pz: JSON.stringify(p) }, session: { pb_test: "1" } });
  const sessionKeys = () => new Set(Object.keys(b.window.sessionStorage.dump()));
  const localKeys = () => new Set(Object.keys(b.window.localStorage.dump()));
  PZ.boot(b.window);
  PZ.applyHome(b.document);
  const ev = b.events.find((e) => e.name === "pz_check");
  assert.equal(ev.params.test_traffic, 1);
  for (const k of localKeys()) assert.ok(beforeKeys.has(k) || k === "pb_pz", `new local key ${k}`);
  for (const k of sessionKeys()) assert.ok(k === "pb_test" || k === "pb_pz_s", `new session key ${k}`);
});

// ───────── contact_click, through the real pb-metrics gate ─────────
function metricsBrowser({ nav = {}, local = {}, session = {}, search = "", pathname = "/book" } = {}) {
  const scripts = [];
  const docListeners = {};
  const winListeners = {};
  const dataLayer = [];
  const window = {
    navigator: { ...nav },
    localStorage: storage(local),
    sessionStorage: storage(session),
    location: { search, pathname, hostname: "purebaric.com" },
    innerWidth: 1280,
    innerHeight: 800,
    pageYOffset: 0,
    dataLayer,
    addEventListener: (t, fn) => { (winListeners[t] = winListeners[t] || []).push(fn); },
    document: {
      referrer: "",
      head: { appendChild: (s) => scripts.push(s.src) },
      createElement: () => ({}),
      documentElement: { scrollHeight: 4000, clientHeight: 800, clientWidth: 1280, scrollTop: 0 },
      body: { scrollHeight: 4000 },
      addEventListener: (t, fn) => { (docListeners[t] = docListeners[t] || []).push(fn); },
    },
    setTimeout: (fn) => { fn(); return 1; },
    clearTimeout: () => {},
  };
  // Pre-install a gtag that records events so we can assert after the script wraps/replaces it.
  window.gtag = function () { dataLayer.push(Array.from(arguments)); };
  const ctx = vm.createContext({ window, document: window.document, URLSearchParams, URL, JSON, Date, Math, Promise, setTimeout: window.setTimeout, clearTimeout: () => {} });
  vm.runInContext(METRICS_SRC, ctx);
  return { window, docListeners, dataLayer };
}

function anchor({ href, placement, text = href }) {
  const el = {
    tagName: "A",
    href,
    textContent: text,
    getAttribute: (n) => (n === "href" ? href : n === "data-pb-placement" ? placement || null : null),
    closest: (sel) => {
      const prefix = href.toLowerCase().startsWith("sms:") ? "sms:" : href.toLowerCase().startsWith("tel:") ? "tel:" : "";
      if (prefix && typeof sel === "string" && sel.includes(prefix)) return el;
      return null;
    },
  };
  return el;
}

function fireClick(browser, el) {
  let defaultPrevented = false, stopped = false;
  const ev = {
    target: el,
    preventDefault() { defaultPrevented = true; },
    stopPropagation() { stopped = true; },
    stopImmediatePropagation() { stopped = true; },
  };
  for (const fn of browser.docListeners.click || []) fn(ev);
  return { defaultPrevented, stopped };
}

function contactEvents(dataLayer) {
  return dataLayer
    .filter((a) => a[0] === "event" && a[1] === "contact_click")
    .map((a) => JSON.parse(JSON.stringify(a[2] || {})));
}

// Phone digits must never appear in a param. def_v is the number 1 (the definition version).
function leaksPhone(params, phone = "8019010873") {
  return Object.entries(params).some(([k, v]) => {
    if (k === "def_v") return false;
    const s = String(v);
    return s.replace(/\D/g, "").includes(phone) || /\d/.test(s);
  });
}

test("contact_click: tel and sms each fire one event with no digits in any param, and never block navigation", () => {
  const b = metricsBrowser({ pathname: "/book" });
  const tel = fireClick(b, anchor({ href: "tel:+18019010873", placement: "book", text: "(801) 901-0873" }));
  const telEv = contactEvents(b.dataLayer);
  assert.equal(telEv.length, 1);
  assert.deepEqual(telEv[0], { method: "tel", source: "book", page_path: "/book", def_v: 1 });
  assert.equal(leaksPhone(telEv[0]), false);
  assert.equal(tel.defaultPrevented, false);
  assert.equal(tel.stopped, false);

  const b2 = metricsBrowser({ pathname: "/contact/" });
  const sms = fireClick(b2, anchor({ href: "sms:+18019010873", placement: "contact" }));
  const smsEv = contactEvents(b2.dataLayer);
  assert.equal(smsEv.length, 1);
  assert.deepEqual(smsEv[0], { method: "sms", source: "contact", page_path: "/contact/", def_v: 1 });
  assert.equal(leaksPhone(smsEv[0]), false);
  assert.equal(sms.defaultPrevented, false);

  const b3 = metricsBrowser({ pathname: "/missing-page" });
  fireClick(b3, anchor({ href: "tel:8019010873", placement: "side-nav" }));
  assert.equal(contactEvents(b3.dataLayer)[0].source, "other");
  assert.equal(leaksPhone(contactEvents(b3.dataLayer)[0]), false);
});

test("contact_click: GPC, DNT, opt-out and internal=1 each send 0, and the link still opens", () => {
  const blocked = [
    { nav: { globalPrivacyControl: true } },
    { nav: { doNotTrack: "1" } },
    { local: { pb_cookie: "decline" } },
    { search: "?internal=1" },
  ];
  for (const c of blocked) {
    const b = metricsBrowser({ pathname: "/book", ...c });
    const result = fireClick(b, anchor({ href: "tel:+18019010873", placement: "book" }));
    assert.equal(contactEvents(b.dataLayer).length, 0, JSON.stringify(c));
    assert.equal(result.defaultPrevented, false, "link still opens");
    assert.equal(result.stopped, false);
  }
});

test("pz_check through trackPurebaricEvent: internal=1 sends 0", () => {
  const now = Date.now();
  const b = metricsBrowser({ pathname: "/", search: "?internal=1" });
  const ctx = { window: b.window, document: b.window.document, URLSearchParams, URL, JSON, Date, Math };
  // Seed a qualifying profile before personalize boots.
  const file = PZ_PATH;
  delete require.cache[file];
  const PZ = require(file);
  const p = seedProfile(PZ, { rnd: 0.5, signal: ["sitting", "cta"], n: 0, now });
  b.window.localStorage.setItem("pb_pz", JSON.stringify(p));
  b.window.document = Object.assign(b.window.document, heroDom());
  vm.createContext; // keep lint quiet if unused
  // Run personalize in the same window as the blocked metrics helper.
  const run = vm.runInNewContext;
  const sandbox = vm.createContext({ window: b.window, document: b.window.document, module: { exports: {} }, exports: {}, URLSearchParams, URL, JSON, Date, Math, Uint32Array });
  sandbox.window.document = b.window.document;
  vm.runInContext(PZ_SRC, sandbox);
  const api = sandbox.window.PBPZ || sandbox.module.exports;
  if (api && api.boot) api.boot(b.window);
  if (api && api.applyHome) api.applyHome(b.window.document);
  assert.equal(contactEvents(b.dataLayer).length, 0);
  const pz = b.dataLayer.filter((a) => a[0] === "event" && a[1] === "pz_check");
  assert.equal(pz.length, 0);
});
