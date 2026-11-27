// Shared fallback monthly rates for home (`months`) and business rentals.
// /api/pricing (admin-edited Netlify Blobs) is the live source of truth.
// These values are used only when that read is missing, and must stay in
// step with it: `npm test` compares them to a saved snapshot, and
// `npm run check:pricing` does a read-only live GET after deploy.
// Values copied from https://purebaric.com/api/pricing on
// Friday, Nov 27, 2026, 10:40:47 AM America/Denver (MST, UTC-7).
(function (root, factory) {
  var defaults = factory();
  if (typeof module === "object" && module.exports) {
    module.exports = defaults;
  }
  if (typeof root !== "undefined") {
    root.PB_PRICING_DEFAULTS = defaults;
  }
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  return {
    months: {
      1: 729, 2: 659, 3: 659, 4: 579, 5: 579, 6: 559,
      7: 559, 8: 559, 9: 549, 10: 549, 11: 549, 12: 529
    },
    business: {
      1: 979, 2: 979, 3: 929, 4: 881, 5: 881, 6: 832,
      7: 832, 8: 832, 9: 810, 10: 810, 11: 810, 12: 783
    }
  };
});
