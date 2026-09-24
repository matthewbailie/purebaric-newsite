const { test } = require("node:test");
const assert = require("node:assert/strict");
const {
  computeAvailabilityByType,
  computeAvailableCount,
  machineSetPoolFull,
  inferAta,
  inferPosture,
} = require("../netlify/functions/_lib/inventory");

const chambers = [
  { id: "c1", ata: 1.5, posture: "lying", status: "active" },
  { id: "c2", ata: 1.5, posture: "lying", status: "active" },
  { id: "c3", ata: 1.5, posture: "sitting", status: "active" },
  { id: "c4", ata: 2.0, posture: "lying", status: "active" },
  { id: "c5", ata: 2.0, posture: "lying", status: "maintenance" }, // not rentable
];

test("unconfigured machine sets leave availability equal to free chambers", () => {
  const byType = computeAvailabilityByType(chambers, [], [], "2026-10-01", "2026-10-01");
  const lying15 = byType.find((t) => t.ata === 1.5 && t.posture === "lying");
  assert.equal(lying15.totalChambers, 2);
  assert.equal(lying15.freeChambers, 2);
  assert.equal(lying15.setsConfigured, false);
  assert.equal(lying15.freeSets, null);
  assert.equal(lying15.available, 2);
  // Maintenance chamber excluded: only c4 counts for 2.0 lying.
  const lying20 = byType.find((t) => t.ata === 2.0 && t.posture === "lying");
  assert.equal(lying20.totalChambers, 1);
});

test("machine-set pool caps availability and is shared across postures of an ATA", () => {
  const machineSets = [{ ata: 1.5, count: 1 }, { ata: 2.0, count: 5 }];
  const byType = computeAvailabilityByType(chambers, [], machineSets, "2026-10-01", "2026-10-01");
  const lying15 = byType.find((t) => t.ata === 1.5 && t.posture === "lying");
  const sitting15 = byType.find((t) => t.ata === 1.5 && t.posture === "sitting");
  // Only one 1.5 set exists: each posture individually shows 1 offerable...
  assert.equal(lying15.available, 1);
  assert.equal(sitting15.available, 1);
  // ...but the shared pool caps total 1.5 availability at 1.
  const total = computeAvailableCount(chambers, [], machineSets, "2026-10-01", "2026-10-01");
  // 1.5 -> min(3 free chambers, 1 set) = 1 ; 2.0 -> min(1 free chamber, 5 sets) = 1
  assert.equal(total, 2);
});

test("overlapping rentals consume chambers and machine sets for the window", () => {
  const machineSets = [{ ata: 1.5, count: 2 }];
  const rentals = [
    { id: "r1", chamberId: "c1", machineSetAta: 1.5, status: "active", startDate: "2026-09-01", endDate: "2026-12-01" },
  ];
  const byType = computeAvailabilityByType(chambers, rentals, machineSets, "2026-10-01", "2026-10-01");
  const lying15 = byType.find((t) => t.ata === 1.5 && t.posture === "lying");
  assert.equal(lying15.freeChambers, 1); // c1 busy, c2 free
  assert.equal(lying15.freeSets, 1); // 2 configured - 1 in use
});

test("machineSetPoolFull blocks a second 1.5 rental when only one set exists", () => {
  const machineSets = [{ ata: 1.5, count: 1 }];
  const chambersById = new Map(chambers.map((c) => [c.id, c]));
  const rentals = [
    { id: "r1", chamberId: "c1", machineSetAta: 1.5, status: "scheduled", startDate: "2026-10-01", endDate: "2026-11-01" },
  ];
  assert.equal(
    machineSetPoolFull(1.5, machineSets, rentals, chambersById, "2026-10-15", "2026-10-20"),
    true
  );
  // Excluding the occupying rental (editing it) frees the pool.
  assert.equal(
    machineSetPoolFull(1.5, machineSets, rentals, chambersById, "2026-10-15", "2026-10-20", "r1"),
    false
  );
  // A non-overlapping window is fine.
  assert.equal(
    machineSetPoolFull(1.5, machineSets, rentals, chambersById, "2026-12-01", "2026-12-05"),
    false
  );
});

test("legacy chambers infer ATA and posture from the model string", () => {
  assert.equal(inferAta({ model: "Purebaric 2.0 ATA" }), 2.0);
  assert.equal(inferAta({ model: "Soft-Shell 1.5 ATA" }), 1.5);
  assert.equal(inferAta({ model: "no rating here" }), 1.5); // default
  assert.equal(inferPosture({ model: "1.5 ATA sitting chamber" }), "sitting");
  assert.equal(inferPosture({ model: "1.5 ATA" }), "lying"); // default
  assert.equal(inferAta({ ata: 2.0 }), 2.0); // explicit wins
});
