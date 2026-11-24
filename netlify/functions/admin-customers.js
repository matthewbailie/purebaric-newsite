const {
  listCustomers,
  createManualCustomer,
  updateManualCustomer,
  store,
  STORES,
} = require("./_lib/storage");
const { requireAuth, parseBody, parsePathSegments, json } = require("./_lib/admin");
const { listManualCustomers } = require("./_lib/storage");
const { emailOnAnotherCustomer } = require("./_lib/customers");

async function findEmailOnAnotherCustomer(data, selfId) {
  return emailOnAnotherCustomer(await listManualCustomers(), data, selfId);
}

exports.handler = async (event, context) => {
  const authErr = await requireAuth(event, context);
  if (authErr) return authErr;

  const { id } = parsePathSegments(event, "customers");
  const method = event.httpMethod;
  const q = event.queryStringParameters || {};

  try {
    if (method === "GET" && !id) {
      const customers = await listCustomers();
      let filtered = customers;
      if (q.q) {
        const needle = q.q.toLowerCase();
        filtered = customers.filter(
          (c) =>
            c.email.includes(needle) ||
            (c.name || "").toLowerCase().includes(needle) ||
            (c.phone || "").includes(needle)
        );
      }
      return json(200, { customers: filtered });
    }

    if (method === "POST" && !id) {
      const body = parseBody(event);
      // Name is the only required field; email and phone are optional.
      if (!String(body.name || "").trim()) return json(400, { error: "Add a name to save this customer." });
      const email = body.noEmail ? "" : String(body.email || "").trim();
      const dupe = await findEmailOnAnotherCustomer({ ...body, email });
      if (dupe) return json(409, { error: "That email is already on another customer. Search for them instead of adding a duplicate." });
      const customer = await createManualCustomer({
        email,
        name: body.name || "",
        phone: body.phone || "",
        address: {
          street: body.street || "",
          city: body.city || "",
          state: body.state || "",
          zip: body.zip || "",
        },
        notes: body.notes || "",
        tags: Array.isArray(body.tags) ? body.tags : (body.tags ? String(body.tags).split(",").map(s => s.trim()).filter(Boolean) : []),
      });
      return json(201, { customer });
    }

    if (method === "PATCH" && id) {
      const body = parseBody(event);
      const patch = {};
      if (typeof body.name === "string") patch.name = body.name.trim();
      if (typeof body.phone === "string") patch.phone = body.phone.trim();
      if (body.noEmail) patch.email = "";
      else if (typeof body.email === "string") patch.email = body.email.trim();

      if (typeof body.notes === "string") patch.notes = body.notes;
      if (body.address) patch.address = body.address;
      if (typeof body.street === "string" || typeof body.city === "string" || typeof body.state === "string" || typeof body.zip === "string") {
        patch.address = {
          street: body.street || "",
          city: body.city || "",
          state: body.state || "",
          zip: body.zip || "",
        };
      }
      if (typeof body.tags !== "undefined") {
        patch.tags = Array.isArray(body.tags) ? body.tags : String(body.tags).split(",").map(s => s.trim()).filter(Boolean);
      }
      const updated = await updateManualCustomer(id, patch);
      if (!updated) return json(404, { error: "not_found" });
      return json(200, { customer: updated });
    }

    if (method === "DELETE" && id) {
      await store(STORES.customers).delete(id);
      return json(200, { ok: true });
    }

    return json(405, { error: "method_not_allowed" });
  } catch (err) {
    console.error("admin-customers error", err);
    return json(500, { error: err.message || "internal_error", stack: err.stack });
  }
};
