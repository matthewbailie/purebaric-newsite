const {
  listChambers,
  createChamber,
  updateChamber,
  archiveChamber,
} = require("./_lib/storage");
const { requireAuth, parseBody, parsePathSegments, json } = require("./_lib/admin");

exports.handler = async (event, context) => {
  const authErr = requireAuth(event, context);
  if (authErr) return authErr;

  const { id } = parsePathSegments(event, "chambers");
  const method = event.httpMethod;

  try {
    if (method === "GET" && !id) {
      const includeArchived = (event.queryStringParameters || {}).includeArchived === "true";
      const chambers = await listChambers({ includeArchived });
      return json(200, { chambers });
    }

    if (method === "POST" && !id) {
      const body = parseBody(event);
      if (!body.name) return json(400, { error: "name required" });
      const chamber = await createChamber({
        name: body.name.trim(),
        model: body.model || undefined,
        notes: body.notes || "",
      });
      return json(201, { chamber });
    }

    if (method === "PATCH" && id) {
      const body = parseBody(event);
      const patch = {};
      if (typeof body.name === "string") patch.name = body.name.trim();
      if (typeof body.model === "string") patch.model = body.model;
      if (typeof body.notes === "string") patch.notes = body.notes;
      if (["active", "maintenance", "archived"].includes(body.status)) {
        patch.status = body.status;
        if (body.status === "archived") patch.archivedAt = new Date().toISOString();
      }
      const updated = await updateChamber(id, patch);
      if (!updated) return json(404, { error: "not_found" });
      return json(200, { chamber: updated });
    }

    if (method === "DELETE" && id) {
      const archived = await archiveChamber(id);
      if (!archived) return json(404, { error: "not_found" });
      return json(200, { chamber: archived });
    }

    return json(405, { error: "method_not_allowed" });
  } catch (err) {
    console.error("admin-chambers error", err);
    return json(500, { error: err.message || "internal_error", stack: err.stack });
  }
};
