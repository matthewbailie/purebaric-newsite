const { getNotifications, setNotifications } = require("./_lib/storage");
const { CARRIER_GATEWAYS, EVENTS } = require("./_lib/notifications");
const { requireAuth, parseBody, json } = require("./_lib/admin");

// GET  /api/admin/notifications -> { recipients, carriers, events }
// PUT  /api/admin/notifications  body { recipients:[{label,number,carrier,events}] } -> saved
exports.handler = async (event, context) => {
  const authErr = requireAuth(event, context);
  if (authErr) return authErr;

  const method = event.httpMethod;
  try {
    if (method === "GET") {
      const cfg = await getNotifications();
      return json(200, { ...cfg, carriers: Object.keys(CARRIER_GATEWAYS), events: EVENTS });
    }
    if (method === "PUT" || method === "POST") {
      const body = parseBody(event);
      const saved = await setNotifications({ emails: body.emails, sms: body.sms || body.recipients });
      return json(200, saved);
    }
    return json(405, { error: "method_not_allowed" });
  } catch (err) {
    console.error("admin-notifications error", err);
    return json(500, { error: err.message || "internal_error", stack: err.stack });
  }
};
