const { test } = require("node:test");
const assert = require("node:assert/strict");
const {
  normalizeNumber,
  gatewayAddress,
  normalizeNotifications,
  recipientsForEvent,
} = require("../netlify/functions/_lib/notifications");

test("normalizeNumber strips formatting and a leading 1", () => {
  assert.equal(normalizeNumber("(801) 555-1234"), "8015551234");
  assert.equal(normalizeNumber("1-801-555-1234"), "8015551234");
  assert.equal(normalizeNumber("801.555.1234"), "8015551234");
  assert.equal(normalizeNumber("55512"), null);
});

test("gatewayAddress builds a carrier email-to-text address", () => {
  assert.equal(gatewayAddress("8015551234", "verizon"), "8015551234@vtext.com");
  assert.equal(gatewayAddress("8015551234", "att"), "8015551234@txt.att.net");
  assert.equal(gatewayAddress("8015551234", "unknowncarrier"), null);
});

test("normalize drops recipients missing a number, carrier, or event", () => {
  const out = normalizeNotifications({ recipients: [
    { number: "8015551234", carrier: "verizon", events: ["reservation_in", "bogus"] },
    { number: "bad", carrier: "verizon", events: ["review"] },
    { number: "8015550000", carrier: "verizon", events: [] },
  ] });
  assert.equal(out.recipients.length, 1);
  assert.deepEqual(out.recipients[0].events, ["reservation_in"]);
});

test("recipientsForEvent returns only subscribed gateway addresses", () => {
  const cfg = { recipients: [
    { number: "8015551111", carrier: "verizon", events: ["reservation_in", "reservation_out"] },
    { number: "8015552222", carrier: "att", events: ["review"] },
    { number: "8015553333", carrier: "tmobile", events: ["reservation_in"] },
  ] };
  assert.deepEqual(recipientsForEvent(cfg, "reservation_in"), ["8015551111@vtext.com", "8015553333@tmomail.net"]);
  assert.deepEqual(recipientsForEvent(cfg, "review"), ["8015552222@txt.att.net"]);
  assert.deepEqual(recipientsForEvent(cfg, "reservation_out"), ["8015551111@vtext.com"]);
});
