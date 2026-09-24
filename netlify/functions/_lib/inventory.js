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
// A unit is "bookable now" only when it's active AND has no scheduled/active
// rental commitment. A scheduled (upcoming) rental makes it unavailable, matching
// the state shown in the admin lists (a SCHEDULED chamber is not bookable).
function bookableUnits(units, rentals, unitKey, today) {
  const day = today || new Date().toISOString().slice(0, 10);
  return (units || []).filter((u) => unitState(u, rentals, unitKey, day).state === "available");
}

// Bookable count now = min(bookable chambers, bookable machines): a rental needs both.
function computeAvailableCount(chambers, machines, rentals, today) {
  const fc = bookableUnits(chambers, rentals, "chamberId", today).length;
  const fm = bookableUnits(machines, rentals, "machineId", today).length;
  return Math.min(fc, fm);
}

// Availability by chamber style. A scheduled or in-use unit is NOT bookable.
// Machines are a shared pool across styles. Returns [{ style, label,
// totalChambers, freeChambers, totalMachines, freeMachines, available }] for
// styles that have at least one active chamber.
function computeAvailabilityByStyle(chambers, machines, rentals, today) {
  const day = today || new Date().toISOString().slice(0, 10);
  const freeMachines = bookableUnits(machines, rentals, "machineId", day).length;
  const totalMachines = (machines || []).filter((m) => m.status === "active").length;
  return ["lying", "sitting"]
    .map((style) => {
      const of = (chambers || []).filter((c) => c.status === "active" && chamberStyleOf(c) === style);
      const free = of.filter((c) => unitState(c, rentals, "chamberId", day).state === "available").length;
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
  bookableUnits,
  computeAvailableCount,
  computeAvailabilityByStyle,
  unitPoolFull,
};
