/* Purebaric metrics bootstrap - consent-gated GA4.
 *
 * Served as /pb-metrics.js (a neutral first-party name; a file literally named
 * "analytics.js" is blocked by many ad/privacy blockers as ERR_BLOCKED_BY_CLIENT).
 * GA_ID points at the standalone Purebaric "Purebaric Website" property
 * (account 408850169, property 555169638, stream 15813569788).
 *
 * PRIVACY: never pass names, emails, phones, addresses, ZIP/city, notes, health
 * info, raw form payloads, or API responses into any event. Only allowlisted,
 * non-identifying values (chamber model, rental length, CTA source, eligibility
 * result, form topic, amount/currency, error category).
 */
(function () {
  window.dataLayer = window.dataLayer || [];
  window.gtag = window.gtag || function () { window.dataLayer.push(arguments); };

  var GA_ID = 'G-Q1X04YRWP1'; // standalone Purebaric Website property
  var READY = /^G-[A-Z0-9]+$/.test(GA_ID) && GA_ID.indexOf('PUREBARIC_ID') === -1;

  gtag('consent', 'default', {
    analytics_storage: 'denied',
    ad_storage: 'denied',
    ad_user_data: 'denied',
    ad_personalization: 'denied',
    wait_for_update: 500
  });

  window.loadPurebaricAnalytics = function () {
    gtag('consent', 'update', { analytics_storage: 'granted' });
    if (!READY || window.purebaricAnalyticsLoaded) return;
    window.purebaricAnalyticsLoaded = true;
    gtag('js', new Date());
    gtag('config', GA_ID, {
      send_page_view: true,
      allow_google_signals: false,
      allow_ad_personalization_signals: false
    });
    var s = document.createElement('script');
    s.async = true;
    s.src = 'https://www.googletagmanager.com/gtag/js?id=' + GA_ID;
    document.head.appendChild(s);
  };

  window.declinePurebaricAnalytics = function () {
    gtag('consent', 'update', { analytics_storage: 'denied' });
  };

  // Explicit, safe event helper. Never pass a form, FormData, response, or free text.
  window.trackPurebaricEvent = function (name, params) {
    if (typeof window.gtag !== 'function') return;
    window.gtag('event', name, params || {});
  };
  // Back-compat alias used by the teal pages' script.js.
  if (typeof window.track !== 'function') window.track = window.trackPurebaricEvent;

  // Auto-load if the visitor already accepted cookies (warm + teal consent keys).
  try {
    var warm = localStorage.getItem('pb_cookie');            // warm pages
    var teal = localStorage.getItem('purebaric_cookie_consent'); // teal pages
    if (warm === 'accept' || teal === 'accepted') window.loadPurebaricAnalytics();
  } catch (e) {}
})();
