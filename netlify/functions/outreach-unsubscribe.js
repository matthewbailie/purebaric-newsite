// Public unsubscribe for business outreach emails.
//
//   GET  /api/outreach/unsubscribe?p=<prospect id>&t=<token>   -> marks the prospect unsubscribed, shows a short page
//   POST /api/outreach/unsubscribe?p=...&t=...                  -> same, for RFC 8058 one-click (List-Unsubscribe-Post)
//
// The token is random per prospect and never shown in the admin, so a link only works for the business it was
// sent to. A wrong or missing token still gets a friendly page (no information about whether the id exists).
const { store } = require("./_lib/storage");

const STORE = "outreach";

function page(title, body) {
  return {
    statusCode: 200,
    headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" },
    body: `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${title}</title>
<style>body{margin:0;background:#efe7db;font-family:-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#2b2320}
.card{max-width:520px;margin:48px auto;background:#fffdf9;border:1px solid #e6dccd;border-radius:16px;padding:32px 36px}
h1{font-family:Georgia,'Times New Roman',serif;font-size:24px;margin:0 0 12px}p{font-size:16px;line-height:1.6;margin:0 0 10px;color:#5f544d}a{color:#9a4f3a}</style></head>
<body><div class="card"><h1>${title}</h1>${body}<p style="margin-top:18px;font-size:13px">Purebaric &nbsp;|&nbsp; <a href="https://purebaric.com">purebaric.com</a> &nbsp;|&nbsp; <a href="mailto:hello@purebaric.com">hello@purebaric.com</a></p></div></body></html>`,
  };
}

exports.handler = async (event) => {
  if (!["GET", "POST"].includes(event.httpMethod)) return { statusCode: 405, body: "method not allowed" };
  const q = event.queryStringParameters || {};
  const id = String(q.p || "").trim();
  const token = String(q.t || "").trim();
  const generic = page("You're unsubscribed", "<p>If this link came from one of our emails, that address will not hear from us again about chambers for businesses.</p><p>If you did not mean to unsubscribe, just reply to the original email or write to hello@purebaric.com.</p>");
  if (!/^p_[0-9a-f]{20}$/.test(id) || !/^[0-9a-f]{32}$/.test(token)) return generic;
  try {
    const s = store(STORE);
    const p = await s.get(id, { type: "json" });
    if (p && p.unsubToken === token && p.status !== "unsubscribed") {
      const at = new Date().toISOString();
      await s.setJSON(id, { ...p, status: "unsubscribed", updatedAt: at, history: [...(p.history || []), { at, event: "unsubscribed", via: event.httpMethod === "POST" ? "one-click" : "link" }] });
    }
  } catch (e) {
    console.error("outreach-unsubscribe error", e);
  }
  if (event.httpMethod === "POST") return { statusCode: 200, body: "unsubscribed" };
  return generic;
};
