const { createWaitlistEntry } = require("./_lib/storage");
const { notifyAdminWaitlistJoin } = require("./_lib/email");

function parseBody(event) {
  if (!event.body) return {};
  const contentType = (event.headers["content-type"] || event.headers["Content-Type"] || "").toLowerCase();
  if (contentType.includes("application/json")) {
    try { return JSON.parse(event.body); } catch { return {}; }
  }
  const params = new URLSearchParams(event.body);
  return Object.fromEntries(params);
}

// Area waitlist for the homepage ZIP checker: the visitor has given no contact
// details yet, so name + phone + ZIP are the whole form. Email is optional
// (the waitlist entry accepts an empty email; the admin notification subject
// stays "Waitlist: <name>", which the submissions watch already monitors).
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

    const combinedName = [body.first_name, body.last_name].filter(Boolean).join(" ").trim();
    const name = (body.name || combinedName || "").trim();
    const phone = (body.phone || "").trim();
    const zip = (body.zip || "").trim();
    if (!name || !phone || !zip) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "name, phone and zip are required" }),
      };
    }

    const entry = await createWaitlistEntry({
      name,
      email: (body.email || "").trim(),
      phone,
      zip,
      reason: "Area waitlist via homepage ZIP checker",
    });

    let adminEmailResult = null;
    try {
      await notifyAdminWaitlistJoin(entry);
      adminEmailResult = "sent";
    } catch (err) {
      console.error("admin notify failed", err);
      adminEmailResult = `failed: ${err.message}`;
    }

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ok: true, success: true, id: entry.id, message: "You're on the list. We'll reach out if we're able to deliver to your area.", adminEmail: adminEmailResult }),
    };
  } catch (err) {
    console.error("area-waitlist error", err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "area_waitlist_failed" }),
    };
  }
};
