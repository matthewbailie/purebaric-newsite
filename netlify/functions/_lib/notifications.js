// Pure notification-routing helpers (no I/O), unit-tested in test/notifications.test.js.
// The admin Notifications tab registers recipients for owner-facing alerts. Each
// recipient (an email address or a phone number) subscribes to one or more events.
// - Email is sent via Resend.
// - SMS is sent free through carrier email-to-text gateways (<10-digit>@<gateway>),
//   also via Resend.

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
const EVENTS = ["reservation_in", "reservation_out", "review"];

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
      id: r.id || null,
      label: String(r.label || "").trim().slice(0, 60),
      number: normalizeNumber(r.number),
      carrier: String(r.carrier || "").toLowerCase(),
      events: cleanEvents(r.events),
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

// SMS gateway addresses subscribed to an event (de-duped).
function smsForEvent(config, eventKey) {
  const { sms } = normalizeNotifications(config);
  const out = [];
  for (const r of sms) {
    if (!r.events.includes(eventKey)) continue;
    const addr = gatewayAddress(r.number, r.carrier);
    if (addr && !out.includes(addr)) out.push(addr);
  }
  return out;
}

module.exports = {
  CARRIER_GATEWAYS,
  EVENTS,
  normalizeNumber,
  normalizeEmail,
  gatewayAddress,
  normalizeNotifications,
  emailsForEvent,
  smsForEvent,
  // Back-compat alias (SMS).
  recipientsForEvent: smsForEvent,
};
