/* Screen-support logic shared by the experience pages and the tests.
 *
 * A flicker at F Hz can only be drawn exactly when the screen's refresh rate is a whole multiple
 * of F, i.e. N = refresh / F ("frames per cycle") is a whole number of at least 2. Examples:
 *   40 Hz light: 120 Hz screen -> N = 3 (ok); 60 Hz -> N = 1.5 (no); 144 Hz -> N = 3.6 (no)
 *   10 Hz light:  60 Hz screen -> N = 6 (ok); 90 Hz -> N = 9 (ok); 144 Hz -> N = 14.4 (no)
 * Audio does not depend on the screen, so sound is always available.
 */
(function (root, factory) {
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.PBSupport = api;
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';
  var TOLERANCE = 0.04;      // N may be this far from a whole number (at 3 frames per cycle = 1.33%)
  var MIN_STABLE_PCT = 98;   // % of well-timed frames needed to pass
  var MIN_HZ = 55;           // below this the screen is considered too slow / throttled
  var STANDARD_RATES = [60, 90, 120, 144, 165, 240];

  // The allowed distance from a whole number grows with the cycle length, so the allowed
  // error in the flicker RATE stays about 1.3% whatever the frequency.
  function tolN(k) { return Math.max(TOLERANCE, k * TOLERANCE / 3); }

  function supportFor(hz, f) {
    var N = hz / f, k = Math.round(N);
    return { hz: f, N: N, k: k, ok: k >= 2 && Math.abs(N - k) <= tolN(k) };
  }

  /* hz: measured refresh rate; stablePct: % of frames within 75..125% of the median interval;
     drifted: rate moved >3% between first and last frames; freqs: flicker rates the experience
     uses (default [40]). Returns the verdict plus a per-frequency breakdown. */
  function evaluateRefresh(hz, stablePct, drifted, freqs) {
    freqs = freqs && freqs.length ? freqs : [40];
    var stages = freqs.map(function (f) { return supportFor(hz, f); });
    var reason = null;
    if (hz < MIN_HZ) reason = 'TOO_SLOW';
    else if (drifted || stablePct < MIN_STABLE_PCT) reason = 'UNSTABLE';
    else if (stages.some(function (s) { return !s.ok; })) reason = 'NOT_MULTIPLE';
    var label = '', best = Infinity;
    STANDARD_RATES.forEach(function (r) { var d = Math.abs(hz - r); if (d < best) { best = d; label = String(r); } });
    if (best / hz > 0.08) label = '';
    return {
      hz: hz, freqs: freqs, stages: stages, N: stages[0].N, k: stages[0].k,
      stablePct: stablePct, drifted: drifted, label: label, reason: reason, pass: reason === null
    };
  }
  return { TOLERANCE: TOLERANCE, MIN_STABLE_PCT: MIN_STABLE_PCT, tolN: tolN, supportFor: supportFor, evaluateRefresh: evaluateRefresh };
});
