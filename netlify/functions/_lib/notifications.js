// Pure notification-routing helpers (no I/O), unit-tested in test/notifications.test.js.
// Free admin SMS is sent through carrier email-to-text gateways (reusing Resend):
// a text to <10-digit-number>@<carrier-gateway>. The owner configures recipients
// in the admin Notifications tab; each recipient subscribes to one or more events.

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

function gatewayAddress(number, carrier) {
  const ten = normalizeNumber(number);
  const domain = CARRIER_GATEWAYS[String(carrier || "").toLowerCase()];
  return ten && domain ? `${ten}@${domain}` : null;
}

function normalizeNotifications(config) {
  const list = config && Array.isArray(config.recipients) ? config.recipients : [];
  const recipients = list
    .map((r) => ({
      id: r.id || null,
      label: String(r.label || "").trim().slice(0, 60),
      number: normalizeNumber(r.number),
      carrier: String(r.carrier || "").toLowerCase(),
      events: Array.isArray(r.events) ? r.events.filter((e) => EVENTS.includes(e)) : [],
    }))
    .filter((r) => r.number && CARRIER_GATEWAYS[r.carrier] && r.events.length);
  return { recipients };
}

// Gateway addresses subscribed to an event (de-duped).
function recipientsForEvent(config, eventKey) {
  const { recipients } = normalizeNotifications(config);
  const out = [];
  for (const r of recipients) {
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
  gatewayAddress,
  normalizeNotifications,
  recipientsForEvent,
};
