// POST /api/stripe-webhook-thin — a placeholder for Stripe's "thin payload"
// destination. Stripe's destination wizard asks for a URL for thin payloads even
// when only snapshot events are wanted; this accepts and ignores them so the
// wizard can be completed. All real payment handling is in stripe-webhook.js
// (snapshot payloads), which is what the signing secret in the admin belongs to.
exports.handler = async (event) => {
  if (event.httpMethod !== "POST") return { statusCode: 405, body: "method not allowed" };
  return { statusCode: 200, body: JSON.stringify({ received: true }) };
};
