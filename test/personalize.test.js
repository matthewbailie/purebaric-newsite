const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const PZ = require("../pb-personalize.js");

const DAY = 864e5;
const T0 = Date.UTC(2026, 10, 24, 19);

test("a first visit with no signals gets the default homepage", () => {
  const p = PZ.fresh(T0, 0.5);
  assert.equal(PZ.decide(p, T0), null);
});

test("one sitting CTA click qualifies; the hero shows sitting", () => {
  const p = PZ.add(PZ.fresh(T0, 0.5), "sitting", "cta", T0);
  const d = PZ.decide(p, T0 + DAY);
  assert.equal(d.interest, "sitting");
  assert.equal(d.variant, "personalized");
  assert.equal(d.reason, "behavior");
});

test("a 3 second dwell alone is too weak to change the hero", () => {
  const p = PZ.add(PZ.fresh(T0, 0.5), "sitting", "dwell", T0);
  assert.equal(PZ.decide(p, T0), null);
});

test("viewing both chambers equally does not pick one", () => {
  let p = PZ.fresh(T0, 0.5);
  p = PZ.add(p, "sitting", "cta", T0);
  p = PZ.add(p, "lying", "cta", T0);
  assert.equal(PZ.decide(p, T0), null);
});

test("recency: signals halve every 14 days, so a fresh one wins over an old one", () => {
  let p = PZ.fresh(T0, 0.5);
  p = PZ.add(p, "lying", "book_param", T0);           // 4 points, 20 days ago
  p = PZ.add(p, "sitting", "book_param", T0 + 20 * DAY); // 4 points, today
  assert.equal(PZ.decide(p, T0 + 20 * DAY).interest, "sitting");
  assert.ok(Math.abs(PZ.decay(4, T0, T0 + 14 * DAY) - 2) < 1e-9);
});

test("ad tags map to an interest and the reason is the ad", () => {
  assert.deepEqual(
    PZ.signalsFromUrl("?utm_source=meta&utm_campaign=30d_home_v1&utm_content=sitting_chamber&utm_term=sitting_50_70", "/book"),
    [["sitting", "utm"]]
  );
  assert.deepEqual(PZ.signalsFromUrl("?utm_content=clinic_compare&utm_term=home_50_70", "/book"), []);
  const p = PZ.add(PZ.fresh(T0, 0.5), "sitting", "utm", T0);
  assert.equal(PZ.decide(p, T0).reason, "ad");
  assert.deepEqual(PZ.signalsFromUrl("?type=business", "/book"), [["business", "book_param"]]);
  assert.deepEqual(PZ.signalsFromUrl("?chamber=lying&months=4", "/book"), [["lying", "book_param"]]);
});

test("10% holdout: control visitors get a decision but variant control", () => {
  const p = PZ.add(PZ.fresh(T0, 0.05), "sitting", "cta", T0);
  assert.equal(p.g, "c");
  assert.equal(PZ.decide(p, T0).variant, "control");
  assert.equal(PZ.fresh(T0, 0.1).g, "p");
});

test("profiles expire after 45 idle days and bad data is ignored", () => {
  const p = PZ.add(PZ.fresh(T0, 0.5), "sitting", "cta", T0);
  assert.ok(PZ.parse(JSON.stringify(p), T0 + 44 * DAY));
  assert.equal(PZ.parse(JSON.stringify(p), T0 + 46 * DAY), null);
  assert.equal(PZ.parse("{not json", T0), null);
  assert.equal(PZ.parse(JSON.stringify({ v: 1, g: "x", u: T0 }), T0), null);
});

test("nudge only on a later visit and never within 30 days of a request", () => {
  let p = PZ.add(PZ.fresh(T0, 0.5), "sitting", "cta", T0);
  p.n = 1; p.ss = T0;
  assert.equal(PZ.decide(p, T0).nudge, false);
  p.n = 2; p.ss = T0 + 3 * DAY;
  assert.equal(PZ.decide(p, T0 + 3 * DAY).nudge, true);
  p.lead = T0 + DAY;
  assert.equal(PZ.decide(p, T0 + 3 * DAY).nudge, false);
});

test("city pages and links", () => {
  assert.equal(PZ.cityFromPath("/hyperbaric-chamber-rental/park-city"), "park-city");
  assert.equal(PZ.cityFromPath("/use-cases/longevity"), null);
  assert.equal(PZ.interestFromHref("/book?chamber=sitting"), "sitting");
  assert.equal(PZ.interestFromHref("/book?type=business"), "business");
  assert.equal(PZ.interestFromHref("/pricing"), null);
});

test("opt-outs: GPC, DNT, analytics declined, personalization off", () => {
  const ls = (m) => ({ getItem: (k) => m[k] || null });
  assert.equal(PZ.optedOut({ navigator: { globalPrivacyControl: true }, localStorage: ls({}) }), true);
  assert.equal(PZ.optedOut({ navigator: { doNotTrack: "1" }, localStorage: ls({}) }), true);
  assert.equal(PZ.optedOut({ navigator: {}, localStorage: ls({ pb_cookie: "decline" }) }), true);
  assert.equal(PZ.optedOut({ navigator: {}, localStorage: ls({ pb_pz_off: "1" }) }), true);
  assert.equal(PZ.optedOut({ navigator: {}, localStorage: ls({}) }), false);
});

test("the stored profile never holds raw URLs, UTM values or PII-shaped keys", () => {
  const p = PZ.add(PZ.fresh(T0, 0.5), "sitting", "utm", T0);
  const json = JSON.stringify(p);
  assert.ok(!/utm|http|@|zip|name|phone/i.test(json), json);
});

test("homepage copy is reused site copy with no medical claims", () => {
  const home = fs.readFileSync(path.join(__dirname, "..", "index.html"), "utf8");
  assert.match(home, /<script src="\/pb-personalize\.js" async blocking="render"><\/script>/);
  assert.match(home, /PBPZ\.applyHome\(\)/);
  const copy = JSON.stringify(PZ.HOME);
  assert.ok(!/treat|cure|heal|diagnos|disease|FDA|therapy/i.test(copy), copy);
});

test("request mode: nudge and business CTA use the request-mode wording (Proof-reader, Nov 24)", () => {
  const doc = (req) => ({ documentElement: { classList: { contains: (c) => req && c === "reqmode-site" } } });
  assert.equal(PZ.requestMode(doc(true)), true);
  assert.equal(PZ.requestMode(doc(false)), false);
  assert.equal(PZ.requestMode({}), false);
  assert.equal(PZ.NUDGE.book, "See delivery dates \u2192");
  assert.equal(PZ.NUDGE.request, "Reserve a chamber \u2192");
  assert.equal(PZ.HOME.business.ctaTextReq, "Request a business rental");
  assert.ok(!/revenue|check availability/i.test(JSON.stringify(PZ.HOME) + PZ.NUDGE.book + PZ.NUDGE.request));
});

test("approved hero copy matches the Proof-reader sign-off", () => {
  assert.equal(PZ.HOME.sitting.h1, "A sitting hyperbaric chamber, at home");
  assert.equal(PZ.HOME.sitting.p, "An upright, seated design for easier entry and exit, at the same mild 1.5 ATA pressure as our lying chamber. Delivered, set up, and serviced in your home.");
  assert.equal(PZ.HOME.business.h1, "Add hyperbaric sessions to your business, without buying a chamber");
});
