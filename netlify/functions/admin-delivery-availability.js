// GET /api/admin/delivery-availability -> { config, preview:{lying:[dates], sitting:[dates]} }
// PUT /api/admin/delivery-availability  body { mode, weekdaysOff, blockedDates, leadDays, horizonDays, deliveryNote } -> saved config
const { getDeliveryAvailability, setDeliveryAvailability, inventoryInputs, bookingHolds } = require("./_lib/storage");
const { requireAuth, parseBody, json } = require("./_lib/admin");
const delivery = require("./_lib/delivery");

async function preview(config) {
  const [{ chambers, machines, rentals }, holds] = await Promise.all([inventoryInputs(), bookingHolds()]);
  const today = delivery.mountainToday();
  const out = {};
  for (const style of ["lying", "sitting"]) {
    if (!chambers.some(c => c.status === "active" && delivery.styleOf(c) === style)) continue;
    out[style] = delivery.availableDates({ config, chambers, machines, rentals, holds, style, months: 1, today }).filter(x => x.ok).slice(0, 8).map(x => x.date);
  }
  return out;
}

exports.handler = async (event, context) => {
  const authErr = await requireAuth(event, context);
  if (authErr) return authErr;
  try {
    if (event.httpMethod === "GET") {
      const config = await getDeliveryAvailability();
      return json(200, { config, preview: await preview(config), today: delivery.mountainToday() });
    }
    if (event.httpMethod === "PUT" || event.httpMethod === "POST") {
      const config = await setDeliveryAvailability({ ...(await getDeliveryAvailability()), ...parseBody(event) });
      return json(200, { config, preview: await preview(config), today: delivery.mountainToday() });
    }
    return json(405, { error: "method_not_allowed" });
  } catch (err) {
    console.error("admin-delivery-availability error", err);
    return json(500, { error: err.message || "internal_error" });
  }
};
