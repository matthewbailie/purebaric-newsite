// Black Friday 2026: $200 off the first month of any rental, home or business, and the one-time
// $200 business training and supplies fee is waived. Applies automatically to bookings made through
// Friday, Nov 27, 2026 (end of day, Mountain time: MST is UTC-7, so 2026-11-28T07:00:00Z).
// The pages carry the same cut-off in the banner snippet (Date.UTC(2026,10,28,7)); keep the two in step.
const BLACK_FRIDAY_2026 = {
  id: "black-friday-2026",
  label: "Black Friday 2026",
  amountOff: 200,
  waiveBusinessFee: true,
  endsAt: "2026-11-28T07:00:00Z",
  endsLabel: "Friday, Nov 27, 2026",
};

function activePromo(now = new Date()) {
  return new Date(now).getTime() < Date.parse(BLACK_FRIDAY_2026.endsAt) ? BLACK_FRIDAY_2026 : null;
}

// One line for the booking notes, the admin email and the rental made from the booking.
function promoNote(promo, rentalType) {
  if (!promo) return "";
  const biz = rentalType === "business" && promo.waiveBusinessFee;
  return `${promo.label}: $${promo.amountOff} off the first month${biz ? "; one-time $200 training and supplies fee waived" : ""}.`;
}

// Adds the promo line to the customer's notes unless the page already wrote it.
function withPromoNote(reason, promo, rentalType) {
  const text = String(reason || "").trim();
  if (!promo || /black friday/i.test(text)) return text;
  return (text ? text + "\n" : "") + promoNote(promo, rentalType);
}

module.exports = { BLACK_FRIDAY_2026, activePromo, promoNote, withPromoNote };
