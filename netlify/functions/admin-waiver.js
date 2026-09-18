const { saveWaiver, getWaiver, updateRental, store, STORES } = require("./_lib/storage");
const { requireAuth, parseBody, json } = require("./_lib/admin");

// POST: { rentalId, filename, contentType, dataBase64 }  → uploads & links waiver to rental.
// GET ?rentalId=… → streams the file inline.
exports.handler = async (event, context) => {
  const authErr = requireAuth(event, context);
  if (authErr) return authErr;

  const method = event.httpMethod;

  try {
    if (method === "GET") {
      const rentalId = (event.queryStringParameters || {}).rentalId;
      if (!rentalId) return json(400, { error: "rentalId required" });
      const rental = await store(STORES.rentals).get(rentalId, { type: "json" });
      if (!rental || !rental.waiverFileKey) return json(404, { error: "no_waiver" });
      const { blob, metadata } = await getWaiver(rental.waiverFileKey);
      if (!blob) return json(404, { error: "blob_missing" });
      const buf = Buffer.from(blob);
      return {
        statusCode: 200,
        headers: {
          "Content-Type": (metadata && metadata.contentType) || "application/octet-stream",
          "Content-Disposition": `inline; filename="waiver-${rentalId}"`,
        },
        body: buf.toString("base64"),
        isBase64Encoded: true,
      };
    }

    if (method === "POST") {
      const body = parseBody(event);
      const { rentalId, contentType, dataBase64 } = body;
      if (!rentalId || !dataBase64) {
        return json(400, { error: "rentalId and dataBase64 required" });
      }
      const buf = Buffer.from(dataBase64, "base64");
      const key = await saveWaiver(rentalId, buf, contentType || "application/octet-stream");
      const rental = await updateRental(rentalId, { waiverFileKey: key });
      if (!rental) return json(404, { error: "rental_not_found" });
      return json(200, { ok: true, rental });
    }

    return json(405, { error: "method_not_allowed" });
  } catch (err) {
    console.error("admin-waiver error", err);
    return json(500, { error: err.message || "internal_error", stack: err.stack });
  }
};
