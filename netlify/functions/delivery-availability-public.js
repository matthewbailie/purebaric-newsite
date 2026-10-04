// GET /api/delivery-availability?style=lying&months=3
//   -> { mode, leadDays, horizonDays, weekdaysOff, deliveryNote, today, styles:[{style,label,available}], dates:[{date,ok}] }
// Public, used by book.html in "book" mode. `dates` is the delivery calendar for that style and rental length.
const { getDeliveryAvailability, inventoryInputs, bookingHolds } = require("./_lib/storage");
const { styleLabel } = require("./_lib/inventory");
const delivery = require("./_lib/delivery");

exports.handler = async (event) => {
  try {
    const q = event.queryStringParameters || {};
    const config = await getDeliveryAvailability();
    const today = delivery.mountainToday();
    const base = { mode: config.mode, leadDays: config.leadDays, horizonDays: delivery.horizonDaysFor(config, today), horizonEnd: delivery.horizonEnd(today), weekdaysOff: config.weekdaysOff, deliveryNote: config.deliveryNote, today };
    if (config.mode !== "book") {
      return { statusCode: 200, headers: { "Content-Type": "application/json", "Cache-Control": "public, max-age=60" }, body: JSON.stringify({ ...base, styles: [], dates: [] }) };
    }
    const [{ chambers, machines, rentals }, holds] = await Promise.all([inventoryInputs(), bookingHolds()]);
    const months = Math.max(1, Math.min(12, parseInt(q.months, 10) || 1));
    const style = delivery.styleOf({ style: q.style });
    const inputs = { config, chambers, machines, rentals, holds, today };
    // Per style: does it exist, and when is the next open delivery day for this rental length?
    //   available = within the normal horizon; later = first open day is past the horizon; none = nothing within ~13 months; soon = no chambers of that style yet
    const styles = ["lying", "sitting"].map(s => {
      const exists = chambers.some(c => c.status === "active" && delivery.styleOf(c) === s);
      const next = exists ? delivery.nextAvailableDate({ ...inputs, style: s, months }) : null;
      const status = !exists ? "soon" : !next ? "none" : (delivery.daysBetween(today, next) <= delivery.horizonDaysFor(config, today) ? "available" : "later");
      return { style: s, label: styleLabel(s), available: exists, nextAvailable: next, status };
    });
    const mine = styles.find(s => s.style === style) || styles[0];
    const horizon = delivery.effectiveHorizon(config, mine.nextAvailable, today);
    const dates = delivery.availableDates({ ...inputs, style, months, horizonDays: horizon });
    return { statusCode: 200, headers: { "Content-Type": "application/json", "Cache-Control": "public, max-age=30" }, body: JSON.stringify({ ...base, style, months, styles, nextAvailable: mine.nextAvailable, status: mine.status, dates }) };
  } catch (err) {
    console.error("delivery-availability error", err);
    return { statusCode: 500, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ error: err.message || "delivery_availability_failed" }) };
  }
};
