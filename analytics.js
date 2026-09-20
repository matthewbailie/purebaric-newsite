/* Purebaric analytics bootstrap - consent-gated GA4.
 *
 * OWNER ACTION: create the standalone Purebaric GA4 property (its own account, NOT
 * Nerd United), then replace GA_ID below with that property's Measurement ID
 * (e.g. G-XXXXXXXXXX) and redeploy. Until a real ID is set, this file safely
 * no-ops: no GA network requests are made and tracked events queue harmlessly.
 *
 * PRIVACY: never pass names, emails, phones, addresses, ZIP/city, notes, health
 * info, raw form payloads, or API responses into any event. Only allowlisted,
 * non-identifying values (chamber model, rental length, CTA source, eligibility
 * result, form topic, amount/currency, error category).
 */
(function () {
  window.dataLayer = window.dataLayer || [];
  window.gtag = window.gtag || function () { window.dataLayer.push(arguments); };

  var GA_ID = 'G-PUREBARIC_ID'; // <-- REPLACE with the real Measurement ID
  var READY = GA_ID.indexOf('PUREBARIC_ID') === -1; // false while placeholder

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
