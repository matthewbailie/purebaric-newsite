const {
  createBooking,
  updateBooking,
  createWaitlistEntry,
  countAvailableToday,
  listBookings,
  getServiceArea,
  getNotifications,
  getTwilioConfig,
  getPricing,
  getDeliveryAvailability,
  inventoryInputs,
  bookingHolds,
} = require("./_lib/storage");
const delivery = require("./_lib/delivery");
const { monthsFromLength } = require("./_lib/followup");
const { cleanGclid } = require("./_lib/analytics");
const { cleanRentalType, cleanBusinessName } = require("./_lib/rental-type");
const { zipServed } = require("./_lib/servicearea");
const { smsForEvent, smsNumbersForEvent, emailsForEvent } = require("./_lib/notifications");
const {
  notifyAdminBooking,
  notifyCustomerChamberAvailable,
  notifyCustomerWaitlistAdded,
  notifyCustomerBookingConfirmed,
  notifyCustomerPendingAvailability,
  notifyAdminOutOfArea,
  notifyAdminSms,
} = require("./_lib/email");
const {
  cleanClientId,
  cleanSessionId,
  sendBookingRequestSubmitted,
} = require("./_lib/analytics");

// ───────── Delivery service area (ZIP gating) ─────────
// The rule is admin-managed (settings/serviceArea, edited in the Service Area
// tab) and served at /api/service-area. Defaults mirror the historic gate
// (840xx/841xx/844xx + Provo/Weber additions). See _lib/servicearea.js.

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

    const zip = (body.zip || body.zip_code || "").trim();
    const area = await getServiceArea();
    const outOfArea = zip !== "" && !zipServed(zip, area);
    const notifCfg = await getNotifications();
    const twilio = await getTwilioConfig();

    const analyticsConsent = typeof body.analytics_consent === "undefined"
      ? null
      : bool(body.analytics_consent);
    const rentalType = cleanRentalType(body.rental_type);

    // ─── Book mode: the customer chose a delivery date from the owner's calendar. Re-check it here
    //     (their calendar may be stale) and reserve the window on the booking record. ───
    const deliveryCfg = await getDeliveryAvailability();
    const bookMode = deliveryCfg.mode === "book" && String(body.booking_mode || "") === "book";
    let booked = null;
    if (bookMode) {
      const months = Math.max(1, Math.min(12, parseInt(body.months, 10) || monthsFromLength(body["rental-length"] || "") || 1));
      const style = delivery.styleOf({ style: body.chamber_style });
      const [{ chambers, machines, rentals }, holds] = await Promise.all([inventoryInputs(), bookingHolds()]);
      const today = delivery.mountainToday();
      const next = delivery.nextAvailableDate({ config: deliveryCfg, chambers, machines, rentals, holds, style, months, today });
      const check = delivery.dateAvailable({ config: deliveryCfg, chambers, machines, rentals, holds, style, months, today, horizonDays: delivery.effectiveHorizon(deliveryCfg, next, today), date: (body["start-date"] || body.preferred_date || "").trim() });
      if (!check.ok) {
        return { statusCode: 409, headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ error: "date_unavailable", reason: check.reason, message: `That delivery date is no longer available (${check.reason}). Please pick another date.` }) };
      }
      booked = { bookingMode: "book", chamberStyle: style, months, endDate: check.endDate };
    }

    const booking = await createBooking({
      firstName, lastName, email,
      rentalType,
      businessName: rentalType === "business" ? cleanBusinessName(body.business_name) : "",
      phone: (body.phone || body.customer_phone || "").trim(),
      zip,
      streetAddress: (body["street-address"] || "").trim(),
      city: (body.city || "").trim(),
      state: (body.state || "").trim(),
      startDate: (body["start-date"] || body.preferred_date || "").trim(),
      rentalLength: (body["rental-length"] || body.rental_duration || "").trim(),
      requestedType: (body.chamber_id || body.chamber_type || "").trim(),
      reason: (body.reason || body.notes || "").trim(),
      priorExperience: (body["prior-experience"] || "").trim(),
      medicalScreeningFlags: (body["medical-screening-flags"] || "none").trim(),
      consentMedical: bool(body["consent-medical"]),
      consentTerms: bool(body["consent-terms"]),
      outOfArea,
      gclid: cleanGclid(body.gclid),
      analytics: {
        consentGranted: analyticsConsent,
        clientId: cleanClientId(body.analytics_client_id),
        sessionId: cleanSessionId(body.analytics_session_id),
      },
      ...(booked || { bookingMode: "request" }),
    });

    // ─── Out-of-area: do NOT send the customer a reservation confirmation and do
    //     NOT route to the waitlist. Log it and alert the admin so they can follow up. ───
    if (outOfArea) {
      let adminEmail = null;
      try {
        await notifyAdminOutOfArea(booking, emailsForEvent(notifCfg, "reservation_out"));
        adminEmail = "sent";
      } catch (err) {
        console.error("admin out-of-area notify failed", err);
        adminEmail = `failed: ${err.message}`;
      }
      try { await notifyAdminSms(booking, { outOfArea: true, gateways: smsForEvent(notifCfg, "reservation_out"), numbers: smsNumbersForEvent(notifCfg, "reservation_out"), twilio }); } catch (err) { console.error("admin sms failed", err); }
      return {
        statusCode: 200,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ok: true,
          success: true,
          outOfArea: true,
          id: booking.id,
          booking_number: booking.id.slice(0, 8).toUpperCase(),
          message:
            "Thanks. Your delivery ZIP is outside our current service area, so we haven't scheduled a delivery, but we've logged your request and our team will reach out to see if we can help.",
          emailResults: { admin: adminEmail },
        }),
      };
    }

    // ─── Auto-routing: chamber available → notify customer; else → waitlist + notify ───
    const routing = { autoNotified: null, linkedWaitlistId: null };
    const emailResults = { customer: null, admin: null };

    try {
      if (booked) {
        // Book mode: the date is reserved; no waitlist routing. Confirm to the customer.
        routing.autoNotified = "booked";
        await updateBooking(booking.id, { autoNotified: "booked" });
        try {
          await notifyCustomerBookingConfirmed(booking, { deliveryNote: deliveryCfg.deliveryNote });
          emailResults.customer = "sent";
        } catch (err) {
          console.error("customer 'booked' notify failed", err);
          emailResults.customer = `failed: ${err.message}`;
        }
        throw Object.assign(new Error("booked"), { booked: true });
      }
      const { available } = await countAvailableToday();
      // Untriaged demand = bookings still "new" (includes the one just created).
      // A chamber is only genuinely free for this request if available capacity
      // exceeds the pending requests ahead of it.
      const pending = (await listBookings({ status: "new" })).length;

      if (pending <= available) {
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
      } else if (available > 0) {
        // Chambers exist physically but are already spoken for by earlier
        // untriaged requests. Don't promise availability or waitlist; just
        // tell the customer we'll follow up, and flag it for triage.
        routing.autoNotified = "pending";
        await updateBooking(booking.id, { autoNotified: "pending" });
        try {
          await notifyCustomerPendingAvailability(booking);
          emailResults.customer = "sent";
        } catch (err) {
          console.error("customer 'pending' notify failed", err);
          emailResults.customer = `failed: ${err.message}`;
        }
      } else {
        // No chambers available at all → waitlist
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
      if (!err.booked) console.error("auto-routing failed", err);
    }

    // When a chamber is available the admin alerts carry a copy-and-paste
    // follow-up text, which quotes the monthly rate for the requested length.
    let followUp = null;
    if (routing.autoNotified === "available") {
      try {
        const months = monthsFromLength(booking.rentalLength);
        const pricing = months ? await getPricing() : null;
        routing.monthlyRate = (pricing && pricing[months]) || null;
      } catch (err) {
        console.error("pricing lookup for follow-up failed", err);
      }
      followUp = { monthlyRate: routing.monthlyRate };
    }

    // Admin notification, runs regardless of routing outcome
    try {
      await notifyAdminBooking(booking, routing, emailsForEvent(notifCfg, "reservation_in"));
      emailResults.admin = "sent";
    } catch (err) {
      console.error("admin notify failed", err);
      emailResults.admin = `failed: ${err.message}`;
    }
    try { await notifyAdminSms(booking, { gateways: smsForEvent(notifCfg, "reservation_in"), numbers: smsNumbersForEvent(notifCfg, "reservation_in"), twilio, followUp }); } catch (err) { console.error("admin sms failed", err); }

    // Send the accepted reservation event from the backend so a successful API
    // response and the analytics event cannot drift apart or double-count.
    try {
      const analyticsResult = await sendBookingRequestSubmitted({ booking });
      if (analyticsResult.sent) {
        await updateBooking(booking.id, {
          analytics: {
            ...booking.analytics,
            bookingRequestSubmittedAt: new Date().toISOString(),
            bookingRequestSubmittedEvent: "booking_request_submit",
          },
        });
      }
    } catch (err) {
      console.error("booking request analytics failed", err.message);
    }

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ok: true,
        success: true,
        id: booking.id,
        booking_number: booking.id.slice(0, 8).toUpperCase(),
        message: booked
          ? `Your chamber is booked for delivery on ${booking.startDate}. We emailed your confirmation and will text or call to set the delivery time.`
          : "Your reservation request has been received. Our team will contact you shortly to confirm delivery.",
        booked: !!booked,
        startDate: booking.startDate,
        endDate: booking.endDate || null,
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
