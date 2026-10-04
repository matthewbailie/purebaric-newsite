const test = require("node:test");
const assert = require("node:assert/strict");
const email = require("../netlify/functions/_lib/email.js");

const entry = { id: "11111111-2222-4333-8444-555555555555", name: "Jane Test", confirmToken: "a".repeat(32), holdExpiresAt: "2026-10-06T18:00:00Z", wantsDiscount: true, discountPrice: 450 };

test("waitlist confirm link carries the entry id and its token", () => {
  const url = email.waitlistConfirmUrl(entry);
  assert.equal(url, `https://purebaric.com/waitlist-confirm?w=${entry.id}&t=${"a".repeat(32)}`);
  assert.equal(email.waitlistConfirmUrl({ id: entry.id }), "", "no token, no link");
});

test("chamber-ready text includes the confirm link and the requested rate", () => {
  const text = email.waitlistHoldSmsText(entry, { name: "LC-003", style: "lying" });
  assert.match(text, /a lying chamber is now available/);
  assert.match(text, /\$450 a month/);
  assert.match(text, /confirm here: https:\/\/purebaric\.com\/waitlist-confirm\?w=/);
  assert.doesNotMatch(text, /LC-003/, "unit number stays out of the customer text");
});
