// Public: the Confirm button in the waitlist chamber-ready email/text.
//
//   GET  /waitlist-confirm?w=<entry id>&t=<token>  -> a page that confirms via POST as soon as it loads (a plain
//                                                     fetch by a link scanner does not confirm anything)
//   POST /waitlist-confirm?w=...&t=...             -> turns the hold into a rental request, emails the person,
//                                                     alerts the admin; returns JSON
//
// The token is minted per hold (admin-waitlist.js) and never shown in the admin, so the link only works for the
// person it was sent to, and only while that hold is open.
const {
  getNotifications, getTwilioConfig, createBooking, updateWaitlistEntry, STORES, store,
} = require("./_lib/storage");
const { notifyWaitlistConfirmed, notifyAdminBooking, notifyAdminSms } = require("./_lib/email");
const { smsForEvent, smsNumbersForEvent, emailsForEvent } = require("./_lib/notifications");

const CALL = '<a href="tel:+18019010873">(801) 901-0873</a>';

function page(title, body, extraHead = "") {
  return {
    statusCode: 200,
    headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" },
    body: `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="robots" content="noindex"><title>${title}</title>
<style>body{margin:0;background:#efe7db;font-family:-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#2b2320}
.card{max-width:520px;margin:48px auto;background:#fffdf9;border:1px solid #e6dccd;border-radius:16px;padding:32px 36px}
h1{font-family:Georgia,'Times New Roman',serif;font-size:24px;margin:0 0 12px}p{font-size:16px;line-height:1.6;margin:0 0 10px;color:#5f544d}a{color:#9a4f3a}
.btn{display:inline-block;padding:12px 22px;background:#b8654d;color:#fff!important;text-decoration:none;border-radius:8px;font-weight:700;border:0;font-size:15px;cursor:pointer;font-family:inherit}</style>${extraHead}</head>
<body><div class="card"><h1 id="t">${title}</h1><div id="b">${body}</div><p style="margin-top:18px;font-size:13px">Purebaric &nbsp;|&nbsp; <a href="https://purebaric.com">purebaric.com</a> &nbsp;|&nbsp; ${CALL}</p></div></body></html>`,
  };
}
const json = (statusCode, obj) => ({ statusCode, headers: { "Content-Type": "application/json", "Cache-Control": "no-store" }, body: JSON.stringify(obj) });

const EXPIRED = { title: "This offer has expired", body: `<p>The hold on this chamber is no longer open. If you would still like a chamber, reply to our email or call us at ${CALL} and we will find the next available one for you.</p>` };
const INVALID = { title: "We could not find that offer", body: `<p>This link does not match an open chamber offer. If you think that is a mistake, reply to our email or call us at ${CALL}.</p>` };
const DONE = { title: "You're confirmed", body: `<p>Thank you. Your chamber request is confirmed and we will reach out shortly to schedule your delivery.</p><p>A confirmation email is on its way to you.</p>` };
const ALREADY = { title: "Already confirmed", body: `<p>This chamber request is already confirmed. We will be in touch shortly to schedule your delivery.</p>` };

async function lookup(q) {
  const id = String(q.w || "").trim(), token = String(q.t || "").trim();
  if (!/^[0-9a-f-]{36}$/.test(id) || !/^[0-9a-f]{32}$/.test(token)) return { state: "invalid" };
  const entry = await store(STORES.waitlist).get(id, { type: "json" });
  if (!entry || !entry.confirmToken || entry.confirmToken !== token) return { state: "invalid" };
  if (entry.status === "converted") return { state: "already", entry };
  if (entry.status !== "hold" || !entry.holdExpiresAt || new Date(entry.holdExpiresAt).getTime() < Date.now()) return { state: "expired", entry };
  return { state: "open", entry };
}

async function confirm(entry) {
  const chamber = entry.notifiedChamberId ? await store(STORES.chambers).get(entry.notifiedChamberId, { type: "json" }) : null;
  const [firstName, ...rest] = String(entry.name || "").trim().split(/\s+/);
  const rate = entry.wantsDiscount && Number(entry.discountPrice) > 0 ? ` Requested monthly rate: $${Math.round(Number(entry.discountPrice))}.` : "";
  const booking = await createBooking({
    firstName: firstName || "", lastName: rest.join(" "),
    email: entry.email || "", phone: entry.phone || "", zip: entry.zip || "",
    streetAddress: "", city: "", state: "",
    rentalType: entry.rentalType === "business" ? "business" : "residential",
    businessName: entry.rentalType === "business" ? (entry.businessName || "") : "",
    startDate: entry.preferredStartDate || "", rentalLength: "",
    requestedType: chamber && chamber.style ? chamber.style : "",
    reason: `Confirmed from the waitlist${chamber ? ` (held chamber: ${chamber.name})` : ""}.${rate}${entry.reason ? ` ${entry.reason}` : ""}`.trim(),
    priorExperience: "", medicalScreeningFlags: "none", consentMedical: false, consentTerms: false, outOfArea: false,
    source: "waitlist", waitlistId: entry.id,
    analytics: { consentGranted: false, clientId: "", sessionId: "", rentalConfirmedAt: null, rentalConfirmedEvent: null },
  });
  await updateWaitlistEntry(entry.id, { status: "converted", convertedBookingId: booking.id, confirmedAt: new Date().toISOString() });

  const results = { customerEmail: "no email on file", adminEmail: "skipped", adminSms: "skipped" };
  if (entry.email) { try { await notifyWaitlistConfirmed(entry, chamber); results.customerEmail = "sent"; } catch (e) { results.customerEmail = `failed: ${e.message}`; console.error("waitlist-confirm customer email failed", e); } }
  try {
    const notifCfg = await getNotifications();
    const twilio = await getTwilioConfig();
    const routing = { autoNotified: "waitlist-confirmed", linkedWaitlistId: entry.id, chamberName: chamber ? chamber.name : "" };
    try { await notifyAdminBooking(booking, routing, emailsForEvent(notifCfg, "reservation_in")); results.adminEmail = "sent"; } catch (e) { results.adminEmail = `failed: ${e.message}`; console.error("waitlist-confirm admin email failed", e); }
    try { await notifyAdminSms(booking, { gateways: smsForEvent(notifCfg, "reservation_in"), numbers: smsNumbersForEvent(notifCfg, "reservation_in"), twilio }); results.adminSms = "sent"; } catch (e) { results.adminSms = `failed: ${e.message}`; console.error("waitlist-confirm admin sms failed", e); }
  } catch (e) { console.error("waitlist-confirm admin notify setup failed", e); }
  return { booking, results };
}

exports.handler = async (event) => {
  const q = event.queryStringParameters || {};
  try {
    if (event.httpMethod === "GET") {
      const r = await lookup(q);
      if (r.state === "invalid") return page(INVALID.title, INVALID.body);
      if (r.state === "expired") return page(EXPIRED.title, EXPIRED.body);
      if (r.state === "already") return page(ALREADY.title, ALREADY.body);
      // Open hold: confirm from the page itself so that only a real visit (not a link scanner) confirms.
      const action = `/waitlist-confirm?w=${encodeURIComponent(q.w)}&t=${encodeURIComponent(q.t)}`;
      const body = `<p>One moment, confirming your chamber…</p><form method="post" action="${action}" id="f"><button class="btn" type="submit">Confirm my chamber</button></form>`;
      const script = `<script>(function(){var f=document.getElementById('f');function show(t,b){document.getElementById('t').textContent=t;document.getElementById('b').innerHTML=b;}
f.addEventListener('submit',function(e){e.preventDefault();go();});function go(){fetch(f.action,{method:'POST',headers:{'Accept':'application/json'}}).then(function(r){return r.json();}).then(function(j){show(j.title,j.body);}).catch(function(){f.querySelector('button').style.display='inline-block';show('Please confirm',${JSON.stringify("<p>Tap the button below to confirm your chamber.</p>")}+f.outerHTML);});}
go();})();</script>`;
      return page("Confirming your chamber", body, script);
    }
    if (event.httpMethod === "POST") {
      const r = await lookup(q);
      const wantsJson = /application\/json/i.test(event.headers["accept"] || event.headers["Accept"] || "");
      const reply = (p, extra) => (wantsJson ? json(200, { ...p, ...(extra || {}) }) : page(p.title, p.body));
      if (r.state === "invalid") return reply(INVALID);
      if (r.state === "expired") return reply(EXPIRED);
      if (r.state === "already") return reply(ALREADY);
      const { results } = await confirm(r.entry);
      return reply(DONE, { results });
    }
    return { statusCode: 405, body: "method not allowed" };
  } catch (err) {
    console.error("waitlist-confirm error", err);
    return page("Something went wrong", `<p>We could not confirm your chamber just now. Please reply to our email or call us at ${CALL} and we will take care of it.</p>`);
  }
};
