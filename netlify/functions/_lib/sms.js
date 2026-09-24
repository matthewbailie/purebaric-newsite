// Reliable SMS via Twilio's REST API (no SDK — just fetch). Enabled when
// TWILIO_ACCOUNT_SID + TWILIO_AUTH_TOKEN + TWILIO_FROM are set in Netlify.
// When unset, callers fall back to free carrier email-to-text (see email.js).

function twilioConfig() {
  const sid = (process.env.TWILIO_ACCOUNT_SID || "").trim();
  const token = (process.env.TWILIO_AUTH_TOKEN || "").trim();
  const from = (process.env.TWILIO_FROM || "").trim();
  return sid && token && from ? { sid, token, from } : null;
}

function smsEnabled() {
  return !!twilioConfig();
}

// E.164 for a US number: +1 followed by 10 digits.
function toE164(number) {
  const raw = String(number || "").trim();
  if (raw.startsWith("+")) return raw;
  const digits = raw.replace(/\D/g, "");
  const ten = digits.length === 11 && digits[0] === "1" ? digits.slice(1) : digits;
  return /^\d{10}$/.test(ten) ? "+1" + ten : null;
}

async function sendSms(number, text) {
  const cfg = twilioConfig();
  if (!cfg) return { sent: false, reason: "twilio_not_configured" };
  const to = toE164(number);
  if (!to) return { sent: false, reason: "bad_number" };
  const body = new URLSearchParams({ To: to, From: cfg.from, Body: text });
  const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${cfg.sid}/Messages.json`, {
    method: "POST",
    headers: {
      Authorization: "Basic " + Buffer.from(`${cfg.sid}:${cfg.token}`).toString("base64"),
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: body.toString(),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`Twilio ${res.status}: ${data.message || JSON.stringify(data)}`);
  return { sent: true, sid: data.sid };
}

module.exports = { twilioConfig, smsEnabled, toE164, sendSms };
