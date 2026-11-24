// TEST / internal suppression on the server: detection, the booking record flag,
// and no GA4 Measurement Protocol send for internal records.
const { test } = require("node:test");
const assert = require("node:assert/strict");
const path = require("path");
const Module = require("module");

const FN = path.join(__dirname, "..", "netlify", "functions");
const { isInternalLead } = require("../netlify/functions/_lib/internal-lead");
const realAnalytics = require("../netlify/functions/_lib/analytics");

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
  try { const file = path.join(FN, handlerFile); delete require.cache[file]; return require(file); }
  finally { Module._load = orig; }
}
const form = (obj) => ({ httpMethod: "POST", headers: { "content-type": "application/x-www-form-urlencoded" }, body: new URLSearchParams(obj).toString() });

test("isInternalLead: TEST names, test emails, the owner; not real people with 'test' inside a word", () => {
  assert.equal(isInternalLead({ firstName: "TEST", lastName: "x", email: "a@b.com" }), true);
  assert.equal(isInternalLead({ name: "jane", email: "qa.test@b.com" }), true);
  assert.equal(isInternalLead({ name: "M", email: "matthewbailie@gmail.com" }), true);
  assert.equal(isInternalLead({ name: "M", email: "matthew.bailie+x@gmail.com" }), true);
  assert.equal(isInternalLead({ name: "Jane", email: "j@b.com", flag: "1" }), true);
  assert.equal(isInternalLead({ name: "Celeste Testa", email: "celeste@contest.com" }), false);
  assert.equal(isInternalLead({ name: "Jane Doe", email: "jane@example.com" }), false);
});

test("GA4 Measurement Protocol never sends for an internal record", async () => {
  process.env.GA4_API_SECRET = "s";
  let calls = 0;
  global.fetch = async () => { calls++; return { ok: true, status: 204 }; };
  const r = await realAnalytics.sendBookingRequestSubmitted({ booking: { id: "b", internal: true, analytics: { consentGranted: true, clientId: "1.2" } } });
  assert.deepEqual(r, { sent: false, reason: "internal" });
  assert.equal(calls, 0);
  const ok = await realAnalytics.sendBookingRequestSubmitted({ booking: { id: "b", analytics: { consentGranted: true, clientId: "1.2" } } });
  assert.equal(ok.sent, true);
});

test("booking-submit flags internal leads and skips the GA4 send; real leads still send", async () => {
  const db = new Map(); const sent = [];
  const h = loadWithStubs("booking-submit.js", {
    "_lib/storage": {
      getServiceArea: async () => ({ prefixes: ["840"], zips: [] }),
      getNotifications: async () => ({}),
      getTwilioConfig: async () => ({}),
      getBooking: async (id) => db.get(id) || null,
      createBooking: async (d) => { const b = { id: "bk-" + (db.size + 1), ...d }; db.set(b.id, b); return b; },
      updateBooking: async (id, patch) => { const b = { ...db.get(id), ...patch, id }; db.set(id, b); return b; },
    },
    "_lib/email": { notifyAdminBooking: async () => {}, notifyAdminOutOfArea: async () => {}, notifyAdminSms: async () => {} },
    "_lib/analytics": {
      ...realAnalytics,
      sendBookingLeadSubmitted: async ({ booking }) => { sent.push(booking.id); return { sent: false }; },
    },
  }).handler;
  const base = { lead_stage: "step1", "first-name": "Jane", "last-name": "Doe", customer_email: "jane@example.com", zip_code: "84043" };
  let r = await h(form(base));
  const real = db.get(JSON.parse(r.body).id);
  assert.equal(real.internal, false);
  assert.deepEqual(sent, [real.id]);
  for (const extra of [{ "first-name": "TEST" }, { customer_email: "matthewbailie@gmail.com" }, { pb_internal: "1" }]) {
    sent.length = 0;
    r = await h(form({ ...base, ...extra }));
    assert.equal(db.get(JSON.parse(r.body).id).internal, true, JSON.stringify(extra));
    assert.deepEqual(sent, [], "no Measurement Protocol send");
  }
});
