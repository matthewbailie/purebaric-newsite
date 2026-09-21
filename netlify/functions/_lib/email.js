const { Resend } = require("resend");

const FROM = "Purebaric <noreply@purebaric.com>";
const REPLY_TO = "hello@purebaric.com";
const ADMIN_NOTIFY = "matthewbailie@gmail.com";

function client() {
  const key = process.env.RESEND_API_KEY;
  if (!key) throw new Error("RESEND_API_KEY not set");
  return new Resend(key);
}

async function send({ to, subject, html, text }) {
  const resend = client();
  const recipients = Array.isArray(to) ? to : [to];
  const payload = {
    from: FROM,
    to: recipients,
    // v4 SDK uses camelCase `replyTo`; v1-v2 used snake_case `reply_to`.
    // We send both for maximum compatibility, extra fields are ignored.
    replyTo: REPLY_TO,
    reply_to: REPLY_TO,
    subject,
    html,
    text,
  };
  let result;
  try {
    result = await resend.emails.send(payload);
  } catch (err) {
    // Network errors, timeouts, etc., SDK threw outright
    throw new Error(`Resend send threw: ${err && err.message ? err.message : String(err)}`);
  }
  // Resend SDK returns { data, error }, API-level errors are NOT thrown,
  // they come back as result.error and must be inspected manually.
  if (result && result.error) {
    const errObj = result.error;
    const msg = errObj.message || errObj.name || JSON.stringify(errObj);
    const code = errObj.statusCode || errObj.name || "unknown";
    throw new Error(`Resend API error [${code}]: ${msg}`);
  }
  if (!result || !result.data || !result.data.id) {
    throw new Error(`Resend returned unexpected response: ${JSON.stringify(result)}`);
  }
  console.log(`Resend OK · id=${result.data.id} · to=${recipients.join(",")} · subject="${subject}"`);
  return result;
}

// ───────── Templates ─────────
// Warm brand palette (matches the website):
//   cream2 #efe7db (page bg) · card #fffdf9 · line #e6dccd
//   ink #2b2320 (headings/body) · muted #6f635b · terracotta #b8654d
// Emails use a system sans stack (web fonts do not load reliably in mail clients).
// The logo is the cream logo on a dark band so it stays readable in light and dark mode.

function wrap(bodyHtml) {
  return `<!doctype html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta name="color-scheme" content="light only">
<meta name="supported-color-schemes" content="light">
<title>Purebaric</title>
</head>
<body style="margin:0; padding:0; background:#efe7db; font-family:-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif; color:#2b2320; line-height:1.6;">
  <div style="display:none; font-size:1px; color:#efe7db; line-height:1px; max-height:0; max-width:0; overflow:hidden;">Purebaric, hyperbaric rentals at home, delivered across Utah.</div>
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background:#efe7db;">
    <tr>
      <td align="center" style="padding:28px 16px;">
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="560" style="max-width:560px; width:100%; background:#fffdf9; border:1px solid #e6dccd; border-radius:16px; overflow:hidden;">
          <!-- Logo header (cream logo on dark band = readable in light & dark mode) -->
          <tr>
            <td style="background:#2b2320; padding:22px 40px; text-align:center;">
              <a href="https://purebaric.com" style="display:inline-block;">
                <img src="https://purebaric.com/images/logo-cream.png" alt="Purebaric" width="150" style="display:inline-block; height:auto; max-width:150px; border:0; outline:none; text-decoration:none;" />
              </a>
            </td>
          </tr>
          <!-- Hero imagery -->
          <tr>
            <td style="padding:0; font-size:0; line-height:0;">
              <img src="https://purebaric.com/images/chamber-side.jpg" alt="A Purebaric hyperbaric chamber set up at home" width="560" style="display:block; width:100%; max-width:560px; height:auto; border:0;" />
            </td>
          </tr>
          <!-- Body content -->
          <tr>
            <td style="padding:34px 40px; font-size:16px; color:#2b2320;">
              ${bodyHtml}
            </td>
          </tr>
          <!-- Tagline + footer -->
          <tr>
            <td style="padding:24px 40px 30px; border-top:1px solid #e6dccd; text-align:center;">
              <div style="font-size:16px; font-weight:700; color:#b8654d; margin-bottom:12px; letter-spacing:-0.01em;">Hyperbaric rentals at home.</div>
              <div style="font-size:13px; color:#6f635b; line-height:1.6;">
                <a href="https://purebaric.com" style="color:#b8654d; text-decoration:none;">purebaric.com</a>
                &nbsp;·&nbsp;
                <a href="mailto:hello@purebaric.com" style="color:#b8654d; text-decoration:none;">hello@purebaric.com</a>
                &nbsp;·&nbsp;
                <a href="tel:+18019010873" style="color:#b8654d; text-decoration:none;">(801) 901-0873</a>
              </div>
              <div style="margin-top:12px; font-size:11px; color:#9a8f85; letter-spacing:0.04em; text-transform:uppercase;">
                Hyperbaric chamber rentals · Delivered across Utah
              </div>
            </td>
          </tr>
        </table>
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="560" style="max-width:560px; width:100%;">
          <tr>
            <td style="padding:16px 16px 0; text-align:center; font-size:11px; color:#9a8f85; line-height:1.5;">
              You're receiving this email because you submitted a request through purebaric.com.
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function signoff() {
  return `<p style="margin:24px 0 0;">Matthew<br><span style="color:#6f635b;">Purebaric</span></p>`;
}

function escapeHtml(s) {
  return String(s || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function or(v) {
  return escapeHtml(v || "-");
}

async function notifyAdminWaitlistJoin(entry) {
  const html = wrap(`
    <p style="margin:0 0 16px;"><strong style="color:#2b2320;">New waitlist signup</strong></p>
    <p style="margin:0 0 16px;">${escapeHtml(entry.name)} &lt;${escapeHtml(entry.email)}&gt;<br>
    Phone: ${or(entry.phone)}<br>
    ZIP: ${or(entry.zip)}<br>
    Preferred start: ${or(entry.preferredStartDate)}</p>
    <p style="margin:0;"><strong style="color:#2b2320;">Reason / context:</strong><br>${escapeHtml(entry.reason || "-").replace(/\n/g, "<br>")}</p>
  `);
  return send({ to: ADMIN_NOTIFY, subject: `Waitlist: ${entry.name}`, html });
}

async function notifyWaitlistChamberAvailable(entry, chamber) {
  const expires = new Date(entry.holdExpiresAt).toLocaleString("en-US", { timeZone: "America/Denver", dateStyle: "long", timeStyle: "short" });
  const html = wrap(`
    <p style="margin:0 0 16px;">Hi ${escapeHtml(entry.name.split(" ")[0])},</p>
    <p style="margin:0 0 16px;">Good news, a chamber just opened up. We're holding <strong style="color:#2b2320;">${escapeHtml(chamber.name)}</strong> (${escapeHtml(chamber.model)}) for you until <strong style="color:#2b2320;">${expires} Mountain Time</strong>.</p>
    <p style="margin:0 0 16px;">To claim it, reply to this email or call us at <a href="tel:+18019010873" style="color:#b8654d;">(801) 901-0873</a> and we'll get you set up.</p>
    <p style="margin:0;">If we don't hear back by then, the chamber will roll to the next person on the list.</p>
    ${signoff()}
  `);
  return send({
    to: entry.email,
    subject: "A Purebaric chamber is available for you",
    html,
  });
}

// Customer-facing: a chamber is available, Matthew will reach out
async function notifyCustomerChamberAvailable(booking) {
  const first = (booking.firstName || "there").split(" ")[0];
  const html = wrap(`
    <p style="margin:0 0 16px;">Hi ${escapeHtml(first)},</p>
    <p style="margin:0 0 16px;">Thanks for your booking request, <strong style="color:#2b2320;">we have a chamber available</strong>.</p>
    <p style="margin:0;">We will be in contact with you shortly to arrange delivery.</p>
    ${signoff()}
  `);
  return send({
    to: booking.email,
    subject: "Purebaric, chamber available, we'll be in touch shortly",
    html,
  });
}

// Customer-facing: no chambers available, added to waitlist
async function notifyCustomerWaitlistAdded(booking) {
  const first = (booking.firstName || "there").split(" ")[0];
  const html = wrap(`
    <p style="margin:0 0 16px;">Hi ${escapeHtml(first)},</p>
    <p style="margin:0 0 16px;">Thanks for your booking request. All of our chambers are currently out on rental, so <strong style="color:#2b2320;">we've added you to our waitlist</strong>.</p>
    <p style="margin:0;">Here's how it works: we work through the waitlist in order. When a chamber frees up, we email the next person in line and hold the unit for 24 hours so they can claim it. Most waitlist clients are matched within 1 to 3 weeks.</p>
    ${signoff()}
  `);
  return send({
    to: booking.email,
    subject: "Purebaric, you've been added to the waitlist",
    html,
  });
}

async function notifyAdminBooking(b, routing = {}) {
  const name = `${b.firstName || ""} ${b.lastName || ""}`.trim();
  const flags = b.medicalScreeningFlags && b.medicalScreeningFlags !== "none"
    ? `<strong style="color:#9a4f3a;">${escapeHtml(b.medicalScreeningFlags)}</strong>`
    : "none";
  const address = [b.streetAddress, b.city, b.state, b.zip].filter(Boolean).join(", ") || "-";
  let routingBlock = "";
  if (routing.autoNotified === "available") {
    routingBlock = `<p style="padding:12px 14px; background:#ebf2da; color:#4a5d24; border-radius:8px; margin:0 0 16px;"><strong>Auto-routed: chamber available.</strong><br>Customer was emailed that we'll be in contact shortly to arrange delivery. Action: reach out to confirm.</p>`;
  } else if (routing.autoNotified === "waitlist") {
    routingBlock = `<p style="padding:12px 14px; background:#f4e7df; color:#7a4a1e; border-radius:8px; margin:0 0 16px;"><strong>Auto-routed: no chambers available.</strong><br>Customer was added to the waitlist and emailed about it. Linked waitlist id: <code>${or(routing.linkedWaitlistId)}</code></p>`;
  }
  const subjectTag = routing.autoNotified === "available" ? " [chamber available]" :
                     routing.autoNotified === "waitlist" ? " [to waitlist]" : "";
  const html = wrap(`
    <p style="margin:0 0 16px;"><strong style="color:#2b2320;">New booking request</strong></p>
    ${routingBlock}
    <p style="margin:0 0 16px;">${escapeHtml(name)} &lt;${escapeHtml(b.email)}&gt;<br>
    Phone: ${or(b.phone)}<br>
    Delivery address: ${escapeHtml(address)}</p>
    <p style="margin:0 0 16px;"><strong style="color:#2b2320;">Rental:</strong><br>
    Start: ${or(b.startDate)}<br>
    Length: ${or(b.rentalLength)}<br>
    Reason / notes: ${escapeHtml(b.reason || "-").replace(/\n/g, "<br>")}<br>
    Prior experience: ${or(b.priorExperience)}</p>
    <p style="margin:0 0 16px;"><strong style="color:#2b2320;">Safety screening flags:</strong> ${flags}</p>
    <p style="margin:0;"><a href="https://purebaric.com/admin.html" style="color:#b8654d;">View in admin →</a></p>
  `);
  return send({ to: ADMIN_NOTIFY, subject: `Booking request: ${name}${subjectTag}`, html });
}

// Admin-facing: a request came in for a ZIP outside the delivery area.
// The customer is NOT sent a confirmation; the admin decides whether to follow up.
async function notifyAdminOutOfArea(b) {
  const name = `${b.firstName || ""} ${b.lastName || ""}`.trim() || "-";
  const address = [b.streetAddress, b.city, b.state, b.zip].filter(Boolean).join(", ") || "-";
  const html = wrap(`
    <p style="margin:0 0 16px;"><strong style="color:#2b2320;">Out-of-area request</strong></p>
    <p style="padding:12px 14px; background:#f4e7df; color:#7a4a1e; border-radius:8px; margin:0 0 16px;"><strong>ZIP ${or(b.zip)} is outside the delivery area.</strong><br>No confirmation was sent to the customer. Reach out only if you can serve this address.</p>
    <p style="margin:0 0 16px;">${escapeHtml(name)} &lt;${escapeHtml(b.email)}&gt;<br>
    Phone: ${or(b.phone)}<br>
    Address: ${escapeHtml(address)}</p>
    <p style="margin:0 0 16px;"><strong style="color:#2b2320;">Requested rental:</strong><br>
    Start: ${or(b.startDate)}<br>
    Length: ${or(b.rentalLength)}<br>
    Notes: ${escapeHtml(b.reason || "-").replace(/\n/g, "<br>")}</p>
    <p style="margin:0;"><a href="https://purebaric.com/admin.html" style="color:#b8654d;">View in admin →</a></p>
  `);
  return send({ to: ADMIN_NOTIFY, subject: `Out-of-area request: ${name} (ZIP ${b.zip || "?"})`, html });
}

// Admin-facing SMS via a carrier email-to-text gateway (free, reuses Resend).
// Inert until ADMIN_SMS_GATEWAY is set (e.g. "8015551234@vtext.com"). Keep the
// message short, carrier gateways cap each segment near 160 characters.
async function notifyAdminSms(b, { outOfArea } = {}) {
  const to = (process.env.ADMIN_SMS_GATEWAY || "").trim();
  if (!to) return { skipped: "ADMIN_SMS_GATEWAY not set" };
  const name = `${b.firstName || ""} ${b.lastName || ""}`.trim() || b.name || "New lead";
  const parts = [name];
  if (b.phone) parts.push(b.phone);
  if (b.zip) parts.push(`ZIP ${b.zip}`);
  if (b.rentalLength) parts.push(b.rentalLength);
  const detail = parts.join(", ");
  const subject = outOfArea ? "Purebaric out-of-area lead" : "New Purebaric lead";
  const text = outOfArea
    ? `${detail}. Outside service area, no auto-email sent.`
    : `${detail}. Check email or the admin portal to follow up.`;
  return send({ to, subject, text, html: `<p>${escapeHtml(text)}</p>` });
}

module.exports = {
  send,
  notifyAdminWaitlistJoin,
  notifyWaitlistChamberAvailable,
  notifyAdminBooking,
  notifyCustomerChamberAvailable,
  notifyCustomerWaitlistAdded,
  notifyAdminOutOfArea,
  notifyAdminSms,
};
