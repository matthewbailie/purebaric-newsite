const MEASUREMENT_ID = process.env.GA4_MEASUREMENT_ID || "G-Q1X04YRWP1";

function cleanClientId(value) {
  const clientId = String(value || "").trim();
  return /^\d{1,20}\.\d{1,20}$/.test(clientId) ? clientId : null;
}

function cleanSessionId(value) {
  const sessionId = String(value || "").trim();
  return /^\d{1,20}$/.test(sessionId) ? sessionId : null;
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

async function sendBookingRequestSubmitted({ booking }) {
  const rentalMonthsMatch = String(booking.rentalLength || "").match(/\d+/);
  return sendEvent({
    booking,
    name: "booking_request_submit",
    params: {
      form_name: "reservation_request",
      rental_months: rentalMonthsMatch ? Number(rentalMonthsMatch[0]) : 1,
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
  sendBookingRequestSubmitted,
  sendRentalConfirmed,
};
