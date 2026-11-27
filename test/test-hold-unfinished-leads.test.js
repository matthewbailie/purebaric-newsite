// TEST/internal holds do not reserve capacity; the unfinished step-1 leads
// filter splits real rows from TEST/internal and counts only the real ones.
const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const d = require("../netlify/functions/_lib/delivery");
const { isInternalLead } = require("../netlify/functions/_lib/lead-source");
const { isStoredInternalLead } = require("../netlify/functions/_lib/stored-internal");
const adminUtils = require("../admin-utils");

const root = path.join(__dirname, "..");
const adminHtml = fs.readFileSync(path.join(root, "admin.html"), "utf8");

const chambers = [
  { id: "c1", name: "LC-001", style: "lying", status: "active" },
  { id: "c2", name: "LC-002", style: "lying", status: "active" },
];
const machines = [
  { id: "m1", status: "active" },
  { id: "m2", status: "active" },
];
const today = "2026-11-25";
const windowStart = "2026-12-01";
const windowEnd = "2027-03-31";
const base = { chambers, machines, rentals: [], holds: [] };

function bookHold(extra) {
  return {
    bookingMode: "book",
    status: "new",
    chamberStyle: "lying",
    startDate: windowStart,
    endDate: windowEnd,
    firstName: "Jane",
    lastName: "Doe",
    email: "jane@example.com",
    ...extra,
  };
}

const NOW = Date.parse("2026-11-25T17:00:00-07:00");
const hoursAgo = (h) => new Date(NOW - h * 60 * 60 * 1000).toISOString();

function lead(extra) {
  return {
    id: extra.id || "l",
    status: "lead",
    bookingMode: "lead",
    firstName: "Tyra",
    lastName: "L",
    email: "tyra@example.com",
    createdAt: hoursAgo(48),
    ...extra,
  };
}

test("isStoredInternalLead prefers the stored flag and falls back only when it is missing", () => {
  assert.equal(isStoredInternalLead({ internal: true, firstName: "Jane", email: "jane@example.com" }), true);
  assert.equal(isStoredInternalLead({ internal: false, firstName: "TEST", email: "qa.test@b.com" }), false, "trust a stored false");
  assert.equal(isStoredInternalLead({ firstName: "TEST", lastName: "Run", email: "a@b.com" }), true, "pre-flag TEST name");
  assert.equal(isStoredInternalLead({ firstName: "Jane", email: "qa.test@b.com" }), true, "pre-flag test email token");
  assert.equal(isStoredInternalLead({ firstName: "M", email: "matthew.bailie+x@gmail.com" }), true, "pre-flag owner gmail");
  assert.equal(isStoredInternalLead({ firstName: "Jane", lastName: "Doe", email: "jane@example.com" }), false);
  assert.equal(isStoredInternalLead({ firstName: "Celeste", lastName: "Testa", email: "celeste@contest.com" }), false);
});

test("admin-utils isInternalLead and isStoredInternalLead match the server helpers", () => {
  const fixtures = [
    { firstName: "TEST", lastName: "x", email: "a@b.com" },
    { name: "jane", email: "qa.test@b.com" },
    { name: "M", email: "matthewbailie@gmail.com" },
    { name: "M", email: "matthew.bailie+x@gmail.com" },
    { name: "Jane", email: "j@b.com", flag: "1" },
    { name: "Celeste Testa", email: "celeste@contest.com" },
    { name: "Jane Doe", email: "jane@example.com" },
    { internal: true, firstName: "Jane", email: "jane@example.com" },
    { internal: false, firstName: "TEST", email: "qa.test@b.com" },
    { firstName: "TEST", lastName: "Run", email: "a@b.com" },
    { firstName: "Jane", lastName: "Doe", email: "jane@example.com" },
  ];
  for (const f of fixtures) {
    assert.equal(adminUtils.isInternalLead(f), isInternalLead(f), JSON.stringify(f));
    assert.equal(adminUtils.isStoredInternalLead(f), isStoredInternalLead(f), JSON.stringify(f));
  }
});

test("holdsFrom skips TEST/internal book-mode rows, including pre-flag fallbacks; a real row still holds", () => {
  const hs = d.holdsFrom([
    bookHold({ firstName: "Jane", lastName: "Doe", email: "jane@example.com" }),
    bookHold({ internal: true, firstName: "Lab", lastName: "Run", email: "lab@example.com", chamberStyle: "sitting" }),
    bookHold({ firstName: "TEST", lastName: "Hold", email: "tester@example.com" }),
    bookHold({ bookingMode: "lead", status: "lead", firstName: "Partial", email: "p@example.com" }),
    bookHold({ status: "converted", firstName: "Done", email: "done@example.com" }),
  ]);
  assert.equal(hs.length, 1);
  assert.equal(hs[0].style, "lying");
  assert.equal(hs[0].startDate, windowStart);
});

test("a TEST/internal book-mode row does not reduce availability or capacity; a real row still does", () => {
  assert.equal(d.capacity(base, "lying", windowStart, windowEnd), 2);

  const realHolds = d.holdsFrom([bookHold({ firstName: "Jane", email: "jane@example.com" })]);
  assert.equal(realHolds.length, 1);
  assert.equal(d.capacity({ ...base, holds: realHolds }, "lying", windowStart, windowEnd), 1, "real hold takes one pair");

  const flagged = d.holdsFrom([bookHold({ internal: true, firstName: "Lab", email: "lab@example.com" })]);
  assert.equal(flagged.length, 0);
  assert.equal(d.capacity({ ...base, holds: flagged }, "lying", windowStart, windowEnd), 2);

  const legacy = d.holdsFrom([bookHold({ firstName: "TEST", lastName: "Booking", email: "run@example.com" })]);
  assert.equal(legacy.length, 0);
  assert.equal(d.capacity({ ...base, holds: legacy }, "lying", windowStart, windowEnd), 2);

  const mixed = d.holdsFrom([
    bookHold({ firstName: "Jane", email: "jane@example.com" }),
    bookHold({ internal: true, firstName: "Lab", email: "lab@example.com" }),
    bookHold({ firstName: "TEST", lastName: "Booking", email: "run@example.com" }),
  ]);
  assert.equal(mixed.length, 1);
  assert.equal(d.capacity({ ...base, holds: mixed }, "lying", windowStart, windowEnd), 1);

  const date = d.dateAvailable({ ...base, holds: flagged, style: "lying", months: 4, today, date: windowStart });
  assert.equal(date.ok, true, "TEST hold leaves the date bookable");
  const blocked = d.dateAvailable({
    ...base,
    holds: d.holdsFrom([
      bookHold({ firstName: "A", email: "a@example.com" }),
      bookHold({ firstName: "B", email: "b@example.com" }),
    ]),
    style: "lying",
    months: 4,
    today,
    date: windowStart,
  });
  assert.equal(blocked.ok, false, "two real holds fill both pairs");
  assert.equal(blocked.reason, "no chamber free for that window");
});

test("unfinished step-1 filter includes a real lead older than 24h and sorts oldest first", () => {
  const older = lead({ id: "old", email: "old@example.com", firstName: "Old", createdAt: hoursAgo(72) });
  const newer = lead({ id: "newish", email: "newish@example.com", firstName: "Newish", createdAt: hoursAgo(25) });
  const outOfArea = lead({ id: "ooa", email: "ooa@example.com", firstName: "Out", outOfArea: true, createdAt: hoursAgo(30) });
  const got = adminUtils.unfinishedStep1Leads([newer, older, outOfArea], NOW);
  assert.deepEqual(got.real.map((b) => b.id), ["old", "ooa", "newish"]);
  assert.equal(got.count, 3);
  assert.deepEqual(got.internal, []);
});

test("unfinished step-1 filter excludes TEST/internal, rows younger than 24h, and leads that already completed a request", () => {
  const real = lead({ id: "real", email: "real@example.com" });
  const flagged = lead({ id: "flag", email: "flag@example.com", firstName: "Lab", internal: true, createdAt: hoursAgo(40) });
  const legacyTest = lead({ id: "legacy", email: "qa.test@example.com", firstName: "Pat", createdAt: hoursAgo(40) });
  const young = lead({ id: "young", email: "young@example.com", createdAt: hoursAgo(12) });
  const exact24 = lead({ id: "edge", email: "edge@example.com", createdAt: hoursAgo(24) });
  const finishedLead = lead({ id: "partial", email: "done@example.com", createdAt: hoursAgo(50) });
  const completed = { id: "done", status: "approved", bookingMode: "book", email: "done@example.com", createdAt: hoursAgo(10) };
  const otherCompleted = { id: "other", status: "converted", bookingMode: "book", email: "someone-else@example.com", createdAt: hoursAgo(10) };

  const got = adminUtils.unfinishedStep1Leads(
    [real, flagged, legacyTest, young, exact24, finishedLead, completed, otherCompleted],
    NOW
  );
  assert.deepEqual(got.real.map((b) => b.id), ["real"]);
  assert.equal(got.count, 1);
  assert.deepEqual(got.internal.map((b) => b.id).sort(), ["flag", "legacy"]);
  assert.ok(!got.real.some((b) => b.id === "young" || b.id === "edge" || b.id === "partial"));
});

test("unfinished view count is real rows only; TEST/internal are returned separately, oldest first", () => {
  const realOld = lead({ id: "r1", email: "r1@example.com", createdAt: hoursAgo(80) });
  const realNew = lead({ id: "r2", email: "r2@example.com", createdAt: hoursAgo(26) });
  const testOld = lead({ id: "t1", firstName: "TEST", email: "t1@example.com", createdAt: hoursAgo(90) });
  const testNew = lead({ id: "t2", internal: true, email: "t2@example.com", createdAt: hoursAgo(30) });
  const got = adminUtils.unfinishedStep1Leads([testNew, realNew, testOld, realOld], NOW);
  assert.deepEqual(got.real.map((b) => b.id), ["r1", "r2"]);
  assert.deepEqual(got.internal.map((b) => b.id), ["t1", "t2"]);
  assert.equal(got.count, got.real.length);
  assert.equal(got.count, 2);
  assert.ok(!got.internal.some((b) => got.real.includes(b)));
});

test("admin portal wires the unfinished filter, hides archived email on that view, and excludes TEST holds from scheduled capacity", () => {
  assert.match(adminHtml, /<option value="unfinished-step1">Unfinished step-1 leads > 24h<\/option>/);
  assert.match(adminHtml, /id="bookingsUnfinishedSummary"/);
  assert.match(adminHtml, /1 unfinished step-1 lead/);
  assert.match(adminHtml, /\$\{unfinished\.count\} unfinished step-1 leads/);
  assert.match(adminHtml, /Internal \/ TEST — not in the partial-lead count/);
  assert.match(adminHtml, /No unfinished step-1 leads older than 24 hours\./);
  assert.match(adminHtml, /const special = window\.PurebaricAdminUtils\.UNFINISHED_STEP1_FILTER;/);
  assert.match(adminHtml, /status && status !== special/);
  assert.match(adminHtml, /emailBtn\.hidden = filter !== 'archived'/);
  assert.match(adminHtml, /unfinishedStep1Leads\(_bookings \|\| \[\]\)/);
  assert.match(adminHtml, /isStoredInternalLead\(b\)\)\.length/);
  assert.match(adminHtml, /PurebaricAdminUtils\.isStoredInternalLead\(b\)/);
  assert.equal(adminUtils.UNFINISHED_STEP1_LABEL, "Unfinished step-1 leads > 24h");
  assert.equal(adminUtils.UNFINISHED_STEP1_FILTER, "unfinished-step1");
});
