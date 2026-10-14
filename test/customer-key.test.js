const { test } = require("node:test");
const assert = require("node:assert/strict");
const { renterKey } = require("../netlify/functions/_lib/customer-key");
const M = require("../dashboard-metrics");

test("a renter is identified by name, else email, else phone", () => {
  assert.equal(renterKey({ email: " Sam@X.com ", phone: "8015551212" }), "sam@x.com");
  assert.equal(renterKey({ name: "Troy Miller", phone: "+1 (801) 358-3141" }), "name:troy miller");
  assert.equal(renterKey({ name: "Troy Miller", email: "a@x.com" }), renterKey({ name: "  troy   MILLER ", email: "b@x.com" }));
  assert.equal(renterKey({ phone: "+1 (801) 358-3141" }), "phone:8013583141");
  assert.equal(renterKey({}), "");
});

test("three email-less rentals with one phone are one customer and one subscriber", () => {
  const troy = { name: "Troy Miller", email: "", phone: "8013583141" };
  const rs = [
    { id: 1, status: "completed", startDate: "2025-11-24", endDate: "2026-01-23", renter: troy },
    { id: 2, status: "completed", startDate: "2026-06-18", endDate: "2026-08-17", renter: troy },
    { id: 3, status: "completed", startDate: "2026-08-18", endDate: "2026-09-17", renter: troy },
  ];
  assert.equal(new Set(rs.map((r) => renterKey(r.renter))).size, 1);
  assert.equal(M.snapshot(rs, "2026-06-20").subscribers, 1);
});
