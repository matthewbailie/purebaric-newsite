// Review-form compliance: no steered 5-star default, keep "verified review(s)"
// (Matthew confirms each reviewer). Counts follow the reviews API.
const { test } = require("node:test");
const assert = require("node:assert/strict");
const path = require("path");
const fs = require("fs");
const http = require("http");
const os = require("os");
const { spawn } = require("child_process");
const Module = require("module");

const ROOT = path.join(__dirname, "..");
const FN = path.join(ROOT, "netlify", "functions");

function loadWithStubs(handlerFile, stubs) {
  const resolved = {};
  for (const [rel, impl] of Object.entries(stubs)) resolved[path.join(FN, rel.endsWith(".js") ? rel : rel + ".js")] = impl;
  const orig = Module._load;
  Module._load = function (req, parent, ...rest) {
    if (parent && parent.filename) {
      let full = path.resolve(path.dirname(parent.filename), req);
      if (!full.endsWith(".js") && !full.endsWith(".json")) full += ".js";
      if (resolved[full]) return resolved[full];
    }
    return orig.call(this, req, parent, ...rest);
  };
  try {
    const file = path.join(FN, handlerFile);
    delete require.cache[file];
    return require(file);
  } finally { Module._load = orig; }
}

function read(rel) {
  return fs.readFileSync(path.join(ROOT, rel), "utf8");
}

const PREFACE = "Only leave a review if you've rented a chamber from Purebaric. Use your own words, and please skip any health details.";
const STAR_HELP = "Pick the star rating that fits your experience.";

test("reviews.html has no default checked star, requires a rating, and does not fall back to 5", () => {
  const html = read("reviews.html");
  const radios = [...html.matchAll(/<input type="radio" name="stars"[^>]*>/g)].map((m) => m[0]);
  assert.equal(radios.length, 5);
  for (const el of radios) {
    assert.doesNotMatch(el, /(?:^|\s)checked(?:\s|\/|>)/, el);
    assert.match(el, /(?:^|\s)required(?:\s|\/|>)/, el);
  }
  const submit = html.slice(html.indexOf("/* Submit a review */"));
  assert.doesNotMatch(submit, /starEl\s*\?\s*starEl\.value\s*:\s*['"]5['"]/);
  assert.doesNotMatch(submit, /data\.set\(\s*['"]stars['"]\s*,\s*[^)]*['"]5['"]/);
  assert.match(submit, /if\s*\(\s*!starEl\s*\)\s*\{[^}]*return;[^}]*\}/);
  assert.match(submit, /data\.set\(\s*['"]stars['"]\s*,\s*starEl\.value\s*\)/);
  assert.doesNotMatch(html, new RegExp(PREFACE.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  assert.doesNotMatch(html, new RegExp(STAR_HELP.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
});

test("reviews.html, index.html, and bake-hero-rating.js use 'verified review(s)'", () => {
  for (const rel of ["reviews.html", "index.html", "scripts/bake-hero-rating.js"]) {
    const text = read(rel);
    assert.match(text, /verified review/i, rel);
  }
});

test("homepage and /reviews count labels use verified review(s) and follow the API n", () => {
  const index = read("index.html");
  const reviews = read("reviews.html");
  const bake = read("scripts/bake-hero-rating.js");

  const heroExpr = index.match(/heroCount'\)\.textContent=(.+);/);
  assert.ok(heroExpr, "hero count updater present");
  const heroCount = new Function("n", "return " + heroExpr[1]);
  assert.equal(heroCount(1), "(1 verified review)");
  assert.equal(heroCount(6), "(6 verified reviews)");

  const labelExpr = index.match(/var label=(.+);/);
  assert.ok(labelExpr, "hero aria-label updater present");
  const heroLabel = new Function("score", "n", "return " + labelExpr[1]);
  assert.equal(heroLabel("4.5", 1), "Rated 4.5 out of 5 from 1 verified review");
  assert.equal(heroLabel("3.0", 2), "Rated 3.0 out of 5 from 2 verified reviews");

  assert.match(reviews, /rated\.length\s*\+\s*\(rated\.length===1\s*\?\s*' verified review'\s*:\s*' verified reviews'\)/);
  assert.match(bake, /const count = `\(\$\{n\} verified review\$\{n === 1 \? "" : "s"\}\)`/);
  assert.match(bake, /from \$\{n\} verified review\$\{n === 1 \? "" : "s"\}/);
  assert.match(index, /id="heroCount"[^>]*>\(\d+ verified reviews?\)<\/a>/);
  assert.match(index, /id="bandCount">\(\d+ verified reviews?\)<\/span>/);
  assert.match(index, /id="heroRating" aria-label="Rated [\d.]+ out of 5 from \d+ verified reviews?"/);
});

test("bake-hero-rating.js writes the fixture API count, not a stale baseline", async () => {
  const fixture = {
    reviews: [
      { stars: 1, text: "one" },
      { stars: 5, text: "five" },
      { stars: null, text: "unrated ignored" },
    ],
  };
  const server = http.createServer((req, res) => {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify(fixture));
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const { port } = server.address();
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "pb-bake-"));
  const tmpIndex = path.join(tmpDir, "index.html");
  // Minimal markers the bake script replaces; stale count on purpose.
  fs.writeFileSync(tmpIndex, [
    '<span class="rating" id="heroRating" aria-label="Rated 5.0 out of 5 from 4 verified reviews">',
    '<span class="stars" id="heroStars" aria-hidden="true">★★★★★</span>',
    '<strong id="heroScore">5.0</strong>',
    '<a class="count" id="heroCount" href="#reviewsBand">(4 verified reviews)</a></span>',
    '<span class="rating" id="bandRatingUnit" aria-label="Rated 5.0 out of 5 from 4 verified reviews">',
    '<span class="stars" id="bandStars" aria-hidden="true">★★★★★</span>',
    '<strong id="bandScore">5.0</strong>',
    '<span class="count" id="bandCount">(4 verified reviews)</span></span>',
  ].join(""));
  try {
    const result = await new Promise((resolve, reject) => {
      const child = spawn(process.execPath, [path.join(ROOT, "scripts", "bake-hero-rating.js")], {
        env: { ...process.env, REVIEWS_URL: `http://127.0.0.1:${port}/api/reviews`, BAKE_INDEX: tmpIndex },
      });
      let stdout = "", stderr = "";
      child.stdout.on("data", (d) => { stdout += d; });
      child.stderr.on("data", (d) => { stderr += d; });
      const timer = setTimeout(() => { child.kill(); reject(new Error("bake script timed out")); }, 8000);
      child.on("close", (status) => { clearTimeout(timer); resolve({ status, stdout, stderr }); });
    });
    assert.equal(result.status, 0, result.stderr || result.stdout);
    const out = fs.readFileSync(tmpIndex, "utf8");
    assert.match(out, /id="heroCount"[^>]*>\(2 verified reviews\)<\/a>/);
    assert.match(out, /id="bandCount">\(2 verified reviews\)</);
    assert.match(out, /aria-label="Rated 3.0 out of 5 from 2 verified reviews"/g);
    assert.match(out, /id="heroScore">3.0<\/strong>/);
    assert.doesNotMatch(out, /4 verified reviews|4 reviews/i);
  } finally {
    server.close();
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

test("reviews-submit: 400 when stars are missing or out of range; 1-star and 5-star bodies are created", async () => {
  const created = [];
  const { handler } = loadWithStubs("reviews-submit.js", {
    "_lib/storage": {
      createReview: async (data) => {
        created.push(data);
        return { id: "rev-" + data.stars, ...data, status: "pending" };
      },
      getNotifications: async () => ({}),
      getTwilioConfig: async () => ({}),
    },
    "_lib/email": {
      notifyAdminReview: async () => {},
      notifyAdminReviewSms: async () => ({ via: "none", sent: 0 }),
    },
    "_lib/notifications": {
      smsForEvent: () => [],
      smsNumbersForEvent: () => [],
      emailsForEvent: () => [],
    },
  });
  const post = (fields) => handler({
    httpMethod: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ firstName: "Pat", lastInitial: "Q", text: "Setup was straightforward.", ...fields }).toString(),
  });

  const missing = await post({});
  assert.equal(missing.statusCode, 400);
  assert.match(JSON.parse(missing.body).error, /star rating/i);

  const zero = await post({ stars: "0" });
  assert.equal(zero.statusCode, 400);

  const six = await post({ stars: "6" });
  assert.equal(six.statusCode, 400);

  const one = await post({ stars: "1" });
  assert.equal(one.statusCode, 200);
  assert.equal(JSON.parse(one.body).ok, true);

  const five = await post({ stars: "5" });
  assert.equal(five.statusCode, 200);
  assert.equal(JSON.parse(five.body).ok, true);

  assert.deepEqual(created.map((r) => r.stars), [1, 5]);
  assert.ok(created.every((r) => r.firstName === "Pat"));
});

test("listPublishedReviews / reviews-public return published 1-star and 5-star rows and do not filter by rating", async () => {
  const src = read("netlify/functions/_lib/storage.js");
  const start = src.indexOf("async function listPublishedReviews");
  const end = src.indexOf("async function createReview");
  assert.ok(start >= 0 && end > start);
  const fn = src.slice(start, end);
  assert.match(fn, /status === "published"/);
  assert.doesNotMatch(fn, /stars/);

  const published = [
    { id: "low", firstName: "Ann", lastInitial: "A", city: "Lehi", text: "Not for me.", stars: 1, status: "published", createdAt: "2026-01-01T00:00:00.000Z", publishedAt: "2026-01-02T00:00:00.000Z" },
    { id: "high", firstName: "Bo", lastInitial: "B", city: "", text: "Loved it.", stars: 5, status: "published", createdAt: "2026-01-03T00:00:00.000Z", publishedAt: "2026-01-04T00:00:00.000Z" },
    { id: "mid", firstName: "Cy", lastInitial: "C", city: "Provo", text: "Fine.", stars: 3, status: "published", createdAt: "2026-01-05T00:00:00.000Z", publishedAt: "2026-01-06T00:00:00.000Z" },
  ];
  const { handler } = loadWithStubs("reviews-public.js", {
    "_lib/storage": { listPublishedReviews: async () => published },
  });
  const res = await handler({});
  assert.equal(res.statusCode, 200);
  const body = JSON.parse(res.body);
  assert.deepEqual(body.reviews.map((r) => r.stars), [1, 5, 3]);
  assert.equal(body.reviews.length, 3);
  assert.equal(body.reviews[0].firstName, "Ann");
});
