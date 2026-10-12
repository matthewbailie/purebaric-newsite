// Reliable SMS via Twilio's REST API (no SDK — just fetch). The Twilio config is
// resolved by storage.getTwilioConfig() (portal settings first, else env vars)
// and passed in here; this module stays a pure sender. When Twilio isn't
// configured, callers fall back to free carrier email-to-text (see email.js).

function twilioConfigFromEnv() {
  const accountSid = (process.env.TWILIO_ACCOUNT_SID || "").trim();
  const authToken = (process.env.TWILIO_AUTH_TOKEN || "").trim();
  const fromNumber = (process.env.TWILIO_FROM || "").trim();
  return accountSid && authToken && fromNumber ? { accountSid, authToken, fromNumber } : null;
}

// `paused` (set in the admin Notifications tab) keeps the keys but routes
// texts through the free carrier email-to-text path instead, for example while
// the A2P 10DLC campaign is still pending and carriers block Twilio traffic.
function isComplete(cfg) {
  return !!(cfg && !cfg.paused && cfg.accountSid && cfg.authToken && cfg.fromNumber);
}

// E.164 for a US number: +1 followed by 10 digits.
function toE164(number) {
  const raw = String(number || "").trim();
  if (raw.startsWith("+")) return raw;
  const digits = raw.replace(/\D/g, "");
  const ten = digits.length === 11 && digits[0] === "1" ? digits.slice(1) : digits;
  return /^\d{10}$/.test(ten) ? "+1" + ten : null;
}

async function sendSms(number, text, cfg) {
  if (!isComplete(cfg)) return { sent: false, reason: "twilio_not_configured" };
  const to = toE164(number);
  if (!to) return { sent: false, reason: "bad_number" };
  const body = new URLSearchParams({ To: to, From: cfg.fromNumber, Body: text });
  const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${cfg.accountSid}/Messages.json`, {
    method: "POST",
    headers: {
      Authorization: "Basic " + Buffer.from(`${cfg.accountSid}:${cfg.authToken}`).toString("base64"),
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: body.toString(),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`Twilio ${res.status}: ${data.message || JSON.stringify(data)}`);
  return { sent: true, sid: data.sid };
}

module.exports = { twilioConfigFromEnv, isComplete, toE164, sendSms };
