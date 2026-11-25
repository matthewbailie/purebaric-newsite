// Admin Metrics tab: the pure rules in _lib/constellation.js plus the read-only handler, with fixtures
// only (no live Blobs or Stripe). `nowMs` is passed in, so every test pins "today".
const { test } = require("node:test");
const assert = require("node:assert/strict");
const path = require("path");
const Module = require("module");
const C = require("../netlify/functions/_lib/constellation");
const realConfig = require("../netlify/functions/_data/metrics-config.json");

const cfg = () => JSON.parse(JSON.stringify(realConfig));
// Noon MT on a day, as epoch seconds / ms.
const sec = (day, hm = "12:00") => Math.floor(Date.parse(`${day}T${hm}:00-07:00`) / 1000);
const msAt = (day, hm = "12:00") => sec(day, hm) * 1000;
const sub = (id, monthly, over = {}) => ({
  id, livemode: true, status: "active", start_date: sec("2026-06-01"), created: sec("2026-06-01"),
  customer: { id: "cus_" + id, email: id + "@example.com" },
  items: { data: [{ quantity: 1, price: { unit_amount: monthly * 100, recurring: { interval: "month", interval_count: 1 } } }] },
  ...over,
});
// Nov 24, 2026 as recorded in metrics.md §9: five paying (529 + 590 + 579 + 979 + 529 = $3,206), Carlos paused,
// Robert comped at $0, Monica and Charity canceled in November, plus a test-mode subscription.
const SUBS = [
  sub("sam", 529), sub("lisa", 590), sub("mike", 579), sub("cassie", 979),
  sub("brooke", 529, { start_date: sec("2026-10-20", "19:20"), created: sec("2026-10-20", "19:20") }),
  sub("carlos", 120, { status: "paused", items: { data: [{ quantity: 1, price: { unit_amount: 12000, recurring: { interval: "week", interval_count: 1 } } }] } }),
  sub("carlos2", 300, { pause_collection: { behavior: "void" } }),
  sub("robert", 0),
  sub("monica", 729, { status: "canceled", canceled_at: sec("2026-11-13"), ended_at: sec("2026-11-13") }),
  sub("charity", 549, { status: "canceled", canceled_at: sec("2026-11-23", "15:36"), ended_at: sec("2026-11-23", "15:36") }),
  sub("testmode", 999, { livemode: false }),
];
const NOW = msAt("2026-11-24", "18:00");
const MACHINES = Array.from({ length: 8 }, (_, i) => ({ id: "m" + i, name: "M" + (i + 1), status: "active" }))
  .concat([{ id: "old", name: "Old", status: "archived" }]);

test("period rollup: MT calendar periods with Monday–Sunday weeks", () => {
  assert.deepEqual(C.periodBounds("week", "2026-11-24", "2026-11-24"), { period: "week", start: "2026-11-23", end: "2026-11-29", days: 7, elapsed: 2, complete: false, future: false });
  assert.equal(C.periodBounds("week", "2026-11-29", "2026-11-29").start, "2026-11-23"); // Sunday belongs to the week before
  assert.equal(C.periodBounds("week", "2026-11-30", "2026-11-30").start, "2026-11-30"); // Monday opens a new week
  const m = C.periodBounds("month", "2026-02-10", "2026-03-01");
  assert.deepEqual([m.start, m.end, m.days, m.elapsed, m.complete], ["2026-02-01", "2026-02-28", 28, 28, true]);
  const q = C.periodBounds("quarter", "2026-11-24", "2026-11-24");
  assert.deepEqual([q.start, q.end, q.days], ["2026-10-01", "2026-12-31", 92]);
  assert.deepEqual([C.periodBounds("year", "2026-11-24", "2026-11-24").start, C.periodBounds("year", "2026-11-24", "2026-11-24").end], ["2026-01-01", "2026-12-31"]);
  assert.equal(C.periodBounds("bogus", "2026-11-24", "2026-11-24").period, "day");
  // 11:30 PM MT on Nov 24 is Nov 25 in UTC but still Nov 24 here.
  assert.equal(C.mtDayOfMs(Date.parse("2026-11-25T06:30:00Z")), "2026-11-24");
  // Midnight MT across the DST change (Nov 1, 2026).
  assert.equal(new Date(C.mtMidnightMs("2026-11-01")).toISOString(), "2026-11-01T06:00:00.000Z");
  assert.equal(new Date(C.mtMidnightMs("2026-11-02")).toISOString(), "2026-11-02T07:00:00.000Z");
  // Current period: as of the end of the last complete minute; a past period: its last second.
  const cur = C.periodBounds("day", "2026-11-24", "2026-11-24");
  assert.equal(new Date(C.asOfMs(cur, Date.parse("2026-11-24T18:05:42-07:00"))).toISOString(), "2026-11-25T01:04:59.000Z");
  const past = C.periodBounds("day", "2026-11-20", "2026-11-24");
  assert.equal(new Date(C.asOfMs(past, NOW)).toISOString(), "2026-11-21T06:59:59.000Z");
});

test("paying rentals and MRR: Stripe livemode only; paused, comps, canceled and test mode excluded", () => {
  const c = cfg();
  const snap = C.stripeSnapshot(SUBS, NOW, c);
  assert.equal(snap.count, 5);
  assert.equal(snap.mrr, 3206);
  assert.ok(!snap.ids.has("carlos") && !snap.ids.has("carlos2") && !snap.ids.has("robert") && !snap.ids.has("testmode"));
  // Before Charity's cancellation she was still paying.
  const before = C.stripeSnapshot(SUBS, msAt("2026-11-23", "12:00"), c);
  assert.equal(before.count, 6); assert.equal(before.mrr, 3755);
  // Weekly billing is converted to a monthly amount.
  assert.equal(C.monthlyRate(sub("w", 100, { items: { data: [{ quantity: 1, price: { unit_amount: 12000, recurring: { interval: "week", interval_count: 1 } } }] } })), 520);
  // A 100%-off forever coupon is a comp.
  assert.equal(C.payingAt(sub("free", 529, { discount: { coupon: { duration: "forever", percent_off: 100 } } }), NOW, c), false);
});

test("new paid starts are counted by MT start day and skip comps, incomplete and test mode", () => {
  const c = cfg();
  const extra = [...SUBS, sub("dec", 529, { start_date: sec("2026-12-02") }), sub("inc", 529, { status: "incomplete", start_date: sec("2026-12-03") }), sub("compdec", 0, { start_date: sec("2026-12-04") })];
  assert.equal(C.newPaidStarts(extra, "2026-11-24", "2026-12-24", c), 1);
  assert.equal(C.newPaidStarts(extra, "2026-10-20", "2026-10-20", c), 1); // Brooke, Oct 20 7:20 PM MT
});

test("on track / behind: stock with a deadline, flow with a period target, MRR hold-or-grow", () => {
  // 5 of 6 with a free machine and a month left: on track. Same gap after the deadline: behind.
  assert.equal(C.deadlineStatus({ current: 5, target: 6, deadline: "2026-12-24", day: "2026-11-24", freeMachines: 3 }), "on_track");
  assert.equal(C.deadlineStatus({ current: 5, target: 6, deadline: "2026-12-24", day: "2026-12-25", freeMachines: 3 }), "behind");
  assert.equal(C.deadlineStatus({ current: 6, target: 6, deadline: "2026-12-24", day: "2026-12-30" }), "on_track");
  // No free machine: cannot close the gap.
  assert.equal(C.deadlineStatus({ current: 5, target: 6, deadline: "2026-12-24", day: "2026-11-24", freeMachines: 0 }), "behind");
  // Gap of 3 with 10 days left at one start a week: behind. Gap of 2: on track (two partial weeks).
  assert.equal(C.deadlineStatus({ current: 0, target: 3, deadline: "2026-12-24", day: "2026-12-15" }), "behind");
  assert.equal(C.deadlineStatus({ current: 0, target: 2, deadline: "2026-12-24", day: "2026-12-15" }), "on_track");
  // Flow: 3 a week, Wednesday (3 of 7 days elapsed) needs 9/7 ≈ 1.29.
  assert.equal(C.flowStatus({ actual: 1, targetForPeriod: 3, elapsed: 3, days: 7 }), "behind");
  assert.equal(C.flowStatus({ actual: 2, targetForPeriod: 3, elapsed: 3, days: 7 }), "on_track");

  const r = C.buildReport({ period: "week", nowMs: NOW, subs: SUBS, stripe: { configured: true }, machines: MACHINES, config: cfg() });
  const by = Object.fromEntries(r.rows.map((x) => [x.id, x]));
  assert.equal(by.paying_rentals.value, 5);
  assert.equal(by.paying_rentals.status, "on_track");
  assert.equal(by.paying_rentals.display, "5 of 8 machines");
  // Week opened Mon Nov 23 with Charity still paying ($3,755); now $3,206 → behind the hold-or-grow guardrail.
  assert.equal(by.mrr.value, 3206);
  assert.equal(by.mrr.target, 3755);
  assert.equal(by.mrr.status, "behind");
  assert.equal(by.net_mrr_change.value, -549);
  assert.equal(by.arpu.value, 641.2);
  assert.equal(by.paid_utilization.value, 0.625);
});

const fixtures = () => ({
  bookings: [
    { id: "b1", status: "new", bookingMode: "request", firstName: "Alex", lastName: "T", email: "alex@example.com", phone: "801-555-0101", createdAt: "2026-11-24T22:00:00Z", leadSource: { channel: "paid_social", utmSource: "facebook" }, streetAddress: "1 Main St", adminNotes: "call back" },
    { id: "b2", status: "lead", bookingMode: "lead", firstName: "Tyra", lastName: "L", email: "tyra@example.com", createdAt: "2026-11-24T16:00:00Z" },
    { id: "b3", status: "new", bookingMode: "request", firstName: "TEST", lastName: "Muse", email: "muse@example.com", createdAt: "2026-11-24T17:00:00Z" },
    { id: "b4", status: "new", bookingMode: "request", firstName: "Matthew", lastName: "Bailie", email: "matthew.bailie+x@gmail.com", createdAt: "2026-11-24T17:30:00Z" },
    { id: "b5", status: "new", bookingMode: "request", firstName: "Shanto", lastName: "M", email: "shanto@example.com", outOfArea: true, createdAt: "2026-11-25T03:00:00Z" },
    { id: "b6", status: "new", bookingMode: "request", firstName: "Flagged", lastName: "Person", email: "flag@example.com", internal: true, createdAt: "2026-11-24T18:00:00Z" },
  ],
  waitlist: [
    // Alex also joined the waitlist earlier: one person, first touch wins (Nov 23).
    { id: "w1", status: "queued", name: "Alex T", email: "ALEX@example.com", createdAt: "2026-11-23T20:00:00Z" },
    { id: "w2", status: "converted", name: "Done Person", email: "done@example.com", createdAt: "2026-11-24T15:00:00Z" },
    { id: "w3", status: "expired", name: "Gone Person", phone: "(801) 555-0199", createdAt: "2026-11-24T15:30:00Z", category: "out-of-area" },
  ],
  customers: [
    // Two customers with placeholder emails are different people, keyed by phone.
    { id: "c1", name: "Scott B", email: "no-email+c1@placeholder.invalid", phone: "801-555-0111", tags: ["lead", "inquiry", "source-contact-form"], createdAt: "2026-11-24T19:00:00Z", notes: "secret" },
    { id: "c2", name: "Pat Q", email: "no-email+c2@placeholder.invalid", phone: "801-555-0122", tags: ["lead"], createdAt: "2026-11-24T19:10:00Z" },
    { id: "c3", name: "Renter Only", email: "renter@example.com", tags: ["customer"], createdAt: "2026-11-24T19:20:00Z" },
  ],
  contacts: [
    // Same phone as Scott: the same person.
    { id: "k1", name: "Scott Bennett", email: "", phone: "+1 801 555 0111", message: "Is it safe?", createdAt: "2026-11-24T20:00:00Z" },
  ],
});

test("real leads: TEST/internal excluded, placeholder emails never a key, one person = one lead, first touch wins", () => {
  const f = fixtures();
  const leads = C.dedupeLeads(C.leadRecords(f));
  const keys = leads.map((l) => l.key).sort();
  assert.deepEqual(keys, ["e:alex@example.com", "e:done@example.com", "e:shanto@example.com", "p:8015550111", "p:8015550122", "p:8015550199"]);
  const alex = leads.find((l) => l.key === "e:alex@example.com");
  assert.equal(alex.firstDay, "2026-11-23");
  assert.equal(C.personKey({ email: "no-email+c9@placeholder.invalid" }).startsWith("id:"), true);
  // Shanto's booking at 8 PM MT Nov 24 is Nov 25 in UTC but counts on Nov 24.
  assert.equal(leads.find((l) => l.key === "e:shanto@example.com").firstDay, "2026-11-24");
});

test("report: waitlist signups vs active waitlist, serviceable split, too-thin rows, not-connected GA4/ads", () => {
  const f = fixtures();
  const r = C.buildReport({ period: "day", nowMs: NOW + 3 * 3600000, subs: SUBS, stripe: { configured: true }, machines: MACHINES, config: cfg(), ...f });
  const by = Object.fromEntries(r.rows.map((x) => [x.id, x]));
  assert.equal(r.period.start, "2026-11-24");
  // Nov 24 first touches: done, gone (phone), Scott (phone), Pat (phone), Shanto. Alex's first touch was Nov 23.
  assert.equal(by.real_leads.value, 5);
  assert.equal(by.real_leads.display, "5 total · 3 serviceable");
  assert.equal(by.serviceable_leads.value, 3);
  assert.equal(by.completed_submits.value, 2); // Alex + Shanto; TEST, owner and flagged rows excluded
  assert.equal(by.partial_leads.value, 1); // Tyra
  assert.equal(by.waitlist_signups.value, 2); // converted and expired entries still count as signups
  assert.equal(by.waitlist_signups.display, "2 this period · 3 all-time");
  assert.equal(by.active_waitlist.value, 1); // only Alex is still waiting
  assert.equal(by.lead_to_rental.status, "too_thin");
  assert.equal(by.lead_to_rental.value, null);
  assert.match(by.lead_to_rental.display, /of 6 real leads/);
  assert.equal(by.lead_source_coverage.status, "too_thin");
  assert.equal(by.step1_to_step2.status, "too_thin");
  assert.equal(by.step1_to_step2.note, "Too few for a rate yet.");
  // No GA4 key in this fixture: every GA4 row says Not connected, with the reason.
  for (const id of ["personalization", "booking_completion_rate", "form_starts", "paid_form_start_rate", "booking_page_visits", "scroll_depth", "device_split"]) {
    assert.equal(by[id].status, "not_connected", id);
    assert.equal(by[id].value, null, id);
    assert.match(by[id].note, /GA4_SERVICE_ACCOUNT/, id);
  }
  // CPL and CAC fall back to hand-entered spend (none here), so they are static.
  assert.equal(by.cpl.static, true);
  assert.equal(by.cac.static, true);
  // Renewal touch and reply time are team-entered static rows, never removed.
  assert.equal(by.renewal_touch.static, true);
  assert.equal(by.reply_time.static, true);
  assert.equal(by.renewal_touch.display, "Not entered yet");
  assert.equal(by.renewal_touch.lastUpdated, null);
  assert.deepEqual(r.sources, { ga4: "not_connected", googleAds: "not_connected", meta: "not_connected", readAt: null });
  assert.equal(r.staticFootnote, "* Static: updated by the team; accurate only when kept current.");
  // Sections in layout order.
  const order = [...new Set(r.rows.map((x) => x.section))];
  assert.deepEqual(order, ["okr", "kpi", "leading"]);
});

test("report: no PII in the payload, only whitelisted keys", () => {
  const f = fixtures();
  const rentals = [{ id: "r1", status: "active", stripeSubscriptionId: "cassie", endDate: "2027-01-05", renter: { name: "Cassie Johnson", email: "cassie@example.com", phone: "801-555-0177", address: { street: "9 Elm" } }, notes: "gate code 1234" }];
  const r = C.buildReport({ period: "month", nowMs: NOW, subs: SUBS, stripe: { configured: true }, machines: MACHINES, rentals, config: cfg(), ...f });
  const text = JSON.stringify(r);
  for (const bad of ["@example.com", "placeholder.invalid", "555-01", "555 01", "Alex", "Tyra", "Scott", "Shanto", "Cassie", "Muse", "Main St", "Elm", "gate code", "secret", "call back", "Is it safe", "cus_", "b1", "w1", "c1", "k1", "r1"]) {
    assert.ok(!text.includes(bad), `payload leaks ${bad}`);
  }
  assert.deepEqual(Object.keys(r).sort(), ["config", "period", "rows", "sources", "staticFootnote", "stripe", "updated"]);
  assert.deepEqual(Object.keys(r.updated).sort(), ["at", "computedAt", "label", "portalAt", "stripeAt"]);
  const allowed = new Set(["id", "section", "label", "source", "value", "display", "target", "stretch", "progress", "status", "statusLabel", "provisional", "note", "static", "lastUpdated", "editable"]);
  for (const row of r.rows) {
    for (const k of Object.keys(row)) assert.ok(allowed.has(k), `unexpected row key ${k}`);
    assert.ok(row.value == null || typeof row.value === "number", row.id);
    if (row.progress) for (const k of Object.keys(row.progress)) assert.ok(["current", "target", "stretch", "markers", "targetLabel", "money"].includes(k), k);
  }
});

test("provisional config: targets and baselines are read from the config file, not code", () => {
  const c = C.loadConfig();
  const provisional = Object.entries(c.metrics).filter(([, m]) => m.provisional).map(([k]) => k).sort();
  assert.deepEqual(provisional, ["activeWaitlist", "cac", "cpl", "deviceSplit", "januaryTermEnds", "leadSourceCoverage", "personalization", "realLeads", "scrollDepth", "serviceableLeads", "waitlistSignups"]);
  // Contested baselines are not baked in.
  assert.equal(c.metrics.realLeads.baseline30d, null);
  assert.deepEqual(c.metrics.realLeads.baselineCandidates, [2, 3]);
  assert.equal(c.metrics.waitlistSignups.baseline, null);
  assert.equal(c.scorecardTolerance.status, "proposal");
  assert.throws(() => C.loadConfig({ metrics: {} }), /missing payingRentals/);

  // Changing the config changes the report: a different committed target and lead target.
  const alt = cfg();
  alt.metrics.payingRentals.target = 9;
  alt.metrics.realLeads.provisional = false;
  alt.metrics.realLeads.targetInForce = true;
  alt.metrics.realLeads.targetPerWeek = 7;
  const r = C.buildReport({ period: "week", nowMs: NOW, subs: SUBS, stripe: { configured: true }, machines: MACHINES, config: alt, ...fixtures() });
  const by = Object.fromEntries(r.rows.map((x) => [x.id, x]));
  assert.equal(by.paying_rentals.target, 9);
  assert.equal(by.paying_rentals.status, "behind"); // gap 4 with ~4.3 weeks left but only 3 free machines
  assert.equal(by.real_leads.provisional, false);
  assert.equal(by.real_leads.target, 7);
  assert.ok(["on_track", "behind"].includes(by.real_leads.status));
  assert.equal(r.config.provisionalCount, 10);
  // Default config: provisional rows make no status call.
  const d = C.buildReport({ period: "week", nowMs: NOW, subs: SUBS, stripe: { configured: true }, machines: MACHINES, config: cfg() });
  assert.equal(d.rows.find((x) => x.id === "real_leads").status, "provisional");
  assert.equal(d.config.provisionalCount, 11);
});

test("Stripe not configured: Stripe rows show no data instead of zeros", () => {
  const r = C.buildReport({ period: "day", nowMs: NOW, subs: [], stripe: { configured: false }, machines: MACHINES, config: cfg() });
  const by = Object.fromEntries(r.rows.map((x) => [x.id, x]));
  for (const id of ["paying_rentals", "mrr", "new_paid_starts_window", "renewals_kept"]) assert.equal(by[id].status, "no_data", id);
  assert.equal(by.mrr.value, null);
  assert.equal(by.paying_rentals.display, null);
});

test("renewals kept and MRR at risk use portal term ends and Stripe rates", () => {
  const rentals = [
    { id: "r1", status: "active", stripeSubscriptionId: "cassie", endDate: "2027-01-05" },
    { id: "r2", status: "active", stripeSubscriptionId: "sam", endDate: "2027-01-20" },
    { id: "r3", status: "active", stripeSubscriptionId: "lisa", endDate: "2027-03-01" },
    { id: "r4", status: "completed", stripeSubscriptionId: "charity", endDate: "2026-11-23" },
    { id: "r5", status: "active", stripeSubscriptionId: "mike", endDate: "2026-11-10" },
  ];
  const r = C.buildReport({ period: "month", nowMs: NOW, subs: SUBS, stripe: { configured: true }, machines: MACHINES, rentals, config: cfg() });
  const by = Object.fromEntries(r.rows.map((x) => [x.id, x]));
  assert.equal(by.mrr_at_risk.value, 979 + 529); // next 60 days from Nov 24: Cassie Jan 5, Sam Jan 20
  assert.equal(by.january_term_ends.value, 979 + 529);
  assert.equal(by.january_term_ends.status, "provisional");
  assert.equal(by.renewals_kept.display, "1 of 2 due"); // Mike kept, Charity not
  assert.equal(by.renewals_kept.status, "too_thin");
});

// ───────── Handler: auth, read-only, response shape ─────────
const FN = path.join(__dirname, "..", "netlify", "functions");
function loadWithStubs(stubs) {
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
  try {
    const file = path.join(FN, "admin-metrics.js");
    delete require.cache[file];
    return require(file);
  } finally { Module._load = orig; }
}
function storageStub(writes) {
  const f = fixtures();
  const no = (name) => async () => { writes.push(name); throw new Error("write attempted: " + name); };
  return {
    listBookings: async () => f.bookings, listWaitlist: async () => f.waitlist, listManualCustomers: async () => f.customers,
    listContactMessages: async () => f.contacts, listMachines: async () => MACHINES.filter((m) => m.status !== "archived"), listRentals: async () => [],
    getStripeConfig: async () => ({ secretKey: "fixture-key-not-real", source: "env" }),
    getCampaignList: async () => [], getStaticMetrics: async () => ({ id: "staticMetrics", values: {} }),
    store: () => ({ setJSON: no("setJSON"), set: no("set"), delete: no("delete"), get: async () => null, list: async () => ({ blobs: [] }) }),
    updateBooking: no("updateBooking"), updateWaitlistEntry: no("updateWaitlistEntry"), updateRental: no("updateRental"),
  };
}
const realAdmin = require("../netlify/functions/_lib/admin");

test("handler: 401 without auth, 405 on writes, aggregates on GET with a read-only Stripe list", async () => {
  const writes = [];
  const stripeCalls = [];
  const fakeStripe = { subscriptions: { list: (params) => { stripeCalls.push(params); return { autoPagingToArray: async () => SUBS }; } } };
  // The real requireAuth: no Identity user and no passkey cookie → 401 before anything is read.
  const denied = loadWithStubs({ "_lib/storage": storageStub(writes), "_lib/stripe": { stripeClientFrom: () => fakeStripe } });
  const res401 = await denied.handler({ httpMethod: "GET", headers: {}, queryStringParameters: { period: "week" } }, {});
  assert.equal(res401.statusCode, 401);
  assert.equal(stripeCalls.length, 0);

  const { handler } = loadWithStubs({ "_lib/storage": storageStub(writes), "_lib/admin": { ...realAdmin, requireAuth: async () => null }, "_lib/stripe": { stripeClientFrom: () => fakeStripe } });
  for (const m of ["POST", "PATCH", "DELETE", "PUT"]) assert.equal((await handler({ httpMethod: m, headers: {} }, {})).statusCode, 405);
  const res = await handler({ httpMethod: "GET", headers: {}, queryStringParameters: { period: "week" } }, {});
  assert.equal(res.statusCode, 200);
  const body = JSON.parse(res.body);
  assert.equal(body.period.name, "week");
  assert.equal(body.stripe.ok, true);
  assert.deepEqual(stripeCalls, [{ status: "all", limit: 100, expand: ["data.customer"] }]);
  assert.deepEqual(writes, []);
  assert.match(body.updated.label, /^Last updated [A-Z][a-z]{2} \d{1,2}, \d{4}, \d{1,2}:\d{2} [AP]M MT$/);
  assert.ok(body.updated.portalAt && body.updated.stripeAt);
  assert.ok(!res.body.includes("@example.com") && !res.body.includes("fixture-key-not-real"));

  // Stripe failing is reported without leaking the error text and without failing the page.
  const broken = { subscriptions: { list: () => ({ autoPagingToArray: async () => { throw new Error("Invalid API Key provided: fixture-key-not-real"); } }) } };
  const h2 = loadWithStubs({ "_lib/storage": storageStub(writes), "_lib/admin": { ...realAdmin, requireAuth: async () => null }, "_lib/stripe": { stripeClientFrom: () => broken } });
  const orig = console.error; console.error = () => {};
  try {
    const r2 = await h2.handler({ httpMethod: "GET", headers: {}, queryStringParameters: {} }, {});
    assert.equal(r2.statusCode, 200);
    assert.ok(!r2.body.includes("fixture-key-not-real"));
    assert.equal(JSON.parse(r2.body).stripe.error, "stripe_read_failed");
  } finally { console.error = orig; }
});

test("admin.html: Site OKRs & Analytics tab holds three sub-tabs; no separate Metrics tab; old links land right", () => {
  const html = require("fs").readFileSync(path.join(__dirname, "..", "admin.html"), "utf8");
  // One root tab, renamed; the top-level Metrics tab is gone.
  assert.match(html, /<button class="tab-btn" data-tab="analytics">Site OKRs &amp; Analytics<\/button>/);
  assert.doesNotMatch(html, /data-tab="metrics"/);
  assert.doesNotMatch(html, /data-panel="metrics"/);
  assert.doesNotMatch(html, />Site analytics</);
  // Three sub-tabs, in this order, inside the analytics panel; Metrics content first, GA content after it.
  const panel = html.slice(html.indexOf('<section class="tab-panel" data-panel="analytics">'), html.indexOf("<!-- ───── Delivery availability"));
  const okrsBtn = panel.indexOf('data-sub="okrs" onclick="showAnalyticsSub(\'okrs\')">OKRs, KPIs, and Metrics</button>');
  const dataBtn = panel.indexOf('data-sub="data" onclick="showAnalyticsSub(\'data\')">Analytics &amp; Data</button>');
  const leadsBtn = panel.indexOf('data-sub="leads" onclick="showAnalyticsSub(\'leads\')">Leads by Campaign</button>');
  assert.ok(okrsBtn > 0 && dataBtn > okrsBtn && leadsBtn > dataBtn);
  assert.ok(panel.indexOf('<div class="an-leads">') > panel.indexOf('id="mxFoot"') && panel.indexOf('id="lcTable"') > panel.indexOf('<div class="an-leads">'));
  const okrs = panel.indexOf('<div class="an-okrs">');
  assert.ok(okrs > dataBtn);
  assert.ok(panel.indexOf('id="mxOkr"') > okrs && panel.indexOf('id="mxPeriod"') > okrs);
  assert.ok(panel.indexOf('id="anNote"') > panel.indexOf('id="mxFoot"'), "GA content follows the metrics content");
  assert.match(panel, /onclick="loadTraffic\(true\)">Refresh from Google Analytics<\/button>/);
  // CSS shows one sub-tab at a time (the funnel card dashboard-charts.js appends is hidden with the GA content).
  assert.match(html, /\.tab-panel\[data-panel="analytics"\]\.sub-okrs > :not\(\.an-subnav\):not\(\.an-okrs\):not\(\.tab-loading-status\) \{ display: none !important; \}/);
  assert.match(html, /\.tab-panel\[data-panel="analytics"\]:not\(\.sub-okrs\) > \.an-okrs \{ display: none; \}/);
  assert.match(html, /\.tab-panel\[data-panel="analytics"\]\.sub-leads > :not\(\.an-subnav\):not\(\.an-leads\):not\(\.tab-loading-status\) \{ display: none !important; \}/);
  assert.match(html, /\.tab-panel\[data-panel="analytics"\]:not\(\.sub-leads\) > \.an-leads \{ display: none; \}/);
  // Loading: the shown sub-tab loads on demand; GA only auto-refreshes on Analytics & Data.
  assert.match(html, /analytics: \(\) => loadAnalyticsSub\(\)/);
  assert.match(html, /const task = sub === 'okrs' \? loadMetrics\(\) : sub === 'leads' \? loadLeadsByCampaign\(\) : loadTraffic\(true\);/);
  assert.match(html, /_anSub !== 'data' \|\| document\.hidden/);
  assert.match(html, /api\('\/api\/admin\/metrics\?period='/);
  // Deep links: #okrs and the old #metrics → OKRs sub-tab; #analytics (old Site analytics) → Analytics & Data.
  assert.match(html, /if \(name === 'okrs' \|\| name === 'metrics'\) \{ _anSub = 'okrs'; name = 'analytics'; \}/);
  assert.match(html, /else if \(name === 'analytics'\) _anSub = 'data';/);
  assert.match(html, /_anSub === 'okrs' \? '#okrs' : _anSub === 'leads' \? '#leads' : '#analytics'/);
  // #leads (and the spec's #leads-by-campaign) → Leads by Campaign.
  assert.match(html, /else if \(name === 'leads' \|\| name === 'leads-by-campaign'\) \{ _anSub = 'leads'; name = 'analytics'; \}/);
  assert.match(html, /api\('\/api\/admin\/campaign-leads'/);
  assert.match(html, /onclick="openAnalyticsData\(\);return false;"[^>]*>Analytics &amp; Data<\/a> tab under Site OKRs &amp; Analytics/);
  // Nothing from the metrics view goes into browser storage.
  const start = html.indexOf("// ───────── OKRs, KPIs, and Metrics");
  const block = html.slice(start, html.indexOf("async function loadTraffic", start));
  assert.ok(start > 0 && block.length > 0);
  assert.doesNotMatch(block, /localStorage|sessionStorage|document\.cookie/);
});

// The sub-tab switching and deep-link logic, run in a tiny fake DOM.
test("Site OKRs & Analytics: sub-tab switching, deep links and lazy loads behave", () => {
  const html = require("fs").readFileSync(path.join(__dirname, "..", "admin.html"), "utf8");
  const pick = (from, to) => html.slice(html.indexOf(from), html.indexOf(to, html.indexOf(from)));
  const subCode = pick("  let _anSub = 'okrs';", "  // ───────── Leads by Campaign");
  const restoreCode = pick("  function restoreTab() {", "  // Links from the ending-soon");
  const cls = () => { const set = new Set(); return { toggle: (c, on) => (on ? set.add(c) : set.delete(c)), contains: (c) => set.has(c), set }; };
  const panel = { classList: cls() }; panel.classList.set.add("active");
  const mkBtn = (sub) => ({ dataset: { sub }, classList: cls(), attrs: {}, setAttribute(k, v) { this.attrs[k] = v; } });
  const subBtns = [mkBtn("okrs"), mkBtn("data"), mkBtn("leads")];
  const calls = []; const hashes = [];
  let clicked = null;
  const tabBtn = { dataset: { tab: "analytics" }, click() { clicked = "analytics"; } };
  const document = {
    querySelector: (q) => (q === '[data-panel="analytics"]' ? panel : q === '.tab-btn[data-tab="analytics"]' ? tabBtn : null),
    querySelectorAll: (q) => (q === "#anSubTabs button" ? subBtns : q === ".tab-btn" ? [tabBtn] : []),
  };
  const location = { hash: "" };
  const history = { replaceState: (a, b, h) => hashes.push(h) };
  const env = { document, location, history, toast: () => {},
    withPanelLoading: (tabs, fn) => { calls.push("panel:" + tabs.join()); return fn(); },
    loadMetrics: async () => { calls.push("metrics"); }, loadTraffic: async () => { calls.push("traffic"); },
    loadLeadsByCampaign: async () => { calls.push("leads"); } };
  const run = new Function(...Object.keys(env), subCode + restoreCode + "\nreturn { showAnalyticsSub, loadAnalyticsSub, openAnalyticsData, restoreTab, get sub() { return _anSub; }, set sub(v) { _anSub = v; } };");
  const api = run(...Object.values(env));
  // Default sub-tab is OKRs, KPIs, and Metrics.
  assert.equal(api.sub, "okrs");
  api.showAnalyticsSub("okrs");
  assert.ok(panel.classList.contains("sub-okrs"));
  assert.equal(subBtns[0].attrs["aria-selected"], "true");
  assert.equal(hashes.at(-1), "#okrs");
  assert.deepEqual(calls, ["panel:analytics", "metrics"]);
  // Switching to Analytics & Data loads GA once; switching back does not reload metrics.
  api.showAnalyticsSub("data");
  assert.ok(!panel.classList.contains("sub-okrs"));
  assert.equal(hashes.at(-1), "#analytics");
  return Promise.resolve().then(() => {
    api.showAnalyticsSub("okrs");
    api.showAnalyticsSub("data");
    assert.deepEqual(calls.filter((c) => c === "metrics" || c === "traffic"), ["metrics", "traffic"]);
    // Leads by Campaign: its own class and address, loaded once.
    api.showAnalyticsSub("leads");
    assert.ok(panel.classList.contains("sub-leads") && !panel.classList.contains("sub-okrs"));
    assert.equal(subBtns[2].attrs["aria-selected"], "true");
    assert.equal(hashes.at(-1), "#leads");
  }).then(() => {
    api.showAnalyticsSub("okrs");
    assert.ok(!panel.classList.contains("sub-leads"));
    api.showAnalyticsSub("leads");
    assert.deepEqual(calls.filter((c) => c === "leads"), ["leads"]);
    // Deep links.
    for (const [hash, sub] of [["#metrics", "okrs"], ["#okrs", "okrs"], ["#analytics", "data"], ["#leads", "leads"], ["#leads-by-campaign", "leads"]]) {
      clicked = null; location.hash = hash; api.sub = sub === "okrs" ? "data" : "okrs";
      api.restoreTab();
      assert.equal(clicked, "analytics", hash);
      assert.equal(api.sub, sub, hash);
    }
    api.sub = "okrs"; clicked = null; api.openAnalyticsData();
    assert.equal(api.sub, "data"); assert.equal(clicked, "analytics");
  });
});

test("last updated: every report carries the MT time its data was read, shown on each panel", () => {
  assert.equal(C.formatMt(Date.parse("2026-11-25T17:52:00Z")), "Nov 25, 2026, 10:52 AM MT");
  assert.equal(C.formatMt(Date.parse("2026-07-01T05:05:00Z")), "Jun 30, 2026, 11:05 PM MT"); // daylight time, previous MT day
  // The stamp is the older of the two reads; Stripe read later than the portal → the portal time.
  const u = C.lastUpdated({ nowMs: Date.parse("2026-11-25T17:53:00Z"), portalMs: Date.parse("2026-11-25T17:52:10Z"), stripeMs: Date.parse("2026-11-25T17:52:40Z") });
  assert.equal(u.at, "2026-11-25T17:52:10.000Z");
  assert.equal(u.label, "Last updated Nov 25, 2026, 10:52 AM MT");
  assert.equal(u.stripeAt, "2026-11-25T17:52:40.000Z");
  // No fetch times → the compute time.
  assert.equal(C.lastUpdated({ nowMs: Date.parse("2026-11-25T18:00:00Z") }).label, "Last updated Nov 25, 2026, 11:00 AM MT");
  // In the report; a Stripe read that failed does not count as fresh.
  const r = C.buildReport({ period: "day", nowMs: NOW, subs: [], stripe: { configured: true, error: "x" }, machines: MACHINES, config: cfg(),
    fetchedAt: { portalMs: NOW - 5000, stripeMs: NOW - 1000 } });
  assert.equal(r.updated.at, new Date(NOW - 5000).toISOString());
  assert.equal(r.updated.stripeAt, null);
  assert.match(r.updated.label, /^Last updated Nov 24, 2026, 5:59 PM MT$/);
  // admin.html shows it on all three panels.
  const html = require("fs").readFileSync(path.join(__dirname, "..", "admin.html"), "utf8");
  const panel = html.slice(html.indexOf('<div class="an-okrs">'), html.indexOf('id="mxFoot"'));
  assert.equal((panel.match(/data-mx-updated/g) || []).length, 3);
  assert.match(html, /document\.querySelectorAll\('\[data-mx-updated\]'\)/);
  assert.match(html, /\}\. Refresh to update\./);
});
