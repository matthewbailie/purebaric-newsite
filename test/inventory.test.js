const { test } = require("node:test");
const assert = require("node:assert/strict");
const {
  unitState,
  freeUnits,
  computeAvailableCount,
  computeAvailabilityByStyle,
  unitPoolFull,
  chamberStyleOf,
} = require("../netlify/functions/_lib/inventory");

const chambers = [
  { id: "c1", name: "PB-001", style: "lying", status: "active" },
  { id: "c2", name: "PB-002", style: "lying", status: "active" },
  { id: "c3", name: "PB-003", style: "sitting", status: "active" },
  { id: "c4", name: "PB-004", style: "lying", status: "maintenance" },
];
const machines = [
  { id: "m1", name: "M-001", status: "active" },
  { id: "m2", name: "M-002", status: "active" },
];

test("unitState reflects manual status, current, upcoming, and free", () => {
  const rentals = [
    { id: "r1", chamberId: "c1", machineId: "m1", status: "active", startDate: "2026-09-01", endDate: "2026-12-01" },
    { id: "r2", chamberId: "c2", machineId: "m2", status: "scheduled", startDate: "2026-11-01", endDate: "2026-12-01" },
  ];
  const today = "2026-10-01";
  assert.equal(unitState(chambers[0], rentals, "chamberId", today).state, "inuse");   // c1 rented now
  assert.equal(unitState(chambers[1], rentals, "chamberId", today).state, "scheduled"); // c2 upcoming
  assert.equal(unitState(chambers[2], rentals, "chamberId", today).state, "available"); // c3 none
  assert.equal(unitState(chambers[3], rentals, "chamberId", today).state, "maintenance");
  assert.equal(unitState(machines[0], rentals, "machineId", today).state, "inuse");    // m1 in use now
});

test("availability by style shares the machine pool and caps by it", () => {
  const rentals = [
    { id: "r1", chamberId: "c1", machineId: "m1", status: "active", startDate: "2026-09-01", endDate: "2026-12-01" },
  ];
  const byStyle = computeAvailabilityByStyle(chambers, machines, rentals, "2026-10-01", "2026-10-01");
  const lying = byStyle.find((s) => s.style === "lying");
  const sitting = byStyle.find((s) => s.style === "sitting");
  assert.equal(lying.totalChambers, 2);   // c1,c2 (c4 maintenance excluded)
  assert.equal(lying.freeChambers, 1);     // c1 busy
  assert.equal(lying.freeMachines, 1);     // m1 busy, m2 free
  assert.equal(lying.available, 1);        // min(1 chamber, 1 machine)
  assert.equal(sitting.freeChambers, 1);
  assert.equal(sitting.freeMachines, 1);   // same shared machine pool
});

test("bookable count is the min of free chambers and free machines", () => {
  // 3 active chambers free, 2 machines free -> 2 bookable.
  assert.equal(computeAvailableCount(chambers, machines, [], "2026-10-01", "2026-10-01"), 2);
  // Take both machines -> 0 bookable even though chambers are free.
  const rentals = [
    { id: "r1", chamberId: "c1", machineId: "m1", status: "active", startDate: "2026-09-01", endDate: "2026-12-01" },
    { id: "r2", chamberId: "c2", machineId: "m2", status: "active", startDate: "2026-09-01", endDate: "2026-12-01" },
  ];
  // c1,c2 busy, c3 free, c4 maintenance -> 1 free chamber; both machines busy -> 0 machines free -> min = 0.
  assert.equal(computeAvailableCount(chambers, machines, rentals, "2026-10-01", "2026-10-01"), 0);
});

test("unitPoolFull detects when every active machine is booked", () => {
  const rentals = [
    { id: "r1", chamberId: "c1", machineId: "m1", status: "active", startDate: "2026-10-01", endDate: "2026-11-01" },
    { id: "r2", chamberId: "c2", machineId: "m2", status: "active", startDate: "2026-10-01", endDate: "2026-11-01" },
  ];
  assert.equal(unitPoolFull(machines, rentals, "machineId", "2026-10-10", "2026-10-20"), true);
  assert.equal(unitPoolFull(machines, rentals, "machineId", "2026-10-10", "2026-10-20", "r2"), false); // editing r2 frees m2
  assert.equal(unitPoolFull(machines, rentals, "machineId", "2026-12-01", "2026-12-05"), false); // no overlap
});

test("chamberStyleOf tolerates legacy posture / type-id records", () => {
  assert.equal(chamberStyleOf({ style: "sitting" }), "sitting");
  assert.equal(chamberStyleOf({ posture: "sitting" }), "sitting");
  assert.equal(chamberStyleOf({ chamberTypeId: "ct_1.5_sitting" }), "sitting");
  assert.equal(chamberStyleOf({}), "lying");
});
