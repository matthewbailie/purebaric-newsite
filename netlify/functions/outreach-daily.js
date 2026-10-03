// Scheduled business-outreach sender (see netlify.toml: every 10 minutes, 16:00 to 17:50 UTC, Monday to
// Thursday; that is the 10 a.m. hour in Utah). Each run sends a small batch until the day's cap is reached,
// checks recent sends for bounces, pauses itself if bounces climb, and emails the owner a daily summary.
// Honours the "auto-send" switch in the admin Outreach settings.
const io = require("./_lib/outreach-io");
const { runBatch } = require("./_lib/outreach-run");
const { send } = require("./_lib/email");
const { OWNER_EMAIL } = require("./_lib/owner");

const notify = ({ subject, text }) => send({ to: OWNER_EMAIL, subject, text, html: `<p>${text}</p>` });

exports.handler = async () => {
  try {
    const r = await runBatch({ ...io, notify }, { trigger: "schedule" });
    console.log("outreach-daily", JSON.stringify(r));
    return { statusCode: 200, body: JSON.stringify(r) };
  } catch (err) {
    console.error("outreach-daily error", err);
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};
