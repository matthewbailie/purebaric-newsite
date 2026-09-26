// Who a rental belongs to, for grouping rentals into customers. Email is the identity when there is
// one; older customers (e.g. recorded from a Venmo history) may have none, so fall back to their
// phone number, then their name, so they still appear in the Customers tab as one person.
// dashboard-metrics.js mirrors this for its subscriber counts; test/customer-key.test.js keeps them equal.
const normEmail = (v) => String(v || "").trim().toLowerCase();

function renterKey(renter) {
  const r = renter || {};
  const email = normEmail(r.email);
  if (email) return email;
  const digits = String(r.phone || "").replace(/\D/g, "").replace(/^1(?=\d{10}$)/, "");
  if (digits) return `phone:${digits}`;
  const name = String(r.name || "").trim().toLowerCase().replace(/\s+/g, " ");
  return name ? `name:${name}` : "";
}

module.exports = { renterKey };
