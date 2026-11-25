// Black Friday 2026: the bf-on switch hides all five offer strings after
// Nov 27, 11:59 PM MT, and the step-1 button text does not change with BF.
const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");
const { BLACK_FRIDAY_2026, activePromo } = require("../netlify/functions/_lib/promo");

const root = path.join(__dirname, "..");
const read = (p) => fs.readFileSync(path.join(root, p), "utf8");

const CUTOFF = Date.UTC(2026, 10, 28, 7); // Nov 28, 2026 00:00 MST (UTC-7)

test("client and server cutoffs match: on through Nov 27 11:59 PM MT, off at midnight", () => {
  const book = read("book.html");
  const business = read("business.html");
  assert.match(book, /window\.PB_BF=Date\.now\(\)<Date\.UTC\(2026,10,28,7\)/);
  assert.match(business, /window\.PB_BF=Date\.now\(\)<Date\.UTC\(2026,10,28,7\)/);
  assert.equal(new Date(BLACK_FRIDAY_2026.endsAt).getTime(), CUTOFF);
  // 11:59:59 PM MST on Nov 27, 2026
  assert.equal(CUTOFF, Date.parse("2026-11-28T07:00:00Z"));
  assert.ok(Date.parse("2026-11-28T06:59:59Z") < CUTOFF);
  assert.ok(activePromo(new Date("2026-11-28T06:59:59Z")));
  assert.equal(activePromo(new Date("2026-11-28T07:00:00Z")), null);
  // The same comparison the pages run
  const bfOn = (ms) => ms < CUTOFF;
  assert.equal(bfOn(Date.parse("2026-11-28T06:59:59Z")), true);
  assert.equal(bfOn(CUTOFF), false);
});

test("all five Black Friday offer strings are gated by bf-on / bf-only / banner removal, including the business banner", () => {
  const book = read("book.html");
  const business = read("business.html");

  // 1. Site banner (removed when !PB_BF)
  assert.match(book, /id="bfBanner"[^>]*>Black Friday: \$200 off your first month, ends Friday, Nov 27\./);
  assert.match(book, /if\(window\.PB_BF\)b\.style\.display='block';else b\.remove\(\)/);
  // 2. Step-1 supporting line
  assert.match(book, /<span class="bf-only"> Book by Friday, Nov 27 to save \$200 on your first month\.<\/span>/);
  // 3. Business banner on /book (fee waived)
  assert.match(book, /<span class="bf-only">Black Friday: \$200 off your first month and the one-time \$200 training and supplies fee waived when you book by Friday, Nov 27\. <\/span>/);
  // 4. Summary card line
  assert.match(book, /class="bf-only" id="bfFirst"[^>]*>First month \$379, then \$579 a month\. Book by Friday, Nov 27\.<\/div>/);
  // 5. /business banner
  assert.match(business, /id="bfBanner"[^>]*>Black Friday: \$200 off your first month, ends Friday, Nov 27\./);
  assert.match(business, /if\(window\.PB_BF\)b\.style\.display='block';else b\.remove\(\)/);

  // CSS hides leftover .bf-only when the html.bf-on class is off
  assert.match(book, /html:not\(\.bf-on\) \.bf-only\{display:none!important\}/);
  assert.match(business, /html:not\(\.bf-on\) \.bf-only\{display:none!important\}/);
});

test("step-1 button is 'Save and continue →' in every promo state and never swaps with Black Friday", () => {
  const book = read("book.html");
  assert.match(book, /id="leadBtn">Save and continue →</);
  assert.doesNotMatch(book, /Secure my \$200 off/);
  assert.doesNotMatch(book, /leadBtn'\)\.textContent='Continue →'/);
  assert.doesNotMatch(book, /leadBtn'\)\.textContent=.*BF/);
  // The offer still lives in the banner and other bf-only strings, not the button.
  assert.match(book, /ends Friday, Nov 27/);
});
