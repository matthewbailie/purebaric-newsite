// Lead-source attribution and internal-lead detection, shared by the public
// form handlers (booking-submit, waitlist-join, area-waitlist, contact-submit).
//
// The browser (pb-metrics.js) captures the visitor's FIRST touch (utm_*, fbclid,
// gclid, referrer origin+path, landing path, timestamp) in first-party storage
// and sends it as ls_* fields with a form submission. Capture is skipped entirely
// when the browser sends GPC or DNT, or the visitor opted out on /privacy, so
// these fields are simply absent for those visitors. Nothing personal is stored
// in the browser; the self-reported answers (heard_about, customer_type) are
// read only from the submitted form and stored here, server-side.

const HEARD_ABOUT = [
  "Facebook or Instagram",
  "Facebook Marketplace",
  "Google search",
  "Google Maps",
  "Friend or family",
  "Gym, studio, clinic or salon",
  "Other",
];

// Customer type (persona) and use case: optional, chosen by the visitor, stored on
// the portal record ONLY. Never sent to GA4 or Meta, never stored in the browser.
// Values are stable keys; labels are what the forms and admin show. Wellness
// language only: no treatment, diagnosis or FDA wording.
const CUSTOMER_TYPE_LABELS = {
  home: "Home",
  athlete: "Athlete",
  gym: "Gym",
  clinic: "Clinic",
  salon: "Salon",
  other: "Other",
};
const CUSTOMER_TYPES = Object.keys(CUSTOMER_TYPE_LABELS);

const USE_CASE_LABELS = {
  recovery: "Recovery after activity",
  wellness: "General wellness and relaxation",
  performance: "Athletic performance",
  business_amenity: "An amenity for my business",
  other: "Other",
};
const USE_CASES = Object.keys(USE_CASE_LABELS);

function pick(value, allowed) {
  const v = String(value || "").trim();
  return allowed.includes(v) ? v : "";
}

// Free-ish tag values from ad URLs: keep letters, digits and a few separators, cap length.
function tag(value, max = 100) {
  return String(value || "")
    .trim()
    .slice(0, max)
    .replace(/[^A-Za-z0-9 _.\-+:|/()]/g, "");
}

// Click ids are opaque tokens.
function clickId(value, max) {
  const v = String(value || "").trim().slice(0, max);
  return /^[A-Za-z0-9_.\-]+$/.test(v) ? v : "";
}

// A referrer is stored as origin + path only (the browser already strips the query).
function referrer(value) {
  const v = String(value || "").trim().slice(0, 200);
  if (!v) return "";
  try {
    const u = new URL(v);
    if (u.protocol !== "https:" && u.protocol !== "http:") return "";
    return (u.origin + u.pathname).slice(0, 200);
  } catch {
    return "";
  }
}

function path(value) {
  const v = String(value || "").trim().slice(0, 200);
  return /^\/[A-Za-z0-9_.\-/]*$/.test(v) ? v : "";
}

function isoTime(value) {
  const v = String(value || "").trim();
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{1,3})?Z$/.test(v)) return "";
  return Number.isNaN(Date.parse(v)) ? "" : v;
}

// Bucket strings only. Raw counters, integers and timestamps are dropped.
const VISIT_NUMBER = ["1", "2", "3", "4-5", "6+"];
const DAYS_SINCE_FIRST = ["0", "1-3", "4-7", "8-30", "31+"];
function visitBucket(value, allowed) {
  const v = String(value || "").trim();
  return allowed.includes(v) ? v : "";
}

// Returns { leadSource, heardAbout, customerType, useCase } for a parsed form body.
// leadSource is null when the browser sent no capture (opted out, blocked, old page).
function cleanLeadSource(body = {}) {
  const ls = {
    utmSource: tag(body.ls_utm_source),
    utmMedium: tag(body.ls_utm_medium),
    utmCampaign: tag(body.ls_utm_campaign),
    utmContent: tag(body.ls_utm_content),
    utmTerm: tag(body.ls_utm_term),
    fbclid: clickId(body.ls_fbclid, 255),
    gclid: clickId(body.ls_gclid, 100),
    referrer: referrer(body.ls_referrer),
    landingPath: path(body.ls_landing),
    firstTouchAt: isoTime(body.ls_ts),
  };
  const hasAny = Object.values(ls).some(Boolean);
  return {
    leadSource: hasAny ? { ...ls, channel: channelOf(ls) } : null,
    heardAbout: pick(body.heard_about, HEARD_ABOUT),
    customerType: pick(body.customer_type, CUSTOMER_TYPES),
    useCase: pick(body.use_case, USE_CASES),
    visitNumber: visitBucket(body.ls_visit_number, VISIT_NUMBER),
    daysSinceFirstVisit: visitBucket(body.ls_days_since_first_visit, DAYS_SINCE_FIRST),
  };
}

// A coarse channel label for the admin and for counting leads by source.
function channelOf(ls) {
  if (!ls) return "";
  const src = (ls.utmSource || "").toLowerCase();
  const med = (ls.utmMedium || "").toLowerCase();
  if (src.includes("marketplace")) return "Facebook Marketplace";
  if (ls.fbclid || /^(fb|facebook|ig|instagram|meta)$/.test(src)) {
    return /paid|cpc|ads?|paid_social/.test(med) || ls.fbclid ? "Meta paid" : "Meta organic";
  }
  if (ls.gclid || (src === "google" && /cpc|paid|ads?/.test(med))) return "Google Ads";
  if (/email|newsletter|outreach/.test(med) || /outreach/.test(src)) return "Email / outreach";
  if (src) return "Campaign: " + src;
  const ref = (ls.referrer || "").toLowerCase();
  if (!ref) return "Direct";
  if (/google\.|bing\.|duckduckgo\.|yahoo\./.test(ref)) return "Organic search";
  if (/facebook\.|instagram\.|fb\.|t\.co|twitter\.|x\.com|linkedin\.|reddit\./.test(ref)) return "Social (organic)";
  return "Referral";
}

// TEST and internal entries are excluded from real-lead counts and from every
// analytics send. Internal = the browser flag (?internal=1 → pb_internal), a
// name with the word "test", an email whose local part has a "test" token, or
// the owner's own address.
const OWNER_EMAILS = ["matthewbailie@gmail.com"];
function isInternalLead({ name = "", firstName = "", lastName = "", email = "", flag = "" } = {}) {
  if (String(flag) === "1") return true;
  const fullName = [name, firstName, lastName].filter(Boolean).join(" ");
  if (/\btest\b/i.test(fullName)) return true;
  const e = String(email || "").trim().toLowerCase();
  if (!e) return false;
  const [local, domain] = e.split("@");
  if (domain === "gmail.com" && local.split("+")[0].replace(/\./g, "") === "matthewbailie") return true;
  if (OWNER_EMAILS.includes(e)) return true;
  return /(^|[._+\-])test([._+\-]|\d|$)/.test(local || "");
}

// Plain-text lines for admin notification emails.
function leadSourceLines(rec = {}) {
  const ls = rec.leadSource || null;
  const lines = [];
  if (rec.customerType) lines.push(["Customer type", CUSTOMER_TYPE_LABELS[rec.customerType] || rec.customerType]);
  if (rec.useCase) lines.push(["Use case", USE_CASE_LABELS[rec.useCase] || rec.useCase]);
  if (rec.heardAbout) lines.push(["Heard about us", rec.heardAbout]);
  if (ls) {
    lines.push(["Channel (first touch)", ls.channel || ""]);
    const utm = [ls.utmSource, ls.utmMedium, ls.utmCampaign, ls.utmContent, ls.utmTerm].filter(Boolean).join(" / ");
    if (utm) lines.push(["UTM", utm]);
    if (ls.fbclid) lines.push(["Meta click ID", ls.fbclid]);
    if (ls.gclid) lines.push(["Google click ID", ls.gclid]);
    if (ls.referrer) lines.push(["Referrer", ls.referrer]);
    if (ls.landingPath) lines.push(["Landing page", ls.landingPath]);
    if (ls.firstTouchAt) lines.push(["First visit", ls.firstTouchAt]);
  }
  if (rec.internal) lines.push(["Internal / TEST", "yes (excluded from real-lead counts)"]);
  return lines;
}

// Fields to spread into a stored record.
function leadSourceFields(body, who) {
  const { leadSource, heardAbout, customerType, useCase, visitNumber, daysSinceFirstVisit } = cleanLeadSource(body);
  const fields = {
    leadSource,
    heardAbout,
    customerType,
    useCase,
    internal: isInternalLead({ ...who, flag: body.pb_internal }),
  };
  if (visitNumber) fields.ls_visit_number = visitNumber;
  if (daysSinceFirstVisit) fields.ls_days_since_first_visit = daysSinceFirstVisit;
  return fields;
}

module.exports = {
  HEARD_ABOUT,
  CUSTOMER_TYPES,
  CUSTOMER_TYPE_LABELS,
  USE_CASES,
  USE_CASE_LABELS,
  cleanLeadSource,
  channelOf,
  isInternalLead,
  leadSourceLines,
  leadSourceFields,
};
