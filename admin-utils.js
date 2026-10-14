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

  // Who a customer is: email, else phone digits, else name. Mirrors netlify/functions/_lib/customer-key.js
  // (test/admin-utils.test.js keeps them equal) so the admin can match rentals to customers with no email.
  function customerKey(p) {
    const r = p || {};
    const name = String(r.name || '').trim().toLowerCase().replace(/\s+/g, ' ');
    if (name) return `name:${name}`;
    const email = String(r.email || '').trim().toLowerCase();
    if (email) return email;
    const digits = String(r.phone || '').replace(/\D/g, '').replace(/^1(?=\d{10}$)/, '');
    return digits ? `phone:${digits}` : '';
  }
  // The customer a rental's renter copy belongs to: same name (phone breaks a tie between two customers
  // with one name), else same email, else same phone. Mirrors customerFor in _lib/customers.js.
  function findCustomerFor(customers, p) {
    const all = customers || [];
    const name = String((p && p.name) || '').trim().toLowerCase().replace(/\s+/g, ' ');
    const digits = String((p && p.phone) || '').replace(/\D/g, '').replace(/^1(?=\d{10}$)/, '');
    const email = String((p && p.email) || '').trim().toLowerCase();
    if (name) {
      const same = all.filter(c => (c.nameKey || String(c.name || '').trim().toLowerCase().replace(/\s+/g, ' ')) === name);
      if (same.length === 1) return same[0];
      if (same.length > 1) return same.find(c => digits && c.phoneDigits === digits) || same.find(c => email && c.email === email) || same.find(c => !c.phoneDigits) || same[0];
    }
    if (email) { const e = all.find(c => c.email === email); if (e) return e; }
    if (digits) { const d = all.find(c => c.phoneDigits === digits); if (d) return d; }
    return null;
  }
  return { matchesSearch, orderByKeys, customerKey, findCustomerFor };
});
