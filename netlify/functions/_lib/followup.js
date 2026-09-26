// The follow-up text the owner copies and sends to a customer from their own
// phone after a reservation request comes in with a chamber available. Pure —
// unit-tested in test/followup.test.js. Used by the admin email (real first
// name) and the admin SMS alert (a "[NAME]" placeholder, since admin SMS never
// carries customer details — see RUNBOOK §7f).

const NAME_PLACEHOLDER = "[NAME]";
const TIMES_PLACEHOLDER = "[TIMES]";
const DATE_PLACEHOLDER = "[DELIVERY DATE]";

// "2026-10-03" -> "Sat, Oct 3". Parsed as UTC so the day never shifts with the
// server's time zone. Anything unparseable becomes the placeholder.
function formatDeliveryDate(startDate) {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(startDate || ""));
  if (!m) return DATE_PLACEHOLDER;
  const d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));
  if (Number.isNaN(d.getTime())) return DATE_PLACEHOLDER;
  return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", timeZone: "UTC" });
}

// "4 months" -> 4. Null when the length isn't a plain month count.
function monthsFromLength(rentalLength) {
  const m = /^\s*(\d+)/.exec(String(rentalLength || ""));
  return m ? Number(m[1]) : null;
}

function buildFollowUpText({ firstName, rentalLength, startDate, monthlyRate } = {}) {
  const name = String(firstName || "").trim().split(/\s+/)[0] || NAME_PLACEHOLDER;
  const months = monthsFromLength(rentalLength);
  const article = months === 8 || months === 11 ? "an" : "a";
  const term = months ? `${article} ${months}-month chamber rental` : "a chamber rental";
  const price = months && monthlyRate ? ` at $${monthlyRate}/month` : "";
  return [
    `Hi ${name}, this is Matthew with Purebaric, hyperbaric chamber rentals.`,
    `I received your request for ${term}${price}. I have a chamber ready for delivery ${formatDeliveryDate(startDate)}.`,
    `If you have any questions, I'm happy to jump on a call. If not, I can deliver the chamber anytime between ${TIMES_PLACEHOLDER}.`,
    "Payment is collected after I set up the chamber and you are comfortable operating the equipment. You can pay with Card, Apple Pay, Amazon Pay, etc.",
  ].join("\n\n");
}

module.exports = { NAME_PLACEHOLDER, TIMES_PLACEHOLDER, DATE_PLACEHOLDER, formatDeliveryDate, monthsFromLength, buildFollowUpText };
