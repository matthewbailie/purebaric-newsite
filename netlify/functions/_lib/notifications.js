// Pure notification-routing helpers (no I/O), unit-tested in test/notifications.test.js.
// The admin Notifications tab registers recipients for owner-facing alerts. Each
// recipient (an email address or a phone number) subscribes to one or more events.
// - Email is sent via Resend.
// - SMS is sent free through carrier email-to-text gateways (<10-digit>@<gateway>),
//   also via Resend, or through Twilio when configured.
//
// A2P 10DLC / TCPA compliance: SMS is transactional and admin-only (never sent to
// customers). Each SMS recipient carries a `consent` record — { given, at, by,
// version, status } — stamped server-side in admin-notifications.js when the
// admin affirmatively checks the consent checkbox and saves. A number is only
// eligible for delivery when consent.given === true and consent.status ===
// "enabled" (see smsForEvent / smsNumbersForEvent below). See /sms-consent for
// the public evidence page.
const { randomUUID } = require("crypto");

// v2 (2026-09-26): wording now also covers rental-ending reminders. Numbers that consented
// under v1 keep receiving reservation/review alerts (what they agreed to) but must re-consent
// to v2 before they get any event in EVENTS_NEEDING_CURRENT_CONSENT.
const CONSENT_VERSION = "purebaric-sms-consent-v2";
const EVENTS_NEEDING_CURRENT_CONSENT = ["rental_ending"];

// SMS (not MMS) email-to-text gateways for major US carriers.
const CARRIER_GATEWAYS = {
  verizon: "vtext.com",
  att: "txt.att.net",
  tmobile: "tmomail.net",
  sprint: "messaging.sprintpcs.com",
  googlefi: "msg.fi.google.com",
  uscellular: "email.uscc.net",
  cricket: "sms.cricketwireless.net",
  boost: "sms.myboostmobile.com",
  metropcs: "mymetropcs.com",
  virgin: "vmobl.com",
  xfinity: "vtext.com",
};

// The events a recipient can subscribe to.
const EVENTS = ["reservation_in", "reservation_out", "review", "rental_ending"];

function normalizeNumber(value) {
  const digits = String(value || "").replace(/\D/g, "");
  const ten = digits.length === 11 && digits[0] === "1" ? digits.slice(1) : digits;
  return /^\d{10}$/.test(ten) ? ten : null;
}

function normalizeEmail(value) {
  const email = String(value || "").trim().toLowerCase();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : null;
}

function gatewayAddress(number, carrier) {
  const ten = normalizeNumber(number);
  const domain = CARRIER_GATEWAYS[String(carrier || "").toLowerCase()];
  return ten && domain ? `${ten}@${domain}` : null;
}

function cleanEvents(events) {
  return Array.isArray(events) ? events.filter((e) => EVENTS.includes(e)) : [];
}

const CONSENT_STATUSES = ["enabled", "disabled", "opted_out"];

// Validate/pass through a consent record already stamped by admin-notifications.js.
// Never fabricate consent here — this lib only cleans shape, it does not grant it.
function cleanConsent(consent) {
  const c = consent || {};
  const status = CONSENT_STATUSES.includes(c.status) ? c.status : "disabled";
  return {
    given: c.given === true && status === "enabled",
    at: typeof c.at === "string" ? c.at : null,
    by: typeof c.by === "string" ? c.by : null,
    version: typeof c.version === "string" ? c.version : null,
    status,
  };
}

// { emails: [{id,label,email,events}], sms: [{id,label,number,carrier,events}] }.
// Accepts the legacy `recipients` key (SMS-only) as a fallback for `sms`.
function normalizeNotifications(config) {
  const cfg = config || {};
  const emailSrc = Array.isArray(cfg.emails) ? cfg.emails : [];
  const smsSrc = Array.isArray(cfg.sms) ? cfg.sms : Array.isArray(cfg.recipients) ? cfg.recipients : [];

  const emails = emailSrc
    .map((r) => ({
      id: r.id || null,
      label: String(r.label || "").trim().slice(0, 60),
      email: normalizeEmail(r.email),
      events: cleanEvents(r.events),
    }))
    .filter((r) => r.email && r.events.length);

  const sms = smsSrc
    .map((r) => ({
      id: r.id || randomUUID(),
      label: String(r.label || "").trim().slice(0, 60),
      number: normalizeNumber(r.number),
      carrier: String(r.carrier || "").toLowerCase(),
      events: cleanEvents(r.events),
      consent: cleanConsent(r.consent),
    }))
    .filter((r) => r.number && CARRIER_GATEWAYS[r.carrier] && r.events.length);

  return { emails, sms };
}

// Email addresses subscribed to an event (de-duped).
function emailsForEvent(config, eventKey) {
  const { emails } = normalizeNotifications(config);
  const out = [];
  for (const r of emails) {
    if (r.events.includes(eventKey) && !out.includes(r.email)) out.push(r.email);
  }
  return out;
}

// A number is eligible for SMS delivery only with affirmative, currently-active
// consent — never send transactional texts to a number that hasn't opted in
// (or that has since been disabled / opted out via STOP).
function hasActiveConsent(r, eventKey) {
  const active = !!(r.consent && r.consent.given === true && r.consent.status === "enabled");
  if (!active) return false;
  if (EVENTS_NEEDING_CURRENT_CONSENT.includes(eventKey)) return r.consent.version === CONSENT_VERSION;
  return true;
}

// SMS gateway addresses subscribed to an event (de-duped). For free carrier
// email-to-text.
function smsForEvent(config, eventKey) {
  const { sms } = normalizeNotifications(config);
  const out = [];
  for (const r of sms) {
    if (!r.events.includes(eventKey) || !hasActiveConsent(r, eventKey)) continue;
    const addr = gatewayAddress(r.number, r.carrier);
    if (addr && !out.includes(addr)) out.push(addr);
  }
  return out;
}

// Raw 10-digit numbers subscribed to an event (de-duped). For Twilio.
function smsNumbersForEvent(config, eventKey) {
  const { sms } = normalizeNotifications(config);
  const out = [];
  for (const r of sms) {
    if (!r.events.includes(eventKey) || !hasActiveConsent(r, eventKey)) continue;
    if (r.number && !out.includes(r.number)) out.push(r.number);
  }
  return out;
}

// Stamp each incoming SMS row's consent record server-side, from the client's
// `consentChecked` flag (whether the box is checked right now) plus whatever
// consent (if any) the matching existing row already has. This is the ONLY
// place that grants, renews, or revokes SMS consent — admin-notifications.js
// calls it on every save instead of trusting a client-supplied consent object.
//
// - Checked + no active consent yet (or the number changed since) -> a brand
//   new consent event: given=true, at=now, by=the authenticated admin,
//   status="enabled".
// - Checked + already has active consent for this same number -> left as-is
//   (editing an unrelated field doesn't fabricate a new consent timestamp).
// - Unchecked -> status="disabled", given=false immediately (SMS delivery
//   stops on save). Re-enabling later requires checking the box again, which
//   stamps a fresh consent event — consent is never carried forward silently.
function stampSmsConsent(incomingSms, existingSms, who, now) {
  const nowIso = now || new Date().toISOString();
  const existing = existingSms || [];
  return (incomingSms || []).map((r) => {
    const prev =
      existing.find((p) => p.id && r.id && p.id === r.id) ||
      existing.find((p) => normalizeNumber(p.number) && normalizeNumber(p.number) === normalizeNumber(r.number));
    const checked = r.consentChecked === true;
    const sameNumberAlreadyActive =
      checked && prev && hasActiveConsent(prev) && normalizeNumber(prev.number) === normalizeNumber(r.number)
      && prev.consent.version === CONSENT_VERSION; // consent under older wording is renewed, not carried forward
    // A number still on older wording shows an UNCHECKED box until the admin agrees to the new wording;
    // saving other changes in the meantime must not switch off what they already agreed to. This flag can
    // only preserve an existing active consent for the same number, never grant one.
    const keepEarlier = !checked && r.keepEarlierConsent === true && prev && hasActiveConsent(prev)
      && normalizeNumber(prev.number) === normalizeNumber(r.number);

    const consent = checked
      ? sameNumberAlreadyActive
        ? prev.consent
        : { given: true, at: nowIso, by: who, version: CONSENT_VERSION, status: "enabled" }
      : keepEarlier
      ? prev.consent
      : {
          given: false,
          at: (prev && prev.consent && prev.consent.at) || null,
          by: (prev && prev.consent && prev.consent.by) || null,
          version: (prev && prev.consent && prev.consent.version) || null,
          status: "disabled",
        };

    const { consentChecked, keepEarlierConsent, ...rest } = r;
    return { ...rest, id: (prev && prev.id) || r.id, consent };
  });
}

module.exports = {
  CARRIER_GATEWAYS,
  EVENTS,
  CONSENT_VERSION,
  normalizeNumber,
  normalizeEmail,
  gatewayAddress,
  normalizeNotifications,
  hasActiveConsent,
  emailsForEvent,
  smsForEvent,
  smsNumbersForEvent,
  stampSmsConsent,
  // Back-compat alias (SMS).
  recipientsForEvent: smsForEvent,
};
