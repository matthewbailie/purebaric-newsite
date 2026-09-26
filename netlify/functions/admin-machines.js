const {
  listMachines,
  createMachine,
  updateMachine,
  archiveMachine,
} = require("./_lib/storage");
const { requireAuth, parseBody, parsePathSegments, json } = require("./_lib/admin");

exports.handler = async (event, context) => {
  const authErr = await requireAuth(event, context);
  if (authErr) return authErr;

  const { id } = parsePathSegments(event, "machines");
  const method = event.httpMethod;

  try {
    if (method === "GET" && !id) {
      const includeArchived = (event.queryStringParameters || {}).includeArchived === "true";
      const machines = await listMachines({ includeArchived });
      return json(200, { machines });
    }

    if (method === "POST" && !id) {
      const body = parseBody(event);
      if (!body.name) return json(400, { error: "name required" });
      const machine = await createMachine({ name: body.name.trim(), notes: body.notes || "" });
      return json(201, { machine });
    }

    if (method === "PATCH" && id) {
      const body = parseBody(event);
      const patch = {};
      if (typeof body.name === "string") patch.name = body.name.trim();
      if (typeof body.notes === "string") patch.notes = body.notes;
      if (["active", "maintenance", "archived"].includes(body.status)) {
        patch.status = body.status;
        if (body.status === "archived") patch.archivedAt = new Date().toISOString();
      }
      const updated = await updateMachine(id, patch);
      if (!updated) return json(404, { error: "not_found" });
      return json(200, { machine: updated });
    }

    if (method === "DELETE" && id) {
      const archived = await archiveMachine(id);
      if (!archived) return json(404, { error: "not_found" });
      return json(200, { machine: archived });
    }

    return json(405, { error: "method_not_allowed" });
  } catch (err) {
    console.error("admin-machines error", err);
    return json(500, { error: err.message || "internal_error", stack: err.stack });
  }
};
