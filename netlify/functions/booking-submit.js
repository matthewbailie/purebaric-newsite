const {
  createBooking,
  updateBooking,
  createWaitlistEntry,
  countAvailableToday,
} = require("./_lib/storage");
const {
  notifyAdminBooking,
  notifyCustomerChamberAvailable,
  notifyCustomerWaitlistAdded,
} = require("./_lib/email");

function parseBody(event) {
  if (!event.body) return {};
  const contentType = (event.headers["content-type"] || event.headers["Content-Type"] || "").toLowerCase();
  if (contentType.includes("application/json")) {
    try { return JSON.parse(event.body); } catch { return {}; }
  }
  const params = new URLSearchParams(event.body);
  return Object.fromEntries(params);
}

function bool(v) {
  return v === true || v === "true" || v === "on" || v === "yes" || v === "1";
}

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") return { statusCode: 405, body: "Method Not Allowed" };
  try {
    const body = parseBody(event);

    // Honeypot, silently accept and drop
    if (body["bot-field"]) {
      return { statusCode: 200, body: JSON.stringify({ ok: true }) };
    }

    // Accept both the Netlify field names and the newer frontend's names
    // (customer_name is a single field; split into first/last).
    const customerName = (body.customer_name || "").trim();
    const cnParts = customerName ? customerName.split(/\s+/) : [];
    const firstName = (body["first-name"] || cnParts[0] || "").trim();
    const lastName = (body["last-name"] || cnParts.slice(1).join(" ") || "").trim();
    const email = (body.email || body.customer_email || "").trim();
    if (!firstName || !email) {
      return {
        statusCode: 400,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ error: "first name and email are required" }),
      };
    }

    const booking = await createBooking({
      firstName, lastName, email,
      phone: (body.phone || body.customer_phone || "").trim(),
      zip: (body.zip || body.zip_code || "").trim(),
      streetAddress: (body["street-address"] || "").trim(),
      city: (body.city || "").trim(),
      state: (body.state || "").trim(),
      startDate: (body["start-date"] || body.preferred_date || "").trim(),
      rentalLength: (body["rental-length"] || body.rental_duration || "").trim(),
      reason: (body.reason || body.notes || "").trim(),
      priorExperience: (body["prior-experience"] || "").trim(),
      medicalScreeningFlags: (body["medical-screening-flags"] || "none").trim(),
      consentMedical: bool(body["consent-medical"]),
      consentTerms: bool(body["consent-terms"]),
    });

    // ─── Auto-routing: chamber available → notify customer; else → waitlist + notify ───
    const routing = { autoNotified: null, linkedWaitlistId: null };
    const emailResults = { customer: null, admin: null };

    try {
      const { available } = await countAvailableToday();
      if (available > 0) {
        routing.autoNotified = "available";
        await updateBooking(booking.id, { autoNotified: "available" });
        // Await the email, Lambda freezes pending I/O on return, so fire-and-forget
        // .catch() patterns lose the in-flight request before Resend receives it.
        try {
          await notifyCustomerChamberAvailable(booking);
          emailResults.customer = "sent";
        } catch (err) {
          console.error("customer 'available' notify failed", err);
          emailResults.customer = `failed: ${err.message}`;
        }
      } else {
        // Add to waitlist
        const waitlistEntry = await createWaitlistEntry({
          name: `${booking.firstName} ${booking.lastName || ""}`.trim(),
          email: booking.email,
          phone: booking.phone || "",
          zip: booking.zip || "",
          reason: booking.reason || "",
          preferredStartDate: booking.startDate || "",
          adminNotes: `Auto-added from booking ${booking.id}. Rental length: ${booking.rentalLength || ", "}.`,
        });
        routing.autoNotified = "waitlist";
        routing.linkedWaitlistId = waitlistEntry.id;
        await updateBooking(booking.id, {
          autoNotified: "waitlist",
          linkedWaitlistId: waitlistEntry.id,
        });
        try {
          await notifyCustomerWaitlistAdded(booking);
          emailResults.customer = "sent";
        } catch (err) {
          console.error("customer 'waitlist' notify failed", err);
          emailResults.customer = `failed: ${err.message}`;
        }
      }
    } catch (err) {
      // Don't fail the booking submission if routing fails, admin will still get notified
      console.error("auto-routing failed", err);
    }

    // Admin notification, runs regardless of routing outcome
    try {
      await notifyAdminBooking(booking, routing);
      emailResults.admin = "sent";
    } catch (err) {
      console.error("admin notify failed", err);
      emailResults.admin = `failed: ${err.message}`;
    }

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ok: true,
        success: true,
        id: booking.id,
        booking_number: booking.id.slice(0, 8).toUpperCase(),
        message: "Your reservation request has been received. Our team will contact you shortly to confirm delivery.",
        autoNotified: routing.autoNotified,
        emailResults,
      }),
    };
  } catch (err) {
    console.error("booking-submit error", err);
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: "booking_submit_failed" }),
    };
  }
};
