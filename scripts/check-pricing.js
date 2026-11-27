#!/usr/bin/env node
// Read-only post-deploy check: compare live GET /api/pricing to the shared fallback.
// Never writes. Exit 1 if the live table has drifted from pricing-defaults.js.
"use strict";

const defaults = require("../pricing-defaults.js");

const URL = process.env.PRICING_API_URL || "https://purebaric.com/api/pricing";

function table12(src, label) {
  const out = {};
  for (let m = 1; m <= 12; m++) {
    const v = Number(src && src[m]);
    if (!Number.isFinite(v) || v <= 0) {
      throw new Error(`${label} is missing a positive rate for month ${m}`);
    }
    out[m] = v;
  }
  return out;
}

function diffs(live, fallback, label) {
  const left = table12(live, `live ${label}`);
  const right = table12(fallback, `fallback ${label}`);
  const rows = [];
  for (let m = 1; m <= 12; m++) {
    if (left[m] !== right[m]) {
      rows.push(`  ${label} ${m}-month: live ${left[m]} != fallback ${right[m]}`);
    }
  }
  return rows;
}

(async () => {
  const res = await fetch(URL, { method: "GET", redirect: "follow" });
  if (!res.ok) {
    console.error(`check:pricing: GET ${URL} failed: ${res.status} ${res.statusText}`);
    process.exit(1);
  }
  const body = await res.json();
  const found = [
    ...diffs(body.months, defaults.months, "home"),
    ...diffs(body.business, defaults.business, "business"),
  ];
  if (found.length) {
    console.error(`check:pricing: live ${URL} has drifted from pricing-defaults.js`);
    console.error(found.join("\n"));
    console.error("Update the shared fallback and test/fixtures/pricing-api-snapshot.json after Matthew confirms the live prices.");
    process.exit(1);
  }
  console.log(`check:pricing: live ${URL} matches pricing-defaults.js`);
})().catch((err) => {
  console.error(`check:pricing: ${err.message || err}`);
  process.exit(1);
});
