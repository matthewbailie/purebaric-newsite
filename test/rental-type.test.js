const { test } = require("node:test");
const assert = require("node:assert/strict");
const { cleanRentalType, cleanBusinessName, isBusiness } = require("../netlify/functions/_lib/rental-type");

test("cleanRentalType defaults to residential and accepts business in any case", () => {
  assert.equal(cleanRentalType(undefined), "residential");
  assert.equal(cleanRentalType(""), "residential");
  assert.equal(cleanRentalType("home"), "residential");
  assert.equal(cleanRentalType("business"), "business");
  assert.equal(cleanRentalType(" Business "), "business");
  assert.equal(cleanRentalType("residential"), "residential");
});

test("cleanBusinessName trims and caps", () => {
  assert.equal(cleanBusinessName("  Hello Sugar  "), "Hello Sugar");
  assert.equal(cleanBusinessName(null), "");
  assert.equal(cleanBusinessName("x".repeat(500)).length, 120);
});

test("isBusiness reads the record's type; older records with no type are residential", () => {
  assert.equal(isBusiness({ rentalType: "business" }), true);
  assert.equal(isBusiness({ rentalType: "residential" }), false);
  assert.equal(isBusiness({}), false);
  assert.equal(isBusiness(null), false);
});
