const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");
const { DEFAULT_PRICING, DEFAULT_BUSINESS_PRICING } = require("../netlify/functions/_lib/storage");
const defaults = require("../pricing-defaults.js");

const root = path.join(__dirname, "..");
const snapshot = JSON.parse(
  fs.readFileSync(path.join(__dirname, "fixtures", "pricing-api-snapshot.json"), "utf8")
);

const SKIP_DIRS = new Set([
  "node_modules",
  ".git",
  "design-previews",
  "_internal",
  "build",
  "vendor",
  "coverage",
  "dist",
  "out",
  "target",
]);

const TABLE_FILES_ALLOWED = new Set([
  path.join(root, "pricing-defaults.js"),
  path.join(root, "test", "fixtures", "pricing-api-snapshot.json"),
]);

const PAGES_USING_DEFAULTS = [
  { file: "index.html", tables: ["months"] },
  { file: "book.html", tables: ["months", "business"] },
  { file: "pricing.html", tables: ["months", "business"] },
  { file: "admin.html", tables: ["months", "business"] },
];

function table12(src) {
  const out = {};
  for (let m = 1; m <= 12; m++) {
    const v = Number(src && src[m]);
    assert.ok(Number.isFinite(v) && v > 0, `expected a positive rate for month ${m}`);
    out[m] = v;
  }
  return out;
}

function tablesEqual(a, b) {
  const left = table12(a);
  const right = table12(b);
  assert.deepEqual(left, right);
}

const TABLE_RE =
  /\{\s*((?:["']?\d+["']?\s*:\s*\d+\s*,\s*){11}["']?\d+["']?\s*:\s*\d+)\s*,?\s*\}/g;

function extractRateTables(src) {
  const tables = [];
  let match;
  const re = new RegExp(TABLE_RE.source, "g");
  while ((match = re.exec(src))) {
    const obj = {};
    for (const part of match[1].split(",")) {
      const bit = part.trim().match(/^["']?(\d+)["']?\s*:\s*(\d+)$/);
      if (!bit) continue;
      obj[Number(bit[1])] = Number(bit[2]);
    }
    const keys = Object.keys(obj).map(Number).sort((a, b) => a - b);
    if (keys.length !== 12 || keys[0] !== 1 || keys[11] !== 12) continue;
    const vals = keys.map((k) => obj[k]);
    if (vals.every((v) => v >= 100 && v <= 5000)) tables.push({ raw: match[0], table: obj });
  }
  return tables;
}

function walk(dir, out = []) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    if (SKIP_DIRS.has(ent.name)) continue;
    const full = path.join(dir, ent.name);
    if (ent.isDirectory()) walk(full, out);
    else if (/\.(html|js|json)$/.test(ent.name)) out.push(full);
  }
  return out;
}

test("shared fallback exports a complete home and business table", () => {
  tablesEqual(defaults.months, defaults.months);
  tablesEqual(defaults.business, defaults.business);
  assert.equal(defaults.months[6], 559);
  assert.equal(defaults.months[9], 549);
  assert.equal(defaults.business[3], 929);
  assert.equal(defaults.business[9], 810);
});

test("storage defaults are the shared fallback", () => {
  tablesEqual(DEFAULT_PRICING, defaults.months);
  tablesEqual(DEFAULT_BUSINESS_PRICING, defaults.business);
});

test("shared fallback matches the saved /api/pricing snapshot", () => {
  tablesEqual(defaults.months, snapshot.months);
  tablesEqual(defaults.business, snapshot.business);
});

test("no leftover hard-coded 1-12 month rate tables outside the shared fallback", () => {
  const leftovers = [];
  for (const file of walk(root)) {
    if (TABLE_FILES_ALLOWED.has(file)) continue;
    const src = fs.readFileSync(file, "utf8");
    const found = extractRateTables(src);
    if (found.length) leftovers.push({ file: path.relative(root, file), count: found.length, sample: found[0].raw });
  }
  assert.deepEqual(leftovers, [], leftovers.length
    ? leftovers.map((l) => `${l.file}: ${l.count} table(s), e.g. ${l.sample}`).join("\n")
    : "");
});

test("public pages and admin load the shared fallback and use it", () => {
  for (const page of PAGES_USING_DEFAULTS) {
    const src = fs.readFileSync(path.join(root, page.file), "utf8");
    assert.match(
      src,
      /<script src="\/pricing-defaults\.js"><\/script>/,
      `${page.file} must load /pricing-defaults.js`
    );
    if (page.tables.includes("months")) {
      assert.match(
        src,
        /PB_PRICING_DEFAULTS\.months/,
        `${page.file} must read PB_PRICING_DEFAULTS.months`
      );
    }
    if (page.tables.includes("business")) {
      assert.match(
        src,
        /PB_PRICING_DEFAULTS\.business/,
        `${page.file} must read PB_PRICING_DEFAULTS.business`
      );
    }
  }
});

test("pricing.html JSON-LD offer prices match the shared fallback", () => {
  const src = fs.readFileSync(path.join(root, "pricing.html"), "utf8");
  const block = src.match(/<script type="application\/ld\+json" id="pricingLd">([\s\S]*?)<\/script>/);
  assert.ok(block, "expected #pricingLd JSON-LD block");
  const data = JSON.parse(block[1]);
  const offers = data.hasOfferCatalog && data.hasOfferCatalog.itemListElement;
  assert.ok(Array.isArray(offers) && offers.length, "expected OfferCatalog items");
  for (const offer of offers) {
    const parsed = /^(Home|Business), (\d+) months?$/.exec(offer.name || "");
    assert.ok(parsed, `unexpected offer name: ${offer.name}`);
    const kind = parsed[1] === "Business" ? "business" : "months";
    const months = Number(parsed[2]);
    assert.equal(
      String(offer.price),
      String(defaults[kind][months]),
      `${offer.name} price ${offer.price} != fallback ${defaults[kind][months]}`
    );
  }
});

test("city-page AggregateOffer low/high prices match the 12-month and 1-month home fallback", () => {
  const dir = path.join(root, "hyperbaric-chamber-rental");
  for (const name of fs.readdirSync(dir).filter((f) => f.endsWith(".html"))) {
    const src = fs.readFileSync(path.join(dir, name), "utf8");
    const lows = [...src.matchAll(/"lowPrice"\s*:\s*"(\d+)"/g)].map((m) => m[1]);
    const highs = [...src.matchAll(/"highPrice"\s*:\s*"(\d+)"/g)].map((m) => m[1]);
    assert.ok(lows.length && highs.length, `${name} should have AggregateOffer prices`);
    for (const low of lows) assert.equal(low, String(defaults.months[12]), `${name} lowPrice`);
    for (const high of highs) assert.equal(high, String(defaults.months[1]), `${name} highPrice`);
  }
});
