// Pure service-area (delivery ZIP) rules, unit-tested in test/servicearea.test.js.
// A ZIP is served when it matches one of the 3-digit prefixes OR is in the
// explicit 5-digit list. Defaults mirror the historic hardcoded rule
// (840xx / 841xx / 844xx + the Provo/Weber additions).

const DEFAULT_SERVICE_AREA = {
  prefixes: ["840", "841", "844"],
  zips: [
    "84201", "84244",
    "84601", "84602", "84603", "84604", "84605", "84606",
    "84626", "84633", "84651", "84653", "84660", "84663", "84664",
  ],
};

function normalizeServiceArea(area) {
  const src = area || {};
  const prefixes = Array.isArray(src.prefixes)
    ? src.prefixes.map((p) => String(p).trim()).filter((p) => /^\d{3}$/.test(p))
    : [];
  const zips = Array.isArray(src.zips)
    ? src.zips.map((z) => String(z).trim()).filter((z) => /^\d{5}$/.test(z))
    : [];
  return { prefixes: [...new Set(prefixes)], zips: [...new Set(zips)].sort() };
}

function zipServed(zip, area) {
  const z = String(zip || "").trim();
  if (!/^\d{5}$/.test(z)) return false;
  const a = normalizeServiceArea(area);
  if (a.prefixes.some((p) => z.startsWith(p))) return true;
  return a.zips.includes(z);
}

module.exports = { DEFAULT_SERVICE_AREA, normalizeServiceArea, zipServed };
