const { test } = require("node:test");
const assert = require("node:assert/strict");
const { matchesSearch, orderByKeys, customerKey, findCustomerFor } = require("../admin-utils");
const { renterKey } = require("../netlify/functions/_lib/customer-key");

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

test("customerKey matches the server's renterKey for every fallback", () => {
  for (const p of [{ email: " Sam@X.com ", phone: "8015551212" }, { name: "Cassie Johnson", phone: "+1 (801) 358-3141" }, { name: "  Cassie   Johnson " }, {}, { email: "", phone: "", name: "" }]) {
    assert.equal(customerKey(p), renterKey(p));
  }
  assert.equal(customerKey({ name: "Cassie Johnson" }), "name:cassie johnson");
  assert.equal(customerKey({ email: "x@y.com", phone: "801" }), "x@y.com");
});

test("findCustomerFor: by name, phone breaks a tie, then email, then phone", () => {
  const cs = [
    { key: "name:sam lee|phone:8011111111", nameKey: "sam lee", phoneDigits: "8011111111", email: "" },
    { key: "name:sam lee|phone:8012222222", nameKey: "sam lee", phoneDigits: "8012222222", email: "sam2@x.com" },
    { key: "name:cassie johnson", nameKey: "cassie johnson", phoneDigits: "", email: "" },
    { key: "anon@x.com", nameKey: "", phoneDigits: "", email: "anon@x.com" },
  ];
  assert.equal(findCustomerFor(cs, { name: "Cassie Johnson", email: "someone-elses@x.com" }).key, "name:cassie johnson");
  assert.equal(findCustomerFor(cs, { name: "Sam Lee", phone: "(801) 222-2222" }).key, "name:sam lee|phone:8012222222");
  assert.equal(findCustomerFor(cs, { name: "Sam Lee", email: "sam2@x.com" }).key, "name:sam lee|phone:8012222222");
  assert.equal(findCustomerFor(cs, { name: "", email: "Anon@x.com" }).key, "anon@x.com");
  assert.equal(findCustomerFor(cs, { name: "Nobody" }), null);
});

test("orderByKeys: listed keys first in order, the rest keep their relative order", () => {
  const items = ["a", "b", "c", "d"];
  assert.deepEqual(orderByKeys(items, ["c", "a"]), ["c", "a", "b", "d"]);
  assert.deepEqual(orderByKeys(items, []), items);
  assert.deepEqual(orderByKeys(items, ["zzz", "d"]), ["d", "a", "b", "c"]);
  assert.deepEqual(orderByKeys([{ k: "x" }, { k: "y" }], ["y"], (o) => o.k), [{ k: "y" }, { k: "x" }]);
});
