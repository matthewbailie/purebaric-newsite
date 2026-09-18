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
    // We send both for maximum compatibility — extra fields are ignored.
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
    // Network errors, timeouts, etc. — SDK threw outright
    throw new Error(`Resend send threw: ${err && err.message ? err.message : String(err)}`);
  }
  // Resend SDK returns { data, error } — API-level errors are NOT thrown,
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

function wrap(bodyHtml) {
  // Brand palette from styles.css
  //   cream-warm: #e8e2d6 (page bg)
  //   cream:      #f5f0e8 (card bg)
  //   ink:        #2a2620 (primary text)
  //   stone:      #3a3530 (body text)
  //   stone-muted:#5a544a (secondary text)
  //   terracotta: #b8654d (accent / links)
  //   line:       rgba(42,38,32,0.1)
  // Fonts: Fraunces (serif headlines, Georgia fallback) + Manrope (body, system fallback)
  return `<!doctype html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Purebaric</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,400;0,9..144,500;1,9..144,400&family=Manrope:wght@400;500;600&display=swap');
  body { margin: 0; padding: 0; }
  a { color: #b8654d; text-decoration: none; }
  a:hover { text-decoration: underline; }
  .container p { margin: 0 0 16px; }
  .container strong { color: #2a2620; font-weight: 600; }
  .container h2 { font-family: 'Fraunces', Georgia, 'Times New Roman', serif; font-weight: 400; font-size: 26px; line-height: 1.15; letter-spacing: -0.01em; margin: 0 0 16px; color: #2a2620; }
</style>
</head>
<body style="margin:0; padding:0; background:#e8e2d6; font-family:'Manrope', -apple-system, 'Segoe UI', Roboto, sans-serif; color:#3a3530; line-height:1.6;">
  <!-- Preheader: hidden on render, shown by inbox preview -->
  <div style="display:none; font-size:1px; color:#e8e2d6; line-height:1px; max-height:0; max-width:0; overflow:hidden;">Purebaric — hyperbaric chamber rentals delivered across Utah.</div>

  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background:#e8e2d6;">
    <tr>
      <td align="center" style="padding: 32px 16px;">
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="560" style="max-width:560px; width:100%;">
          <tr>
            <td class="container" style="background:#f5f0e8; border-radius:12px; padding:40px 40px; box-shadow: 0 2px 12px rgba(42,38,32,0.06);">
              <!-- Logo header -->
              <div style="text-align:center; padding-bottom:24px; margin-bottom:28px; border-bottom:1px solid rgba(42,38,32,0.08);">
                <a href="https://purebaric.com" style="display:inline-block;">
                  <img src="https://purebaric.com/images/logo.png" alt="Purebaric" width="160" style="display:inline-block; height:auto; max-width:160px; border:0; outline:none; text-decoration:none;" />
                </a>
              </div>

              <!-- Body content -->
              <div style="font-size:16px; color:#3a3530;">
                ${bodyHtml}
              </div>

              <!-- Tagline + footer -->
              <div style="margin-top:36px; padding-top:24px; border-top:1px solid rgba(42,38,32,0.08); text-align:center;">
                <div style="font-family:'Fraunces', Georgia, 'Times New Roman', serif; font-style:italic; font-size:17px; color:#b8654d; margin-bottom:14px; letter-spacing:-0.01em;">Hyperbaric, at home.</div>
                <div style="font-size:13px; color:#5a544a; line-height:1.6;">
                  <a href="https://purebaric.com" style="color:#b8654d; text-decoration:none;">purebaric.com</a>
                  &nbsp;·&nbsp;
                  <a href="mailto:hello@purebaric.com" style="color:#b8654d; text-decoration:none;">hello@purebaric.com</a>
                  &nbsp;·&nbsp;
                  <a href="tel:+18019010873" style="color:#b8654d; text-decoration:none;">(801) 901-0873</a>
                </div>
                <div style="margin-top:14px; font-size:11px; color:#7a7268; letter-spacing:0.04em; text-transform:uppercase;">
                  Hyperbaric chamber rentals · Delivered across Utah
                </div>
              </div>
            </td>
          </tr>
          <tr>
            <td style="padding:18px 16px 0; text-align:center; font-size:11px; color:#7a7268; line-height:1.5;">
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

async function notifyAdminWaitlistJoin(entry) {
  const html = wrap(`
    <p><strong>New waitlist signup</strong></p>
    <p>${escapeHtml(entry.name)} &lt;${escapeHtml(entry.email)}&gt;<br>
    Phone: ${escapeHtml(entry.phone || "—")}<br>
    ZIP: ${escapeHtml(entry.zip || "—")}<br>
    Preferred start: ${escapeHtml(entry.preferredStartDate || "—")}</p>
    <p><strong>Reason / context:</strong><br>${escapeHtml(entry.reason || "—").replace(/\n/g, "<br>")}</p>
  `);
  return send({ to: ADMIN_NOTIFY, subject: `Waitlist: ${entry.name}`, html });
}

async function notifyWaitlistChamberAvailable(entry, chamber) {
  const expires = new Date(entry.holdExpiresAt).toLocaleString("en-US", { timeZone: "America/Denver", dateStyle: "long", timeStyle: "short" });
  const html = wrap(`
    <p>Hi ${escapeHtml(entry.name.split(" ")[0])},</p>
    <p>Good news — a chamber just opened up. We're holding <strong>${escapeHtml(chamber.name)}</strong> (${escapeHtml(chamber.model)}) for you until <strong>${expires} Mountain Time</strong>.</p>
    <p>To claim it, reply to this email or call us at <a href="tel:+18019010873" style="color:#b8654d;">(801) 901-0873</a> and we'll get you set up.</p>
    <p>If we don't hear back by then, the chamber will roll to the next person on the list.</p>
    <p>— Matthew, Purebaric</p>
  `);
  return send({
    to: entry.email,
    subject: "A Purebaric chamber is available for you",
    html,
  });
}

function escapeHtml(s) {
  return String(s || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// Customer-facing: a chamber is available, Matthew will reach out
async function notifyCustomerChamberAvailable(booking) {
  const first = (booking.firstName || "there").split(" ")[0];
  const startDate = booking.startDate
    ? new Date(booking.startDate).toLocaleDateString("en-US", { dateStyle: "long" })
    : "the date you requested";
  const html = wrap(`
    <p>Hi ${escapeHtml(first)},</p>
    <p>Thanks for your booking request — <strong>we have a chamber available</strong>.</p>
    <p>We will be in contact shortly to arrange delivery for ${escapeHtml(startDate)}. Most deliveries happen within 24–48 hours of confirmation.</p>
    <p>— Matthew, Purebaric</p>
  `);
  return send({
    to: booking.email,
    subject: "Purebaric — chamber available, we'll be in touch shortly",
    html,
  });
}

// Customer-facing: no chambers available, added to waitlist
async function notifyCustomerWaitlistAdded(booking) {
  const first = (booking.firstName || "there").split(" ")[0];
  const html = wrap(`
    <p>Hi ${escapeHtml(first)},</p>
    <p>Thanks for your booking request. All of our chambers are currently out on rental, so <strong>we've added you to our waitlist</strong>.</p>
    <p>Here's how it works: we work through the waitlist in order. When a chamber frees up, we email the next person in line and hold the unit for 24 hours so they can claim it. Most waitlist clients are matched within 1–3 weeks.</p>
    <p>— Matthew, Purebaric</p>
  `);
  return send({
    to: booking.email,
    subject: "Purebaric — you've been added to the waitlist",
    html,
  });
}

async function notifyAdminBooking(b, routing = {}) {
  const name = `${b.firstName || ""} ${b.lastName || ""}`.trim();
  const flags = b.medicalScreeningFlags && b.medicalScreeningFlags !== "none"
    ? `<strong style="color:#82402f;">${escapeHtml(b.medicalScreeningFlags)}</strong>`
    : "none";
  const address = [b.streetAddress, b.city, b.state, b.zip].filter(Boolean).join(", ") || "—";
  let routingBlock = "";
  if (routing.autoNotified === "available") {
    routingBlock = `<p style="padding:0.85rem 1rem; background:#dbeacd; color:#3d5a26; border-radius:4px;"><strong>✓ Auto-routed: chamber available.</strong><br>Customer was emailed: "we will be in contact shortly to arrange delivery." <strong>Action: reach out to confirm.</strong></p>`;
  } else if (routing.autoNotified === "waitlist") {
    routingBlock = `<p style="padding:0.85rem 1rem; background:#f2e5d2; color:#6b5326; border-radius:4px;"><strong>⏱ Auto-routed: no chambers available.</strong><br>Customer was added to waitlist and emailed about it. Linked waitlist id: <code>${escapeHtml(routing.linkedWaitlistId || "—")}</code></p>`;
  }
  const subjectTag = routing.autoNotified === "available" ? " [chamber available]" :
                     routing.autoNotified === "waitlist" ? " [→ waitlist]" : "";
  const html = wrap(`
    <p><strong>New booking request</strong></p>
    ${routingBlock}
    <p>${escapeHtml(name)} &lt;${escapeHtml(b.email)}&gt;<br>
    Phone: ${escapeHtml(b.phone || "—")}<br>
    Delivery address: ${escapeHtml(address)}</p>
    <p><strong>Rental:</strong><br>
    Start: ${escapeHtml(b.startDate || "—")}<br>
    Length: ${escapeHtml(b.rentalLength || "—")}<br>
    Reason: ${escapeHtml(b.reason || "—")}<br>
    Prior experience: ${escapeHtml(b.priorExperience || "—")}</p>
    <p><strong>Safety screening flags:</strong> ${flags}</p>
    <p><a href="https://purebaric.com/admin.html" style="color:#b8654d;">View in admin →</a></p>
  `);
  return send({ to: ADMIN_NOTIFY, subject: `Booking request: ${name}${subjectTag}`, html });
}

module.exports = {
  send,
  notifyAdminWaitlistJoin,
  notifyWaitlistChamberAvailable,
  notifyAdminBooking,
  notifyCustomerChamberAvailable,
  notifyCustomerWaitlistAdded,
};
