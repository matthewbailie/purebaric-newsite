#!/usr/bin/env node
// Refreshes the baked-in rating in the home hero (index.html) from the live reviews API, so the
// row shows the right numbers the instant the page paints instead of waiting ~1.5 s for the
// reviews function. Run before a deploy whenever reviews have changed:  node scripts/bake-hero-rating.js
const fs = require("fs");
const path = require("path");
const URL_ = process.env.REVIEWS_URL || "https://purebaric.com/api/reviews";
(async () => {
  const res = await fetch(URL_);
  if (!res.ok) throw new Error(`reviews API ${res.status}`);
  const reviews = ((await res.json()) || {}).reviews || [];
  const rated = reviews.filter((r) => r.stars >= 1 && r.stars <= 5);
  if (!rated.length) { console.log("no rated reviews; leaving index.html as is"); return; }
  const avg = rated.reduce((a, r) => a + r.stars, 0) / rated.length, n = rated.length;
  const score = avg.toFixed(1), stars = "★★★★★☆☆☆☆☆".slice(5 - Math.round(avg), 10 - Math.round(avg));
  const count = `(${n} verified review${n === 1 ? "" : "s"})`, label = `Rated ${score} out of 5 from ${n} verified review${n === 1 ? "" : "s"}`;
  const file = path.join(__dirname, "..", "index.html");
  let html = fs.readFileSync(file, "utf8");
  const before = html;
  html = html.replace(/(<span class="rating" id="heroRating" aria-label=")[^"]*(")/, `$1${label}$2`)
    .replace(/(<span class="stars" id="heroStars" aria-hidden="true">)[^<]*(<\/span>)/, `$1${stars}$2`)
    .replace(/(<strong id="heroScore">)[^<]*(<\/strong>)/, `$1${score}$2`)
    .replace(/(<a class="count" id="heroCount"[^>]*>)[^<]*(<\/a>)/, `$1${count}$2`)
    .replace(/(<span class="rating" id="bandRatingUnit" aria-label=")[^"]*(")/, `$1${label}$2`)
    .replace(/(<span class="stars" id="bandStars" aria-hidden="true">)[^<]*(<\/span>)/, `$1${stars}$2`)
    .replace(/(<strong id="bandScore">)[^<]*(<\/strong>)/, `$1${score}$2`)
    .replace(/(<span class="count" id="bandCount">)[^<]*(<\/span>)/, `$1${count}$2`);
  if (html === before) { console.log(`index.html already says ${score} ${count}`); return; }
  fs.writeFileSync(file, html);
  console.log(`index.html hero rating set to ${stars} ${score} ${count}`);
})().catch((e) => { console.error(e.message); process.exit(1); });
