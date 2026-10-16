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

  // Meta (Facebook + Instagram) pixel, for the Meta Ads campaigns. META_PIXEL_ID stays blank
  // until the owner creates the pixel in Meta Events Manager; blank means nothing loads and
  // trackPurebaricMeta is a no-op. Same opt-out as GA: a visitor who declined never loads it.
  // A pixel id is public (it sits in every page's source), so it lives here like GA_ID does.
  var META_PIXEL_ID = '';
  var META_READY = /^\d{10,20}$/.test(META_PIXEL_ID);
  function configMeta() {
    if (!META_READY || declined || window.purebaricMetaLoaded) return;
    window.purebaricMetaLoaded = true;
    var n = window.fbq = function () { n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments); };
    if (!window._fbq) window._fbq = n;
    n.push = n; n.loaded = true; n.version = '2.0'; n.queue = [];
    var s = document.createElement('script');
    s.async = true;
    s.src = 'https://connect.facebook.net/en_US/fbevents.js';
    document.head.appendChild(s);
    window.fbq('init', META_PIXEL_ID);
    window.fbq('track', 'PageView');
  }

  // Meta standard events only (Lead, Contact, ...). Same PII rule as trackPurebaricEvent.
  window.trackPurebaricMeta = function (name, params) {
    if (!window.purebaricMetaLoaded || typeof window.fbq !== 'function') return;
    window.fbq('track', name, params || {});
  };

  // "Accept": ensure measurement is granted and the tags are loaded.
  window.loadPurebaricAnalytics = function () {
    declined = false;
    try { localStorage.setItem('pb_cookie', 'accept'); } catch (e) {}
    gtag('consent', 'update', {
      analytics_storage: 'granted',
      ad_storage: 'granted',
      ad_user_data: 'granted',
      ad_personalization: 'denied'
    });
    configGA();
    configMeta();
  };

  // "Decline": opt out of all measurement, and remember it.
  window.declinePurebaricAnalytics = function () {
    declined = true;
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

  // Capture the anonymous GA identifiers needed to connect a later, offline
  // rental confirmation to the visitor's original web/ad session. Never add
  // contact, address, or health fields to this object.
  window.getPurebaricAnalyticsContext = function () {
    return new Promise(function (resolve) {
      if (!READY || declined || typeof window.gtag !== 'function') {
        resolve({ consentGranted: false });
        return;
      }

      var context = { consentGranted: true };
      var pending = 2;
      var complete = false;
      var timer = setTimeout(finish, 800);

      function finish() {
        if (complete) return;
        complete = true;
        clearTimeout(timer);
        resolve(context);
      }
      function received(field, value) {
        if (value != null) context[field] = String(value);
        pending -= 1;
        if (pending === 0) finish();
      }

      gtag('get', GA_ID, 'client_id', function (value) { received('clientId', value); });
      gtag('get', GA_ID, 'session_id', function (value) { received('sessionId', value); });
    });
  };
  // Back-compat alias used by the teal pages' script.js.
  if (typeof window.track !== 'function') window.track = window.trackPurebaricEvent;

  // Capture the ad click id Google appends to a Search/PMax ad's landing URL (?gclid=...), so a
  // later reservation request can be tied back to the click that produced it. Session-scoped: it
  // survives the visit (in case the click lands on the homepage, not /book) but not future visits,
  // and never touches ad_storage/localStorage, so it needs no consent gate of its own.
  try {
    var gclid = new URLSearchParams(location.search).get('gclid');
    if (gclid) sessionStorage.setItem('pb_gclid', gclid.slice(0, 100));
  } catch (e) {}
  window.getPurebaricGclid = function () {
    try { return sessionStorage.getItem('pb_gclid') || ''; } catch (e) { return ''; }
  };

  // Load GA (and the Meta pixel, once it has an id) on page load unless the visitor has opted out.
  if (!declined) { configGA(); configMeta(); }
})();
