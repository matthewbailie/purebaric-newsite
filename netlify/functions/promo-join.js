// POST /api/promo-join  body (form or JSON): { email, name?, source? }
// Adds the person to the promotions list (admin → Outreach → Promotions list).
const { addPromoSubscriber, normalizePromoEmail } = require("./_lib/storage");

function parseBody(event) {
  if (!event.body) return {};
  const ct = (event.headers["content-type"] || event.headers["Content-Type"] || "").toLowerCase();
  if (ct.includes("application/json")) { try { return JSON.parse(event.body); } catch { return {}; } }
  return Object.fromEntries(new URLSearchParams(event.body));
}
const json = (statusCode, body) => ({ statusCode, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") return { statusCode: 405, body: "Method Not Allowed" };
  try {
    const body = parseBody(event);
    if (body["bot-field"]) return json(200, { ok: true }); // honeypot: accept silently, store nothing
    const email = normalizePromoEmail(body.email);
    if (!email) return json(400, { error: "invalid_email", message: "Please enter a valid email address." });
    const source = /^[a-z0-9_-]{1,40}$/i.test(String(body.source || "")) ? String(body.source) : "homepage";
    await addPromoSubscriber({ email, name: body.name, phone: body.phone, source });
    return json(200, { ok: true, message: "You're on the list. We'll email you when we run a promotion." });
  } catch (err) {
    console.error("promo-join error", err);
    return json(500, { error: "promo_join_failed" });
  }
};
