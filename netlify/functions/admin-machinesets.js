const { getMachineSets, setMachineSets, availabilityByType } = require("./_lib/storage");
const { requireAuth, parseBody, json } = require("./_lib/admin");

// GET  /api/admin/machinesets -> { sets: [{ ata, count }], byType }
// PUT  /api/admin/machinesets  body { sets: [{ ata, count }] } -> saved sets
exports.handler = async (event, context) => {
  const authErr = requireAuth(event, context);
  if (authErr) return authErr;

  const method = event.httpMethod;
  try {
    if (method === "GET") {
      const [sets, byType] = await Promise.all([getMachineSets(), availabilityByType()]);
      return json(200, { sets, byType });
    }

    if (method === "PUT" || method === "POST") {
      const body = parseBody(event);
      const sets = Array.isArray(body.sets) ? body.sets : Array.isArray(body) ? body : [];
      const saved = await setMachineSets(sets);
      return json(200, { sets: saved });
    }

    return json(405, { error: "method_not_allowed" });
  } catch (err) {
    console.error("admin-machinesets error", err);
    return json(500, { error: err.message || "internal_error", stack: err.stack });
  }
};
