const { test } = require("node:test");
const assert = require("node:assert/strict");
const E = require("../netlify/functions/_lib/rental-ending");
const M = require("../dashboard-metrics");
const { EVENTS } = require("../netlify/functions/_lib/notifications");

const rental = (id, status, endDate, extra = {}) => ({ id, status, startDate: "2026-01-01", endDate, ...extra });
const today = "2026-10-01";
const fixture = [
  rental("a", "active", "2026-10-11"),   // exactly 10 days out: in
  rental("b", "active", "2026-10-12"),   // 11 days: not yet
  rental("c", "active", "2026-10-01"),   // last day is today: in
  rental("d", "active", "2026-09-30"),   // already over
  rental("e", "completed", "2026-10-05"),// finished / historical
  rental("f", "cancelled", "2026-10-05"),
  rental("g", "scheduled", "2026-10-03"),// scheduled counts
  rental("h", "active", ""),             // no end date
  rental("i", "active", "2026-10-03"),   // same day as g: stable order by id
];

test("digest lists running rentals ending within 10 days, soonest first (repeat weekly, no once-only stamp)", () => {
  assert.deepEqual(E.rentalsEndingSoon(fixture, today).map((r) => r.id), ["c", "g", "i", "a"]);
  // A rental ending in 9 days shows up this week AND, with 2 days left, next week: a built-in reminder.
  const r = [rental("x", "active", "2026-10-10")];
  assert.equal(E.rentalsEndingSoon(r, "2026-10-01").length, 1);
  assert.equal(E.rentalsEndingSoon(r, "2026-10-08").length, 1);
});

test("10 days is longer than the weekly run interval, so no rental can slip between runs", () => {
  assert.ok(E.LOOKAHEAD_DAYS > 7);
  for (let offset = 0; offset < 40; offset += 1) {
    const end = new Date(Date.UTC(2026, 9, 1 + offset)).toISOString().slice(0, 10);
    let seen = false;
    for (let run = 0; run <= offset; run += 7) {
      const runDay = new Date(Date.UTC(2026, 9, 1 + run)).toISOString().slice(0, 10);
      if (E.rentalsEndingSoon([rental("z", "active", end)], runDay).length) seen = true;
    }
    if (offset >= 3) assert.ok(seen, `end ${end} was never in a weekly digest`);
  }
});

test("the admin list uses the same rule as the server digest", () => {
  assert.deepEqual(M.endingSoon(fixture, today, 10).map((r) => r.id), E.rentalsEndingSoon(fixture, today).map((r) => r.id));
});

test("the text never carries customer details: a count, the earliest end date and an opaque admin link", () => {
  const list = [
    rental("r-1", "active", "2026-10-03", { renter: { name: "Sam Heaton", email: "s@x.com", phone: "8015551212", address: { street: "3072 N. Bend Lane" } } }),
    rental("r-2", "active", "2026-10-09", { renter: { name: "Heather Mercer", email: "h@x.com", phone: "8018456359" } }),
  ];
  const text = E.endingSmsText(list, 10);
  assert.match(text, /^Purebaric: 2 rentals end within the next 10 days \(first: Oct 3\)\./);
  assert.match(text, /https:\/\/purebaric\.com\/admin\?endingSoon=1/);
  assert.match(text, /Reply STOP to opt out or HELP for help\.$/);
  for (const pii of ["Sam", "Heaton", "Heather", "Mercer", "s@x.com", "8015551212", "Bend"]) assert.ok(!text.includes(pii), pii);
  assert.match(E.endingSmsText([list[0]], 10), /^Purebaric: 1 rental ends within/);
});

test("rental_ending is a subscribable notification event", () => {
  assert.ok(EVENTS.includes("rental_ending"));
});
