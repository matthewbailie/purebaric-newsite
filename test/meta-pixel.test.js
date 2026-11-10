// The Meta pixel is wired but inert until META_PIXEL_ID is set; the booking page reports a Lead
// the moment step 1 creates a lead, and CompleteRegistration when step 2 completes the request.
// An out-of-area full submit fires no Meta event: it is not a confirmed reservation.
const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");

const metrics = fs.readFileSync(path.join(__dirname, "..", "pb-metrics.js"), "utf8");
const book = fs.readFileSync(path.join(__dirname, "..", "book.html"), "utf8");

test("the Meta pixel loads only with a numeric id and never for a visitor who opted out", () => {
  assert.match(metrics, /var META_PIXEL_ID = '(\d{10,20})?';/);
  assert.match(metrics, /if \(!META_READY \|\| declined \|\| window\.purebaricMetaLoaded\) return;/);
  assert.match(metrics, /window\.trackPurebaricMeta = function/);
  assert.match(metrics, /connect\.facebook\.net\/en_US\/fbevents\.js/);
});

test("a step-1 lead is the Meta Lead, with only the rental type attached", () => {
  const leadBranch = book.slice(book.indexOf("j&&j.lead"), book.indexOf("document.getElementById('backBtn')"));
  const params = leadBranch.match(/trackPurebaricMeta\?\.\('Lead',(\{[^}]*\})\)/);
  assert.ok(params, "Lead fires when a step-1 lead is created");
  assert.match(params[1], /^\{content_category:[^,]*\}$/, "only the rental type travels with the Lead");
  // The full submit fires CompleteRegistration, not a second Lead, so one
  // visitor is never counted as two Leads.
  const okBranch = book.slice(book.indexOf("j.success||j.ok"), book.indexOf("}else{", book.indexOf("j.success||j.ok")));
  assert.match(okBranch, /trackPurebaricMeta\?\.\('CompleteRegistration',\{content_category:[^,]*\}\)/);
  assert.doesNotMatch(okBranch, /trackPurebaricMeta\?\.\('Lead'/);
  // The out-of-area full submit still fires no Meta event: it is not a
  // confirmed reservation.
  const outOfArea = book.slice(book.indexOf("j&&j.outOfArea"), book.indexOf("j.success||j.ok"));
  assert.doesNotMatch(outOfArea, /trackPurebaricMeta/);
  assert.equal((book.match(/trackPurebaricMeta/g) || []).length, 2);
});
