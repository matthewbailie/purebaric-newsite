// Who a rental belongs to, for grouping rentals into customers. Owner's rule (13 Oct 2026): the
// customer's NAME is the identity; two customers with the same name are told apart by phone number
// (see _lib/customers.js, which applies that tie-break when it groups records). A record with no name
// falls back to its email, then its phone, so older records still land somewhere.
// dashboard-metrics.js and admin-utils.js mirror this; test/customer-key.test.js keeps them equal.
const normEmail = (v) => String(v || "").trim().toLowerCase();
const nameKey = (v) => String(v || "").trim().toLowerCase().replace(/\s+/g, " ");
const phoneDigits = (v) => String(v || "").replace(/\D/g, "").replace(/^1(?=\d{10}$)/, "");

function renterKey(renter) {
  const r = renter || {};
  const name = nameKey(r.name);
  if (name) return `name:${name}`;
  const email = normEmail(r.email);
  if (email) return email;
  const digits = phoneDigits(r.phone);
  return digits ? `phone:${digits}` : "";
}

module.exports = { renterKey, nameKey, phoneDigits, normEmail };
