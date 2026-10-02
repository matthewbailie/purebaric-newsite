// Rental type: who the chamber is placed with. "residential" (a home renter, the
// default and what every record before 2026-10-02 is) or "business" (a gym,
// studio, salon or clinic that offers sessions to its own clients). The admin
// sets it on rentals; a request from /book?type=business carries it in.
const RENTAL_TYPES = ["residential", "business"];

function cleanRentalType(value) {
  const v = String(value || "").trim().toLowerCase();
  return RENTAL_TYPES.includes(v) ? v : "residential";
}

function isBusiness(record) {
  return !!record && record.rentalType === "business";
}

// Business name is free text; capped so a form can't stuff the record.
function cleanBusinessName(value) {
  return String(value || "").trim().slice(0, 120);
}

module.exports = { RENTAL_TYPES, cleanRentalType, cleanBusinessName, isBusiness };
