const { getMachineTypes, setMachineTypes } = require("./_lib/storage");
const { requireAuth, parseBody, json } = require("./_lib/admin");

// GET  /api/admin/machine-types -> { types: [{ id, label, count }] }
// PUT  /api/admin/machine-types  body { types: [...] } -> saved
exports.handler = async (event, context) => {
  const authErr = requireAuth(event, context);
  if (authErr) return authErr;

  const method = event.httpMethod;
  try {
    if (method === "GET") {
      return json(200, { types: await getMachineTypes() });
    }
    if (method === "PUT" || method === "POST") {
      const body = parseBody(event);
      const saved = await setMachineTypes(body.types || body);
      return json(200, { types: saved });
    }
    return json(405, { error: "method_not_allowed" });
  } catch (err) {
    console.error("admin-machine-types error", err);
    return json(500, { error: err.message || "internal_error", stack: err.stack });
  }
};
