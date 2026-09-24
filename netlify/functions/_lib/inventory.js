// Pure inventory + availability math (no I/O), unit-tested in test/inventory.test.js.
//
// Model (2026-09-25):
//  - Machine types: [{ id, label, count }]      count null = unlimited (opt-in).
//  - Chamber types: [{ id, label, machineTypeId }]  each needs one machine type.
//  - Chambers:      [{ id, name, chamberTypeId, status }]  a named unit of a type.
//  - Rentals:       [{ id, chamberId, machineTypeId, status, startDate, endDate }]
//
// A chamber type is offerable in a date window when a chamber of that type is free
// AND a machine set of its required machine type is free. Machine sets are a pool
// counted per machine type, shared by every chamber type that uses it (so the pool
// is never double-counted across chamber types). A machine type with no count is
// unconstrained, so availability equals chamber availability until counts are set.

function rentalOccupiesWindow(rental, startDate, endDate) {
  if (!rental) return false;
  if (rental.status !== "scheduled" && rental.status !== "active") return false;
  return rental.startDate <= endDate && rental.endDate >= startDate;
}

// ───────── Legacy helpers (migrating pre-type chambers) ─────────
function normalizePosture(p) {
  return String(p || "").toLowerCase() === "sitting" ? "sitting" : "lying";
}
function normalizeAta(value, fallback = 1.5) {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}
function inferAta(chamber) {
  if (chamber && chamber.ata != null && Number(chamber.ata) > 0) return Number(chamber.ata);
  const m = String((chamber && chamber.model) || "").match(/(\d(?:\.\d)?)\s*ata/i);
  return m ? Number(m[1]) : 1.5;
}
function inferPosture(chamber) {
  if (chamber && chamber.posture) return normalizePosture(chamber.posture);
  return /sit/i.test((chamber && chamber.model) || "") ? "sitting" : "lying";
}
function ataLabel(ata) {
  return (Number(ata) === 2 ? "2.0" : String(normalizeAta(ata))) + " ATA";
}
// Deterministic ids so derived (pre-migration) and persisted data line up.
function legacyMachineTypeId(ata) { return "mt_" + normalizeAta(ata); }
function legacyChamberTypeId(ata, posture) { return "ct_" + normalizeAta(ata) + "_" + normalizePosture(posture); }

// Effective chamber-type id for a chamber (explicit, else derived from ata/posture).
function chamberTypeIdOf(chamber) {
  if (chamber && chamber.chamberTypeId) return chamber.chamberTypeId;
  return legacyChamberTypeId(inferAta(chamber), inferPosture(chamber));
}

// ───────── Normalizers ─────────
function normalizeMachineTypes(list) {
  return (Array.isArray(list) ? list : [])
    .map((m) => ({
      id: m.id || null,
      label: String(m.label || "").trim().slice(0, 60),
      count: m.count === "" || m.count == null ? null : Math.max(0, Math.floor(Number(m.count))),
    }))
    .filter((m) => m.label && (m.count === null || Number.isFinite(m.count)));
}
function normalizeChamberTypes(list) {
  return (Array.isArray(list) ? list : [])
    .map((c) => ({
      id: c.id || null,
      label: String(c.label || "").trim().slice(0, 60),
      machineTypeId: c.machineTypeId || null,
    }))
    .filter((c) => c.label);
}

// ───────── Availability ─────────
// The machine type a rental draws from: explicit, else its chamber's chamber-type's
// machine type, else a legacy fallback from machineSetAta / chamber ATA.
function rentalMachineTypeId(rental, chambersById, chamberTypesById) {
  if (rental.machineTypeId) return rental.machineTypeId;
  const chamber = chambersById.get(rental.chamberId);
  const ct = chamber ? chamberTypesById.get(chamberTypeIdOf(chamber)) : null;
  if (ct && ct.machineTypeId) return ct.machineTypeId;
  if (rental.machineSetAta != null) return legacyMachineTypeId(rental.machineSetAta);
  if (chamber) return legacyMachineTypeId(inferAta(chamber));
  return null;
}

function machineTypeUsage(rentals, chambersById, chamberTypesById, startDate, endDate, excludeRentalId) {
  const usage = new Map();
  for (const r of rentals || []) {
    if (excludeRentalId && r.id === excludeRentalId) continue;
    if (!rentalOccupiesWindow(r, startDate, endDate)) continue;
    const mtId = rentalMachineTypeId(r, chambersById, chamberTypesById);
    if (mtId) usage.set(mtId, (usage.get(mtId) || 0) + 1);
  }
  return usage;
}

function freeMachineCount(machineType, usage) {
  if (!machineType || machineType.count == null) return Infinity;
  return Math.max(0, machineType.count - (usage.get(machineType.id) || 0));
}

// Per chamber-type availability for a window.
// Returns [{ id, label, machineTypeId, machineTypeLabel, totalChambers, freeChambers,
//            setsConfigured, freeSets (null=unlimited), available }].
function computeAvailabilityByType(chamberTypes, machineTypes, chambers, rentals, startDate, endDate) {
  const chambersById = new Map((chambers || []).map((c) => [c.id, c]));
  const chamberTypesById = new Map((chamberTypes || []).map((t) => [t.id, t]));
  const machineTypesById = new Map((machineTypes || []).map((m) => [m.id, m]));
  const usage = machineTypeUsage(rentals, chambersById, chamberTypesById, startDate, endDate);
  const busy = new Set((rentals || []).filter((r) => rentalOccupiesWindow(r, startDate, endDate)).map((r) => r.chamberId));

  const freeByType = new Map();
  const totalByType = new Map();
  for (const c of chambers || []) {
    if (c.status !== "active") continue;
    const ctId = chamberTypeIdOf(c);
    totalByType.set(ctId, (totalByType.get(ctId) || 0) + 1);
    if (!busy.has(c.id)) freeByType.set(ctId, (freeByType.get(ctId) || 0) + 1);
  }

  return (chamberTypes || []).map((ct) => {
    const mt = ct.machineTypeId ? machineTypesById.get(ct.machineTypeId) : null;
    const freeSets = mt ? freeMachineCount(mt, usage) : Infinity;
    const freeChambers = freeByType.get(ct.id) || 0;
    return {
      id: ct.id,
      label: ct.label,
      machineTypeId: ct.machineTypeId || null,
      machineTypeLabel: mt ? mt.label : null,
      totalChambers: totalByType.get(ct.id) || 0,
      freeChambers,
      setsConfigured: !!(mt && mt.count != null),
      freeSets: freeSets === Infinity ? null : freeSets,
      available: Math.min(freeChambers, freeSets),
    };
  });
}

// Total chambers available in the window, capped once per machine type (the pool
// is shared across every chamber type that uses that machine type).
function computeAvailableCount(chamberTypes, machineTypes, chambers, rentals, startDate, endDate) {
  const byType = computeAvailabilityByType(chamberTypes, machineTypes, chambers, rentals, startDate, endDate);
  const perMachine = new Map();
  let unlinkedFree = 0;
  for (const t of byType) {
    if (!t.machineTypeId) { unlinkedFree += t.freeChambers; continue; }
    const e = perMachine.get(t.machineTypeId) || { freeChambers: 0, freeSets: t.freeSets };
    e.freeChambers += t.freeChambers;
    e.freeSets = t.freeSets;
    perMachine.set(t.machineTypeId, e);
  }
  let total = unlinkedFree;
  for (const { freeChambers, freeSets } of perMachine.values()) {
    total += freeSets == null ? freeChambers : Math.min(freeChambers, freeSets);
  }
  return total;
}

// True when the pool for a machine type is fully booked across the window.
function machineTypePoolFull(machineTypeId, machineTypes, chamberTypes, chambers, rentals, startDate, endDate, excludeRentalId) {
  const mt = (machineTypes || []).find((m) => m.id === machineTypeId);
  if (!mt || mt.count == null) return false;
  const chambersById = new Map((chambers || []).map((c) => [c.id, c]));
  const chamberTypesById = new Map((chamberTypes || []).map((t) => [t.id, t]));
  const usage = machineTypeUsage(rentals, chambersById, chamberTypesById, startDate, endDate, excludeRentalId);
  return (usage.get(machineTypeId) || 0) >= mt.count;
}

// ───────── Migration derivation (deterministic ids) ─────────
function deriveMachineTypes(legacyMachineSets, chambers) {
  const byId = new Map();
  for (const s of legacyMachineSets || []) {
    const ata = normalizeAta(s.ata, null);
    if (ata == null) continue;
    const id = legacyMachineTypeId(ata);
    byId.set(id, { id, label: ataLabel(ata), count: s.count == null || s.count === "" ? null : Math.max(0, Math.floor(Number(s.count))) });
  }
  for (const c of chambers || []) {
    const id = legacyMachineTypeId(inferAta(c));
    if (!byId.has(id)) byId.set(id, { id, label: ataLabel(inferAta(c)), count: null });
  }
  return [...byId.values()];
}
function deriveChamberTypes(chambers) {
  const byId = new Map();
  for (const c of chambers || []) {
    const ata = inferAta(c);
    const posture = inferPosture(c);
    const id = legacyChamberTypeId(ata, posture);
    if (!byId.has(id)) byId.set(id, { id, label: `${ataLabel(ata)} ${posture}`, machineTypeId: legacyMachineTypeId(ata) });
  }
  return [...byId.values()];
}

module.exports = {
  rentalOccupiesWindow,
  normalizePosture,
  normalizeAta,
  inferAta,
  inferPosture,
  ataLabel,
  legacyMachineTypeId,
  legacyChamberTypeId,
  chamberTypeIdOf,
  normalizeMachineTypes,
  normalizeChamberTypes,
  rentalMachineTypeId,
  machineTypeUsage,
  computeAvailabilityByType,
  computeAvailableCount,
  machineTypePoolFull,
  deriveMachineTypes,
  deriveChamberTypes,
};
