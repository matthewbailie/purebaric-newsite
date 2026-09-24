const { test } = require("node:test");
const assert = require("node:assert/strict");
const {
  computeAvailabilityByType,
  computeAvailableCount,
  machineTypePoolFull,
  deriveMachineTypes,
  deriveChamberTypes,
  chamberTypeIdOf,
} = require("../netlify/functions/_lib/inventory");

const machineTypes = [
  { id: "mt15", label: "1.5 ATA", count: 2 },
  { id: "mt20", label: "2.0 ATA", count: 5 },
];
const chamberTypes = [
  { id: "lying15", label: "1.5 ATA lying", machineTypeId: "mt15" },
  { id: "sitting15", label: "1.5 ATA sitting", machineTypeId: "mt15" },
  { id: "lying20", label: "2.0 ATA lying", machineTypeId: "mt20" },
];
const chambers = [
  { id: "c1", chamberTypeId: "lying15", status: "active" },
  { id: "c2", chamberTypeId: "lying15", status: "active" },
  { id: "c3", chamberTypeId: "sitting15", status: "active" },
  { id: "c4", chamberTypeId: "lying20", status: "active" },
  { id: "c5", chamberTypeId: "lying20", status: "maintenance" }, // not rentable
];

test("byType reports free chambers and the shared machine pool per type", () => {
  const byType = computeAvailabilityByType(chamberTypes, machineTypes, chambers, [], "2026-10-01", "2026-10-01");
  const lying15 = byType.find((t) => t.id === "lying15");
  assert.equal(lying15.totalChambers, 2);
  assert.equal(lying15.freeChambers, 2);
  assert.equal(lying15.machineTypeLabel, "1.5 ATA");
  assert.equal(lying15.freeSets, 2);
  assert.equal(lying15.available, 2);
  const lying20 = byType.find((t) => t.id === "lying20");
  assert.equal(lying20.totalChambers, 1); // maintenance chamber excluded
});

test("total available caps the shared 1.5 machine pool ONCE across postures (no double-count)", () => {
  // 3 free 1.5 chambers (2 lying + 1 sitting) but only 2 machine sets → total 1.5 = 2.
  const total = computeAvailableCount(chamberTypes, machineTypes, chambers, [], "2026-10-01", "2026-10-01");
  // 1.5 pool: min(2 lying + 1 sitting = 3 chambers, 2 sets) = 2 ; 2.0: min(1, 5) = 1
  assert.equal(total, 3);
});

test("a rental consumes a machine set from the shared pool for the window", () => {
  const rentals = [
    { id: "r1", chamberId: "c1", status: "active", startDate: "2026-09-01", endDate: "2026-12-01" },
  ];
  const byType = computeAvailabilityByType(chamberTypes, machineTypes, chambers, rentals, "2026-10-01", "2026-10-01");
  const lying15 = byType.find((t) => t.id === "lying15");
  const sitting15 = byType.find((t) => t.id === "sitting15");
  assert.equal(lying15.freeChambers, 1); // c1 busy
  assert.equal(lying15.freeSets, 1); // 2 - 1 used
  assert.equal(sitting15.freeSets, 1); // same shared pool reflects the usage
});

test("machineTypePoolFull blocks a second rental when only one set exists", () => {
  const oneSet = [{ id: "mt15", label: "1.5 ATA", count: 1 }];
  const rentals = [
    { id: "r1", chamberId: "c1", machineTypeId: "mt15", status: "scheduled", startDate: "2026-10-01", endDate: "2026-11-01" },
  ];
  assert.equal(machineTypePoolFull("mt15", oneSet, chamberTypes, chambers, rentals, "2026-10-15", "2026-10-20"), true);
  assert.equal(machineTypePoolFull("mt15", oneSet, chamberTypes, chambers, rentals, "2026-10-15", "2026-10-20", "r1"), false); // editing that rental
  assert.equal(machineTypePoolFull("mt15", oneSet, chamberTypes, chambers, rentals, "2026-12-05", "2026-12-10"), false); // no overlap
});

test("unlimited machine type (no count) leaves availability equal to free chambers", () => {
  const noCount = [{ id: "mt15", label: "1.5 ATA", count: null }];
  const byType = computeAvailabilityByType(chamberTypes, noCount, chambers, [], "2026-10-01", "2026-10-01");
  const lying15 = byType.find((t) => t.id === "lying15");
  assert.equal(lying15.setsConfigured, false);
  assert.equal(lying15.freeSets, null);
  assert.equal(lying15.available, 2);
});

test("migration derives machine + chamber types (with deterministic ids) from legacy chambers", () => {
  const legacyChambers = [
    { id: "p1", model: "Purebaric 1.5 ATA", ata: 1.5, posture: "lying", status: "active" },
    { id: "p2", model: "Purebaric 2.0 ATA", ata: 2.0, posture: "sitting", status: "active" },
  ];
  const mt = deriveMachineTypes([{ ata: 1.5, count: 3 }], legacyChambers);
  assert.deepEqual(mt.find((m) => m.id === "mt_1.5"), { id: "mt_1.5", label: "1.5 ATA", count: 3 });
  assert.equal(mt.find((m) => m.id === "mt_2").count, null); // derived from chamber, no count yet
  const ct = deriveChamberTypes(legacyChambers);
  assert.deepEqual(ct.find((t) => t.id === "ct_1.5_lying"), { id: "ct_1.5_lying", label: "1.5 ATA lying", machineTypeId: "mt_1.5" });
  // a legacy chamber with no chamberTypeId resolves to its derived type id
  assert.equal(chamberTypeIdOf(legacyChambers[0]), "ct_1.5_lying");
});
