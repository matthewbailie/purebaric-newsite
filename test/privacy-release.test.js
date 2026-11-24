// Guards privacy.html against a bad merge in any release. Checks only phrases that
// must hold in every combination of pixel-fix-minimal, homepage-personalization and
// lead-source-tracking (Proof-reader verdicts, Nov 24). The lead-source-only
// sentences are guarded by privacy-final.test.js on that branch.
const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");
const html = fs.readFileSync(path.join(__dirname, "..", "privacy.html"), "utf8");
const text = html.replace(/<[^>]+>/g, "").replace(/&amp;/g, "&").replace(/\s+/g, " ");

test("privacy.html keeps the live GPC/DNT line, the Meta bullet and the remarketing disclosure", () => {
  assert.ok(text.includes("We honor Global Privacy Control and Do Not Track. If your browser sends either signal, or you turn off analytics on this device, Google Analytics and the Meta (Facebook) pixel don't load at all."));
  assert.ok(text.includes("Meta (Facebook), through its pixel"));
  assert.ok(text.includes("We may use the Meta pixel to show our own ads again, on Facebook and Instagram, to people who've visited our site."));
  assert.ok(!/does not enable personalized advertising or remarketing/i.test(text));
});

test("privacy.html has the approved personalization paragraph and none of the rejected wording", () => {
  assert.ok(text.includes("To show you the chamber you looked at when you come back, this site keeps a small record in your own browser (local storage, not a cookie)."));
  assert.ok(text.includes("it expires after 45 days without a visit"));
  assert.ok(text.includes("the 1 in 10 visitors who always see the standard homepage."));
  assert.ok(!/turn analytics off below/i.test(text));
  assert.ok(!/cookie banner/i.test(text));
});
