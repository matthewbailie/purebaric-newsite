const { test } = require("node:test");
const assert = require("node:assert/strict");
const { cleanLayout } = require("../netlify/functions/_lib/layout");

test("cleanLayout keeps valid section orders and drops junk", () => {
  assert.deepEqual(cleanLayout({ "home-health": ["a", "b", "a", "c d", 5, "ok-1"], bad: "x", "bad key!": ["z"] }), { "home-health": ["a", "b", "ok-1"] });
  assert.deepEqual(cleanLayout(null), {});
  assert.deepEqual(cleanLayout([1, 2]), {});
  assert.equal(Object.keys(cleanLayout(Object.fromEntries(Array.from({ length: 60 }, (_, i) => [`s${i}`, ["a"]])))).length, 30);
  assert.equal(cleanLayout({ s: Array.from({ length: 60 }, (_, i) => `k${i}`) }).s.length, 30);
});
