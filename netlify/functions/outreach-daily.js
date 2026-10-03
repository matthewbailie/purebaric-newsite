// No-op even if a stale scheduler or a manual invocation reaches this function.
// Resend must never deliver unsolicited prospect emails.
exports.handler = async () => ({
  statusCode: 200,
  body: JSON.stringify({ disabled: true, sent: 0, reason: "Cold outreach through Resend is disabled." }),
});
