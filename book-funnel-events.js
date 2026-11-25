/* Booking funnel events, v2 (O&P contract, 2026-11-25).
 *
 * booking_form_start: first focusin or input on a real input/select/textarea
 *   in #leadForm or #resForm, once per session (sessionStorage flag, no PII).
 *   Never on buttons, links, the Home/Business toggle, or Edit.
 *   Params: form_id, device, first_field (name, never value), def_v=2.
 * booking_form_abandon: only after a v2 start. last_field, had_delivery_date, def_v=2.
 * booking_step1_save: browser event when the step-1 API returns 200.
 *   Params: device, in_area (boolean), def_v=2.
 * service_area_check: callers add in_area (boolean).
 * /book?pbtest=1 sets a session flag; every event in the session gets test_traffic=1.
 * Privacy: skip when PBMetrics.isBlocked() (GPC, DNT, or /privacy opt-out).
 * No names, emails, phones or ZIPs in params.
 *
 * Uses the existing trackPurebaricEvent / PBMetrics consent helper.
 */
(function (root, factory) {
  var api = factory(root);
  if (typeof module === "object" && module.exports) module.exports = api;
  root.PBBookFunnel = api;
})(typeof window !== "undefined" ? window : typeof global !== "undefined" ? global : this, function (root) {
  var START_FLAG = "pb_bfs_v2";
  var TEST_FLAG = "pb_test";
  var SKIP_TYPES = { button: 1, submit: 1, reset: 1, image: 1, hidden: 1 };
  var submitted = false;
  var lastField = "";

  function winOf(w) { return w || root; }

  function storageGet(w, k) {
    try { return winOf(w).sessionStorage.getItem(k); } catch (e) { return null; }
  }
  function storageSet(w, k, v) {
    try { winOf(w).sessionStorage.setItem(k, v); } catch (e) {}
  }

  function noteTestTraffic(w) {
    w = winOf(w);
    var search = (w.location && w.location.search) || "";
    if (/(?:^|[?&])pbtest=1(?:&|$)/.test(search)) storageSet(w, TEST_FLAG, "1");
  }

  function isTestTraffic(w) { return storageGet(w, TEST_FLAG) === "1"; }
  function hasV2Start(w) { return storageGet(w, START_FLAG) === "1"; }
  function markV2Start(w) { storageSet(w, START_FLAG, "1"); }

  function isRealField(el) {
    if (!el || !el.tagName) return false;
    var tag = String(el.tagName).toUpperCase();
    if (tag !== "INPUT" && tag !== "SELECT" && tag !== "TEXTAREA") return false;
    if (tag === "INPUT") {
      var t = String(el.type || "text").toLowerCase();
      if (SKIP_TYPES[t]) return false;
    }
    return true;
  }

  function fieldName(el) {
    if (!el) return "";
    var n = "";
    if (el.getAttribute) n = el.getAttribute("name") || el.getAttribute("id") || "";
    if (!n) n = el.name || el.id || "";
    return String(n);
  }

  function formIdFrom(el) {
    if (el && typeof el.closest === "function") {
      var f = el.closest("#leadForm, #resForm");
      if (f && f.id) return f.id;
    }
    return "";
  }

  function deviceType(w) {
    w = winOf(w);
    if (w.PBMetrics && typeof w.PBMetrics.deviceType === "function") return w.PBMetrics.deviceType();
    var width = w.innerWidth || (w.document && w.document.documentElement && w.document.documentElement.clientWidth) || 0;
    if (!width) return "unknown";
    return width < 768 ? "mobile" : "desktop";
  }

  function isBlocked(w) {
    w = winOf(w);
    return !!(w.PBMetrics && typeof w.PBMetrics.isBlocked === "function" && w.PBMetrics.isBlocked());
  }

  function decorate(w, params) {
    w = winOf(w);
    noteTestTraffic(w);
    var o = params ? Object.assign({}, params) : {};
    if (isTestTraffic(w)) o.test_traffic = 1;
    return o;
  }

  function buildParams(w, extra) {
    w = winOf(w);
    var o = extra ? Object.assign({}, extra) : {};
    if (o.device == null) o.device = deviceType(w);
    var p = (w.PBMetrics && typeof w.PBMetrics.funnelParams === "function")
      ? w.PBMetrics.funnelParams(o)
      : o;
    return decorate(w, p);
  }

  function track(w, name, params) {
    w = winOf(w);
    if (isBlocked(w)) return false;
    var p = decorate(w, params || {});
    if (typeof w.trackPurebaricEvent === "function") {
      w.trackPurebaricEvent(name, p);
      return true;
    }
    return false;
  }

  function maybeStart(w, el) {
    w = winOf(w);
    noteTestTraffic(w);
    if (!isRealField(el)) return null;
    var first = fieldName(el);
    if (!first) return null;
    lastField = first;
    if (hasV2Start(w)) return null;
    if (isBlocked(w)) return null;
    markV2Start(w);
    var payload = buildParams(w, {
      form_id: formIdFrom(el),
      device: deviceType(w),
      first_field: first,
      def_v: 2
    });
    track(w, "booking_form_start", payload);
    return payload;
  }

  function maybeAbandon(w, doc) {
    w = winOf(w);
    if (!hasV2Start(w) || submitted) return null;
    if (isBlocked(w)) return null;
    submitted = true;
    var dateEl = doc && doc.getElementById ? doc.getElementById("bookDate") : null;
    var payload = buildParams(w, {
      last_field: lastField || "unknown",
      had_delivery_date: !!(dateEl && dateEl.value),
      def_v: 2
    });
    track(w, "booking_form_abandon", payload);
    return payload;
  }

  function step1Save(w, inArea) {
    w = winOf(w);
    if (isBlocked(w)) return null;
    var payload = buildParams(w, {
      device: deviceType(w),
      in_area: !!inArea,
      def_v: 2
    });
    track(w, "booking_step1_save", payload);
    return payload;
  }

  function serviceAreaParams(inArea, extra) {
    var p = Object.assign({
      result: inArea ? "eligible" : "unsupported",
      in_area: !!inArea
    }, extra || {});
    return p;
  }

  function markSubmitted() { submitted = true; }

  function wrapTracker(w) {
    w = winOf(w);
    noteTestTraffic(w);
    var orig = w.trackPurebaricEvent;
    if (typeof orig !== "function" || orig._pbTestWrapped) return;
    var wrapped = function (name, params) {
      return orig.call(w, name, decorate(w, params || {}));
    };
    wrapped._pbTestWrapped = true;
    w.trackPurebaricEvent = wrapped;
  }

  function install(w, doc) {
    w = winOf(w);
    doc = doc || w.document;
    submitted = false;
    lastField = "";
    noteTestTraffic(w);
    wrapTracker(w);
    if (!doc) return;
    function onEv(e) {
      var el = e && e.target;
      maybeStart(w, el);
    }
    ["leadForm", "resForm"].forEach(function (id) {
      var fm = doc.getElementById(id);
      if (!fm || !fm.addEventListener) return;
      fm.addEventListener("focusin", onEv);
      fm.addEventListener("input", onEv);
    });
    if (w.addEventListener) {
      w.addEventListener("pagehide", function () { maybeAbandon(w, doc); });
    }
  }

  // Test-only reset of in-memory flags (sessionStorage is the caller's to clear).
  function _resetMemory() { submitted = false; lastField = ""; }

  return {
    START_FLAG: START_FLAG,
    TEST_FLAG: TEST_FLAG,
    isRealField: isRealField,
    fieldName: fieldName,
    noteTestTraffic: noteTestTraffic,
    isTestTraffic: isTestTraffic,
    hasV2Start: hasV2Start,
    maybeStart: maybeStart,
    maybeAbandon: maybeAbandon,
    step1Save: step1Save,
    serviceAreaParams: serviceAreaParams,
    markSubmitted: markSubmitted,
    decorate: decorate,
    buildParams: buildParams,
    install: install,
    wrapTracker: wrapTracker,
    _resetMemory: _resetMemory
  };
});
