const { send } = require("./_lib/email");

const ADMIN_NOTIFY = "matthewbailie@gmail.com";

function parseBody(event) {
  if (!event.body) return {};
  const contentType = (event.headers["content-type"] || event.headers["Content-Type"] || "").toLowerCase();
  if (contentType.includes("application/json")) {
    try { return JSON.parse(event.body); } catch { return {}; }
  }
  return Object.fromEntries(new URLSearchParams(event.body));
}

function esc(s) {
  return String(s || "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
}

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") return { statusCode: 405, body: "Method Not Allowed" };
  try {
    const body = parseBody(event);

    // Honeypot, silently accept and drop
    if (body["bot-field"]) return { statusCode: 200, body: JSON.stringify({ ok: true, success: true }) };

    const name = (body.name || "").trim();
    const email = (body.email || "").trim();
    const message = (body.message || "").trim();
    if (!name || !email || !message) {
      return {
        statusCode: 400,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ error: "name, email and message are required" }),
      };
    }

    const phone = (body.phone || "").trim();
    const topic = (body.topic || "General").trim();

    const html = `
      <h2>New contact message</h2>
      <p><strong>Name:</strong> ${esc(name)}</p>
      <p><strong>Email:</strong> ${esc(email)}</p>
      <p><strong>Phone:</strong> ${esc(phone) || ", "}</p>
      <p><strong>Topic:</strong> ${esc(topic)}</p>
      <p><strong>Message:</strong></p>
      <p>${esc(message).replace(/\n/g, "<br>")}</p>
    `;

    let emailResult = "sent";
    try {
      await send({ to: ADMIN_NOTIFY, subject: `Contact: ${name} (${topic})`, html });
    } catch (err) {
      console.error("contact email failed", err);
      emailResult = `failed: ${err.message}`;
    }

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ok: true,
        success: true,
        message: "Thanks for reaching out! We'll get back to you shortly.",
        emailResult,
      }),
    };
  } catch (err) {
    console.error("contact-submit error", err);
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: "contact_submit_failed" }),
    };
  }
};
