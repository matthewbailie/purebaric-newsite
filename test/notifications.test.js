const { test } = require("node:test");
const assert = require("node:assert/strict");
const {
  normalizeNumber,
  normalizeEmail,
  gatewayAddress,
  normalizeNotifications,
  recipientsForEvent,
  smsForEvent,
  smsNumbersForEvent,
  emailsForEvent,
  hasActiveConsent,
  stampSmsConsent,
  CONSENT_VERSION,
} = require("../netlify/functions/_lib/notifications");

const CONSENTED = { given: true, at: "2026-09-26T00:00:00.000Z", by: "owner@purebaric.com", version: CONSENT_VERSION, status: "enabled" };

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

test("smsForEvent returns only subscribed gateway addresses with active consent (legacy 'recipients' key works)", () => {
  const cfg = { recipients: [
    { number: "8015551111", carrier: "verizon", events: ["reservation_in", "reservation_out"], consent: CONSENTED },
    { number: "8015552222", carrier: "att", events: ["review"], consent: CONSENTED },
    { number: "8015553333", carrier: "tmobile", events: ["reservation_in"], consent: CONSENTED },
  ] };
  assert.deepEqual(smsForEvent(cfg, "reservation_in"), ["8015551111@vtext.com", "8015553333@tmomail.net"]);
  assert.deepEqual(recipientsForEvent(cfg, "review"), ["8015552222@txt.att.net"]); // alias
  assert.deepEqual(smsForEvent(cfg, "reservation_out"), ["8015551111@vtext.com"]);
});

test("SMS consent gating: no consent, disabled, or opted-out numbers never receive alerts", () => {
  const cfg = { sms: [
    { number: "8015551111", carrier: "verizon", events: ["reservation_in"] }, // no consent object at all
    { number: "8015552222", carrier: "verizon", events: ["reservation_in"], consent: { given: false, status: "disabled" } },
    { number: "8015553333", carrier: "verizon", events: ["reservation_in"], consent: { given: true, status: "opted_out" } },
    { number: "8015554444", carrier: "verizon", events: ["reservation_in"], consent: CONSENTED }, // the only eligible one
  ] };
  assert.deepEqual(smsForEvent(cfg, "reservation_in"), ["8015554444@vtext.com"]);
  assert.deepEqual(smsNumbersForEvent(cfg, "reservation_in"), ["8015554444"]);
});

test("hasActiveConsent requires given === true AND status === 'enabled'", () => {
  assert.equal(hasActiveConsent({ consent: CONSENTED }), true);
  assert.equal(hasActiveConsent({ consent: { given: true, status: "disabled" } }), false);
  assert.equal(hasActiveConsent({ consent: { given: false, status: "enabled" } }), false);
  assert.equal(hasActiveConsent({}), false);
});

test("normalizeNotifications never fabricates consent — unspecified consent normalizes to disabled/not-given", () => {
  const out = normalizeNotifications({ sms: [
    { number: "8015551234", carrier: "verizon", events: ["reservation_in"] },
  ] });
  assert.equal(out.sms[0].consent.given, false);
  assert.equal(out.sms[0].consent.status, "disabled");
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

test("stampSmsConsent: checking the box for the first time stamps a brand-new consent event", () => {
  const incoming = [{ number: "8015551234", carrier: "verizon", events: ["reservation_in"], consentChecked: true }];
  const out = stampSmsConsent(incoming, [], "owner@purebaric.com", "2026-09-26T00:00:00.000Z");
  assert.deepEqual(out[0].consent, {
    given: true, at: "2026-09-26T00:00:00.000Z", by: "owner@purebaric.com", version: CONSENT_VERSION, status: "enabled",
  });
  assert.equal(out[0].consentChecked, undefined); // internal flag never leaks into the stored record
});

test("stampSmsConsent: leaving an already-active row checked does not fabricate a new timestamp", () => {
  const existing = [{ id: "r1", number: "8015551234", carrier: "verizon", events: ["reservation_in"],
    consent: { given: true, at: "2026-01-01T00:00:00.000Z", by: "owner@purebaric.com", version: CONSENT_VERSION, status: "enabled" } }];
  const incoming = [{ id: "r1", number: "8015551234", carrier: "verizon", events: ["reservation_in", "review"], consentChecked: true }];
  const out = stampSmsConsent(incoming, existing, "owner@purebaric.com", "2026-09-26T00:00:00.000Z");
  assert.equal(out[0].consent.at, "2026-01-01T00:00:00.000Z"); // unchanged
  assert.deepEqual(out[0].events, ["reservation_in", "review"]); // other fields still update
});

test("stampSmsConsent: unchecking the box disables delivery immediately but keeps history", () => {
  const existing = [{ id: "r1", number: "8015551234", carrier: "verizon", events: ["reservation_in"],
    consent: { given: true, at: "2026-01-01T00:00:00.000Z", by: "owner@purebaric.com", version: CONSENT_VERSION, status: "enabled" } }];
  const incoming = [{ id: "r1", number: "8015551234", carrier: "verizon", events: ["reservation_in"], consentChecked: false }];
  const out = stampSmsConsent(incoming, existing, "owner@purebaric.com", "2026-09-26T00:00:00.000Z");
  assert.equal(out[0].consent.given, false);
  assert.equal(out[0].consent.status, "disabled");
  assert.equal(out[0].consent.at, "2026-01-01T00:00:00.000Z"); // audit trail preserved
});

test("stampSmsConsent: re-checking after a disable stamps a fresh consent event (no silent carry-forward)", () => {
  const existing = [{ id: "r1", number: "8015551234", carrier: "verizon", events: ["reservation_in"],
    consent: { given: false, at: "2026-01-01T00:00:00.000Z", by: "owner@purebaric.com", version: CONSENT_VERSION, status: "disabled" } }];
  const incoming = [{ id: "r1", number: "8015551234", carrier: "verizon", events: ["reservation_in"], consentChecked: true }];
  const out = stampSmsConsent(incoming, existing, "owner@purebaric.com", "2026-09-26T12:00:00.000Z");
  assert.equal(out[0].consent.given, true);
  assert.equal(out[0].consent.status, "enabled");
  assert.equal(out[0].consent.at, "2026-09-26T12:00:00.000Z"); // fresh timestamp, not carried forward
});

test("stampSmsConsent: changing the phone number requires fresh consent even if checked", () => {
  const existing = [{ id: "r1", number: "8015551234", carrier: "verizon", events: ["reservation_in"],
    consent: { given: true, at: "2026-01-01T00:00:00.000Z", by: "owner@purebaric.com", version: CONSENT_VERSION, status: "enabled" } }];
  const incoming = [{ id: "r1", number: "8015559999", carrier: "verizon", events: ["reservation_in"], consentChecked: true }];
  const out = stampSmsConsent(incoming, existing, "owner@purebaric.com", "2026-09-26T00:00:00.000Z");
  assert.equal(out[0].consent.at, "2026-09-26T00:00:00.000Z"); // new number -> new consent event
});

test("emails and sms coexist in one config", () => {
  const cfg = {
    emails: [{ email: "owner@purebaric.com", events: ["reservation_in"] }],
    sms: [{ number: "8015551111", carrier: "verizon", events: ["reservation_in"], consent: CONSENTED }],
  };
  const norm = normalizeNotifications(cfg);
  assert.equal(norm.emails.length, 1);
  assert.equal(norm.sms.length, 1);
  assert.deepEqual(emailsForEvent(cfg, "reservation_in"), ["owner@purebaric.com"]);
  assert.deepEqual(smsForEvent(cfg, "reservation_in"), ["8015551111@vtext.com"]);
});
