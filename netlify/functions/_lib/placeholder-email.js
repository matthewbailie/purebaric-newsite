// Placeholder addresses (e.g. no-email+<customer-id>@placeholder.invalid) mark a
// customer who has no real email. ".invalid" is reserved (RFC 2606) and can never
// deliver; every email send path skips these addresses (see email.js send()).
function isPlaceholderEmail(e) {
  const s = String(e || "").trim().toLowerCase();
  const at = s.lastIndexOf("@");
  if (at < 0) return false;
  const domain = s.slice(at + 1);
  return domain === "invalid" || domain.endsWith(".invalid");
}
module.exports = { isPlaceholderEmail };
