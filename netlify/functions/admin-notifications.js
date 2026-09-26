const { getNotifications, setNotifications } = require("./_lib/storage");
const { CARRIER_GATEWAYS, EVENTS, CONSENT_VERSION, stampSmsConsent } = require("./_lib/notifications");
const { requireAuth, adminEmail, parseBody, json } = require("./_lib/admin");

// GET  /api/admin/notifications -> { emails, sms, carriers, events, consentVersion }
// PUT  /api/admin/notifications  body { emails, sms:[{label,number,carrier,events,consentChecked}] } -> saved
//
// SMS consent (A2P 10DLC / TCPA): the client only ever sends `consentChecked`
// (is the box checked right now?) per SMS row. stampSmsConsent is the single
// place that turns that into a real consent record — it never trusts a
// client-supplied consent object, and it stamps the authenticated admin's
// email + a server timestamp. See /sms-consent for the public evidence page.
exports.handler = async (event, context) => {
  const authErr = await requireAuth(event, context);
  if (authErr) return authErr;

  const method = event.httpMethod;
  try {
    if (method === "GET") {
      const cfg = await getNotifications();
      return json(200, { ...cfg, carriers: Object.keys(CARRIER_GATEWAYS), events: EVENTS, consentVersion: CONSENT_VERSION });
    }
    if (method === "PUT" || method === "POST") {
      const body = parseBody(event);
      const existing = await getNotifications();
      const who = (await adminEmail(event, context)) || "unknown-admin";
      const sms = stampSmsConsent(body.sms || body.recipients, existing.sms, who);
      const saved = await setNotifications({ emails: body.emails, sms });
      return json(200, { ...saved, consentVersion: CONSENT_VERSION });
    }
    return json(405, { error: "method_not_allowed" });
  } catch (err) {
    console.error("admin-notifications error", err);
    return json(500, { error: err.message || "internal_error", stack: err.stack });
  }
};
