const { test } = require("node:test");
const assert = require("node:assert/strict");
const { parseBookingName } = require("../netlify/functions/_lib/booking-name");

test("booking name: first-name and last-name fields are used as sent", () => {
  assert.deepEqual(parseBookingName({ "first-name": " Ada ", "last-name": " Lovelace " }), { firstName: "Ada", lastName: "Lovelace" });
});

test("booking name: legacy customer_name is split; a single word leaves last name empty (rejected by the handler)", () => {
  assert.deepEqual(parseBookingName({ customer_name: "Mary Ann Smith" }), { firstName: "Mary", lastName: "Ann Smith" });
  assert.deepEqual(parseBookingName({ customer_name: "  Cher " }), { firstName: "Cher", lastName: "" });
  assert.deepEqual(parseBookingName({}), { firstName: "", lastName: "" });
  assert.deepEqual(parseBookingName({ "first-name": "Ada", "last-name": "   " }), { firstName: "Ada", lastName: "" });
});
