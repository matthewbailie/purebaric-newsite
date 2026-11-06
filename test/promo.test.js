// Black Friday 2026: the cut-off, the note written on a booking, and the pages that carry the promo.
const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");
const { BLACK_FRIDAY_2026, activePromo, promoNote, withPromoNote } = require("../netlify/functions/_lib/promo");
const root = path.join(__dirname, "..");
const read = (f) => fs.readFileSync(path.join(root, f), "utf8");

test("promo is on through the end of Friday Nov 27 Mountain time, then off", () => {
  assert.equal(activePromo(new Date("2026-11-05T18:00:00Z")).id, "black-friday-2026");
  assert.equal(activePromo(new Date("2026-11-28T06:59:59Z")).id, "black-friday-2026"); // 11:59 pm MST on the 27th
  assert.equal(activePromo(new Date("2026-11-28T07:00:00Z")), null);                   // midnight MST
  assert.equal(activePromo(new Date("2026-12-01T00:00:00Z")), null);
});

test("booking note: home gets $200 off, business also gets the fee waived, and it is added once", () => {
  const p = BLACK_FRIDAY_2026;
  assert.equal(promoNote(p, "residential"), "Black Friday 2026: $200 off the first month.");
  assert.match(promoNote(p, "business"), /\$200 off the first month; one-time \$200 training and supplies fee waived\.$/);
  assert.equal(withPromoNote("Need it by the 12th", p, "residential"), "Need it by the 12th\nBlack Friday 2026: $200 off the first month.");
  assert.equal(withPromoNote("", p, "residential"), "Black Friday 2026: $200 off the first month.");
  const already = "Selected plan. Black Friday 2026: $200 off the first month.";
  assert.equal(withPromoNote(already, p, "residential"), already);
  assert.equal(withPromoNote("  notes  ", null, "residential"), "notes");
});

test("every public page carries the self-expiring banner with the same cut-off as the server; admin does not", () => {
  const pages = fs.readdirSync(root).filter((f) => f.endsWith(".html"));
  const end = new Date(BLACK_FRIDAY_2026.endsAt);
  const clientCutoff = `Date.UTC(${end.getUTCFullYear()},${end.getUTCMonth()},${end.getUTCDate()},${end.getUTCHours()})`;
  for (const f of pages) {
    const s = read(f);
    if (f === "admin.html") { assert.ok(!s.includes("bfBanner"), "admin has no banner"); continue; }
    // The booking confirmation page has no banner: a customer who just booked should not be sent back to /book.
    if (f === "thank-you.html") { assert.ok(!s.includes("bfBanner"), "thank-you has no banner"); continue; }
    assert.equal((s.match(/id="bfBanner"/g) || []).length, 1, f + " has one banner");
    assert.ok(s.includes(clientCutoff), f + " uses the server cut-off");
    assert.ok(s.includes('<div id="bfBanner" style="display:none;'), f + " banner is off unless the script turns it on");
    assert.ok(s.includes('ends Friday, Nov 27. <a href="/book"'), f + " banner names the end date and links to booking");
  }
});

test("booking page shows the discount, waives the business fee, and posts the promo; server stamps it", () => {
  const book = read("book.html");
  assert.match(book, /id="bfRow"[^>]*><span>Black Friday: \$200 off first month<\/span><span class="amt">-\$200/);
  assert.match(book, /id="bfFeeRow"/); assert.match(book, /fee waived/);
  assert.match(book, /data\.set\('promo','black-friday-2026'\)/);
  const submit = read("netlify/functions/booking-submit.js");
  assert.match(submit, /withPromoNote\(body\.reason \|\| body\.notes, promo, rentalType\)/);
  assert.match(submit, /promo: promo \? promo\.id : ""/);
  assert.match(read("admin.html"), /b\.promo === 'black-friday-2026'/);
});

test("promo copy: no em dashes, the end date is always stated", () => {
  for (const f of ["index.html", "book.html", "pricing.html", "business.html"]) {
    const s = read(f);
    // the text each "Black Friday" sits in, cut at tag or string boundaries
    const bits = [...s.matchAll(/Black Friday/g)].map((m) => s.slice(Math.max(0, m.index - 20), m.index + 160).split(/[<>']/).find((t) => t.includes("Black Friday")) || "");
    assert.ok(bits.length > 0, f);
    for (const b of bits) assert.ok(!b.includes("—"), f + ": no em dash in " + b.slice(0, 60));
  }
});
