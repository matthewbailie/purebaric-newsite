const { test } = require("node:test");
const assert = require("node:assert/strict");
const {
  normalizeNumber,
  normalizeEmail,
  gatewayAddress,
  normalizeNotifications,
  recipientsForEvent,
  smsForEvent,
  emailsForEvent,
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

test("normalize drops sms recipients missing a number, carrier, or event", () => {
  const out = normalizeNotifications({ sms: [
    { number: "8015551234", carrier: "verizon", events: ["reservation_in", "bogus"] },
    { number: "bad", carrier: "verizon", events: ["review"] },
    { number: "8015550000", carrier: "verizon", events: [] },
  ] });
  assert.equal(out.sms.length, 1);
  assert.deepEqual(out.sms[0].events, ["reservation_in"]);
});

test("smsForEvent returns only subscribed gateway addresses (legacy 'recipients' key works)", () => {
  const cfg = { recipients: [
    { number: "8015551111", carrier: "verizon", events: ["reservation_in", "reservation_out"] },
    { number: "8015552222", carrier: "att", events: ["review"] },
    { number: "8015553333", carrier: "tmobile", events: ["reservation_in"] },
  ] };
  assert.deepEqual(smsForEvent(cfg, "reservation_in"), ["8015551111@vtext.com", "8015553333@tmomail.net"]);
  assert.deepEqual(recipientsForEvent(cfg, "review"), ["8015552222@txt.att.net"]); // alias
  assert.deepEqual(smsForEvent(cfg, "reservation_out"), ["8015551111@vtext.com"]);
});

test("normalizeEmail validates and lowercases", () => {
  assert.equal(normalizeEmail("  Owner@Example.COM "), "owner@example.com");
  assert.equal(normalizeEmail("not-an-email"), null);
  assert.equal(normalizeEmail("a@b"), null);
});

test("emailsForEvent returns only subscribed, valid emails (de-duped)", () => {
  const cfg = { emails: [
    { label: "Owner", email: "owner@purebaric.com", events: ["reservation_in", "reservation_out", "review"] },
    { email: "front-desk@purebaric.com", events: ["review"] },
    { email: "bad-email", events: ["review"] },        // dropped: invalid
    { email: "nobody@purebaric.com", events: [] },      // dropped: no events
  ] };
  assert.deepEqual(emailsForEvent(cfg, "review"), ["owner@purebaric.com", "front-desk@purebaric.com"]);
  assert.deepEqual(emailsForEvent(cfg, "reservation_in"), ["owner@purebaric.com"]);
});

test("emails and sms coexist in one config", () => {
  const cfg = {
    emails: [{ email: "owner@purebaric.com", events: ["reservation_in"] }],
    sms: [{ number: "8015551111", carrier: "verizon", events: ["reservation_in"] }],
  };
  const norm = normalizeNotifications(cfg);
  assert.equal(norm.emails.length, 1);
  assert.equal(norm.sms.length, 1);
  assert.deepEqual(emailsForEvent(cfg, "reservation_in"), ["owner@purebaric.com"]);
  assert.deepEqual(smsForEvent(cfg, "reservation_in"), ["8015551111@vtext.com"]);
});
