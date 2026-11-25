// Claims cleanup: approved C/D strings, new footer tagline, no medical-device
// line in the footer or /safety positioning paragraph, signed /book step labels.
const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const read = (p) => fs.readFileSync(path.join(root, p), "utf8");

function publicHtml() {
  const out = [];
  function walk(dir) {
    for (const name of fs.readdirSync(dir)) {
      const full = path.join(dir, name);
      const rel = path.relative(root, full);
      if (rel.startsWith("node_modules") || rel.startsWith("_internal") || rel.startsWith("design-previews") || rel.startsWith(".")) continue;
      const st = fs.statSync(full);
      if (st.isDirectory()) walk(full);
      else if (name.endsWith(".html") && name !== "admin.html") out.push(rel);
    }
  }
  walk(root);
  return out;
}

const C_NEW = [
  ["index.html", "Daily 1.5 ATA hyperbaric sessions at home, with 99.9% oxygen via mask and no per-session fees."],
  ["index.html", "A month at home costs less than six clinic sessions."],
  ["index.html", "at the 1-year rate with two sessions a day · no per-session fees"],
  ["index.html", "Use it every day, up to two sessions"],
  ["index.html", "Up to two 1.5 ATA sessions a day with 99.9% oxygen via mask, at home."],
  ["pricing.html", "The Soft-Shell 1.5 ATA in your home, with daily sessions and no per-session fees."],
  ["pricing.html", "at the 12-month rate with two sessions a day · no per-session fees"],
  ["pricing.html", "Up to two sessions a day, about 730 a year"],
  ["pricing.html", "<strong>No per-session fees.</strong> The rental price stays the same however often you use it, up to two sessions a day."],
];
const C_OLD = [
  "Unlimited 1.5 ATA hyperbaric sessions with 99.9% oxygen via mask at home.",
  "unlimited daily sessions included",
  "Unlimited daily use",
  "Unlimited sessions. The rental does not change with usage.",
  "The Soft-Shell 1.5 ATA in your home with unlimited daily sessions.",
  "Enjoy unlimited daily sessions on your own schedule",
  "Unlimited daily sessions in a 1.5 ATA soft-shell chamber.",
];
const D_NEW = [
  ["index.html", "Salt Lake-area hyperbaric clinic"],
  ["index.html", "$129–$175"],
  ["index.html", "one-hour session, published prices we checked in Nov 2026"],
  ["index.html", "40 sessions: $5,160–$7,000"],
  ["pricing.html", "A year at home costs about the same as 40 clinic sessions"],
  ["pricing.html", "Salt Lake-area clinics we checked in November 2026 charge $129 to $175"],
  ["pricing.html", "$129–$175"],
  ["pricing.html", "per one-hour session"],
  ["pricing.html", "40 sessions: $5,160 to $7,000"],
  ["pricing.html", "Foothill Wellness (Salt Lake City, $129)"],
  ["pricing.html", "SLC Lymphatic Care (Millcreek, $175)"],
  ["use-cases/athletic-recovery.html", "On the 1-year rate, with one session a day, that's about $17 a session. Salt Lake-area clinics we checked charge $129 to $175 a session."],
];
const D_OLD_INDEX_PRICING = [
  "$75–$150",
  "per mild (1.3 ATA) one-hour session, drop-in",
  "40-session protocol: $3,200–$6,000",
  "A year at home costs about the same as one clinic protocol",
  "$80 to $150",
  "$80–$150",
  "40-session protocol: $3,200 to $6,000",
  "Medical hard-chamber HBOT centers charge $300 to $400",
];
const TAGLINE = "Mild 1.5 ATA hyperbaric chambers brought to your home, with delivery, setup and support included.";
const C12 = "We bring mild 1.5 ATA hyperbaric chambers to your home. Use yours daily on your own schedule, with no per-session fees. We handle delivery, setup and support.";
const OLD_SHORT = "Professional-grade mild hyperbaric oxygen therapy brought to your home, delivery, setup, and support included, for less than the cost of a single month at a clinic.";
const OLD_LONG = "Enjoy unlimited daily sessions on your own schedule, for less than the cost of a single month at a clinic. Our dedicated team handles delivery, setup, and support, ensuring a seamless experience so you can focus entirely on your wellness and recovery journey.";

test("approved C1-C12 and D1-D7 strings are present and the old strings are gone where replaced", () => {
  for (const [file, s] of C_NEW.concat(D_NEW)) {
    assert.ok(read(file).includes(s), `missing in ${file}: ${s.slice(0, 80)}`);
  }
  const cityLine = "Daily sessions in a 1.5 ATA soft-shell chamber, with no per-session fees.";
  for (const city of ["draper-sandy", "salt-lake-city", "ogden", "park-city", "utah-county"]) {
    assert.ok(read(`hyperbaric-chamber-rental/${city}.html`).includes(cityLine), city);
  }
  assert.match(read("hyperbaric-chamber-rental/draper-sandy.html"), /with no per-session fees\. Delivery, setup, training and pickup are included\./);
  assert.match(read("hyperbaric-chamber-rental/salt-lake-city.html"), /with no per-session fees\. Delivery and setup are included, and nothing is charged until delivery day\./);

  const index = read("index.html");
  const pricing = read("pricing.html");
  for (const s of C_OLD) {
    assert.ok(!index.includes(s) && !pricing.includes(s), `old string still present: ${s}`);
  }
  for (const s of D_OLD_INDEX_PRICING) {
    if (s === "$75–$150" || s === "$80 to $150" || s === "$80–$150") {
      // $80/$75 may remain in uncovered business-estimate copy on /pricing; C/D replacements on the compare block must be gone.
      continue;
    }
    assert.ok(!index.includes(s), `old D string on index: ${s}`);
    if (s !== "$75–$150") assert.ok(!index.includes(s));
  }
  assert.doesNotMatch(index, /Typical Utah hyperbaric clinic/);
  assert.doesNotMatch(index, /\$75–\$150/);
  assert.doesNotMatch(pricing, /one clinic protocol/);
  assert.doesNotMatch(pricing, /40-session protocol/);
  assert.doesNotMatch(pricing, /per mild \(1\.3 ATA\) session, drop-in/);
  assert.doesNotMatch(pricing, /\$80–\$150<\/div><div class="sub">per mild/);
  assert.doesNotMatch(read("use-cases/athletic-recovery.html"), /\$100 minimum for a session pack/);
});

test("every public HTML page carries the new footer tagline or the approved C12 long footer", () => {
  const pages = publicHtml();
  let taglinePages = 0, c12Pages = 0;
  for (const rel of pages) {
    const html = read(rel);
    if (!html.includes("foot-desc") && !html.includes("footer-desc") && !html.includes("foot-disc")) continue;
    const hasTagline = html.includes(TAGLINE);
    const hasC12 = html.includes(C12);
    assert.ok(hasTagline || hasC12, `no new footer on ${rel}`);
    assert.ok(!html.includes(OLD_SHORT), `old short footer on ${rel}`);
    assert.ok(!html.includes(OLD_LONG), `old long footer on ${rel}`);
    if (hasTagline) taglinePages++;
    if (hasC12) c12Pages++;
  }
  assert.ok(taglinePages >= 20, `expected short footer on ~22 pages, got ${taglinePages}`);
  assert.ok(c12Pages >= 13, `expected C12 on 13 pages, got ${c12Pages}`);
});

test("footer and /safety ship with no medical-device line and no placeholder text", () => {
  const placeholder = /TBD|TODO|placeholder|pending FDA|FDA wording|\[FDA\]|lorem ipsum/i;
  for (const rel of publicHtml()) {
    const html = read(rel);
    const discs = [...html.matchAll(/class="(?:foot-disc|disclaimer)"[^>]*>([^<]*)</g)].map((m) => m[1]);
    for (const d of discs) {
      assert.doesNotMatch(d, /medical device/i, `${rel} footer: ${d}`);
      assert.doesNotMatch(d, placeholder, `${rel} footer placeholder`);
    }
  }
  const safety = read("safety.html");
  // Positioning paragraph: medical-device clause is gone; contraindications may still say "medical".
  const pos = safety.slice(safety.indexOf("Important positioning"), safety.indexOf("Known risks"));
  assert.doesNotMatch(pos, /medical device/i);
  assert.doesNotMatch(pos, placeholder);
  assert.match(pos, /for general wellness and relaxation only/);
  const fda = read("fda-disclaimer.js");
  assert.match(fda, /PUREBARIC_FDA_DISCLAIMER_LINE = ""/);
  assert.match(safety, /data-fda-line/);
  // The shipped value is empty; comments may mention "placeholder" as a warning not to add one.
  assert.doesNotMatch(fda, /PUREBARIC_FDA_DISCLAIMER_LINE = "[^"]+"/);
});

test("signed /book step-1 strings and final button in every mode", () => {
  const book = read("book.html");
  assert.match(book, />Step 1 of 2</);
  assert.match(book, /id="leadBtn">Save and continue →</);
  assert.match(book, />Step 2 of 2</);
  assert.match(book, /id="submitBtn">Request reservation →</);
  assert.match(book, /submitBtn'\)\.textContent='Request reservation →'/);
  assert.doesNotMatch(book, /Book chamber/);
  assert.doesNotMatch(book, /Secure my \$200 off/);
  assert.doesNotMatch(book, /leadBtn'\)\.textContent='Continue →'/);
  // N7, signed by the Proof-reader for the step-1 rework (cut "on the calendar").
  assert.equal((book.match(/Please pick a delivery date on the calendar\./g) || []).length, 0);
  assert.match(book, /Please pick a delivery date\./);
});


test("Proof-reader Nov 25 edits: C1, C12, lead, D7, keywords and JSON-LD", () => {
  const index = read("index.html");
  assert.ok(index.includes("Daily 1.5 ATA hyperbaric sessions at home, with 99.9% oxygen via mask and no per-session fees."));
  assert.doesNotMatch(index, /The ultimate hyperbaric experience/);
  assert.ok(index.includes("A month at home costs less than six clinic sessions."));
  assert.doesNotMatch(index, /Less than the cost of a single month at a clinic, without leaving home/);

  const kwMatch = index.match(/<meta name="keywords" content="([^"]*)"/);
  assert.ok(kwMatch, "missing keywords meta");
  assert.equal(
    kwMatch[1],
    "hyperbaric chamber rental Utah, mild hyperbaric chamber Park City, hyperbaric chamber Salt Lake City, Purebaric"
  );
  assert.doesNotMatch(kwMatch[1], /therapy/i);
  assert.doesNotMatch(kwMatch[1], /mHBOT/i);

  const blocks = [...index.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map((m) => m[1]);
  assert.equal(blocks.length, 1, `expected 1 JSON-LD block, got ${blocks.length}`);
  const ld = JSON.parse(blocks[0]);
  assert.equal(
    ld.description,
    "Rent a mild 1.5 ATA hyperbaric chamber in Utah. Delivered, installed and serviced in your home across the Wasatch Front and Utah Valley."
  );
  const ldText = JSON.stringify(ld);
  assert.doesNotMatch(ldText, /therapy/i);
  assert.doesNotMatch(ldText, /mHBOT/i);

  const athletic = read("use-cases/athletic-recovery.html");
  assert.ok(athletic.includes("On the 1-year rate, with one session a day, that's about $17 a session. Salt Lake-area clinics we checked charge $129 to $175 a session."));
  assert.doesNotMatch(athletic, /At the 1-year rate, used daily,/);

  const c12Pages = publicHtml().filter((rel) => read(rel).includes(C12));
  assert.equal(c12Pages.length, 13, `C12 should be on exactly 13 pages, got ${c12Pages.length}: ${c12Pages.join(", ")}`);
  for (const rel of publicHtml()) {
    assert.doesNotMatch(
      read(rel),
      /We bring professional-grade mild hyperbaric chambers to your home/
    );
  }
});


test("homepage meta, og and twitter descriptions are the signed text with no mHBOT (Proof-reader Nov 25)", () => {
  const html = fs.readFileSync(path.join(__dirname, "..", "index.html"), "utf8");
  const signed = "Rent a mild 1.5 ATA hyperbaric chamber in Utah from $529/mo (12-month rate). Delivered, set up and maintained in your home.";
  for (const sel of ['name="description"', 'property="og:description"', 'name="twitter:description"']) {
    const m = html.match(new RegExp("<meta " + sel + ' content="([^"]*)"'));
    assert.ok(m, sel);
    assert.equal(m[1], signed);
  }
  assert.doesNotMatch(html.slice(0, html.indexOf("</head>")).replace(/<script[\s\S]*?<\/script>/g, ""), /mHBOT/);
});
