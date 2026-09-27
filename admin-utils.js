// Small pure helpers shared by the admin portal's search boxes and card reordering.
// Unit-tested in test/admin-utils.test.js.
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.PurebaricAdminUtils = api;
})(typeof window !== 'undefined' ? window : globalThis, function () {
  'use strict';

  // Live-search match: every space-separated word in `query` must appear somewhere in `fields`
  // (case-insensitive). A word that looks like a phone number (digits, spaces, dashes, dots,
  // parentheses, +) also matches on digits only, so "801 555" finds "(801) 555-1234". An empty
  // query matches everything.
  function matchesSearch(query, fields) {
    const words = String(query || '').toLowerCase().split(/\s+/).filter(Boolean);
    if (!words.length) return true;
    const list = (fields || []).map((f) => (f == null ? '' : String(f)));
    const hay = list.join(' ').toLowerCase();
    const digits = list.join(' ').replace(/\D/g, '');
    return words.every((w) => {
      if (hay.includes(w)) return true;
      const d = w.replace(/\D/g, '');
      return d.length >= 3 && /^[\d().+-]+$/.test(w) && digits.includes(d);
    });
  }

  // Put `items` (anything with a key) into the order given by `keys`; items whose key isn't
  // listed keep their relative order after the listed ones. Unknown keys are ignored.
  function orderByKeys(items, keys, keyOf) {
    const rank = new Map((keys || []).map((k, i) => [k, i]));
    const kf = keyOf || ((x) => x);
    return items
      .map((item, i) => ({ item, i, r: rank.has(kf(item)) ? rank.get(kf(item)) : Infinity }))
      .sort((a, b) => (a.r === b.r ? a.i - b.i : a.r - b.r))
      .map((x) => x.item);
  }

  return { matchesSearch, orderByKeys };
});
