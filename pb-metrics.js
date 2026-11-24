/* Purebaric metrics bootstrap - GA4 (US-only measurement) + Meta pixel.
 *
 * Served as /pb-metrics.js (a neutral first-party name; a file literally named
 * "analytics.js" is blocked by many ad/privacy blockers as ERR_BLOCKED_BY_CLIENT).
 * GA_ID points at the standalone Purebaric "Purebaric Website" property
 * (account 408850169, property 555169638, stream 15813569788).
 *
 * CONSENT: Purebaric operates and advertises only in Utah (US), not the EEA, so
 * this is an OPT-OUT model with NO cookie banner (never add one). Analytics +
 * Google Ads measurement are on by default; personalized advertising stays
 * denied. Neither GA4 nor the Meta pixel is loaded at all, and every tracking
 * call below is a no-op, when ANY of these is true (see blockReason()):
 *   - the browser sends Global Privacy Control (navigator.globalPrivacyControl)
 *   - the browser sends Do Not Track (navigator.doNotTrack / window.doNotTrack = "1")
 *   - the visitor turned analytics off on /privacy (pb_cookie=decline, or the legacy
 *     purebaric_cookie_consent=declined)
 *   - the browser is flagged internal (pb_internal=1, set by visiting any page with
 *     ?internal=1; ?internal=0 clears it), or a form was just submitted with a TEST
 *     name/email or the owner's own email (session-only flag).
 * First-touch lead-source capture (below) is skipped under the same conditions,
 * plus the /privacy personalization opt-out (pb_pz_off=1).
 *
 * PRIVACY: never pass names, emails, phones, addresses, ZIP/city, notes, health
 * info, raw form payloads, or API responses into any event, and never store them
 * in the browser. Only allowlisted, non-identifying values (chamber model, rental
 * length, CTA source, eligibility result, form topic, amount/currency, error category).
 */
(function (window) {
  var document = window.document;
  var navigator = window.navigator || {};

  function ls() { try { return window.localStorage; } catch (e) { return null; } }
  function ss() { try { return window.sessionStorage; } catch (e) { return null; } }
  function get(store, k) { try { return store ? store.getItem(k) : null; } catch (e) { return null; } }
  function set(store, k, v) { try { if (store) store.setItem(k, v); } catch (e) {} }
  function del(store, k) { try { if (store) store.removeItem(k); } catch (e) {} }
  function query() { try { return new URLSearchParams(window.location.search || ''); } catch (e) { return { get: function () { return null; } }; } }

  // ?internal=1 marks this browser as internal (owner, team, QA) so it never
  // reaches GA4 or Meta; ?internal=0 clears it.
  (function () {
    var q = query().get('internal');
    if (q === '1') { set(ls(), 'pb_internal', '1'); set(ss(), 'pb_internal', '1'); }
    else if (q === '0') { del(ls(), 'pb_internal'); del(ss(), 'pb_internal'); }
  })();

  function gpc() { return navigator.globalPrivacyControl === true; }
  function dnt() {
    return navigator.doNotTrack === '1' || navigator.doNotTrack === 'yes'
        || window.doNotTrack === '1' || navigator.msDoNotTrack === '1';
  }
  function declinedFlag() {
    return get(ls(), 'pb_cookie') === 'decline' || get(ls(), 'purebaric_cookie_consent') === 'declined';
  }
  function internalFlag() { return get(ls(), 'pb_internal') === '1' || get(ss(), 'pb_internal') === '1'; }

  // Why tracking is off on this page view, or '' when it is allowed.
  function blockReason() {
    if (gpc()) return 'gpc';
    if (dnt()) return 'dnt';
    if (declinedFlag()) return 'opt_out';
    if (internalFlag()) return 'internal';
    return '';
  }

  var reason = blockReason();
  var blocked = !!reason;
  var declined = reason === 'opt_out';

  var GA_ID = 'G-Q1X04YRWP1'; // standalone Purebaric Website property
  var READY = /^G-[A-Z0-9]+$/.test(GA_ID) && GA_ID.indexOf('PUREBARIC_ID') === -1;
  // Meta (Facebook + Instagram) pixel. A pixel id is public (it sits in every page's source).
  var META_PIXEL_ID = '1885194068430513'; // "Matthew L. Bailie's Pixel" (Purebaric business)
  var META_READY = /^\d{10,20}$/.test(META_PIXEL_ID);

  window.dataLayer = window.dataLayer || [];
  if (blocked) {
    // Nothing loads and nothing is queued: gtag is a no-op for every caller,
    // including pb-personalize.js and script.js.
    window.gtag = function () {};
  } else {
    window.gtag = window.gtag || function () { window.dataLayer.push(arguments); };
    // Consent default: measurement granted (opt-out model); personalized ads denied.
    window.gtag('consent', 'default', {
      analytics_storage: 'granted',
      ad_storage: 'granted',
      ad_user_data: 'granted',
      ad_personalization: 'denied'
    });
  }

  function configGA() {
    if (!READY || blocked || window.purebaricAnalyticsLoaded) return;
    window.purebaricAnalyticsLoaded = true;
    window.gtag('js', new Date());
    window.gtag('config', GA_ID, {
      send_page_view: true,
      allow_google_signals: false,
      allow_ad_personalization_signals: false
    });
    var s = document.createElement('script');
    s.async = true;
    s.src = 'https://www.googletagmanager.com/gtag/js?id=' + GA_ID;
    document.head.appendChild(s);
  }

  function configMeta() {
    if (!META_READY || blocked || window.purebaricMetaLoaded) return;
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

  // Turn tracking off for the rest of this page view and session (internal/TEST lead).
  function suppress(why) {
    blocked = true;
    reason = why || reason || 'internal';
    window.gtag = function () {}; // trackPurebaricMeta checks `blocked`, so fbq stays as loaded
  }

  // Meta standard events (Lead, InitiateCheckout, CompleteRegistration, Subscribe, Contact).
  // opts.eventID deduplicates against a future Conversions API send. Same PII rule.
  window.trackPurebaricMeta = function (name, params, opts) {
    if (blocked || !window.purebaricMetaLoaded || typeof window.fbq !== 'function') return;
    if (opts && opts.eventID) window.fbq('track', name, params || {}, { eventID: String(opts.eventID) });
    else window.fbq('track', name, params || {});
  };

  // GA4 event helper. Never pass a form, FormData, response, or free text.
  window.trackPurebaricEvent = function (name, params) {
    if (blocked || typeof window.gtag !== 'function') return;
    window.gtag('event', name, params || {});
  };

  // /privacy "Turn analytics back on" (if ever offered). GPC, DNT and the internal
  // flag still win: a browser sending them never loads either tag.
  window.loadPurebaricAnalytics = function () {
    del(ls(), 'purebaric_cookie_consent');
    set(ls(), 'pb_cookie', 'accept');
    reason = blockReason();
    blocked = !!reason;
    declined = false;
    if (blocked) return;
    window.gtag = function () { window.dataLayer.push(arguments); };
    window.gtag('consent', 'update', {
      analytics_storage: 'granted',
      ad_storage: 'granted',
      ad_user_data: 'granted',
      ad_personalization: 'denied'
    });
    configGA();
    configMeta();
  };

  // /privacy "Turn off analytics on this device": opt out of all measurement, and remember it.
  window.declinePurebaricAnalytics = function () {
    set(ls(), 'pb_cookie', 'decline');
    if (!blocked && typeof window.gtag === 'function') {
      window.gtag('consent', 'update', {
        analytics_storage: 'denied',
        ad_storage: 'denied',
        ad_user_data: 'denied',
        ad_personalization: 'denied'
      });
    }
    declined = true;
    suppress('opt_out');
    forgetLeadSource();
  };

  // Anonymous GA identifiers so a later, offline rental confirmation can be tied to
  // the original web/ad session. Never add contact, address, or health fields.
  window.getPurebaricAnalyticsContext = function () {
    return new Promise(function (resolve) {
      if (!READY || blocked || declined || !window.purebaricAnalyticsLoaded || typeof window.gtag !== 'function') {
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
      window.gtag('get', GA_ID, 'client_id', function (value) { received('clientId', value); });
      window.gtag('get', GA_ID, 'session_id', function (value) { received('sessionId', value); });
    });
  };
  // Back-compat alias used by the teal pages' script.js.
  if (typeof window.track !== 'function') window.track = window.trackPurebaricEvent;

  /* ───── Lead source: first-touch capture (no personal info) ─────
   * localStorage pb_ft = {v,ts,s,m,c,ct,t,fb,gc,r,l}: utm_source/medium/campaign/
   * content/term, fbclid, gclid, external referrer (origin + path only, no query),
   * landing path (no query), first-visit time. Kept 90 days, written once (first
   * touch wins). Sent with booking, waitlist and contact submissions as ls_* fields. */
  var FT_KEY = 'pb_ft';
  var FT_DAYS = 90;
  function captureAllowed() { return !blocked && get(ls(), 'pb_pz_off') !== '1'; }
  function clip(v, n) { return v ? String(v).slice(0, n) : ''; }
  function forgetLeadSource() { del(ls(), FT_KEY); del(ss(), FT_KEY); del(ss(), 'pb_gclid'); }

  function readFirstTouch() {
    var raw = get(ls(), FT_KEY) || get(ss(), FT_KEY);
    if (!raw) return null;
    try {
      var ft = JSON.parse(raw);
      if (!ft || ft.v !== 1 || typeof ft.ts !== 'string') return null;
      if (Date.now() - Date.parse(ft.ts) > FT_DAYS * 864e5) { forgetLeadSource(); return null; }
      return ft;
    } catch (e) { return null; }
  }

  function externalReferrer() {
    try {
      if (!document.referrer) return '';
      var r = new URL(document.referrer);
      if (r.hostname === window.location.hostname) return '';
      if (r.protocol !== 'https:' && r.protocol !== 'http:') return '';
      return clip(r.origin + r.pathname, 200);
    } catch (e) { return ''; }
  }

  function captureFirstTouch() {
    if (!captureAllowed() || readFirstTouch()) return;
    var q = query();
    var ft = {
      v: 1,
      ts: new Date().toISOString(),
      s: clip(q.get('utm_source'), 100),
      m: clip(q.get('utm_medium'), 100),
      c: clip(q.get('utm_campaign'), 100),
      ct: clip(q.get('utm_content'), 100),
      t: clip(q.get('utm_term'), 100),
      fb: clip(q.get('fbclid'), 255),
      gc: clip(q.get('gclid'), 100),
      r: externalReferrer(),
      l: clip(window.location.pathname || '/', 200)
    };
    var json = JSON.stringify(ft);
    set(ls(), FT_KEY, json);
    if (!get(ls(), FT_KEY)) set(ss(), FT_KEY, json); // storage-restricted browsers: session only
  }
  try { captureFirstTouch(); } catch (e) {}

  // The Google Ads click id of THIS visit (session-scoped), sent as the booking's gclid.
  try {
    var gclid = query().get('gclid');
    if (gclid && captureAllowed()) set(ss(), 'pb_gclid', gclid.slice(0, 100));
  } catch (e) {}
  window.getPurebaricGclid = function () {
    if (!captureAllowed()) return '';
    return get(ss(), 'pb_gclid') || '';
  };

  // TEST / internal lead check, mirrored server-side in netlify/functions/_lib/lead-source.js.
  function isInternalLead(who) {
    who = who || {};
    if (internalFlag()) return true;
    var name = [who.name, who.firstName, who.lastName].filter(Boolean).join(' ');
    if (/\btest\b/i.test(name)) return true;
    var e = String(who.email || '').trim().toLowerCase();
    if (!e) return false;
    var parts = e.split('@'), local = parts[0] || '', domain = parts[1] || '';
    if (domain === 'gmail.com' && local.split('+')[0].replace(/\./g, '') === 'matthewbailie') return true;
    return /(^|[._+\-])test([._+\-]|\d|$)/.test(local);
  }

  // Add the first-touch fields (ls_*) to a form submission (URLSearchParams or
  // FormData), and flag it internal (pb_internal=1) when it is a TEST/internal
  // lead; an internal lead also switches tracking off for the rest of the session,
  // so no GA4 or Meta event fires for it. Returns true when the lead is internal.
  window.appendPurebaricLeadSource = function (data, who) {
    var internal = isInternalLead(who);
    try {
      if (internal) {
        data.set('pb_internal', '1');
        set(ss(), 'pb_internal', '1');
        suppress('internal');
      }
      if (!blocked) { data.set('pb_device', deviceType()); data.set('pb_variant', variant()); }
      var ft = captureAllowed() ? readFirstTouch() : null;
      if (ft) {
        var map = { ls_utm_source: ft.s, ls_utm_medium: ft.m, ls_utm_campaign: ft.c, ls_utm_content: ft.ct,
          ls_utm_term: ft.t, ls_fbclid: ft.fb, ls_gclid: ft.gc, ls_referrer: ft.r, ls_landing: ft.l, ls_ts: ft.ts };
        for (var k in map) if (map[k]) data.set(k, map[k]);
      }
    } catch (e) {}
    return internal;
  };

  /* ───── Hooks for the Optimization & Personalization event spec ─────
   * The scroll-depth and booking-widget device-type events are specified in
   * /workspace/purebaric-team/metrics.md section 2 (due Wed Nov 25). Add them as
   * PBMetrics.onReady(function (api) { ... api.track('scroll_depth', {...}) ... }),
   * using api.deviceType() for the device dimension. onReady callbacks never run
   * when tracking is blocked (GPC, DNT, opt-out, internal). */
  var readyFns = [];
  // device: viewport width < 768 px = mobile, otherwise desktop; unknown if unmeasurable.
  function deviceType() {
    var w = window.innerWidth || (document.documentElement && document.documentElement.clientWidth) || 0;
    if (!w) return 'unknown';
    return w < 768 ? 'mobile' : 'desktop';
  }
  // variant: the homepage personalization arm (pb-personalize.js profile), or none.
  function variant() {
    try {
      var pz = JSON.parse(get(ls(), 'pb_pz') || 'null');
      if (pz && pz.g === 'c') return 'control';
      if (pz && pz.g === 'p') return 'personalized';
    } catch (e) {}
    return 'none';
  }
  // Allowlisted funnel params (metrics.md section 2): device + variant. No PII.
  function funnelParams(extra) {
    var p = { device: deviceType(), variant: variant() };
    if (extra) for (var k in extra) p[k] = extra[k];
    return p;
  }
  var api = {
    track: function (name, params) { window.trackPurebaricEvent(name, params); },
    meta: function (name, params, opts) { window.trackPurebaricMeta(name, params, opts); },
    deviceType: deviceType,
    variant: variant,
    funnelParams: funnelParams
  };
  window.PBMetrics = {
    isBlocked: function () { return blocked; },
    blockReason: function () { return reason; },
    isInternalLead: isInternalLead,
    deviceType: deviceType,
    variant: variant,
    funnelParams: funnelParams,
    firstTouch: function () { return captureAllowed() ? readFirstTouch() : null; },
    onReady: function (fn) {
      if (typeof fn !== 'function' || blocked) return;
      if (readyFns === null) { try { fn(api); } catch (e) {} return; }
      readyFns.push(fn);
    }
  };

  /* scroll_depth (metrics.md section 2): first crossing of 25/50/75/90% of the
   * document height on /, /book and /pricing, once per threshold per page view.
   * Params: percent, page_path (path only), device, variant. */
  var SCROLL_PAGES = { '/': 1, '/index.html': 1, '/book': 1, '/book.html': 1, '/pricing': 1, '/pricing.html': 1 };
  function scrollPath() {
    var p = (window.location.pathname || '/').replace(/\/+$/, '') || '/';
    return SCROLL_PAGES[p] ? p.replace(/\.html$/, '').replace(/^\/index$/, '/') : '';
  }
  function scrollDepth(a) {
    var path = scrollPath();
    if (!path || !window.addEventListener) return;
    var marks = [25, 50, 75, 90], fired = {};
    var check = function () {
      var de = document.documentElement || {}, body = document.body || {};
      var h = Math.max(de.scrollHeight || 0, body.scrollHeight || 0);
      var view = window.innerHeight || de.clientHeight || 0;
      if (!h) return;
      var y = (window.pageYOffset || de.scrollTop || 0) + view;
      var pct = Math.min(100, (y / h) * 100);
      for (var i = 0; i < marks.length; i++) {
        var m = marks[i];
        if (pct >= m && !fired[m]) {
          fired[m] = true;
          a.track('scroll_depth', funnelParams({ percent: m, page_path: path }));
        }
      }
    };
    var t = false;
    window.addEventListener('scroll', function () { if (t) return; t = true; setTimeout(function () { t = false; check(); }, 200); }, { passive: true });
    window.addEventListener('load', check);
  }
  window.PBMetrics.onReady(scrollDepth);

  // Load GA and the Meta pixel on page load unless tracking is blocked.
  if (!blocked) {
    configGA();
    configMeta();
    var fns = readyFns; readyFns = null;
    for (var i = 0; i < fns.length; i++) { try { fns[i](api); } catch (e) {} }
  }
})(typeof window !== 'undefined' ? window : this);
