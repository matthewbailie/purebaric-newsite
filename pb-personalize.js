/* Purebaric homepage personalization: first-party interest profile.
 *
 * What it does: remembers, in this browser only, which chamber type (sitting,
 * lying) or business rental a visitor showed interest in, the Utah city page
 * they read, and which ad brought them, so the homepage hero can show that
 * chamber on the next visit. See _internal/personalization/README.md.
 *
 * PRIVACY: localStorage only (key pb_pz), no cookies, nothing sent to our
 * servers. Never stores names, contact details, ZIP, address, free text, raw
 * URLs or UTM values, or which health/use-case pages were read. Nothing is
 * stored (and any profile is erased) when the visitor turned analytics off,
 * or the browser sends Global Privacy Control or Do Not Track. The profile
 * expires 45 days after its last update.
 *
 * Fail safe: every entry point is wrapped; on any error the site behaves as
 * if this file did not exist (default homepage).
 */
(function (root, factory) {
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root && root.document) {
    root.PBPZ = api;
    try { api.boot(root); } catch (e) { /* fail safe */ }
  }
})(typeof window !== 'undefined' ? window : null, function () {
  'use strict';

  var KEY = 'pb_pz';
  var SESSION_KEY = 'pb_pz_s';
  var VERSION = 1;
  var DAY = 864e5;
  var HALF_LIFE_DAYS = 14;   // a signal counts half as much after two weeks
  var TTL_DAYS = 45;         // the whole profile is dropped after 45 idle days
  var AD_DAYS = 14;          // an ad click explains the hero for two weeks
  var CITY_DAYS = 30;
  var LEAD_DAYS = 30;        // no "still thinking" nudge after a request
  var HOLDOUT = 0.10;        // 10% persistent control group sees the default homepage
  var MIN_SCORE = 2;         // one strong signal (a chamber CTA click) qualifies for about a week
  var MIN_MARGIN = 1.5;      // and it must clearly lead the runner-up
  var DWELL_MS = 3000;

  var INTERESTS = ['sitting', 'lying', 'business'];
  // Signal weights (points). Frequency: each kind counts once per page view.
  var WEIGHTS = {
    utm: 5,        // arrived from an ad whose tags name the chamber
    book_param: 4, // opened /book with that chamber (or type=business) preselected
    select: 3,     // picked that chamber in a chamber selector
    cta: 3,        // clicked a "book this chamber" link or a button in its card
    page: 1.5,     // viewed the /business page (alone, not enough to switch the hero)
    dwell: 1.5     // kept that chamber's section on screen for 3s+ (needs a second signal)
  };
  var CITIES = {
    'salt-lake-city': 'Salt Lake City',
    'park-city': 'Park City',
    'ogden': 'Ogden',
    'draper-sandy': 'Draper and Sandy',
    'utah-county': 'Utah County'
  };

  function round(n) { return Math.round(n * 1000) / 1000; }
  function decay(w, t, now) {
    if (!w || typeof t !== 'number') return 0;
    var days = Math.max(0, (now - t) / DAY);
    return w * Math.pow(0.5, days / HALF_LIFE_DAYS);
  }

  function optedOut(win) {
    try {
      var n = win.navigator || {};
      if (n.globalPrivacyControl === true) return true;
      if (n.doNotTrack === '1' || n.doNotTrack === 'yes' || win.doNotTrack === '1' || n.msDoNotTrack === '1') return true;
      var ls = win.localStorage;
      if (ls.getItem('pb_pz_off') === '1') return true;
      if (ls.getItem('pb_cookie') === 'decline' || ls.getItem('purebaric_cookie_consent') === 'declined') return true;
      return false;
    } catch (e) { return true; } // no storage access: treat as opted out
  }

  function fresh(now, rnd) {
    return { v: VERSION, g: rnd < HOLDOUT ? 'c' : 'p', c: now, u: now, n: 0, s: {} };
  }

  function parse(raw, now) {
    try {
      var p = JSON.parse(raw || 'null');
      if (!p || p.v !== VERSION || typeof p.u !== 'number' || (p.g !== 'c' && p.g !== 'p')) return null;
      if (now - p.u > TTL_DAYS * DAY || p.u - now > DAY) return null;
      if (!p.s || typeof p.s !== 'object') p.s = {};
      return p;
    } catch (e) { return null; }
  }

  function add(p, interest, kind, now) {
    if (INTERESTS.indexOf(interest) < 0 || !WEIGHTS[kind]) return p;
    var cur = p.s[interest] || { w: 0, t: now };
    p.s[interest] = { w: round(decay(cur.w, cur.t, now) + WEIGHTS[kind]), t: now };
    if (kind === 'utm') p.ad = { i: interest, t: now };
    p.u = now;
    return p;
  }

  /* Read only allowlisted query parameters and map them to an interest.
     Raw values are never stored. */
  function signalsFromUrl(search, path) {
    var out = [];
    var q;
    try { q = new URLSearchParams(search || ''); } catch (e) { return out; }
    var tags = ['utm_content', 'utm_term', 'utm_campaign', 'pz'].map(function (k) { return (q.get(k) || '').toLowerCase(); }).join(' ');
    if (/sitting|seated|upright/.test(tags)) out.push(['sitting', 'utm']);
    else if (/lying|lay[-_ ]?down/.test(tags)) out.push(['lying', 'utm']);
    else if (/business|b2b/.test(tags)) out.push(['business', 'utm']);
    var ch = (q.get('chamber') || '').toLowerCase();
    if (ch === 'sitting' || ch === 'lying') out.push([ch, 'book_param']);
    if ((q.get('type') || '').toLowerCase() === 'business' && /^\/book/.test(path || '')) out.push(['business', 'book_param']);
    return out;
  }

  function cityFromPath(path) {
    var m = /^\/hyperbaric-chamber-rental\/([a-z-]+?)(?:\.html)?\/?$/.exec(path || '');
    return m && CITIES[m[1]] ? m[1] : null;
  }

  function interestFromHref(href) {
    var m = /[?&]chamber=(sitting|lying)\b/i.exec(href || '');
    if (m) return m[1].toLowerCase();
    if (/^\/book(?:\.html)?\?(?:.*&)?type=business\b/i.test(href || '')) return 'business';
    return null;
  }

  function scores(p, now) {
    var out = {};
    INTERESTS.forEach(function (k) { var s = p.s[k]; out[k] = s ? decay(s.w, s.t, now) : 0; });
    return out;
  }

  /* Pure decision: what should the homepage show this visitor? */
  function decide(p, now) {
    if (!p) return null;
    var sc = scores(p, now);
    var ranked = INTERESTS.slice().sort(function (a, b) { return sc[b] - sc[a]; });
    var top = ranked[0], second = ranked[1];
    var interest = (sc[top] >= MIN_SCORE && sc[top] - sc[second] >= MIN_MARGIN) ? top : null;
    var city = p.city && CITIES[p.city.k] && now - p.city.t <= CITY_DAYS * DAY ? p.city.k : null;
    if (!interest && !city) return null;
    var reason = interest && p.ad && p.ad.i === interest && now - p.ad.t <= AD_DAYS * DAY ? 'ad' : (interest ? 'behavior' : 'city');
    var sig = interest ? p.s[interest].t : 0;
    return {
      variant: p.g === 'c' ? 'control' : 'personalized',
      interest: interest,
      score: interest ? round(sc[interest]) : 0,
      reason: reason,
      city: city,
      cityName: city ? CITIES[city] : null,
      months: p.mo >= 1 && p.mo <= 12 ? p.mo : null,
      returning: (p.n || 0) >= 2,
      // "Still thinking about it?" only for a later visit, and never right after a request.
      nudge: !!(interest && p.n >= 2 && sig < (p.ss || 0) && !(p.lead && now - p.lead <= LEAD_DAYS * DAY))
    };
  }

  /* ---------------- browser side ---------------- */
  var win = null, profile = null, seen = {}, disabled = true;

  function now() { return Date.now(); }
  function save() {
    if (disabled || !profile) return;
    try { win.localStorage.setItem(KEY, JSON.stringify(profile)); } catch (e) {}
  }
  function record(interest, kind) {
    if (disabled || !profile) return;
    var k = interest + ':' + kind;
    if (seen[k]) return; // frequency is counted per page view, not per click
    seen[k] = 1;
    add(profile, interest, kind, now());
    save();
  }
  function erase() {
    try { win.localStorage.removeItem(KEY); } catch (e) {}
    try { win.sessionStorage.removeItem(SESSION_KEY); } catch (e) {}
    profile = null; disabled = true;
  }

  function boot(w) {
    win = w;
    var t = now();
    var path = (w.location && w.location.pathname) || '/';
    var isHome = path === '/' || path === '/index.html';
    if (/^\/admin/.test(path)) return;
    if (optedOut(w)) { erase(); if (isHome) unhide(w.document); return; }
    disabled = false;
    var ls = w.localStorage;
    profile = parse(ls.getItem(KEY), t);
    if (!profile) {
      var r = Math.random();
      try { var a = new Uint32Array(1); w.crypto.getRandomValues(a); r = a[0] / 4294967296; } catch (e) {}
      profile = fresh(t, r);
    }
    // A new browser session = a new visit.
    var newVisit = false;
    try { newVisit = !w.sessionStorage.getItem(SESSION_KEY); if (newVisit) w.sessionStorage.setItem(SESSION_KEY, '1'); } catch (e) {}
    if (newVisit) { profile.n = (profile.n || 0) + 1; profile.ss = t; }
    profile.u = t;

    signalsFromUrl(w.location && w.location.search, path).forEach(function (s) { record(s[0], s[1]); });
    var mo = parseInt(new URLSearchParams(w.location.search || '').get('months'), 10);
    if (mo >= 1 && mo <= 12) profile.mo = mo;
    var city = cityFromPath(path);
    if (city) profile.city = { k: city, t: t };
    if (/^\/business(?:\.html)?\/?$/.test(path)) record('business', 'page');
    if (/^\/thank-you(?:\.html)?\/?$/.test(path)) profile.lead = t;
    save();

    // Keep GA's user-scoped group current so lead events can be split by group.
    try { if (typeof w.gtag === 'function') w.gtag('set', 'user_properties', { pz_group: profile.g === 'c' ? 'control' : 'personalized' }); } catch (e) {}

    // Turning analytics off on the privacy page also erases the profile.
    try {
      var decline = w.declinePurebaricAnalytics;
      if (typeof decline === 'function' && !decline.__pz) {
        w.declinePurebaricAnalytics = function () { erase(); return decline.apply(this, arguments); };
        w.declinePurebaricAnalytics.__pz = true;
      }
    } catch (e) {}

    var d = w.document;
    if (isHome && w.__pzHero) applyHome(d);
    function onReady() {
      try { wire(d); } catch (e) {}
    }
    if (d.readyState === 'loading') d.addEventListener('DOMContentLoaded', onReady); else onReady();
  }

  function wire(d) {
    if (disabled) return;
    d.addEventListener('click', function (e) {
      try {
        var el = e.target && e.target.closest ? e.target.closest('a,button,.cdd-opt') : null;
        if (!el) return;
        var href = el.getAttribute('href') || '';
        var i = interestFromHref(href);
        if (!i) { var box = el.closest('[data-pz-interest]'); if (box && (el.tagName === 'A' || el.tagName === 'BUTTON')) i = box.getAttribute('data-pz-interest'); }
        if (i) record(i, 'cta');
        if (el.classList && el.classList.contains('cdd-opt')) {
          // /book chamber dropdown: read the hidden value after the page's own handler ran.
          setTimeout(function () { var ch = d.getElementById('ch'); if (ch) record(/sitting/i.test(ch.value) ? 'sitting' : 'lying', 'select'); }, 0);
        }
      } catch (err) {}
    }, true);
    d.addEventListener('change', function (e) {
      try {
        var t = e.target;
        if (!t || !t.id) return;
        if (t.id === 'ch' && t.tagName === 'SELECT') record(/sitting/i.test(t.value) ? 'sitting' : 'lying', 'select');
        if (/^mo2?$/.test(t.id)) { var m = parseInt(t.value, 10); if (m >= 1 && m <= 12 && profile) { profile.mo = m; save(); } }
      } catch (err) {}
    }, true);
    // Dwell: a chamber's section kept on screen for 3s+.
    if (!('IntersectionObserver' in win)) return;
    var boxes = d.querySelectorAll('[data-pz-dwell]');
    if (!boxes.length) return;
    var timers = new Map();
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        var el = en.target, i = el.getAttribute('data-pz-interest');
        if (en.isIntersecting) {
          if (!timers.has(el)) timers.set(el, setTimeout(function () { record(i, 'dwell'); io.unobserve(el); }, DWELL_MS));
        } else if (timers.has(el)) { clearTimeout(timers.get(el)); timers.delete(el); }
      });
    }, { threshold: 0.5 });
    boxes.forEach(function (b) { io.observe(b); });
  }

  /* Homepage: decision + exposure event (fired for control and personalized alike).
     Opted-out visitors (GPC, DNT, analytics off, personalization off) never get here:
     nothing is stored, no event fires, and they are outside the experiment population. */
  var reported = false;
  function decideForHome() {
    if (disabled || !profile) return null;
    return decide(profile, now());
  }
  function report(dec) {
    if (reported || !dec) return;
    reported = true;
    try {
      if (typeof win.trackPurebaricEvent === 'function') {
        // Exposure is logged for BOTH arms (control sees the default page) so the readout is unbiased.
        win.trackPurebaricEvent('personalization_exposure', {
          variant: dec.variant,
          interest: dec.interest || 'none',
          reason: dec.reason,
          city: dec.city ? 'yes' : 'no',
          nudge: dec.nudge ? 'yes' : 'no',
          visit_type: dec.returning ? 'return' : 'first'
        });
      }
    } catch (e) {}
  }


  /* ---------------- homepage hero (called inline right after the hero copy is parsed) ----------------
     Uses existing site copy and photos only. Booking-mode wording still works because the
     CTA labels match the site's "Book a chamber" patterns. */
  var HOME = {
    sitting: {
      label: 'sitting chamber',
      h1: 'A sitting hyperbaric chamber, at home',
      p: 'An upright, seated design for easier entry and exit, at the same mild 1.5 ATA pressure as our lying chamber. Delivered, set up, and serviced in your home.',
      cta: '/book?chamber=sitting',
      slide: 'chamber-sitting'
    },
    lying: { label: 'lying chamber', cta: '/book?chamber=lying' },
    business: {
      h1: 'Add hyperbaric sessions to your business, without buying a chamber',
      p: 'Offer mild hyperbaric sessions to the members and clients you already serve. Purebaric installs the chamber, trains your staff, and services the equipment.',
      cta: '/book?type=business', ctaText: 'Book a chamber for your business', ctaTextReq: 'Request a business rental',
      ghost: '/business', ghostText: 'For businesses',
      slide: 'chamber-gym.webp'
    }
  };

  var homeDone = false;
  function unhide(d) { try { d.documentElement.classList.remove('pz-wait'); } catch (e) {} }
  /* Safe to call more than once and in either order: the inline hook after the hero copy calls it,
     and so does boot() when this (async) file arrives after the hero was already parsed. */
  // Nudge link wording, approved by the Proof-reader (Nov 24). Request mode = the site's
  // "reservation request" mode (html.reqmode-site), where /book has no live calendar.
  var NUDGE_BOOK = 'See delivery dates \u2192';
  var NUDGE_REQ = 'Reserve a chamber \u2192';
  function requestMode(d) { try { return d.documentElement.classList.contains('reqmode-site'); } catch (e) { return false; } }

  function applyHome(doc) {
    var d = doc || (win && win.document);
    if (!d || homeDone) return null;
    if (!d.querySelector('.hero-below .hero-ctas')) return null; // hero not parsed yet; the inline hook will call again
    homeDone = true;
    try { return applyHomeNow(d); } catch (e) { return null; } finally { unhide(d); }
  }
  function applyHomeNow(d) {
    var dec = decideForHome();
    if (!dec) return null;
    report(dec);
    if (dec.variant !== 'personalized') return dec;
    try { d.documentElement.setAttribute('data-pz', dec.interest || 'city'); } catch (e) {}
    var hb = d.querySelector('.hero-below');
    if (!hb) return dec;
    if (dec.cityName) {
      var eb = hb.querySelector('.eyebrow2');
      if (eb) eb.textContent = '\u25CF Now delivering in ' + dec.cityName;
    }
    var v = dec.interest && HOME[dec.interest];
    if (!v) return dec;
    var h1 = hb.querySelector('h1'), p = hb.querySelector('h1 + p');
    if (v.h1 && h1) h1.textContent = v.h1;
    if (v.p && p) p.textContent = v.p;
    var ctas = hb.querySelectorAll('.hero-ctas a');
    if (ctas[0]) { ctas[0].setAttribute('href', v.cta + (dec.months && dec.interest !== 'business' ? '&months=' + dec.months : '')); if (v.ctaText) ctas[0].textContent = (requestMode(d) && v.ctaTextReq) ? v.ctaTextReq : v.ctaText; }
    if (ctas[1] && v.ghost) { ctas[1].setAttribute('href', v.ghost); ctas[1].textContent = v.ghostText; }
    // Put that chamber's photo first in the hero carousel (the carousel script runs later and follows DOM order).
    if (v.slide) {
      var hero = d.querySelector('.hero'), imgs = hero ? hero.querySelectorAll('img.slide') : [], pick = null;
      for (var i = 0; i < imgs.length; i++) if ((imgs[i].getAttribute('src') || '').indexOf(v.slide) >= 0) { pick = imgs[i]; break; }
      if (pick) {
        var cur = hero.querySelectorAll('.slide.active');
        for (var j = 0; j < cur.length; j++) cur[j].classList.remove('active');
        pick.setAttribute('loading', 'eager');
        pick.setAttribute('fetchpriority', 'high');
        if (v.img) { pick.setAttribute('src', v.img); pick.setAttribute('width', '1792'); pick.setAttribute('height', '1008'); }
        pick.classList.add('active');
        hero.insertBefore(pick, hero.firstChild);
      }
    }
    // "Pick up where you left off" on a later visit.
    if (dec.nudge && v.label) {
      var n = d.createElement('p');
      n.className = 'pz-nudge';
      n.setAttribute('style', 'margin-top:12px;font-size:14px;color:#5f544d');
      n.appendChild(d.createTextNode('Still thinking about the ' + v.label + '? '));
      var a = d.createElement('a');
      a.setAttribute('href', v.cta + (dec.months ? '&months=' + dec.months : ''));
      a.setAttribute('style', 'color:#9a4f3a;font-weight:700;text-decoration:underline');
      // The site's booking-mode script swaps [data-request-text] links between modes; data-book-text
      // pins the book-mode wording so a later swap back never picks up the request wording. If this
      // async file runs after that script already switched to request mode, write the request text now.
      a.setAttribute('data-request-text', NUDGE_REQ);
      a.setAttribute('data-book-text', NUDGE_BOOK);
      a.textContent = requestMode(d) ? NUDGE_REQ : NUDGE_BOOK;
      n.appendChild(a);
      var ctaRow = hb.querySelector('.hero-ctas');
      if (ctaRow && ctaRow.parentNode) ctaRow.parentNode.insertBefore(n, ctaRow.nextSibling);
    }
    // Below the fold: that chamber's card first, and preselected in the price box.
    function later() {
      try {
        var box = d.querySelector('.chambers [data-pz-interest="' + dec.interest + '"]');
        if (box && box.parentNode && box.parentNode.firstElementChild !== box) box.parentNode.insertBefore(box, box.parentNode.firstElementChild);
        var sel = d.getElementById('ch');
        if (sel && sel.tagName === 'SELECT' && (dec.interest === 'sitting' || dec.interest === 'lying')) {
          for (var k = 0; k < sel.options.length; k++) if (new RegExp(dec.interest, 'i').test(sel.options[k].text)) { sel.selectedIndex = k; break; }
        }
      } catch (e) {}
    }
    if (d.readyState === 'loading') d.addEventListener('DOMContentLoaded', later); else later();
    return dec;
  }

  /* Visitor opt-out (privacy page button): erase and stop. */
  function optOut() {
    try { win.localStorage.setItem('pb_pz_off', '1'); } catch (e) {}
    erase();
  }

  return {
    // pure (tested)
    decide: decide, add: add, parse: parse, fresh: fresh, decay: decay, optedOut: optedOut,
    signalsFromUrl: signalsFromUrl, cityFromPath: cityFromPath, interestFromHref: interestFromHref,
    CONFIG: { KEY: KEY, HALF_LIFE_DAYS: HALF_LIFE_DAYS, TTL_DAYS: TTL_DAYS, HOLDOUT: HOLDOUT, MIN_SCORE: MIN_SCORE, MIN_MARGIN: MIN_MARGIN, WEIGHTS: WEIGHTS, CITIES: CITIES },
    // browser
    boot: boot, decideForHome: decideForHome, report: report, record: record, erase: erase, applyHome: applyHome, optOut: optOut, HOME: HOME,
    requestMode: requestMode, NUDGE: { book: NUDGE_BOOK, request: NUDGE_REQ }
  };
});
