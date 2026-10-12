const { test } = require("node:test");
const assert = require("node:assert/strict");
const { isComplete, toE164, twilioConfigFromEnv } = require("../netlify/functions/_lib/sms");

const full = { accountSid: "ACx", authToken: "tok", fromNumber: "+18015550123" };

test("isComplete needs all three keys", () => {
  assert.equal(isComplete(full), true);
  assert.equal(isComplete({ ...full, authToken: "" }), false);
  assert.equal(isComplete(null), false);
});

test("a paused config is treated as not configured, so texts fall back to carrier email-to-text", () => {
  assert.equal(isComplete({ ...full, paused: true }), false);
  assert.equal(isComplete({ ...full, paused: false }), true);
});

test("toE164 normalizes US numbers", () => {
  assert.equal(toE164("(801) 555-0123"), "+18015550123");
  assert.equal(toE164("18015550123"), "+18015550123");
  assert.equal(toE164("+18015550123"), "+18015550123");
  assert.equal(toE164("555"), null);
});

test("twilioConfigFromEnv is null unless all three env vars are set", () => {
  const saved = { ...process.env };
  delete process.env.TWILIO_ACCOUNT_SID; delete process.env.TWILIO_AUTH_TOKEN; delete process.env.TWILIO_FROM;
  assert.equal(twilioConfigFromEnv(), null);
  process.env.TWILIO_ACCOUNT_SID = "ACx"; process.env.TWILIO_AUTH_TOKEN = "tok"; process.env.TWILIO_FROM = "+18015550123";
  assert.deepEqual(twilioConfigFromEnv(), full);
  process.env = saved;
});
