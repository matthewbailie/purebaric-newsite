const { test } = require("node:test");
const assert = require("node:assert/strict");
const { normalizePaymentLinks } = require("../netlify/functions/_lib/storage");

test("payment links: only Stripe-hosted links are kept, per rental length, home and business", () => {
  const out = normalizePaymentLinks({ home: { 12: " https://buy.stripe.com/8x26oH1WW5ls6pZ9x08EM02 ", 3: "https://evil.example/pay", 1: "" }, business: { 12: "https://checkout.stripe.com/c/pay/cs_test_123" }, other: { 1: "https://buy.stripe.com/x" } });
  assert.deepEqual(out, { home: { 12: "https://buy.stripe.com/8x26oH1WW5ls6pZ9x08EM02" }, business: { 12: "https://checkout.stripe.com/c/pay/cs_test_123" } });
  assert.deepEqual(normalizePaymentLinks(null), { home: {}, business: {} });
  assert.deepEqual(normalizePaymentLinks({ home: { 13: "https://buy.stripe.com/x", 0: "https://buy.stripe.com/y" } }).home, {});
});
