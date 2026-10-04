const { Resend } = require("resend");
const { isComplete, sendSms } = require("./sms");
const { buildFollowUpText, formatDeliveryDate } = require("./followup");
const { daysUntil, cancelLink, endingSoonLink, shortDate, endingSmsText } = require("./rental-ending");

const FROM = "Purebaric <noreply@purebaric.com>";
const REPLY_TO = "hello@purebaric.com";
const ADMIN_NOTIFY = require("./owner").OWNER_EMAIL;

function client() {
  const key = process.env.RESEND_API_KEY;
  if (!key) throw new Error("RESEND_API_KEY not set");
  return new Resend(key);
}

// `from`, `replyTo` and `headers` are optional overrides (the admin Outreach tab sends from the owner's
// own address with List-Unsubscribe headers); everything else on the site uses the defaults.
async function send({ to, subject, html, text, from, replyTo, headers }) {
  const resend = client();
  const recipients = Array.isArray(to) ? to : [to];
  const payload = {
    from: from || FROM,
    to: recipients,
    // v4 SDK uses camelCase `replyTo`; v1-v2 used snake_case `reply_to`.
    // We send both for maximum compatibility, extra fields are ignored.
    replyTo: replyTo || REPLY_TO,
    reply_to: replyTo || REPLY_TO,
    subject,
    html,
    text,
  };
  if (headers && Object.keys(headers).length) payload.headers = headers;
  let result;
  // Resend allows 2 API requests per second. Alert tests and outreach batches send several emails
  // back to back, so a 429 ("Too many requests") is paced and retried rather than surfaced as a failure.
  for (let attempt = 0; ; attempt++) {
    try {
      result = await resend.emails.send(payload);
    } catch (err) {
      // Network errors, timeouts, etc., SDK threw outright
      throw new Error(`Resend send threw: ${err && err.message ? err.message : String(err)}`);
    }
    const e = result && result.error;
    const rateLimited = e && (e.statusCode === 429 || e.name === "rate_limit_exceeded");
    if (!rateLimited || attempt >= 4) break;
    await new Promise(r => setTimeout(r, 700 * (attempt + 1)));
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
                <img src="https://purebaric.com/images/logo-cream.png?v=3" alt="Purebaric" width="220" style="display:inline-block; height:auto; max-width:220px; border:0; outline:none; text-decoration:none;" />
              </a>
            </td>
          </tr>
          <!-- Hero imagery -->
          <tr>
            <td style="padding:0; font-size:0; line-height:0;">
              <img src="https://purebaric.com/images/chamber-living.jpg?v=3" alt="A Purebaric hyperbaric chamber set up at home" width="560" style="display:block; width:100%; max-width:560px; height:auto; border:0;" />
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

function signoff(name = "Matthew") {
  return name === "Matthew"
    ? `<p style="margin:24px 0 0;">Matthew<br><span style="color:#6f635b;">Purebaric</span></p>`
    : `<p style="margin:24px 0 0;">${escapeHtml(name)}</p>`;
}
// "a lying chamber" / "a sitting chamber" for the unit being held, or just "a chamber".
function chamberKind(chamber) {
  const style = chamber && String(chamber.style || "").toLowerCase();
  return style === "sitting" || style === "lying" ? `a ${style} chamber` : "a chamber";
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

// One-click confirmation link in the chamber-ready email/text. The token is random per hold and lives only on
// the waitlist entry, so the link works for that person and that hold alone (see waitlist-confirm.js).
function waitlistConfirmUrl(entry) {
  return entry && entry.id && entry.confirmToken ? `https://purebaric.com/waitlist-confirm?w=${encodeURIComponent(entry.id)}&t=${encodeURIComponent(entry.confirmToken)}` : "";
}
// The reduced monthly rate a waitlist person asked for, as a sentence for the chamber-ready email and text.
function waitlistRateLine(entry) {
  const price = entry && entry.wantsDiscount && Number(entry.discountPrice) > 0 ? Math.round(Number(entry.discountPrice)) : 0;
  return price ? `Your rate: $${price.toLocaleString("en-US")} a month, the reduced rate you asked for.` : "";
}
// Short text-message version of the chamber-ready notice.
function waitlistHoldSmsText(entry, chamber) {
  const first = String(entry.name || "there").split(" ")[0];
  const expires = entry.holdExpiresAt ? new Date(entry.holdExpiresAt).toLocaleString("en-US", { timeZone: "America/Denver", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }) : "";
  const rate = waitlistRateLine(entry);
  const url = waitlistConfirmUrl(entry);
  return `Purebaric: Hi ${first}, ${chamberKind(chamber)} is now available for you. We are holding it until ${expires || "tomorrow"}.${rate ? " " + rate : ""} ${url ? `To claim this offer, confirm here: ${url} or` : "To claim this offer, reply to this text or"} call (801) 901-0873.`;
}
async function notifyWaitlistChamberAvailable(entry, chamber) {
  const expires = new Date(entry.holdExpiresAt).toLocaleString("en-US", { timeZone: "America/Denver", dateStyle: "long", timeStyle: "short" });
  const html = wrap(`
    <p style="margin:0 0 16px;">Hi ${escapeHtml(entry.name.split(" ")[0])},</p>
    <p style="margin:0 0 16px;">Good news: ${chamberKind(chamber)} is now available. We are holding <strong style="color:#2b2320;">${chamberKind(chamber)}</strong> for you until <strong style="color:#2b2320;">${expires} Mountain Time</strong>.</p>
    ${waitlistRateLine(entry) ? `<p style="margin:0 0 16px;"><strong style="color:#2b2320;">${escapeHtml(waitlistRateLine(entry))}</strong></p>` : ""}
    ${waitlistConfirmUrl(entry) ? `<p style="margin:28px 0 16px;"><a href="${waitlistConfirmUrl(entry)}" style="display:inline-block; padding:14px 26px; background:#b8654d; color:#ffffff; text-decoration:none; border-radius:8px; font-weight:700; font-size:16px;">Confirm my booking</a></p>
    <p style="margin:0 0 16px;">You can also reply to this email or call us at <a href="tel:+18019010873" style="color:#b8654d;">(801) 901-0873</a>.</p>` : `<p style="margin:0 0 16px;">To claim this offer, reply to this email or call us at <a href="tel:+18019010873" style="color:#b8654d;">(801) 901-0873</a> to confirm your booking.</p>`}
    <p style="margin:0;">This hold is reserved for you until the time above. If we have not heard from you by then, we will release the chamber to the next person on our waiting list.</p>
    ${signoff("The Purebaric team")}
  `);
  return send({
    to: entry.email,
    subject: "A Purebaric chamber is available for you",
    html,
  });
}

// Customer-facing: they clicked Confirm in the chamber-ready email; the request is now in the admin queue.
async function notifyWaitlistConfirmed(entry, chamber) {
  const html = wrap(`
    <p style="margin:0 0 16px;">Hi ${escapeHtml(String(entry.name || "there").split(" ")[0])},</p>
    <p style="margin:0 0 16px;">Thank you. <strong style="color:#2b2320;">Your request for ${escapeHtml(chamberKind(chamber))} is confirmed.</strong></p>
    ${waitlistRateLine(entry) ? `<p style="margin:0 0 16px;">${escapeHtml(waitlistRateLine(entry))}</p>` : ""}
    <p style="margin:0 0 16px;">We will reach out shortly to schedule your delivery. If you have any questions in the meantime, reply to this email or call us at <a href="tel:+18019010873" style="color:#b8654d;">(801) 901-0873</a>.</p>
    ${signoff("The Purebaric team")}
  `);
  return send({ to: entry.email, subject: "Your Purebaric chamber request is confirmed", html });
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

// Customer-facing: chambers exist physically, but they're already spoken for by
// earlier untriaged requests, so we don't promise availability, just a follow-up.
async function notifyCustomerPendingAvailability(booking) {
  const first = (booking.firstName || "there").split(" ")[0];
  const html = wrap(`
    <p style="margin:0 0 16px;">Hi ${escapeHtml(first)},</p>
    <p style="margin:0 0 16px;">Thanks for your reservation request. We're confirming chamber availability right now and <strong style="color:#2b2320;">will contact you shortly</strong> about next steps.</p>
    <p style="margin:0;">If you have any questions in the meantime, reply to this email or call us at <a href="tel:+18019010873" style="color:#b8654d;">(801) 901-0873</a>.</p>
    ${signoff()}
  `);
  return send({
    to: booking.email,
    subject: "Purebaric, we'll be in touch shortly about your reservation",
    html,
  });
}

// Customer-facing: book mode. The delivery date is chosen from the owner's calendar, so this confirms
// the booking itself: chamber, rental length, anticipated delivery day, and that we call or text to set the time.
async function notifyCustomerBookingConfirmed(booking, { deliveryNote } = {}) {
  const first = (booking.firstName || "there").split(" ")[0];
  const style = booking.chamberStyle === "sitting" ? "1.5 ATA sitting chamber" : "1.5 ATA lying chamber";
  const months = Number(booking.months) || 1;
  const length = months === 1 ? "1 month" : `${months} months`;
  const when = formatDeliveryDate(booking.startDate);
  const note = deliveryNote || "We will text or call to confirm the exact delivery time.";
  const isBiz = booking.rentalType === "business";
  const html = wrap(`
    <p style="margin:0 0 16px;">Hi ${escapeHtml(first)},</p>
    <p style="margin:0 0 16px;"><strong style="color:#2b2320;">Your chamber is booked.</strong>${isBiz ? ` Thank you for choosing Purebaric for ${escapeHtml(booking.businessName || "your business")}.` : " Thank you for choosing Purebaric."}</p>
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin:0 0 16px; font-size:15px;">
      <tr><td style="padding:4px 14px 4px 0; color:#6f635b;">Chamber</td><td style="padding:4px 0; font-weight:700;">${escapeHtml(style)}</td></tr>
      <tr><td style="padding:4px 14px 4px 0; color:#6f635b;">Rental length</td><td style="padding:4px 0; font-weight:700;">${escapeHtml(length)}${booking.endDate ? ` <span style="font-weight:400; color:#6f635b;">(through ${escapeHtml(formatDeliveryDate(booking.endDate))})</span>` : ""}</td></tr>
      <tr><td style="padding:4px 14px 4px 0; color:#6f635b;">Anticipated delivery</td><td style="padding:4px 0; font-weight:700;">${escapeHtml(when)}</td></tr>
    </table>
    <p style="margin:0 0 16px;">We will contact you shortly to coordinate a delivery time. ${escapeHtml(note)}</p>
    <p style="margin:0;">Questions before then? Reply to this email or call us at <a href="tel:+18019010873" style="color:#b8654d;">(801) 901-0873</a>.</p>
    ${signoff()}
  `);
  return send({ to: booking.email, subject: `Purebaric, your chamber is booked for ${when}`, html });
}

// Admin recipient list for a given event: the configured emails, or the default
// admin address when none are configured (so alerts never silently stop).
function adminTo(to) {
  const list = (Array.isArray(to) ? to : to ? [to] : []).filter(Boolean);
  return list.length ? list : [ADMIN_NOTIFY];
}

async function notifyAdminBooking(b, routing = {}, to) {
  const name = `${b.firstName || ""} ${b.lastName || ""}`.trim();
  const flags = b.medicalScreeningFlags && b.medicalScreeningFlags !== "none"
    ? `<strong style="color:#9a4f3a;">${escapeHtml(b.medicalScreeningFlags)}</strong>`
    : "none";
  const address = [b.streetAddress, b.city, b.state, b.zip].filter(Boolean).join(", ") || "-";
  let routingBlock = "";
  if (routing.autoNotified === "available") {
    routingBlock = `<p style="padding:12px 14px; background:#ebf2da; color:#4a5d24; border-radius:8px; margin:0 0 16px;"><strong>Auto-routed: chamber available.</strong><br>Customer was emailed that we'll be in contact shortly to arrange delivery. Action: reach out to confirm.</p>`;
  } else if (routing.autoNotified === "pending") {
    routingBlock = `<p style="padding:12px 14px; background:#f4e7df; color:#7a4a1e; border-radius:8px; margin:0 0 16px;"><strong>Auto-routed: pending availability.</strong><br>Chambers exist but are already spoken for by earlier untriaged requests, so no chamber was auto-assigned. Customer was emailed that we'll contact them shortly. Action: triage and confirm.</p>`;
  } else if (routing.autoNotified === "booked") {
    routingBlock = `<p style="padding:12px 14px; background:#e4ebe1; color:#2f4a2a; border-radius:8px; margin:0 0 16px;"><strong>Booked online (book mode).</strong><br>Chamber: ${escapeHtml(b.chamberStyle === "sitting" ? "sitting" : "lying")}. Delivery ${escapeHtml(formatDeliveryDate(b.startDate))}, ${Number(b.months) || 1} month${Number(b.months) === 1 ? "" : "s"} through ${escapeHtml(formatDeliveryDate(b.endDate))}. The customer was emailed a confirmation and told we will text or call to set the delivery time. This date is held for them until you convert or reject the request.</p>`;
  } else if (routing.autoNotified === "waitlist-confirmed") {
    routingBlock = `<p style="padding:12px 14px; background:#ebf2da; color:#4a5d24; border-radius:8px; margin:0 0 16px;"><strong>Confirmed from the waitlist.</strong><br>They clicked Confirm in the chamber-ready email${routing.chamberName ? ` for ${escapeHtml(routing.chamberName)}` : ""}. They were told you will reach out shortly to schedule delivery.</p>`;
  } else if (routing.autoNotified === "waitlist") {
    routingBlock = `<p style="padding:12px 14px; background:#f4e7df; color:#7a4a1e; border-radius:8px; margin:0 0 16px;"><strong>Auto-routed: no chambers available.</strong><br>Customer was added to the waitlist and emailed about it. Linked waitlist id: <code>${or(routing.linkedWaitlistId)}</code></p>`;
  }
  // Only when a chamber is actually free — the message says "I have a chamber ready".
  let followUpBlock = "";
  if (routing.autoNotified === "available") {
    const text = buildFollowUpText({ firstName: b.firstName, rentalLength: b.rentalLength, startDate: b.startDate, monthlyRate: routing.monthlyRate });
    followUpBlock = `<div style="margin:0 0 16px; padding:12px 14px; background:#f6efe4; border:1px solid #e6dccd; border-radius:8px;"><p style="margin:0 0 8px; font-size:12px; color:#7a6f63;"><strong>Follow-up text to copy and send${name ? ` to ${escapeHtml(b.firstName || name)}` : ""}</strong></p><div style="white-space:pre-wrap; color:#2b2320;">${escapeHtml(text)}</div></div>`;
  }
  const subjectTag = routing.autoNotified === "booked" ? ` [booked: ${formatDeliveryDate(b.startDate)}]` :
                     routing.autoNotified === "available" ? " [chamber available]" :
                     routing.autoNotified === "pending" ? " [pending availability]" :
                     routing.autoNotified === "waitlist-confirmed" ? " [confirmed from waitlist]" :
                     routing.autoNotified === "waitlist" ? " [to waitlist]" : "";
  const isBiz = b.rentalType === "business";
  const bizBlock = isBiz
    ? `<p style="padding:12px 14px; background:#2b2320; color:#f3ead9; border-radius:8px; margin:0 0 16px;"><strong>Business rental request</strong><br>Business: ${escapeHtml(b.businessName || "(not given)")}. Came in through the For Businesses page; the business rate and agreement apply, not the home plans.</p>`
    : "";
  const html = wrap(`
    <p style="margin:0 0 16px;"><strong style="color:#2b2320;">${isBiz ? "New business rental request" : "New booking request"}</strong></p>
    ${bizBlock}
    ${routingBlock}
    ${followUpBlock}
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
  const subjectWho = isBiz ? `${b.businessName || name} (business)` : name;
  return send({ to: adminTo(to), subject: `${isBiz ? "Business rental request" : "Booking request"}: ${subjectWho}${subjectTag}`, html });
}

// Admin-facing: a request came in for a ZIP outside the delivery area.
// The customer is NOT sent a confirmation; the admin decides whether to follow up.
async function notifyAdminOutOfArea(b, to) {
  const name = `${b.firstName || ""} ${b.lastName || ""}`.trim() || "-";
  const address = [b.streetAddress, b.city, b.state, b.zip].filter(Boolean).join(", ") || "-";
  const html = wrap(`
    <p style="margin:0 0 16px;"><strong style="color:#2b2320;">Out-of-area request${b.rentalType === "business" ? ` (business: ${escapeHtml(b.businessName || "not given")})` : ""}</strong></p>
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
  return send({ to: adminTo(to), subject: `Out-of-area request: ${name} (ZIP ${b.zip || "?"})`, html });
}

// Deliver an admin text. Prefers Twilio (reliable) when configured, using the raw
// `numbers`; otherwise falls back to free carrier email-to-text via Resend, using
// the `gateways` (+ the legacy ADMIN_SMS_GATEWAY env, if set). Keep it short —
// SMS caps near 160 characters per segment. Returns a status object.
async function deliverAdminSms({ numbers, gateways, text, subject, twilio }) {
  if (isComplete(twilio)) {
    const nums = [...new Set((numbers || []).filter(Boolean))];
    if (!nums.length) return { skipped: "no sms recipients" };
    const results = await Promise.allSettled(nums.map((n) => sendSms(n, text, twilio)));
    const failed = results.filter((r) => r.status === "rejected" || (r.value && r.value.sent === false));
    if (failed.length) console.error("twilio sms failures", failed.map((f) => (f.reason && f.reason.message) || (f.value && f.value.reason)));
    return { via: "twilio", sent: nums.length - failed.length, failed: failed.length };
  }
  const recips = new Set((gateways || []).filter(Boolean));
  const legacy = (process.env.ADMIN_SMS_GATEWAY || "").trim();
  if (legacy) recips.add(legacy);
  if (!recips.size) return { skipped: "no sms recipients" };
  await send({ to: [...recips], subject: subject || "Purebaric", text, html: `<p>${escapeHtml(text)}</p>` });
  return { via: "email-to-text", sent: recips.size };
}

// Admin SMS alerts are transactional and privacy-conscious by design: no
// customer name, phone, address, email, ZIP, or notes ever appear in a text —
// the admin follows the link and signs in to see details. Every message ends
// with the required STOP/HELP compliance footer.
// `followUp` ({ monthlyRate }, passed only when a chamber is available) adds the
// copy-and-paste follow-up text. It carries a "[NAME]" placeholder instead of the customer's name — admin
// SMS never includes customer details (RUNBOOK §7f); the term, price and
// delivery date aren't identifying.
async function notifyAdminSms(b, { outOfArea, gateways, numbers, twilio, followUp } = {}) {
  // The type is not personal data, so it may appear in the text; the business name stays out, like every other detail.
  const kind = b.rentalType === "business" ? "business rental request" : "reservation request";
  const lead = outOfArea
    ? `Purebaric: A new out-of-area ${kind} was received. Sign in to the Purebaric admin portal to review it.`
    : `Purebaric: A new ${kind} was received. Sign in to the Purebaric admin portal to review it.`;
  const copyText = followUp
    ? `\n\nFollow-up text to copy:\n${buildFollowUpText({ rentalLength: b.rentalLength, startDate: b.startDate, monthlyRate: followUp.monthlyRate })}`
    : "";
  const text = `${lead}${copyText}\n\nReply STOP to opt out or HELP for help.`;
  return deliverAdminSms({ numbers, gateways, text, subject: outOfArea ? "Purebaric out-of-area lead" : "New Purebaric lead", twilio });
}

async function notifyAdminReviewSms(review, { gateways, numbers, twilio } = {}) {
  const text = "Purebaric: A new customer review was submitted. Sign in to the Purebaric admin portal to review it. Reply STOP to opt out or HELP for help.";
  return deliverAdminSms({ numbers, gateways, text, subject: "New Purebaric review", twilio });
}

// Admin-facing: a visitor submitted a review. It stays pending until published.
async function notifyAdminReview(review, to) {
  const who = `${review.firstName || ""} ${review.lastInitial || ""}`.trim() || "Someone";
  const where = review.city ? ` from ${review.city}` : "";
  const html = wrap(`
    <p style="margin:0 0 16px;"><strong style="color:#2b2320;">New review submitted</strong></p>
    <p style="margin:0 0 16px;">${escapeHtml(who)}${escapeHtml(where)}</p>
    <p style="margin:0 0 16px; padding:14px 16px; background:#f6efe4; border:1px solid #e6dccd; border-radius:8px; color:#2b2320;">${escapeHtml(review.text || "-").replace(/\n/g, "<br>")}</p>
    <p style="margin:0;">It won't appear on the site until you publish it. <a href="https://purebaric.com/admin.html" style="color:#b8654d;">Review in admin →</a></p>
  `);
  return send({ to: adminTo(to), subject: `New review: ${who}`, html });
}

// Admin-facing weekly digest: every running rental ending within the look-ahead window. Full renter
// details are fine here (the email goes only to the admin); the SMS twin below is deliberately generic.
async function notifyAdminEndingSoon(list, { to, today, days, chambers = [], machines = [] } = {}) {
  const long = (iso) => new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric", timeZone: "UTC" });
  const n = list.length;
  const blocks = list.map((rental) => {
    const renter = rental.renter || {};
    const a = renter.address || {};
    const address = [a.street, [a.city, a.state].filter(Boolean).join(", "), a.zip].filter(Boolean).join(" ") || "-";
    const rate = `$${Number(rental.monthlyRate || 0).toLocaleString("en-US")}/${rental.rateType === "weekly" ? "week" : "month"}`;
    const left = daysUntil(rental.endDate, today);
    const when = left === 0 ? "today" : left === 1 ? "tomorrow" : `in ${left} days`;
    const chamber = (chambers.find((c) => c.id === rental.chamberId) || {}).name;
    const machine = (machines.find((m) => m.id === rental.machineId) || {}).name;
    const action = rental.stripeCancelRequestedAt
      ? `<p style="margin:0; font-size:13px; color:#4a5d24;">Stripe cancellation already requested (${escapeHtml(rental.stripeCancelRequestedAt.slice(0, 10))}).</p>`
      : `<p style="margin:0;"><a href="${cancelLink(rental.id)}" style="display:inline-block; padding:10px 16px; background:#b8654d; color:#ffffff; text-decoration:none; border-radius:8px; font-weight:600;">Cancel Stripe subscription →</a></p>`;
    return `<div style="margin:0 0 16px; padding:14px 16px; background:#fffdf9; border:1px solid #e6dccd; border-radius:8px;">
      <p style="margin:0 0 8px;"><strong style="color:#2b2320;">${escapeHtml(renter.name || "Renter")}</strong>${rental.rentalType === "business" ? ` <span style="font-size:12px; color:#9a4f3a;">(business${rental.businessName ? ": " + escapeHtml(rental.businessName) : ""})</span>` : ""} ends <strong>${escapeHtml(long(rental.endDate))}</strong> (${when})</p>
      <p style="margin:0 0 10px;">Email: ${or(renter.email)}<br>Phone: ${or(renter.phone)}<br>Address: ${escapeHtml(address)}<br>
      ${escapeHtml(rental.startDate)} to ${escapeHtml(rental.endDate)} at ${escapeHtml(rate)} · Chamber: ${or(chamber)} · Machine: ${or(machine)}</p>
      ${action}
    </div>`;
  }).join("");
  const html = wrap(`
    <p style="margin:0 0 16px;"><strong style="color:#2b2320;">${n} rental${n === 1 ? "" : "s"} ending in the next ${days} days</strong></p>
    ${blocks}
    <p style="margin:0 0 16px; font-size:13px; color:#6f635b;">Each button opens the admin (sign in if asked) and asks you to confirm. Nothing is cancelled until you confirm, and the subscription is set to stop at the end of its current billing period. This digest is sent weekly.</p>
    <p style="margin:0;"><a href="${endingSoonLink()}" style="color:#b8654d;">See all in admin →</a></p>
  `);
  return send({ to: adminTo(to), subject: `${n} rental${n === 1 ? "" : "s"} ending soon (first: ${shortDate(list[0].endDate)})`, html });
}

async function notifyAdminEndingSoonSms(list, { days, gateways, numbers, twilio } = {}) {
  return deliverAdminSms({ numbers, gateways, text: endingSmsText(list, days), subject: "Purebaric rentals ending", twilio });
}

module.exports = {
  send,
  notifyAdminEndingSoon,
  notifyAdminEndingSoonSms,
  notifyAdminReview,
  notifyAdminWaitlistJoin,
  notifyWaitlistChamberAvailable,
  notifyWaitlistConfirmed,
  waitlistRateLine,
  waitlistHoldSmsText,
  waitlistConfirmUrl,
  notifyAdminBooking,
  notifyCustomerChamberAvailable,
  notifyCustomerWaitlistAdded,
  notifyCustomerPendingAvailability,
  notifyCustomerBookingConfirmed,
  notifyAdminOutOfArea,
  notifyAdminSms,
  notifyAdminReviewSms,
  deliverAdminSms,
};
