// The admin portal's saved card order, per section: { sectionId: [cardKey, ...] }.
// Pure validation so a bad request can't store junk. Tested in test/layout.test.js.
const MAX_SECTIONS = 30;
const MAX_CARDS = 30;
const KEY = /^[a-z0-9][a-z0-9_-]{0,63}$/i;

function cleanLayout(input) {
  const out = {};
  const orders = input && typeof input === "object" && !Array.isArray(input) ? input : {};
  Object.keys(orders).slice(0, MAX_SECTIONS).forEach((section) => {
    if (!KEY.test(section) || !Array.isArray(orders[section])) return;
    const seen = new Set();
    const keys = [];
    orders[section].forEach((k) => {
      if (typeof k === "string" && KEY.test(k) && !seen.has(k) && keys.length < MAX_CARDS) { seen.add(k); keys.push(k); }
    });
    out[section] = keys;
  });
  return out;
}

module.exports = { cleanLayout };
