// Pure inventory + availability math (no I/O), unit-tested in test/inventory.test.js.
//
// Model (2026-09-26): chambers and machines are each individual named units with
// a manual status (active | maintenance | archived). A rental reserves ONE
// chamber AND ONE machine (the owner picks each by number). A unit's live
// operational state (available | scheduled | inuse) is derived from its rentals.
// A chamber also has a style (lying | sitting). Any machine can run any chamber.

function rentalOccupiesWindow(rental, startDate, endDate) {
  if (!rental) return false;
  if (rental.status !== "scheduled" && rental.status !== "active") return false;
  return rental.startDate <= endDate && rental.endDate >= startDate;
}

function normalizeStyle(s) {
  return String(s || "").toLowerCase() === "sitting" ? "sitting" : "lying";
}
function styleLabel(style) {
  return normalizeStyle(style) === "sitting" ? "Sitting" : "Lying";
}

// Effective style for a chamber, tolerating older records (posture / type id).
function chamberStyleOf(c) {
  if (c && c.style) return normalizeStyle(c.style);
  if (c && c.posture) return normalizeStyle(c.posture);
  if (c && typeof c.chamberTypeId === "string" && /sitting/i.test(c.chamberTypeId)) return "sitting";
  return "lying";
}

// Live operational state of a unit for `today`, from rentals referencing it via
// unitKey ("chamberId" or "machineId"). Manual status wins over derived state.
// Returns { state: available|scheduled|inuse|maintenance|archived, rental }.
function unitState(unit, rentals, unitKey, today) {
  if (!unit) return { state: "available", rental: null };
  if (unit.status === "archived") return { state: "archived", rental: null };
  if (unit.status === "maintenance") return { state: "maintenance", rental: null };
  const mine = (rentals || []).filter(
    (r) => r[unitKey] === unit.id && (r.status === "scheduled" || r.status === "active")
  );
  const current = mine.find((r) => r.startDate <= today && r.endDate >= today);
  if (current) return { state: "inuse", rental: current };
  const upcoming = mine
    .filter((r) => r.startDate > today)
    .sort((a, b) => a.startDate.localeCompare(b.startDate))[0];
  if (upcoming) return { state: "scheduled", rental: upcoming };
  return { state: "available", rental: null };
}

// Active units of a kind that are free across [startDate, endDate].
function freeUnits(units, rentals, unitKey, startDate, endDate) {
  const busy = new Set(
    (rentals || []).filter((r) => rentalOccupiesWindow(r, startDate, endDate)).map((r) => r[unitKey])
  );
  return (units || []).filter((u) => u.status === "active" && !busy.has(u.id));
}

// Bookable count for a window = min(free chambers, free machines): a rental needs both.
function computeAvailableCount(chambers, machines, rentals, startDate, endDate) {
  const fc = freeUnits(chambers, rentals, "chamberId", startDate, endDate).length;
  const fm = freeUnits(machines, rentals, "machineId", startDate, endDate).length;
  return Math.min(fc, fm);
}

// Availability by chamber style for a window. Machines are a shared pool across
// styles. Returns [{ style, label, totalChambers, freeChambers, totalMachines,
// freeMachines, available }] for styles that have at least one active chamber.
function computeAvailabilityByStyle(chambers, machines, rentals, startDate, endDate) {
  const busyChambers = new Set(
    (rentals || []).filter((r) => rentalOccupiesWindow(r, startDate, endDate)).map((r) => r.chamberId)
  );
  const freeMachines = freeUnits(machines, rentals, "machineId", startDate, endDate).length;
  const totalMachines = (machines || []).filter((m) => m.status === "active").length;
  return ["lying", "sitting"]
    .map((style) => {
      const of = (chambers || []).filter((c) => c.status === "active" && chamberStyleOf(c) === style);
      const free = of.filter((c) => !busyChambers.has(c.id)).length;
      return {
        style,
        label: styleLabel(style),
        totalChambers: of.length,
        freeChambers: free,
        totalMachines,
        freeMachines,
        available: Math.min(free, freeMachines),
      };
    })
    .filter((s) => s.totalChambers > 0);
}

// True when every active unit of a kind is busy across the window (excluding one
// rental being edited). Used to warn when a rental can't be fulfilled.
function unitPoolFull(units, rentals, unitKey, startDate, endDate, excludeRentalId) {
  const active = (units || []).filter((u) => u.status === "active");
  if (!active.length) return false;
  const busy = new Set(
    (rentals || [])
      .filter((r) => (!excludeRentalId || r.id !== excludeRentalId) && rentalOccupiesWindow(r, startDate, endDate))
      .map((r) => r[unitKey])
  );
  return active.every((u) => busy.has(u.id));
}

module.exports = {
  rentalOccupiesWindow,
  normalizeStyle,
  styleLabel,
  chamberStyleOf,
  unitState,
  freeUnits,
  computeAvailableCount,
  computeAvailabilityByStyle,
  unitPoolFull,
};
