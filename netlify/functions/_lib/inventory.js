// Pure inventory + availability math (no I/O), unit-tested in test/inventory.test.js.
//
// A rentable "chamber type" is the pair (ATA rating, posture). Physical chambers
// are still individual records; grouping them by type gives the owner's per-type
// unit counts. Machine sets are a fungible pool counted per ATA rating. A chamber
// is only genuinely offerable for a date window when BOTH a chamber of that type
// AND a compatible machine set are free for the window.
//
// Compatibility is exact ATA match: a 1.5 ATA chamber draws a 1.5 ATA machine set.
// Machine-set capacity is opt-in: an ATA with no configured count is treated as
// UNCONSTRAINED (Infinity), so availability equals chamber availability until the
// owner enters counts. This keeps the live booking flow unchanged until configured.

function normalizePosture(p) {
  return String(p || "").toLowerCase() === "sitting" ? "sitting" : "lying";
}

function normalizeAta(value, fallback = 1.5) {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

// Best-effort ATA/posture for a chamber that predates the structured fields.
function inferAta(chamber) {
  if (chamber && chamber.ata != null && Number(chamber.ata) > 0) return Number(chamber.ata);
  const m = String((chamber && chamber.model) || "").match(/(\d(?:\.\d)?)\s*ata/i);
  return m ? Number(m[1]) : 1.5;
}

function inferPosture(chamber) {
  if (chamber && chamber.posture) return normalizePosture(chamber.posture);
  return /sit/i.test((chamber && chamber.model) || "") ? "sitting" : "lying";
}

function chamberTypeKey(ata, posture) {
  return `${normalizeAta(ata)}|${normalizePosture(posture)}`;
}

// A rental occupies the window when it is live (scheduled/active) and its date
// span [startDate, endDate] intersects [startDate, endDate] of the window.
function rentalOccupiesWindow(rental, startDate, endDate) {
  if (!rental) return false;
  if (rental.status !== "scheduled" && rental.status !== "active") return false;
  return rental.startDate <= endDate && rental.endDate >= startDate;
}

// machineSets: [{ ata, count }] -> Map ata(number) -> total count. An absent ATA
// means "unconstrained" (callers treat a missing key as Infinity).
function machineSetCapacity(machineSets) {
  const cap = new Map();
  for (const s of machineSets || []) {
    const ata = normalizeAta(s.ata, null);
    const count = Math.floor(Number(s.count));
    if (ata == null || !Number.isFinite(count) || count < 0) continue;
    cap.set(ata, (cap.get(ata) || 0) + count);
  }
  return cap;
}

// Machine sets in use per ATA across rentals overlapping the window. A rental's
// drawn ATA is its explicit machineSetAta, else its chamber's ATA.
function machineSetUsageByAta(rentals, chambersById, startDate, endDate, excludeRentalId) {
  const usage = new Map();
  for (const r of rentals || []) {
    if (excludeRentalId && r.id === excludeRentalId) continue;
    if (!rentalOccupiesWindow(r, startDate, endDate)) continue;
    const chamber = chambersById.get(r.chamberId);
    const ata = normalizeAta(r.machineSetAta != null ? r.machineSetAta : chamber && chamber.ata);
    usage.set(ata, (usage.get(ata) || 0) + 1);
  }
  return usage;
}

// Free machine sets for an ATA in the window. Infinity when unconstrained.
function freeMachineSets(ata, capacity, usage) {
  const key = normalizeAta(ata);
  if (!capacity.has(key)) return Infinity;
  return Math.max(0, capacity.get(key) - (usage.get(key) || 0));
}

// Per chamber-type availability for a window.
// Returns [{ ata, posture, label, totalChambers, freeChambers, setsConfigured,
//            freeSets (null=unlimited), available }] sorted by ata then posture.
function computeAvailabilityByType(chambers, rentals, machineSets, startDate, endDate) {
  const chambersById = new Map((chambers || []).map((c) => [c.id, c]));
  const capacity = machineSetCapacity(machineSets);
  const usage = machineSetUsageByAta(rentals, chambersById, startDate, endDate);
  const busyChamberIds = new Set(
    (rentals || [])
      .filter((r) => rentalOccupiesWindow(r, startDate, endDate))
      .map((r) => r.chamberId)
  );

  const types = new Map();
  for (const c of chambers || []) {
    if (c.status !== "active") continue; // maintenance/archived are not rentable
    const ata = normalizeAta(c.ata);
    const posture = normalizePosture(c.posture);
    const key = chamberTypeKey(ata, posture);
    if (!types.has(key)) types.set(key, { ata, posture, total: 0, free: 0 });
    const t = types.get(key);
    t.total += 1;
    if (!busyChamberIds.has(c.id)) t.free += 1;
  }

  const result = [];
  for (const t of types.values()) {
    const freeSets = freeMachineSets(t.ata, capacity, usage);
    result.push({
      ata: t.ata,
      posture: t.posture,
      label: `${t.ata} ATA ${t.posture}`,
      totalChambers: t.total,
      freeChambers: t.free,
      setsConfigured: capacity.has(t.ata),
      freeSets: freeSets === Infinity ? null : freeSets,
      available: Math.min(t.free, freeSets),
    });
  }
  result.sort((a, b) => a.ata - b.ata || a.posture.localeCompare(b.posture));
  return result;
}

// Total chambers genuinely available in the window, capped per ATA by the shared
// machine-set pool (free sets are shared across postures of the same ATA).
function computeAvailableCount(chambers, rentals, machineSets, startDate, endDate) {
  const byType = computeAvailabilityByType(chambers, rentals, machineSets, startDate, endDate);
  const perAta = new Map(); // ata -> { freeChambers, freeSets }
  for (const t of byType) {
    const e = perAta.get(t.ata) || { freeChambers: 0, freeSets: t.freeSets };
    e.freeChambers += t.freeChambers;
    e.freeSets = t.freeSets; // identical for all postures of one ATA
    perAta.set(t.ata, e);
  }
  let available = 0;
  for (const { freeChambers, freeSets } of perAta.values()) {
    available += freeSets == null ? freeChambers : Math.min(freeChambers, freeSets);
  }
  return available;
}

// True when the machine-set pool for an ATA is fully booked across the window,
// i.e. assigning one more rental of that ATA would oversubscribe it.
function machineSetPoolFull(ata, machineSets, rentals, chambersById, startDate, endDate, excludeRentalId) {
  const capacity = machineSetCapacity(machineSets);
  const key = normalizeAta(ata);
  if (!capacity.has(key)) return false; // unconstrained
  const usage = machineSetUsageByAta(rentals, chambersById, startDate, endDate, excludeRentalId);
  return (usage.get(key) || 0) >= capacity.get(key);
}

module.exports = {
  normalizePosture,
  normalizeAta,
  inferAta,
  inferPosture,
  chamberTypeKey,
  rentalOccupiesWindow,
  machineSetCapacity,
  machineSetUsageByAta,
  freeMachineSets,
  computeAvailabilityByType,
  computeAvailableCount,
  machineSetPoolFull,
};
