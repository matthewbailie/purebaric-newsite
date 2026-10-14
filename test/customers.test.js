const { test } = require("node:test");
const assert = require("node:assert/strict");
const { groupCustomers, findMergeTarget } = require("../netlify/functions/_lib/customers");

const rental = (id, renter, extra = {}) => ({ id, status: "active", startDate: "2026-10-01", endDate: "2026-11-01", paidAmount: 100, createdAt: "2026-10-01T00:00:00Z", renter, ...extra });

test("the name is the identity: a rental carrying someone else's email still files under its own name", () => {
  const manual = [
    { id: "m1", name: "Brooke Mickelsen", email: "brooke@x.com", phone: "", createdAt: "2026-10-01T00:00:00Z", updatedAt: "2026-10-01T00:00:00Z" },
    { id: "m2", name: "Cassie Johnson", email: "", phone: "", createdAt: "2026-10-02T00:00:00Z", updatedAt: "2026-10-02T00:00:00Z" },
  ];
  const rentals = [
    rental("r1", { name: "Brooke Mickelsen", email: "brooke@x.com", phone: "8015550000" }),
    rental("r2", { name: "Cassie Johnson", email: "brooke@x.com", phone: "8015550000" }, { rentalType: "business" }),
  ];
  const cs = groupCustomers({ manualCustomers: manual, rentals });
  const brooke = cs.find((c) => c.name === "Brooke Mickelsen"), cassie = cs.find((c) => c.name === "Cassie Johnson");
  assert.equal(cs.length, 2);
  assert.deepEqual(brooke.rentals.map((r) => r.id), ["r1"]);
  assert.deepEqual(cassie.rentals.map((r) => r.id), ["r2"]);
  assert.equal(cassie.manualId, "m2");
  assert.equal(cassie.key, "name:cassie johnson");
});

test("two customers with the same name are told apart by phone; a rental goes to the one whose phone it carries", () => {
  const manual = [
    { id: "a", name: "Sam Lee", email: "", phone: "801-111-1111" },
    { id: "b", name: "Sam Lee", email: "sam2@x.com", phone: "(801) 222-2222" },
  ];
  const rentals = [rental("r1", { name: "Sam Lee", phone: "8012222222" }), rental("r2", { name: "sam lee", email: "", phone: "+1 801 111 1111" })];
  const cs = groupCustomers({ manualCustomers: manual, rentals });
  assert.equal(cs.length, 2);
  const a = cs.find((c) => c.manualId === "a"), b = cs.find((c) => c.manualId === "b");
  assert.equal(a.key, "name:sam lee|phone:8011111111");
  assert.equal(b.key, "name:sam lee|phone:8012222222");
  assert.deepEqual(a.rentals.map((r) => r.id), ["r2"]);
  assert.deepEqual(b.rentals.map((r) => r.id), ["r1"]);
});

test("records with no manual customer still group: by name, then email, then phone; bookings and waitlist join by name", () => {
  const cs = groupCustomers({
    rentals: [rental("r1", { name: "Troy Miller", phone: "8013583141" }), rental("r2", { name: "Troy Miller", phone: "801-358-3141" }), rental("r3", { name: "", email: "anon@x.com" })],
    bookings: [{ id: "b1", firstName: "Troy", lastName: "Miller", email: "troy@x.com", createdAt: "2026-09-01T00:00:00Z" }],
    waitlist: [{ id: "w1", name: "Anon", email: "anon@x.com", createdAt: "2026-09-02T00:00:00Z" }],
  });
  const troy = cs.find((c) => c.name === "Troy Miller");
  assert.equal(troy.rentals.length, 2);
  assert.equal(troy.bookings.length, 1);
  assert.equal(troy.email, "troy@x.com");
  const anon = cs.find((c) => c.email === "anon@x.com");
  assert.equal(anon.rentals.length, 1);
  assert.equal(anon.waitlist.length, 1);
  assert.equal(anon.name, "Anon");
  assert.equal(cs.length, 2);
});

test("a new manual record merges into the same name unless both phones are set and differ", () => {
  const all = [{ id: "a", name: "Sam Lee", phone: "8011111111", email: "" }, { id: "n", name: "", email: "only@x.com", phone: "" }];
  assert.equal(findMergeTarget(all, { name: "sam lee", phone: "" }).id, "a");
  assert.equal(findMergeTarget(all, { name: "Sam Lee", phone: "801-111-1111" }).id, "a");
  assert.equal(findMergeTarget(all, { name: "Sam Lee", phone: "8019999999" }), null);
  assert.equal(findMergeTarget(all, { name: "", email: "Only@x.com" }).id, "n");
  assert.equal(findMergeTarget(all, { name: "New Person" }), null);
});
