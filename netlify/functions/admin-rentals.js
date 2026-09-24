const { listRentals, createRental, updateRental, findRentalConflict, getChamber, machineSetPoolFull, store, STORES } = require("./_lib/storage");
const { requireAuth, parseBody, parsePathSegments, json } = require("./_lib/admin");

// Resolve which machine-set ATA pool a rental draws from: an explicit override,
// else the assigned chamber's ATA rating.
async function resolveMachineSetAta(body, chamberId) {
  if (body && body.machineSetAta != null && body.machineSetAta !== "") {
    return Number(body.machineSetAta);
  }
  const chamber = chamberId ? await getChamber(chamberId) : null;
  return chamber ? Number(chamber.ata) : null;
}

function buildRenter(body) {
  return {
    name: (body["renter-name"] || body.renterName || "").trim(),
    email: (body["renter-email"] || body.renterEmail || "").trim(),
    phone: (body["renter-phone"] || body.renterPhone || "").trim(),
    address: {
      street: (body["renter-street"] || "").trim(),
      city: (body["renter-city"] || "").trim(),
      state: (body["renter-state"] || "").trim(),
      zip: (body["renter-zip"] || "").trim(),
    },
  };
}

function buildPaymentPatch(body, patch) {
  if (body.paymentStatus && ["unpaid", "partial", "paid", "refunded"].includes(body.paymentStatus)) {
    patch.paymentStatus = body.paymentStatus;
  }
  if (typeof body.paidAmount !== "undefined") patch.paidAmount = Number(body.paidAmount) || 0;
  if (typeof body.paymentMethod === "string") patch.paymentMethod = body.paymentMethod;
  if (typeof body.paymentDate === "string") patch.paymentDate = body.paymentDate || null;
}

exports.handler = async (event, context) => {
  const authErr = requireAuth(event, context);
  if (authErr) return authErr;

  const { id } = parsePathSegments(event, "rentals");
  const method = event.httpMethod;
  const q = event.queryStringParameters || {};

  try {
    if (method === "GET" && !id) {
      const rentals = await listRentals({
        chamberId: q.chamberId || undefined,
        status: q.status || undefined,
      });
      return json(200, { rentals });
    }

    if (method === "POST" && !id) {
      const body = parseBody(event);
      if (!body.chamberId || !body.startDate || !body.endDate) {
        return json(400, { error: "chamberId, startDate, endDate required" });
      }
      if (body.startDate > body.endDate) {
        return json(400, { error: "startDate must be <= endDate" });
      }

      // Conflict detection, unless caller explicitly overrides
      if (!body.overrideConflict) {
        const conflict = await findRentalConflict({
          chamberId: body.chamberId,
          startDate: body.startDate,
          endDate: body.endDate,
        });
        if (conflict) {
          return json(409, {
            error: "rental_conflict",
            message: `Chamber already booked ${conflict.startDate} → ${conflict.endDate} by ${conflict.renter?.name || "another renter"}`,
            conflict,
          });
        }
      }

      const machineSetAta = await resolveMachineSetAta(body, body.chamberId);

      // Machine-set pool guard: a chamber is only rentable when a compatible
      // machine set is also free for the window. Skipped when unconfigured
      // (opt-in) or when the caller overrides.
      if (machineSetAta != null && !body.overrideConflict) {
        const full = await machineSetPoolFull({
          ata: machineSetAta,
          startDate: body.startDate,
          endDate: body.endDate,
        });
        if (full) {
          return json(409, {
            error: "machineset_conflict",
            message: `No ${machineSetAta} ATA machine set is free ${body.startDate} → ${body.endDate}. All sets in that pool are already assigned for this window.`,
          });
        }
      }

      const rentalData = {
        chamberId: body.chamberId,
        startDate: body.startDate,
        endDate: body.endDate,
        monthlyRate: Number(body.monthlyRate) || 0,
        machineSetAta,
        renter: buildRenter(body),
        notes: body.notes || "",
      };
      buildPaymentPatch(body, rentalData);
      const rental = await createRental(rentalData);
      return json(201, { rental });
    }

    if (method === "PATCH" && id) {
      const body = parseBody(event);
      const patch = {};
      if (body.status && ["scheduled", "active", "completed", "cancelled"].includes(body.status)) {
        patch.status = body.status;
      }
      if (body.startDate) patch.startDate = body.startDate;
      if (body.endDate) patch.endDate = body.endDate;
      if (typeof body.monthlyRate !== "undefined") patch.monthlyRate = Number(body.monthlyRate) || 0;
      if (typeof body.notes === "string") patch.notes = body.notes;
      if (typeof body.chamberId === "string") patch.chamberId = body.chamberId;
      if (body.renterName || body.renterEmail || body.renterPhone || body["renter-name"]) {
        patch.renter = buildRenter(body);
      }
      buildPaymentPatch(body, patch);

      // When the chamber changes, the machine-set pool it draws from follows it.
      if (patch.chamberId) {
        patch.machineSetAta = await resolveMachineSetAta(body, patch.chamberId);
      }

      // Conflict detection on date/chamber changes
      if ((patch.startDate || patch.endDate || patch.chamberId) && !body.overrideConflict) {
        const merged = { ...(await listRentals()).find((r) => r.id === id), ...patch };
        if (merged.chamberId && merged.startDate && merged.endDate) {
          const conflict = await findRentalConflict({
            chamberId: merged.chamberId,
            startDate: merged.startDate,
            endDate: merged.endDate,
            excludeRentalId: id,
          });
          if (conflict) {
            return json(409, {
              error: "rental_conflict",
              message: `Conflict with existing rental ${conflict.startDate} → ${conflict.endDate} (${conflict.renter?.name || ", "})`,
              conflict,
            });
          }
          if (merged.machineSetAta != null) {
            const full = await machineSetPoolFull({
              ata: merged.machineSetAta,
              startDate: merged.startDate,
              endDate: merged.endDate,
              excludeRentalId: id,
            });
            if (full) {
              return json(409, {
                error: "machineset_conflict",
                message: `No ${merged.machineSetAta} ATA machine set is free ${merged.startDate} → ${merged.endDate}. All sets in that pool are already assigned for this window.`,
              });
            }
          }
        }
      }

      const updated = await updateRental(id, patch);
      if (!updated) return json(404, { error: "not_found" });
      return json(200, { rental: updated });
    }

    if (method === "DELETE" && id) {
      // ?hard=true permanently removes the rental from storage (lost forever).
      // Without the flag, sets status to "cancelled" so it stays in history.
      if (q.hard === "true") {
        await store(STORES.rentals).delete(id);
        return json(200, { ok: true, deleted: id });
      }
      const updated = await updateRental(id, { status: "cancelled" });
      if (!updated) return json(404, { error: "not_found" });
      return json(200, { rental: updated });
    }

    return json(405, { error: "method_not_allowed" });
  } catch (err) {
    console.error("admin-rentals error", err);
    return json(500, { error: err.message || "internal_error", stack: err.stack });
  }
};
