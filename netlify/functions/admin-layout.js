const { getAdminLayout, setAdminLayout } = require("./_lib/storage");
const { requireAuth, parseBody, json } = require("./_lib/admin");

// GET /api/admin/layout -> { orders } ; PUT /api/admin/layout { orders } -> { orders }
// The order of the draggable cards on each admin section, saved so it follows the
// admin between phone and computer.
exports.handler = async (event, context) => {
  const authErr = await requireAuth(event, context);
  if (authErr) return authErr;
  try {
    if (event.httpMethod === "GET") return json(200, { orders: await getAdminLayout() });
    if (event.httpMethod === "PUT" || event.httpMethod === "POST") {
      const body = parseBody(event);
      return json(200, { orders: await setAdminLayout(body.orders) });
    }
    return json(405, { error: "method_not_allowed" });
  } catch (err) {
    console.error("admin-layout error", err);
    return json(500, { error: err.message || "internal_error" });
  }
};
