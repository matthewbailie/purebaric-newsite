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
    const base = { mode: config.mode, leadDays: config.leadDays, horizonDays: config.horizonDays, weekdaysOff: config.weekdaysOff, deliveryNote: config.deliveryNote, today };
    if (config.mode !== "book") {
      return { statusCode: 200, headers: { "Content-Type": "application/json", "Cache-Control": "public, max-age=60" }, body: JSON.stringify({ ...base, styles: [], dates: [] }) };
    }
    const [{ chambers, machines, rentals }, holds] = await Promise.all([inventoryInputs(), bookingHolds()]);
    const months = Math.max(1, Math.min(12, parseInt(q.months, 10) || 1));
    const style = delivery.styleOf({ style: q.style });
    const styles = ["lying", "sitting"].map(s => ({ style: s, label: styleLabel(s), available: chambers.some(c => c.status === "active" && delivery.styleOf(c) === s) }));
    const dates = delivery.availableDates({ config, chambers, machines, rentals, holds, style, months, today });
    return { statusCode: 200, headers: { "Content-Type": "application/json", "Cache-Control": "public, max-age=30" }, body: JSON.stringify({ ...base, style, months, styles, dates }) };
  } catch (err) {
    console.error("delivery-availability error", err);
    return { statusCode: 500, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ error: err.message || "delivery_availability_failed" }) };
  }
};
