const { getServiceArea, setServiceArea } = require("./_lib/storage");
const { requireAuth, parseBody, json } = require("./_lib/admin");

// GET  /api/admin/service-area -> { prefixes, zips }
// PUT  /api/admin/service-area  body { prefixes:[...], zips:[...] } -> saved
exports.handler = async (event, context) => {
  const authErr = await requireAuth(event, context);
  if (authErr) return authErr;

  const method = event.httpMethod;
  try {
    if (method === "GET") {
      return json(200, await getServiceArea());
    }
    if (method === "PUT" || method === "POST") {
      const body = parseBody(event);
      const saved = await setServiceArea({ prefixes: body.prefixes, zips: body.zips });
      return json(200, saved);
    }
    return json(405, { error: "method_not_allowed" });
  } catch (err) {
    console.error("admin-service-area error", err);
    return json(500, { error: err.message || "internal_error", stack: err.stack });
  }
};
