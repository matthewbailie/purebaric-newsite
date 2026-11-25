// O&P v2 booking event contract (claims release).
const { test, beforeEach } = require("node:test");
const assert = require("node:assert/strict");
const path = require("path");
const fs = require("fs");

const root = path.join(__dirname, "..");
const bookHtml = fs.readFileSync(path.join(root, "book.html"), "utf8");

function loadFresh() {
  const file = path.join(root, "book-funnel-events.js");
  delete require.cache[file];
  return require(file);
}

function storage() {
  const data = Object.create(null);
  return {
    getItem(k) { return Object.prototype.hasOwnProperty.call(data, k) ? data[k] : null; },
    setItem(k, v) { data[k] = String(v); },
    removeItem(k) { delete data[k]; },
    _data: data,
  };
}

function makeWin(opts = {}) {
  const events = [];
  const blocked = !!opts.blocked;
  const win = {
    innerWidth: opts.width || 390,
    location: { search: opts.search || "", pathname: "/book" },
    sessionStorage: opts.store || storage(),
    document: opts.document || { documentElement: { clientWidth: opts.width || 390 }, getElementById() { return null; } },
    trackPurebaricEvent(name, params) { events.push({ name, params: { ...params } }); },
    PBMetrics: {
      isBlocked() { return blocked; },
      deviceType() { return (opts.width || 390) < 768 ? "mobile" : "desktop"; },
      funnelParams(o) { return Object.assign({ device: (opts.width || 390) < 768 ? "mobile" : "desktop", variant: "none" }, o || {}); },
    },
    addEventListener() {},
    events,
  };
  if (opts.blocked) {
    // Simulate the real consent helper: a blocked tracker is a no-op.
    win.trackPurebaricEvent = function () { /* skipped */ };
  }
  return win;
}

function field(opts) {
  return {
    tagName: opts.tag || "INPUT",
    type: opts.type || "text",
    name: opts.name || "",
    id: opts.id || "",
    getAttribute(k) {
      if (k === "name") return this.name || "";
      if (k === "id") return this.id || "";
      return null;
    },
    closest(sel) {
      if (String(sel).includes(opts.form || "leadForm")) return { id: opts.form || "leadForm" };
      return null;
    },
  };
}

let api;
beforeEach(() => {
  api = loadFresh();
});

test("a focus or input on a toggle, link, or button does not fire booking_form_start", () => {
  const win = makeWin();
  const toggle = field({ tag: "BUTTON", type: "button", name: "", id: "homeBtn", form: "leadForm" });
  toggle.tagName = "BUTTON";
  assert.equal(api.maybeStart(win, toggle), null);
  const link = { tagName: "A", name: "", id: "", getAttribute() { return ""; }, closest() { return { id: "leadForm" }; } };
  assert.equal(api.maybeStart(win, link), null);
  const submit = field({ type: "submit", name: "", id: "leadBtn" });
  assert.equal(api.maybeStart(win, submit), null);
  assert.equal(win.events.length, 0);
  assert.equal(api.hasV2Start(win), false);
});

test("an input focus fires one start, with form_id, device, first_field and def_v=2, never the value", () => {
  const win = makeWin({ width: 390 });
  const zip = field({ name: "zip_code", id: "zip", form: "leadForm" });
  zip.value = "84043"; // must never appear in the payload
  const payload = api.maybeStart(win, zip);
  assert.ok(payload);
  assert.equal(payload.form_id, "leadForm");
  assert.equal(payload.device, "mobile");
  assert.equal(payload.first_field, "zip_code");
  assert.equal(payload.def_v, 2);
  assert.equal(payload["zip_code"], undefined);
  assert.ok(!JSON.stringify(payload).includes("84043"));
  assert.deepEqual(win.events.map((e) => e.name), ["booking_form_start"]);
  assert.deepEqual(win.events[0].params.first_field, "zip_code");

  // once per session: a second focus or input does not fire again
  const phone = field({ name: "customer_phone", id: "cp", form: "leadForm" });
  assert.equal(api.maybeStart(win, phone), null);
  assert.equal(api.maybeStart(win, zip), null);
  assert.equal(win.events.length, 1);
});

test("booking_form_abandon fires only after a v2 start, with last_field, had_delivery_date and def_v=2", () => {
  const store = storage();
  const doc = {
    getElementById(id) { return id === "bookDate" ? { value: "2026-12-10" } : null; },
  };
  const win = makeWin({ store, document: doc });
  assert.equal(api.maybeAbandon(win, doc), null, "no start yet");
  assert.equal(win.events.length, 0);

  api.maybeStart(win, field({ name: "zip_code", id: "zip" }));
  const abandoned = api.maybeAbandon(win, doc);
  assert.ok(abandoned);
  assert.equal(abandoned.last_field, "zip_code");
  assert.equal(abandoned.had_delivery_date, true);
  assert.equal(abandoned.def_v, 2);
  assert.equal(win.events[1].name, "booking_form_abandon");
  assert.equal(api.maybeAbandon(win, doc), null, "only once");
});

test("booking_step1_save fires on a successful save with device, in_area and def_v=2", () => {
  const inWin = makeWin({ width: 1200 });
  const inP = api.step1Save(inWin, true);
  assert.equal(inP.device, "desktop");
  assert.equal(inP.in_area, true);
  assert.equal(inP.def_v, 2);
  assert.equal(inWin.events[0].name, "booking_step1_save");

  const outWin = makeWin({ width: 390 });
  const outP = api.step1Save(outWin, false);
  assert.equal(outP.in_area, false);
  assert.equal(outP.device, "mobile");
});

test("service_area_check params include in_area as a boolean for both ZIP outcomes", () => {
  assert.deepEqual(api.serviceAreaParams(true), { result: "eligible", in_area: true });
  assert.deepEqual(api.serviceAreaParams(false), { result: "unsupported", in_area: false });
  assert.equal(typeof api.serviceAreaParams(true).in_area, "boolean");
  assert.match(bookHtml, /in_area:!!inArea/);
  assert.doesNotMatch(bookHtml, /zip_result/);
});

test("opening /book?pbtest=1 flags the session and every event carries test_traffic=1", () => {
  const store = storage();
  const win = makeWin({ search: "?pbtest=1", store });
  api.noteTestTraffic(win);
  assert.equal(api.isTestTraffic(win), true);
  const start = api.maybeStart(win, field({ name: "first-name", id: "cfn", form: "leadForm" }));
  assert.equal(start.test_traffic, 1);
  const save = api.step1Save(win, true);
  assert.equal(save.test_traffic, 1);
  const abandon = api.maybeAbandon(win, { getElementById() { return { value: "" }; } });
  assert.equal(abandon.test_traffic, 1);
  for (const ev of win.events) assert.equal(ev.params.test_traffic, 1);

  // flag persists for later events in the same session even without the query string
  const later = makeWin({ search: "", store });
  later.trackPurebaricEvent = function (name, params) { later.events.push({ name, params: { ...params } }); };
  const decorated = api.decorate(later, { foo: 1 });
  assert.equal(decorated.test_traffic, 1);
  assert.equal(decorated.foo, 1);
});

test("nothing fires under GPC / DNT / opt-out (PBMetrics.isBlocked)", () => {
  const win = makeWin({ blocked: true });
  assert.equal(api.maybeStart(win, field({ name: "zip_code", id: "zip" })), null);
  assert.equal(api.hasV2Start(win), false);
  assert.equal(api.step1Save(win, true), null);
  assert.equal(api.maybeAbandon(win, { getElementById() { return null; } }), null);
  assert.equal(win.events.length, 0);
});

test("payloads never include name, email, phone or ZIP values", () => {
  const win = makeWin({ search: "?pbtest=1" });
  const el = field({ name: "customer_email", id: "ce" });
  el.value = "pat@example.com";
  const start = api.maybeStart(win, el);
  const save = api.step1Save(win, true);
  const blob = JSON.stringify([start, save, win.events]);
  assert.doesNotMatch(blob, /pat@example\.com|\+1\d{10}|84043|555-0100/i);
  assert.equal(start.first_field, "customer_email");
});

test("book.html date-validation string is unchanged (owned by the step-1 rework)", () => {
  assert.equal((bookHtml.match(/Please pick a delivery date on the calendar\./g) || []).length, 2);
  // The signed N7 wording must not be introduced on this branch.
  assert.doesNotMatch(bookHtml, /Please pick a delivery date\.(?! on the calendar)/);
});
