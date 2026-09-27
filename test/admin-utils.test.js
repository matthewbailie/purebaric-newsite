const { test } = require("node:test");
const assert = require("node:assert/strict");
const { matchesSearch, orderByKeys } = require("../admin-utils");

test("matchesSearch: empty query matches everything, words are AND-ed and case-insensitive", () => {
  assert.equal(matchesSearch("", ["Ann Lee"]), true);
  assert.equal(matchesSearch("  ", []), true);
  assert.equal(matchesSearch("ann", ["Ann Lee", "ann@x.com"]), true);
  assert.equal(matchesSearch("lee ann", ["Ann Lee"]), true);
  assert.equal(matchesSearch("ann bob", ["Ann Lee"]), false);
  assert.equal(matchesSearch("gmail", ["Ann Lee", "ann@gmail.com", null, undefined]), true);
});

test("matchesSearch: phone numbers match on digits regardless of formatting", () => {
  assert.equal(matchesSearch("801 555", ["Ann", "(801) 555-1234"]), true);
  assert.equal(matchesSearch("555-1234", ["8015551234"]), true);
  assert.equal(matchesSearch("(801)", ["801.555.1234"]), true);
  assert.equal(matchesSearch("999", ["8015551234"]), false);
  assert.equal(matchesSearch("12", ["Room 123"]), true); // ordinary text match still works
});

test("orderByKeys: listed keys first in order, the rest keep their relative order", () => {
  const items = ["a", "b", "c", "d"];
  assert.deepEqual(orderByKeys(items, ["c", "a"]), ["c", "a", "b", "d"]);
  assert.deepEqual(orderByKeys(items, []), items);
  assert.deepEqual(orderByKeys(items, ["zzz", "d"]), ["d", "a", "b", "c"]);
  assert.deepEqual(orderByKeys([{ k: "x" }, { k: "y" }], ["y"], (o) => o.k), [{ k: "y" }, { k: "x" }]);
});
