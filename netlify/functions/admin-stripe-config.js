const { getStripeConfig, setStripeConfig } = require("./_lib/storage");
const { requireAuth, parseBody, json } = require("./_lib/admin");

// GET  /api/admin/stripe-config -> { hasSecret, mode, hasWebhook, source } (never the keys)
// PUT  /api/admin/stripe-config  body { secretKey, webhookSecret } -> same
function view(c) {
  const mode = /^sk_live_/.test(c.secretKey) ? "live" : /^sk_test_/.test(c.secretKey) ? "test" : "";
  return { hasSecret: !!c.secretKey, mode, hasWebhook: !!c.webhookSecret, source: c.source };
}

exports.handler = async (event, context) => {
  const authErr = await requireAuth(event, context);
  if (authErr) return authErr;
  try {
    if (event.httpMethod === "GET") {
      return json(200, view(await getStripeConfig()));
    }
    if (event.httpMethod === "PUT" || event.httpMethod === "POST") {
      const body = parseBody(event);
      await setStripeConfig({ secretKey: body.secretKey, webhookSecret: body.webhookSecret });
      return json(200, view(await getStripeConfig()));
    }
    return json(405, { error: "method_not_allowed" });
  } catch (err) {
    console.error("admin-stripe-config error", err);
    return json(500, { error: err.message || "internal_error" });
  }
};
