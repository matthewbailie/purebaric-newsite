const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("path");
const vm = require("node:vm");

const root = path.join(__dirname, "..");
const book = fs.readFileSync(path.join(root, "book.html"), "utf8");
const metrics = fs.readFileSync(path.join(root, "pb-metrics.js"), "utf8");

function extractFunction(name) {
  const start = book.indexOf("function " + name);
  assert.ok(start >= 0, "missing " + name);
  let i = book.indexOf("{", start);
  let depth = 0;
  for (; i < book.length; i++) {
    if (book[i] === "{") depth++;
    else if (book[i] === "}") {
      depth--;
      if (depth === 0) return book.slice(start, i + 1);
    }
  }
  throw new Error("unclosed " + name);
}

test("progress labels and signed button strings are used exactly", () => {
  assert.match(book, /id="s1label">Step 1 of 2</);
  assert.match(book, /id="leadBtn">Save and continue →</);
  assert.match(book, /<h2 style="font-size:22px">Step 2 of 2</);
  assert.match(book, /id="submitBtn">Request reservation →</);
  assert.match(book, /id="waitlistBtn"[^>]*>Join the waitlist</);
  assert.equal((book.match(/Save and continue →/g) || []).length, 1);
  assert.ok((book.match(/Request reservation →/g) || []).length >= 1);
  assert.doesNotMatch(book, /Secure my \$200 off/);
  assert.doesNotMatch(book, /Book chamber →/);
  assert.doesNotMatch(book, /Book chamber for my business →/);
  assert.doesNotMatch(book, /Last step/);
});

test("Black Friday does not change the step-1 or final button text", () => {
  const script = book.slice(book.lastIndexOf("<script>") + 8, book.lastIndexOf("</script>"));
  assert.doesNotMatch(script, /leadBtn\)\.textContent/);
  assert.match(script, /submitBtn'\)\.textContent='Request reservation →'/);
  assert.doesNotMatch(script, /Book chamber/);
  assert.doesNotMatch(script, /Continue →/);
  // Existing BF lines stay, gated by bf-only / PB_BF, and the cutoff is untouched.
  assert.match(book, /window\.PB_BF=Date\.now\(\)<Date\.UTC\(2026,10,28,7\)/);
  assert.match(book, /class="bf-only">Secure your \$200 off</);
  assert.match(book, /id="s1sub"><span class="bf-only"> Book by Friday, Nov 27 to save \$200 on your first month\.<\/span>/);
});

test("N1–N7 strings are used verbatim", () => {
  assert.match(book, /Saved\. Now pick your delivery date\./);
  assert.match(book, /Saved\. One more step to send your request\./);
  assert.match(book, /"We don't deliver to "\+z\+" yet\."/);
  assert.match(book, /Join the waitlist/);
  assert.match(book, /You're on the list\. We'll reach out if we're able to deliver to your area\./);
  assert.match(book, /btn\.innerHTML='Joining…'/);
  assert.match(book, /Something went wrong\. Please try again, or email hello@purebaric\.com\./);
  assert.match(book, /res\.textContent='Please pick a delivery date\.'/);
  assert.doesNotMatch(book, /Please pick a delivery date on the calendar/);
});

test("Home/Business toggle and Edit link sit outside #leadForm", () => {
  const before = book.slice(book.indexOf('id="resResult"'), book.indexOf('id="leadForm"'));
  const lead = book.slice(book.indexOf('id="leadForm"'), book.indexOf('id="resForm"'));
  assert.match(before, /class="rental-toggle"/);
  assert.match(before, /Edit ↓/);
  assert.doesNotMatch(lead, /rental-toggle/);
  assert.doesNotMatch(lead, /Edit ↓/);
});

test("firstOpenCalendarMonth opens the first month with at least 5 open days, else the first open month", () => {
  const fn = extractFunction("firstOpenCalendarMonth");
  const ctx = { firstOpenCalendarMonth: null };
  vm.runInNewContext(fn + "; this.firstOpenCalendarMonth = firstOpenCalendarMonth;", ctx);
  const dates = [
    { date: "2026-11-27", ok: true },
    { date: "2026-11-28", ok: true },
    { date: "2026-11-30", ok: true },
    { date: "2026-12-01", ok: true },
    { date: "2026-12-02", ok: true },
    { date: "2026-12-03", ok: true },
    { date: "2026-12-04", ok: true },
    { date: "2026-12-05", ok: true },
    { date: "2026-12-15", ok: false },
    { date: "2027-01-04", ok: true },
  ];
  assert.equal(ctx.firstOpenCalendarMonth(dates), "2026-12");
  assert.equal(ctx.firstOpenCalendarMonth(dates.filter((d) => d.date.startsWith("2026-11") || !d.ok)), "2026-11");
  assert.equal(ctx.firstOpenCalendarMonth([]), null);
  assert.equal(ctx.firstOpenCalendarMonth([{ date: "2026-11-27", ok: false }]), null);
  assert.match(book, /if\(!sel && openMonth && \(!cur \|\| !curHasOk\)\) DCAL_MONTH=openMonth;/);
});

test("step-1 200 fires PBBookFunnel.step1Save and InitiateCheckout for a new lead, not Lead", () => {
  const step1 = book.slice(book.indexOf("if(j&&j.lead)"), book.indexOf("function showStep1"));
  assert.match(step1, /j\._httpStatus===200&&window\.PBBookFunnel\)window\.PBBookFunnel\.step1Save\(window,!j\.outOfArea\)/);
  assert.match(step1, /if\(!existingLead\)window\.trackPurebaricMeta\?\.\('InitiateCheckout'/);
  assert.doesNotMatch(step1, /'Lead'/);
  assert.doesNotMatch(step1, /generate_lead/);
  // A leftover direct track call would double-count the start-to-step-1 rate.
  assert.doesNotMatch(step1, /trackPurebaricEvent\?\.\('booking_step1_save'/);
  assert.equal((step1.match(/booking_step1_save/g) || []).length, 0);
});

test("service_area_check includes in_area; the v2 module is installed for pbtest and starts", () => {
  assert.match(book, /src="\/book-funnel-events\.js"/);
  assert.match(book, /PBBookFunnel\)window\.PBBookFunnel\.install\(window,document\)/);
  assert.match(book, /in_area:!!inArea/);
  const events = fs.readFileSync(path.join(root, "book-funnel-events.js"), "utf8");
  assert.match(events, /TEST_FLAG = "pb_test"/);
  assert.match(events, /pbtest=1/);
  assert.match(events, /o\.test_traffic = 1/);
  assert.match(events, /def_v: 2/);
});

test("booking events use the gated track helpers and never put PII in params", () => {
  const script = book.slice(book.lastIndexOf("<script>") + 8, book.lastIndexOf("</script>"));
  const eventCalls = [...script.matchAll(/trackPurebaricEvent\?\.\(([^;]+)\)/g)].map((m) => m[1]);
  assert.ok(eventCalls.length >= 6, "expected several GA events");
  for (const call of eventCalls) {
    assert.doesNotMatch(call, /customer_email|customer_phone|first-name|last-name|cfn|cln|ce\.value|cp\.value|zip\.value|cstreet|hello@/);
  }
  // Calls go through the gated helpers, not gtag/fbq directly.
  assert.doesNotMatch(script, /gtag\('event'/);
  assert.doesNotMatch(script, /fbq\(/);
  // The helpers themselves no-op on GPC, DNT, /privacy opt-out, and internal.
  assert.match(metrics, /function blockReason\(\)/);
  assert.match(metrics, /if \(gpc\(\)\) return 'gpc'/);
  assert.match(metrics, /if \(dnt\(\)\) return 'dnt'/);
  assert.match(metrics, /if \(declinedFlag\(\)\) return 'opt_out'/);
  assert.match(metrics, /window\.trackPurebaricEvent = function \(name, params\) \{\n    if \(blocked/);
  assert.match(metrics, /window\.trackPurebaricMeta = function \(name, params, opts\) \{\n    if \(blocked/);
});

test("hidden step-1 buttons stay hidden even though .btn sets display", () => {
  assert.match(book, /#leadBtn\[hidden\],#waitlistBtn\[hidden\]/);
  assert.match(book, /display:none!important/);
});

test("the date-missing guard stays on step 2 and uses N7", () => {
  const step2 = book.slice(book.indexOf("document.getElementById('resForm').addEventListener('submit'"), book.indexOf("var orig=btn.innerHTML;btn.disabled=true;btn.innerHTML='Submitting...'"));
  assert.match(step2, /Please pick a delivery date\./);
  assert.doesNotMatch(step2, /showStep1\(\)/);
  assert.match(step2, /getElementById\('dcal'\)\.scrollIntoView/);
});
