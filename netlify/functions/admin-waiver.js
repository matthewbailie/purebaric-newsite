const { saveWaiver, getWaiver, updateRental, store, STORES } = require("./_lib/storage");
const { requireAuth, parseBody, parsePathSegments, json } = require("./_lib/admin");
const W = require("./_lib/waiver");

// GET  /api/admin/waiver?rentalId=…        → a signed waiver as a printable HTML page, or an attached file inline.
// GET  /api/admin/waiver?rentalId=…&raw=1  → the stored file itself (the signature PNG for a signed waiver).
// GET  /api/admin/waiver/text[?market=&kind=home|business] → the document the admin shows for a finger signature.
// POST /api/admin/waiver/sign              → { rentalId, signerName, agreed: true, signaturePng (data URL), waiverVersion, … }
// POST /api/admin/waiver                   → { rentalId, filename, contentType, dataBase64 } uploads a scanned waiver.
exports.handler = async (event, context) => {
  const authErr = await requireAuth(event, context);
  if (authErr) return authErr;

  const method = event.httpMethod;
  const { id: action } = parsePathSegments(event, "waiver");
  const q = event.queryStringParameters || {};

  try {
    if (method === "GET" && action === "text") {
      return json(200, W.waiverText(q.market, q.kind));
    }

    if (method === "GET") {
      const rentalId = q.rentalId;
      if (!rentalId) return json(400, { error: "rentalId required" });
      const rental = await store(STORES.rentals).get(rentalId, { type: "json" });
      if (!rental || !rental.waiverFileKey) return json(404, { error: "no_waiver" });
      const { blob, metadata } = await getWaiver(rental.waiverFileKey);
      if (!blob) return json(404, { error: "blob_missing" });
      const buf = Buffer.from(blob);
      const signed = rental.waiverSigned && rental.waiverSigned.signatureKey === rental.waiverFileKey;
      if (signed && q.raw !== "1") {
        // Further signers (other adults, parents signing for minors) each have their own signature image.
        const extras = [];
        for (const rec of (rental.waiverSignings || []).filter((x) => x && x.signatureKey && x.signatureKey !== rental.waiverFileKey)) {
          let dataUrl = "";
          try { const g = await getWaiver(rec.signatureKey); if (g.blob) dataUrl = `data:image/png;base64,${Buffer.from(g.blob).toString("base64")}`; } catch (e) { /* shown as missing */ }
          extras.push({ record: rec, dataUrl });
        }
        const html = W.renderSignedHtml(rental.waiverSigned, `data:image/png;base64,${buf.toString("base64")}`, extras);
        return { statusCode: 200, headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" }, body: html };
      }
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

    if (method === "POST" && action === "sign") {
      const v = W.validateSigning(parseBody(event));
      if (!v.ok) return json(400, { error: v.error });
      const s = v.signing;
      const rental = await store(STORES.rentals).get(s.rentalId, { type: "json" });
      if (!rental) return json(404, { error: "rental_not_found" });
      // The first adult signing is the rental's waiver (waiverSigned); every signing, first included, is
      // listed in waiverSignings so other adults and parents of minors can be added later.
      const first = !rental.waiverSigned || rental.waiverSigned.signatureKey !== rental.waiverFileKey;
      if (first && s.role === "guardian") return json(400, { error: "An adult renter signs first; then add parents signing for minors" });
      const signatureKey = await saveWaiver(s.rentalId, s.png, "image/png");
      const record = {
        at: new Date().toISOString(), kind: s.kind, businessName: s.businessName, signerTitle: s.signerTitle,
        role: s.role, minorName: s.minorName, minorAge: s.minorAge,
        name: s.signerName, email: s.signerEmail, phone: s.signerPhone, address: s.signerAddress,
        equipmentCondition: s.equipmentCondition, market: s.market, version: W.WAIVER_VERSIONS[s.kind], signatureKey,
        rentalId: s.rentalId, userAgent: String((event.headers || {})["user-agent"] || "").slice(0, 200),
      };
      const signings = [...(rental.waiverSignings || []), record];
      const patch = first ? { waiverFileKey: signatureKey, waiverSigned: record, waiverSignings: signings } : { waiverSignings: signings };
      const updated = await updateRental(s.rentalId, patch);
      return json(200, { ok: true, rental: updated });
    }

    if (method === "POST") {
      const body = parseBody(event);
      const { rentalId, contentType, dataBase64 } = body;
      if (!rentalId || !dataBase64) {
        return json(400, { error: "rentalId and dataBase64 required" });
      }
      const buf = Buffer.from(dataBase64, "base64");
      const key = await saveWaiver(rentalId, buf, contentType || "application/octet-stream");
      const rental = await updateRental(rentalId, { waiverFileKey: key, waiverSigned: null, waiverSignings: [] });
      if (!rental) return json(404, { error: "rental_not_found" });
      return json(200, { ok: true, rental });
    }

    return json(405, { error: "method_not_allowed" });
  } catch (err) {
    console.error("admin-waiver error", err);
    return json(500, { error: err.message || "internal_error" });
  }
};
