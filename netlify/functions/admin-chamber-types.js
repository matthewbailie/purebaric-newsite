const { getChamberTypes, setChamberTypes, getMachineTypes, availabilityByType } = require("./_lib/storage");
const { requireAuth, parseBody, json } = require("./_lib/admin");

// GET  /api/admin/chamber-types -> { types, machineTypes, byType }
//   (machineTypes for the "requires" dropdown; byType = live availability)
// PUT  /api/admin/chamber-types  body { types: [{ id, label, machineTypeId }] } -> saved
exports.handler = async (event, context) => {
  const authErr = requireAuth(event, context);
  if (authErr) return authErr;

  const method = event.httpMethod;
  try {
    if (method === "GET") {
      const [types, machineTypes, byType] = await Promise.all([
        getChamberTypes(),
        getMachineTypes(),
        availabilityByType(),
      ]);
      return json(200, { types, machineTypes, byType });
    }
    if (method === "PUT" || method === "POST") {
      const body = parseBody(event);
      const saved = await setChamberTypes(body.types || body);
      return json(200, { types: saved });
    }
    return json(405, { error: "method_not_allowed" });
  } catch (err) {
    console.error("admin-chamber-types error", err);
    return json(500, { error: err.message || "internal_error", stack: err.stack });
  }
};
