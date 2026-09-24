const { getRental, updateRental } = require("./_lib/storage");
const { stripeClient } = require("./_lib/stripe");
const { requireAuth, parseBody, json } = require("./_lib/admin");

// POST /api/admin/stripe-link  body { rentalId, amount? (dollars) }
// Creates a Stripe Payment Link for the rental, tagged with rental_id so the
// webhook can auto-reconcile payment. Returns { url }.
exports.handler = async (event, context) => {
  const authErr = requireAuth(event, context);
  if (authErr) return authErr;
  if (event.httpMethod !== "POST") return json(405, { error: "method_not_allowed" });

  const stripe = stripeClient();
  if (!stripe) {
    return json(503, { error: "stripe_not_configured", message: "Set STRIPE_SECRET_KEY in Netlify to enable Stripe payments." });
  }

  try {
    const body = parseBody(event);
    const rentalId = body.rentalId || body.id;
    if (!rentalId) return json(400, { error: "rentalId required" });
    const rental = await getRental(rentalId);
    if (!rental) return json(404, { error: "rental_not_found" });

    let dollars = Number(body.amount);
    if (!Number.isFinite(dollars) || dollars <= 0) dollars = Number(rental.monthlyRate) || 0;
    const amount = Math.round(dollars * 100);
    if (amount < 50) {
      return json(400, { error: "amount_too_small", message: "Enter a rental amount of at least $0.50." });
    }

    const renterName = (rental.renter && rental.renter.name) || "Purebaric rental";
    const desc = `Purebaric rental — ${renterName}` + (rental.startDate ? ` (${rental.startDate} to ${rental.endDate})` : "");

    const price = await stripe.prices.create({
      currency: "usd",
      unit_amount: amount,
      product_data: { name: desc },
    });
    const link = await stripe.paymentLinks.create({
      line_items: [{ price: price.id, quantity: 1 }],
      metadata: { rental_id: rentalId },
      payment_intent_data: { metadata: { rental_id: rentalId } },
    });

    const updated = await updateRental(rentalId, {
      stripePaymentLinkId: link.id,
      stripePaymentUrl: link.url,
      stripeAmount: dollars,
    });
    return json(200, { url: link.url, id: link.id, amount: dollars, rental: updated });
  } catch (err) {
    console.error("admin-stripe-link error", err);
    return json(500, { error: err.message || "internal_error" });
  }
};
