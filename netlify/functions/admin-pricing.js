const { getPricing, setPricing } = require("./_lib/storage");
const { requireAuth, parseBody, json } = require("./_lib/admin");

exports.handler = async (event, context) => {
  const authErr = await requireAuth(event, context);
  if (authErr) return authErr;

  const method = event.httpMethod;
  try {
    if (method === "GET") {
      const months = await getPricing();
      return json(200, { months });
    }

    if (method === "PUT" || method === "POST") {
      const body = parseBody(event);
      // Accept { months: {1:..,..12:..} } or a flat { "1":.., "12":.. }.
      const months = body.months || body;
      const saved = await setPricing(months);
      return json(200, { months: saved });
    }

    return json(405, { error: "method_not_allowed" });
  } catch (err) {
    console.error("admin-pricing error", err);
    return json(500, { error: err.message || "internal_error", stack: err.stack });
  }
};
