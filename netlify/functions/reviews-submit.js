const { createReview, getNotifications } = require("./_lib/storage");
const { notifyAdminReview, notifyAdminReviewSms } = require("./_lib/email");
const { smsForEvent, smsNumbersForEvent, emailsForEvent } = require("./_lib/notifications");

function parseBody(event) {
  if (!event.body) return {};
  const contentType = (event.headers["content-type"] || event.headers["Content-Type"] || "").toLowerCase();
  if (contentType.includes("application/json")) {
    try { return JSON.parse(event.body); } catch { return {}; }
  }
  const params = new URLSearchParams(event.body);
  return Object.fromEntries(params);
}

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }
  try {
    const body = parseBody(event);

    // Honeypot, silently accept and drop
    if (body["bot-field"]) {
      return { statusCode: 200, body: JSON.stringify({ ok: true }) };
    }

    const firstName = (body.firstName || body.first_name || "").trim();
    const lastInitial = (body.lastInitial || body.last_initial || "").trim();
    const text = (body.text || body.review || body.message || "").trim();
    const city = (body.city || "").trim();

    if (!firstName || !lastInitial || !text) {
      return {
        statusCode: 400,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ error: "first name, last initial, and review text are required" }),
      };
    }
    if (text.length > 1500) {
      return {
        statusCode: 400,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ error: "review is too long (1500 characters max)" }),
      };
    }

    const review = await createReview({ firstName, lastInitial, city, text });

    // Await the admin notifications, Lambda freezes pending I/O on return.
    // Errors are caught so a mail hiccup never fails the visitor's submission.
    const notifCfg = await getNotifications();
    let adminEmail = null;
    try {
      await notifyAdminReview(review, emailsForEvent(notifCfg, "review"));
      adminEmail = "sent";
    } catch (err) {
      console.error("admin review notify failed", err);
      adminEmail = `failed: ${err.message}`;
    }
    // Privacy-safe SMS status (counts/method only, never the number) for diagnostics.
    const gateways = smsForEvent(notifCfg, "review");
    const numbers = smsNumbersForEvent(notifCfg, "review");
    let adminSms = numbers.length ? "attempted" : "no_recipients";
    try {
      if (numbers.length) {
        const r = await notifyAdminReviewSms(review, { gateways, numbers });
        adminSms = `${r.via || "sent"}:${r.sent != null ? r.sent : numbers.length}${r.failed ? `(failed ${r.failed})` : ""}`;
      }
    } catch (err) {
      console.error("admin review sms failed", err);
      adminSms = "failed";
    }

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ok: true,
        success: true,
        id: review.id,
        message: "Thanks for sharing. Your review has been submitted, we'll post it after a quick review.",
        adminEmail,
        adminSms,
      }),
    };
  } catch (err) {
    console.error("reviews-submit error", err);
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: "review_submit_failed" }),
    };
  }
};
