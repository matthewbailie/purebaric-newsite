// Name parsing for booking submissions. Newer clients send "first-name" and
// "last-name"; older ones send a single "customer_name", which is split on
// whitespace (first word = first name, the rest = last name).
function parseBookingName(body) {
  const customerName = String(body.customer_name || "").trim();
  const cnParts = customerName ? customerName.split(/\s+/) : [];
  const firstName = String(body["first-name"] || cnParts[0] || "").trim();
  const lastName = String(body["last-name"] || cnParts.slice(1).join(" ") || "").trim();
  return { firstName, lastName };
}

module.exports = { parseBookingName };
