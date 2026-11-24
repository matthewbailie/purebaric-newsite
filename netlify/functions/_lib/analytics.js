const MEASUREMENT_ID = process.env.GA4_MEASUREMENT_ID || "G-Q1X04YRWP1";

function cleanClientId(value) {
  const clientId = String(value || "").trim();
  return /^\d{1,20}\.\d{1,20}$/.test(clientId) ? clientId : null;
}

// A gclid is an opaque Google-assigned token, alphanumeric plus a few separator
// characters; this only guards against someone pasting something else into the field.
function cleanGclid(value) {
  const gclid = String(value || "").trim().slice(0, 100);
  return /^[A-Za-z0-9_.-]+$/.test(gclid) ? gclid : "";
}

function cleanSessionId(value) {
  const sessionId = String(value || "").trim();
  return /^\d{1,20}$/.test(sessionId) ? sessionId : null;
}

// Funnel params from metrics.md section 2. device: the browser's own value
// (mobile/desktop) when it sent one, else a User-Agent class; variant: the
// homepage personalization arm. Allowlisted values only, never PII.
function cleanDevice(value, userAgent) {
  const v = String(value || "").trim();
  if (v === "mobile" || v === "desktop") return v;
  const ua = String(userAgent || "");
  if (!ua) return "unknown";
  return /Mobi|Android|iPhone|iPod/i.test(ua) ? "mobile" : "desktop";
}
function cleanVariant(value) {
  const v = String(value || "").trim();
  return v === "personalized" || v === "control" ? v : "none";
}
function funnelParams(booking) {
  const a = booking?.analytics || {};
  return { device: a.device || "unknown", variant: a.variant || "none" };
}

function rentalMonths(startDate, endDate) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(startDate || "") || !/^\d{4}-\d{2}-\d{2}$/.test(endDate || "")) {
    return 1;
  }
  const [startYear, startMonth] = startDate.split("-").map(Number);
  const [endYear, endMonth] = endDate.split("-").map(Number);
  return Math.max(1, (endYear - startYear) * 12 + endMonth - startMonth);
}

async function sendEvent({ booking, name, params }) {
  const apiSecret = process.env.GA4_API_SECRET;
  const clientId = cleanClientId(booking?.analytics?.clientId);
  const sessionId = cleanSessionId(booking?.analytics?.sessionId);

  // Internal / TEST records (pb_internal, TEST names, the owner's own email)
  // are never sent to GA4, so they cannot count as real leads or rentals.
  if (booking?.internal) return { sent: false, reason: "internal" };
  if (booking?.analytics?.consentGranted === false) {
    return { sent: false, reason: "analytics_opt_out" };
  }
  if (!clientId) return { sent: false, reason: "missing_client_id" };
  if (!apiSecret) return { sent: false, reason: "not_configured" };

  const eventParams = {
    engagement_time_msec: 1,
    ...params,
  };
  if (sessionId) eventParams.session_id = sessionId;

  const endpoint = new URL("https://www.google-analytics.com/mp/collect");
  endpoint.searchParams.set("measurement_id", MEASUREMENT_ID);
  endpoint.searchParams.set("api_secret", apiSecret);

  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: clientId,
      events: [{ name, params: eventParams }],
    }),
  });
  if (!response.ok) throw new Error(`GA4 Measurement Protocol returned ${response.status}`);
  return { sent: true, event: name };
}

async function sendBookingLeadSubmitted({ booking }) {
  const rentalMonthsMatch = String(booking.rentalLength || "").match(/\d+/);
  const rentalType = booking.rentalType === "business" ? "business" : "residential";
  return sendEvent({
    booking,
    name: "booking_lead_submit",
    params: {
      ...funnelParams(booking),
      form_name: "lead_capture",
      rental_months: rentalMonthsMatch ? Number(rentalMonthsMatch[0]) : 1,
      rental_type: rentalType,
      // page_location lets the funnel report split this server-side event into the
      // home vs business funnels by URL, the same way the browser events split.
      page_location: "https://purebaric.com/book" + (rentalType === "business" ? "?type=business" : ""),
      booking_id: booking.id,
      source: "booking_api",
    },
  });
}

async function sendBookingRequestSubmitted({ booking }) {
  const rentalMonthsMatch = String(booking.rentalLength || "").match(/\d+/);
  const rentalType = booking.rentalType === "business" ? "business" : "residential";
  return sendEvent({
    booking,
    name: "booking_request_submit",
    params: {
      ...funnelParams(booking),
      form_name: "reservation_request",
      rental_months: rentalMonthsMatch ? Number(rentalMonthsMatch[0]) : 1,
      rental_type: rentalType,
      // page_location lets the funnel report split this server-side event into the
      // home vs business funnels by URL, the same way the browser events split.
      page_location: "https://purebaric.com/book" + (rentalType === "business" ? "?type=business" : ""),
      booking_id: booking.id,
      source: "booking_api",
    },
  });
}

async function sendRentalConfirmed({ booking, rental }) {
  const months = rentalMonths(rental.startDate, rental.endDate);
  const monthlyRate = Number(rental.monthlyRate) || 0;
  return sendEvent({
    booking,
    name: "close_convert_lead",
    params: {
      currency: "USD",
      value: monthlyRate * months,
      rental_months: months,
      transaction_id: rental.id,
      booking_id: booking.id,
      source: "admin_confirmed",
    },
  });
}

module.exports = {
  cleanClientId,
  cleanSessionId,
  cleanGclid,
  cleanDevice,
  cleanVariant,
  sendBookingLeadSubmitted,
  sendBookingRequestSubmitted,
  sendRentalConfirmed,
};
