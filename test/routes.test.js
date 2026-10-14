const { test } = require("node:test");
const assert = require("node:assert/strict");
const R = require("../netlify/functions/_lib/routes");

const day = (n, stops) => ({ n, area: `Area ${n}`, minutes: 100, best: 1, maps: "https://maps", stops });
const stop = (id, industry, also = []) => ({ id, stop: 1, name: id, industry, also, tier: "Best bet", address: "1 Main", city: "Lehi", zip: "84043", owner: "", phone: "", top: false, note: "", drive_min: 5 });
const plan = { market: "Utah", days: [
  day(1, [stop("a", "Gyms and fitness centers"), stop("b", "CrossFit and performance gyms", ["Second Gym"]), stop("c", "Physical therapy, chiropractic, and sports medicine")]),
  day(2, [stop("d", "Salons and beauty studios"), stop("e", "Recovery studios and med spas")]),
] };

test("pamphlets to take: one per business including the ones sharing an address, grouped by pamphlet", () => {
  const p = R.pamphletsFor(plan.days[0]);
  assert.equal(p.total, 4);
  assert.deepEqual(p.byPamphlet, [
    { pamphlet: "CrossFit and performance", count: 2 },
    { pamphlet: "Gyms and fitness", count: 1 },
    { pamphlet: "Physical therapy and chiropractic", count: 1 },
  ]);
  assert.equal(R.pamphletFor("Something new"), "Something new");
});

test("marking a route complete ticks every stop; unticking stops keeps the route marked; unknown ids are dropped", () => {
  let p = R.applyPatch({}, plan.days[0], { completed: true }, "2026-10-14T10:00:00Z");
  assert.deepEqual(p.days["1"].delivered.sort(), ["a", "b", "c"]);
  assert.equal(p.days["1"].completedAt, "2026-10-14T10:00:00Z");
  p = R.applyPatch(p, plan.days[0], { delivered: ["a", "zzz"] });
  assert.deepEqual(p.days["1"].delivered, ["a"]);
  assert.equal(p.days["1"].completed, true);
  p = R.applyPatch(p, plan.days[0], { completed: false, note: "  rained out  " });
  assert.equal(p.days["1"].completed, false);
  assert.equal(p.days["1"].completedAt, null);
  assert.equal(p.days["1"].note, "rained out");
  assert.deepEqual(p.days["1"].delivered, ["a"]);
});

test("summary counts businesses reached and routes done across the plan", () => {
  const p = R.applyPatch(R.applyPatch({}, plan.days[0], { completed: true }, "t"), plan.days[1], { delivered: ["d"] });
  const s = R.summarize(plan, p);
  assert.equal(s.stops, 5);
  assert.equal(s.delivered, 4);
  assert.equal(s.pct, 80);
  assert.equal(s.days, 2);
  assert.equal(s.daysDone, 1);
  assert.equal(s.byDay[1].delivered, 1);
  assert.equal(s.byDay[0].pamphlets.total, 4);
});

test("progress from the store is normalized defensively", () => {
  const p = R.normalizeProgress({ days: { 3: { completed: "yes", delivered: ["x", 5, "x"], note: 42 } } });
  assert.deepEqual(p.days["3"], { completed: true, completedAt: null, delivered: ["x"], note: "" });
  assert.deepEqual(R.normalizeProgress(null), { days: {} });
});
