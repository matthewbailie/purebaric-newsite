const { getNotifications } = require("./_lib/storage");
const { gatewayAddress } = require("./_lib/notifications");
const { send } = require("./_lib/email");
const { requireAuth, json } = require("./_lib/admin");

// POST /api/admin/notifications-test — sends a test email to each configured
// email recipient and a test text to each SMS recipient, returning per-recipient
// success/failure so the owner can verify notifications end to end. Targets are
// masked in the response.
function maskEmail(e) {
  const [u, d] = String(e).split("@");
  return (u.slice(0, 2) + "***@" + (d || ""));
}
function maskNumber(n) {
  return "•••-•••-" + String(n).slice(-4);
}

exports.handler = async (event, context) => {
  const authErr = requireAuth(event, context);
  if (authErr) return authErr;
  if (event.httpMethod !== "POST") return json(405, { error: "method_not_allowed" });

  try {
    const cfg = await getNotifications();
    const results = [];

    for (const r of cfg.emails) {
      let ok = false, error = null;
      try {
        await send({
          to: r.email,
          subject: "Purebaric test notification",
          text: "This is a test email notification from your Purebaric admin. If you received it, email alerts are working.",
          html: "<p>This is a test email notification from your Purebaric admin. If you received it, email alerts are working.</p>",
        });
        ok = true;
      } catch (e) { error = e.message; }
      results.push({ kind: "email", label: r.label || "", target: maskEmail(r.email), events: r.events, ok, error });
    }

    for (const r of cfg.sms) {
      let ok = false, error = null;
      const addr = gatewayAddress(r.number, r.carrier);
      if (!addr) {
        error = "Could not build a carrier address — check the number and carrier.";
      } else {
        try {
          await send({
            to: addr,
            subject: "Purebaric",
            text: "Purebaric test text. If you got this, SMS alerts are working.",
            html: "<p>Purebaric test text.</p>",
          });
          ok = true;
        } catch (e) { error = e.message; }
      }
      results.push({ kind: "sms", label: r.label || "", target: maskNumber(r.number) + " (" + r.carrier + ")", events: r.events, ok, error });
    }

    return json(200, { results, emailCount: cfg.emails.length, smsCount: cfg.sms.length });
  } catch (err) {
    console.error("admin-notifications-test error", err);
    return json(500, { error: err.message || "internal_error" });
  }
};
