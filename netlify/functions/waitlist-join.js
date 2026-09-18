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

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }
  try {
    const body = parseBody(event);

    // Honeypot — silently accept and drop
    if (body["bot-field"]) {
      return { statusCode: 200, body: JSON.stringify({ ok: true }) };
    }

    // Accept both the Netlify field names and the newer frontend's names.
    const combinedName = [body.first_name, body.last_name].filter(Boolean).join(" ").trim();
    const name = (body.name || combinedName || "").trim();
    const email = (body.email || "").trim();
    if (!name || !email) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "name and email are required" }),
      };
    }

    // The newer form sends "city_zip" (e.g. "Provo, 84601"); pull the 5-digit zip.
    let zip = (body.zip || "").trim();
    if (!zip && body.city_zip) {
      const m = String(body.city_zip).match(/\d{5}/);
      if (m) zip = m[0];
    }
    // Fold the newer form's extra fields into the reason/notes text.
    const reason = [
      body.reason, body.message, body.notes,
      body.rental_length ? `Length: ${body.rental_length}` : "",
      body.urgency ? `Urgency: ${body.urgency}` : "",
    ].filter(Boolean).map((s) => String(s).trim()).join(" | ");

    const entry = await createWaitlistEntry({
      name,
      email,
      phone: (body.phone || "").trim(),
      zip,
      reason,
      preferredStartDate: (body["preferred-start"] || body.preferredStartDate || body.earliest_start || "").trim(),
    });

    // Await the admin notification — Lambda freezes pending I/O on return, so
    // fire-and-forget .catch() patterns lose the in-flight request before Resend
    // receives it. Errors are caught so they don't fail the user's submission.
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
      body: JSON.stringify({ ok: true, success: true, id: entry.id, message: "You've been added to the priority waitlist. We'll reach out the moment a chamber opens up.", adminEmail: adminEmailResult }),
    };
  } catch (err) {
    console.error("waitlist-join error", err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "waitlist_join_failed" }),
    };
  }
};
