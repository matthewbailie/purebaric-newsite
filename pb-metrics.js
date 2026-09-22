/* Purebaric metrics bootstrap - GA4 (US-only measurement).
 *
 * Served as /pb-metrics.js (a neutral first-party name; a file literally named
 * "analytics.js" is blocked by many ad/privacy blockers as ERR_BLOCKED_BY_CLIENT).
 * GA_ID points at the standalone Purebaric "Purebaric Website" property
 * (account 408850169, property 555169638, stream 15813569788).
 *
 * CONSENT: Purebaric operates and advertises only in Utah (US), not the EEA, so
 * this is an OPT-OUT model. Analytics + Google Ads measurement are GRANTED by
 * default (so page_view + gclid are captured and conversions can be attributed);
 * personalized advertising stays DENIED unless the owner enables remarketing.
 * A visitor who clicks "Decline" is remembered and gets everything denied.
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

  // Has the visitor explicitly opted out on a previous visit?
  var declined = false;
  try {
    declined = localStorage.getItem('pb_cookie') === 'decline'
            || localStorage.getItem('purebaric_cookie_consent') === 'declined';
  } catch (e) {}

  // Consent default: grant measurement unless the visitor opted out. Personalized
  // advertising stays denied.
  var measure = declined ? 'denied' : 'granted';
  gtag('consent', 'default', {
    analytics_storage: measure,
    ad_storage: measure,
    ad_user_data: measure,
    ad_personalization: 'denied'
  });

  function configGA() {
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
  }

  // "Accept": ensure measurement is granted and the tag is loaded.
  window.loadPurebaricAnalytics = function () {
    try { localStorage.setItem('pb_cookie', 'accept'); } catch (e) {}
    gtag('consent', 'update', {
      analytics_storage: 'granted',
      ad_storage: 'granted',
      ad_user_data: 'granted',
      ad_personalization: 'denied'
    });
    configGA();
  };

  // "Decline": opt out of all measurement, and remember it.
  window.declinePurebaricAnalytics = function () {
    try { localStorage.setItem('pb_cookie', 'decline'); } catch (e) {}
    gtag('consent', 'update', {
      analytics_storage: 'denied',
      ad_storage: 'denied',
      ad_user_data: 'denied',
      ad_personalization: 'denied'
    });
  };

  // Explicit, safe event helper. Never pass a form, FormData, response, or free text.
  window.trackPurebaricEvent = function (name, params) {
    if (typeof window.gtag !== 'function') return;
    window.gtag('event', name, params || {});
  };
  // Back-compat alias used by the teal pages' script.js.
  if (typeof window.track !== 'function') window.track = window.trackPurebaricEvent;

  // Load GA on page load unless the visitor has opted out (opt-out model).
  if (!declined) configGA();
})();
