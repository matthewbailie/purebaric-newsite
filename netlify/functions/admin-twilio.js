const { getTwilioConfig, setTwilioConfig } = require("./_lib/storage");
const { requireAuth, parseBody, json } = require("./_lib/admin");

// GET  /api/admin/twilio -> { accountSid, fromNumber, hasToken, source } (never the token)
// PUT  /api/admin/twilio  body { accountSid, authToken, fromNumber } -> same (masked)
function view(c) {
  return { accountSid: c.accountSid || "", fromNumber: c.fromNumber || "", hasToken: !!c.authToken, source: c.source };
}

exports.handler = async (event, context) => {
  const authErr = requireAuth(event, context);
  if (authErr) return authErr;
  try {
    if (event.httpMethod === "GET") {
      return json(200, view(await getTwilioConfig()));
    }
    if (event.httpMethod === "PUT" || event.httpMethod === "POST") {
      const body = parseBody(event);
      await setTwilioConfig({ accountSid: body.accountSid, authToken: body.authToken, fromNumber: body.fromNumber });
      return json(200, view(await getTwilioConfig()));
    }
    return json(405, { error: "method_not_allowed" });
  } catch (err) {
    console.error("admin-twilio error", err);
    return json(500, { error: err.message || "internal_error" });
  }
};
