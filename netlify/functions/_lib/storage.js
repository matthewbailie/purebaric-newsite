const { getStore } = require("@netlify/blobs");
const crypto = require("crypto");
const inventory = require("./inventory");
const serviceArea = require("./servicearea");
const notifications = require("./notifications");

const STORES = {
  chambers: "chambers",
  rentals: "rentals",
  waitlist: "waitlist",
  waivers: "waivers",
  bookings: "bookings",
  customers: "customers",
  reviews: "reviews",
  settings: "settings",
};

// Monthly rate per rental length (1-12 months). Editable in the admin (Pricing
// tab) and read by the whole site via /api/pricing. Defaults match the historic
// tiered rate() (1mo 729, 2-3mo 659, 4-11mo 579, 12mo 529).
const DEFAULT_PRICING = {
  1: 729, 2: 659, 3: 659, 4: 579, 5: 579, 6: 579,
  7: 579, 8: 579, 9: 579, 10: 579, 11: 579, 12: 529,
};

function newId() {
  return crypto.randomUUID();
}

function nowIso() {
  return new Date().toISOString();
}

function store(name) {
  // Prefer Netlify's automatic Blobs context (no token, never expires). This
  // site is deployed manually, where auto-context is often NOT injected, so we
  // fall back to explicit siteID + token from env vars. Keep NETLIFY_API_TOKEN
  // valid, an expired token is what caused the 401 Blobs errors.
  try {
    return getStore(name);
  } catch (e) {
    const siteID = process.env.NETLIFY_SITE_ID || process.env.SITE_ID;
    const token = process.env.NETLIFY_API_TOKEN || process.env.NETLIFY_AUTH_TOKEN;
    if (siteID && token) {
      return getStore({ name, siteID, token });
    }
    throw e;
  }
}

async function listAll(storeName) {
  const s = store(storeName);
  const { blobs } = await s.list();
  const items = await Promise.all(
    blobs.map(({ key }) => s.get(key, { type: "json" }))
  );
  return items.filter(Boolean);
}

async function getOne(storeName, id) {
  return store(storeName).get(id, { type: "json" });
}

async function putOne(storeName, value) {
  await store(storeName).setJSON(value.id, value);
  return value;
}

async function deleteOne(storeName, id) {
  await store(storeName).delete(id);
}

// ───────── Chambers ─────────
// shape: { id, name, model, ata (number), posture: "lying"|"sitting",
//   status: "active"|"maintenance"|"archived", notes, createdAt, archivedAt }
// "active" = rentable, "maintenance" = temporarily out of service, "archived" = soft-deleted.
// ata/posture are the structured "chamber type"; legacy records without them are
// backfilled on read from the model string.

function withChamberType(c) {
  // chamberTypeId is authoritative; ata/posture kept for legacy display + migration.
  return { ...c, ata: inventory.inferAta(c), posture: inventory.inferPosture(c), chamberTypeId: inventory.chamberTypeIdOf(c) };
}

async function listChambers({ includeArchived = false } = {}) {
  const all = await listAll(STORES.chambers);
  return all
    .filter((c) => includeArchived || c.status !== "archived")
    .map(withChamberType)
    .sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));
}

async function getChamber(id) {
  const c = await getOne(STORES.chambers, id);
  return c ? withChamberType(c) : null;
}

async function createChamber({ name, chamberTypeId, notes = "" }) {
  const c = {
    id: newId(),
    name,
    chamberTypeId: chamberTypeId || null,
    status: "active",
    notes,
    createdAt: nowIso(),
    archivedAt: null,
  };
  return putOne(STORES.chambers, c);
}

async function updateChamber(id, patch) {
  const existing = await getOne(STORES.chambers, id);
  if (!existing) return null;
  const updated = { ...existing, ...patch, id };
  if (typeof patch.chamberTypeId !== "undefined") updated.chamberTypeId = patch.chamberTypeId || null;
  return putOne(STORES.chambers, updated);
}

async function archiveChamber(id) {
  return updateChamber(id, { status: "archived", archivedAt: nowIso() });
}

// ───────── Rentals ─────────
// shape: {
//   id, chamberId, status: "scheduled"|"active"|"completed"|"cancelled",
//   renter: { name, email, phone, address: { street, city, state, zip } },
//   startDate, endDate, monthlyRate, notes,
//   waiverFileKey, createdAt, updatedAt
// }

async function listRentals({ chamberId, status, activeOn } = {}) {
  const all = await listAll(STORES.rentals);
  let filtered = all;
  if (chamberId) filtered = filtered.filter((r) => r.chamberId === chamberId);
  if (status) filtered = filtered.filter((r) => r.status === status);
  if (activeOn) {
    const day = activeOn.slice(0, 10);
    filtered = filtered.filter(
      (r) =>
        r.startDate <= day &&
        r.endDate >= day &&
        (r.status === "scheduled" || r.status === "active")
    );
  }
  return filtered.sort((a, b) => a.startDate.localeCompare(b.startDate));
}

async function createRental(data) {
  const r = {
    id: newId(),
    status: "scheduled",
    waiverFileKey: null,
    notes: "",
    paymentStatus: "unpaid", // unpaid | partial | paid | refunded
    paidAmount: 0,
    paymentDate: null,
    paymentMethod: "",
    createdAt: nowIso(),
    updatedAt: nowIso(),
    ...data,
  };
  return putOne(STORES.rentals, r);
}

async function getRental(id) {
  return getOne(STORES.rentals, id);
}

// Returns the overlapping rental if {startDate, endDate, chamberId} would conflict,
// otherwise null. Cancelled/completed rentals are ignored.
async function findRentalConflict({ chamberId, startDate, endDate, excludeRentalId }) {
  if (!chamberId || !startDate || !endDate) return null;
  const all = await listRentals({ chamberId });
  return (
    all.find((r) =>
      r.id !== excludeRentalId &&
      (r.status === "scheduled" || r.status === "active") &&
      r.startDate <= endDate &&
      r.endDate >= startDate
    ) || null
  );
}

// Auto status transitions based on today's date.
// Returns { transitioned: [{id, from, to}, ...] }
async function autoTransitionRentals() {
  const today = new Date().toISOString().slice(0, 10);
  const all = await listAll(STORES.rentals);
  const transitioned = [];
  for (const r of all) {
    let next = null;
    if (r.status === "scheduled" && r.startDate <= today && r.endDate >= today) next = "active";
    else if ((r.status === "scheduled" || r.status === "active") && r.endDate < today) next = "completed";
    if (next && next !== r.status) {
      await updateRental(r.id, { status: next });
      transitioned.push({ id: r.id, from: r.status, to: next });
    }
  }
  return { transitioned };
}

async function updateRental(id, patch) {
  const existing = await getOne(STORES.rentals, id);
  if (!existing) return null;
  const updated = { ...existing, ...patch, id, updatedAt: nowIso() };
  return putOne(STORES.rentals, updated);
}

// ───────── Waitlist ─────────
// shape: {
//   id, name, email, phone, zip, reason, preferredStartDate,
//   status: "queued"|"hold"|"notified"|"converted"|"expired",
//   holdExpiresAt, notifiedChamberId, createdAt, notifiedAt, convertedRentalId
// }

async function listWaitlist({ status } = {}) {
  const all = await listAll(STORES.waitlist);
  let filtered = all;
  if (status) filtered = filtered.filter((w) => w.status === status);
  return filtered.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

async function createWaitlistEntry(data) {
  const w = {
    id: newId(),
    status: "queued",
    holdExpiresAt: null,
    notifiedChamberId: null,
    notifiedAt: null,
    convertedRentalId: null,
    adminNotes: "",
    createdAt: nowIso(),
    ...data,
  };
  return putOne(STORES.waitlist, w);
}

async function updateWaitlistEntry(id, patch) {
  const existing = await getOne(STORES.waitlist, id);
  if (!existing) return null;
  const updated = { ...existing, ...patch, id };
  return putOne(STORES.waitlist, updated);
}

// ───────── Bookings ─────────
// shape: {
//   id, status: "new"|"contacted"|"approved"|"rejected"|"converted",
//   firstName, lastName, email, phone, zip,
//   streetAddress, city, state,
//   startDate, rentalLength, reason, priorExperience,
//   medicalScreeningFlags, consentMedical, consentTerms,
//   outOfArea (true = ZIP outside the delivery area; no customer email sent),
//   analytics: { consentGranted, clientId, sessionId, rentalConfirmedAt, rentalConfirmedEvent },
//   adminNotes, convertedRentalId, createdAt, updatedAt
// }

async function listBookings({ status } = {}) {
  const all = await listAll(STORES.bookings);
  let filtered = all;
  if (status) filtered = filtered.filter((b) => b.status === status);
  return filtered.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

async function createBooking(data) {
  const b = {
    id: newId(),
    status: "new",
    adminNotes: "",
    convertedRentalId: null,
    createdAt: nowIso(),
    updatedAt: nowIso(),
    ...data,
  };
  return putOne(STORES.bookings, b);
}

async function getBooking(id) {
  return getOne(STORES.bookings, id);
}

async function updateBooking(id, patch) {
  const existing = await getOne(STORES.bookings, id);
  if (!existing) return null;
  const updated = { ...existing, ...patch, id, updatedAt: nowIso() };
  return putOne(STORES.bookings, updated);
}

// ───────── Machine types & chamber types (settings) ─────────
// settings/machineTypes: { types: [{ id, label, count }] }  count null = unlimited.
// settings/chamberTypes: { types: [{ id, label, machineTypeId }] }.
// When unset, both are derived deterministically from existing chambers (and the
// legacy settings/machineSets pool) so nothing breaks before the owner edits them.

async function getMachineTypes() {
  const doc = await getOne(STORES.settings, "machineTypes");
  if (doc && Array.isArray(doc.types)) return inventory.normalizeMachineTypes(doc.types);
  const [legacy, chambers] = await Promise.all([getOne(STORES.settings, "machineSets"), listChambers()]);
  return inventory.deriveMachineTypes(legacy && legacy.sets, chambers);
}

async function setMachineTypes(types) {
  const clean = inventory.normalizeMachineTypes(types).map((t) => ({ ...t, id: t.id || newId() }));
  await store(STORES.settings).setJSON("machineTypes", { id: "machineTypes", types: clean, updatedAt: nowIso() });
  return clean;
}

async function getChamberTypes() {
  const doc = await getOne(STORES.settings, "chamberTypes");
  if (doc && Array.isArray(doc.types)) return inventory.normalizeChamberTypes(doc.types);
  return inventory.deriveChamberTypes(await listChambers());
}

async function setChamberTypes(types) {
  const clean = inventory.normalizeChamberTypes(types).map((t) => ({ ...t, id: t.id || newId() }));
  await store(STORES.settings).setJSON("chamberTypes", { id: "chamberTypes", types: clean, updatedAt: nowIso() });
  return clean;
}

// The machine type a chamber requires (via its chamber type).
async function machineTypeForChamber(chamberId) {
  const [chamber, chamberTypes] = await Promise.all([getChamber(chamberId), getChamberTypes()]);
  if (!chamber) return null;
  const ct = chamberTypes.find((t) => t.id === inventory.chamberTypeIdOf(chamber));
  return ct ? ct.machineTypeId : inventory.legacyMachineTypeId(inventory.inferAta(chamber));
}

// ───────── Service area (settings) ─────────
// One blob at settings/serviceArea: { prefixes: [...], zips: [...] }. Admin-managed
// delivery ZIP rule. Unset = the historic default (mirrors the old hardcoded gate).

async function getServiceArea() {
  const doc = await getOne(STORES.settings, "serviceArea");
  if (!doc || (!Array.isArray(doc.prefixes) && !Array.isArray(doc.zips))) {
    return { ...serviceArea.DEFAULT_SERVICE_AREA };
  }
  return serviceArea.normalizeServiceArea(doc);
}

async function setServiceArea(area) {
  const clean = serviceArea.normalizeServiceArea(area);
  await store(STORES.settings).setJSON("serviceArea", { id: "serviceArea", ...clean, updatedAt: nowIso() });
  return clean;
}

// ───────── Notifications (settings) ─────────
// One blob at settings/notifications: { recipients: [{ id, label, number, carrier, events }] }.
// Admin-managed SMS recipients (free carrier email-to-text). Default = none.

async function getNotifications() {
  const doc = await getOne(STORES.settings, "notifications");
  return notifications.normalizeNotifications(doc || {});
}

async function setNotifications(config) {
  const clean = notifications.normalizeNotifications(config);
  await store(STORES.settings).setJSON("notifications", { id: "notifications", ...clean, updatedAt: nowIso() });
  return clean;
}

// ───────── Availability ─────────

async function inventoryInputs() {
  const [chamberTypes, machineTypes, chambers, rentals] = await Promise.all([
    getChamberTypes(),
    getMachineTypes(),
    listChambers(),
    listAll(STORES.rentals),
  ]);
  return { chamberTypes, machineTypes, chambers, rentals };
}

async function countAvailableToday() {
  const today = new Date().toISOString().slice(0, 10);
  const { chamberTypes, machineTypes, chambers, rentals } = await inventoryInputs();
  const busyIds = new Set(
    rentals.filter((r) => inventory.rentalOccupiesWindow(r, today, today)).map((r) => r.chamberId)
  );
  const total = chambers.filter((c) => c.status === "active").length;
  const available = inventory.computeAvailableCount(chamberTypes, machineTypes, chambers, rentals, today, today);
  return { available, total, busyIds: [...busyIds] };
}

// Per chamber-type availability for a date window (defaults to today). Used by
// the admin availability view and the public booking form.
async function availabilityByType({ startDate, endDate } = {}) {
  const today = new Date().toISOString().slice(0, 10);
  const start = startDate || today;
  const end = endDate || start;
  const { chamberTypes, machineTypes, chambers, rentals } = await inventoryInputs();
  return inventory.computeAvailabilityByType(chamberTypes, machineTypes, chambers, rentals, start, end);
}

// True when assigning one more rental drawing this machine type would oversubscribe
// its pool across the window. Used to guard admin rental creation/edits.
async function machineTypePoolFull({ machineTypeId, startDate, endDate, excludeRentalId } = {}) {
  const { chamberTypes, machineTypes, chambers, rentals } = await inventoryInputs();
  return inventory.machineTypePoolFull(machineTypeId, machineTypes, chamberTypes, chambers, rentals, startDate, endDate, excludeRentalId);
}

// Returns next-available date for each chamber (or null = available now).
// Considers maintenance status and future scheduled rentals.
async function nextAvailableByChamber() {
  const today = new Date().toISOString().slice(0, 10);
  const [chambers, allRentals] = await Promise.all([
    listChambers({ includeArchived: false }),
    listAll(STORES.rentals),
  ]);
  const map = {};
  for (const c of chambers) {
    if (c.status === "maintenance") {
      map[c.id] = { status: "maintenance", nextAvailable: null };
      continue;
    }
    // Find the latest active/scheduled rental whose endDate is in the future
    const upcoming = allRentals
      .filter((r) => r.chamberId === c.id && (r.status === "scheduled" || r.status === "active"))
      .filter((r) => r.endDate >= today)
      .sort((a, b) => a.startDate.localeCompare(b.startDate));
    if (!upcoming.length) {
      map[c.id] = { status: "available", nextAvailable: today };
    } else {
      // Walk through contiguous rentals to find first gap
      let cursor = today;
      for (const r of upcoming) {
        if (r.startDate > cursor) break; // gap before this rental
        const dayAfter = new Date(new Date(r.endDate).getTime() + 86400000).toISOString().slice(0, 10);
        if (dayAfter > cursor) cursor = dayAfter;
      }
      map[c.id] = {
        status: cursor === today ? "available" : "busy",
        nextAvailable: cursor,
      };
    }
  }
  return map;
}

// ───────── Customers (derived view) ─────────
// Group rentals + bookings + waitlist entries by email. Each "customer" is
// the union of records sharing the same lowercased email.

function normalizeEmail(e) {
  return (e || "").trim().toLowerCase();
}

// Manual customer record (separately created via the admin UI)
// shape: { id, email, name, phone, address, notes, tags[], createdAt, updatedAt }

async function listManualCustomers() {
  return listAll(STORES.customers);
}

async function createManualCustomer(data) {
  const c = {
    id: newId(),
    email: normalizeEmail(data.email),
    name: (data.name || "").trim(),
    phone: (data.phone || "").trim(),
    address: data.address || { street: "", city: "", state: "", zip: "" },
    notes: data.notes || "",
    tags: data.tags || [],
    createdAt: nowIso(),
    updatedAt: nowIso(),
  };
  return putOne(STORES.customers, c);
}

async function updateManualCustomer(id, patch) {
  const existing = await getOne(STORES.customers, id);
  if (!existing) return null;
  const updated = { ...existing, ...patch, id, updatedAt: nowIso() };
  if (patch.email) updated.email = normalizeEmail(patch.email);
  return putOne(STORES.customers, updated);
}

async function listCustomers() {
  const [rentals, bookings, waitlist, manualCustomers] = await Promise.all([
    listAll(STORES.rentals),
    listAll(STORES.bookings),
    listAll(STORES.waitlist),
    listAll(STORES.customers),
  ]);
  const map = new Map();
  function ensure(email) {
    const key = normalizeEmail(email);
    if (!key) return null;
    if (!map.has(key)) {
      map.set(key, {
        email: key,
        manualId: null,
        name: "",
        phone: "",
        address: { street: "", city: "", state: "", zip: "" },
        notes: "",
        tags: [],
        rentals: [],
        bookings: [],
        waitlist: [],
        totalPaid: 0,
        firstSeen: null,
        lastActivity: null,
      });
    }
    return map.get(key);
  }

  // Seed from manually-created customers first, these are the source of truth for name/phone/address/notes/tags
  for (const m of manualCustomers) {
    const c = ensure(m.email);
    if (!c) continue;
    c.manualId = m.id;
    c.name = m.name || c.name;
    c.phone = m.phone || c.phone;
    c.address = m.address || c.address;
    c.notes = m.notes || c.notes;
    c.tags = m.tags || c.tags;
    if (!c.firstSeen || m.createdAt < c.firstSeen) c.firstSeen = m.createdAt;
    if (!c.lastActivity || m.updatedAt > c.lastActivity) c.lastActivity = m.updatedAt;
  }
  function touch(c, iso) {
    if (!c.firstSeen || iso < c.firstSeen) c.firstSeen = iso;
    if (!c.lastActivity || iso > c.lastActivity) c.lastActivity = iso;
  }
  for (const r of rentals) {
    const c = ensure(r.renter && r.renter.email);
    if (!c) continue;
    c.rentals.push(r);
    if (r.renter) {
      if (!c.name && r.renter.name) c.name = r.renter.name;
      if (!c.phone && r.renter.phone) c.phone = r.renter.phone;
    }
    c.totalPaid += Number(r.paidAmount) || 0;
    touch(c, r.createdAt);
  }
  for (const b of bookings) {
    const c = ensure(b.email);
    if (!c) continue;
    c.bookings.push(b);
    const fullName = `${b.firstName || ""} ${b.lastName || ""}`.trim();
    if (!c.name && fullName) c.name = fullName;
    if (!c.phone && b.phone) c.phone = b.phone;
    touch(c, b.createdAt);
  }
  for (const w of waitlist) {
    const c = ensure(w.email);
    if (!c) continue;
    c.waitlist.push(w);
    if (!c.name && w.name) c.name = w.name;
    if (!c.phone && w.phone) c.phone = w.phone;
    touch(c, w.createdAt);
  }
  return Array.from(map.values()).sort((a, b) =>
    (b.lastActivity || "").localeCompare(a.lastActivity || "")
  );
}

// ───────── Reviews / testimonials ─────────
// shape: { id, firstName, lastInitial, city, text,
//   status: "pending"|"published"|"rejected", createdAt, publishedAt }
// Submitted "pending"; only "published" reviews are shown on the public site.

async function listReviews({ status } = {}) {
  const all = await listAll(STORES.reviews);
  let filtered = all;
  if (status) filtered = filtered.filter((r) => r.status === status);
  return filtered.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

async function listPublishedReviews() {
  const all = await listAll(STORES.reviews);
  return all
    .filter((r) => r.status === "published")
    .sort((a, b) =>
      (b.publishedAt || b.createdAt).localeCompare(a.publishedAt || a.createdAt)
    );
}

async function createReview(data) {
  const r = {
    id: newId(),
    firstName: (data.firstName || "").trim().slice(0, 40),
    lastInitial: (data.lastInitial || "").trim().slice(0, 1).toUpperCase(),
    city: (data.city || "").trim().slice(0, 60),
    text: (data.text || "").trim().slice(0, 1500),
    status: "pending",
    createdAt: nowIso(),
    publishedAt: null,
  };
  return putOne(STORES.reviews, r);
}

async function updateReview(id, patch) {
  const existing = await getOne(STORES.reviews, id);
  if (!existing) return null;
  const updated = { ...existing, ...patch, id };
  return putOne(STORES.reviews, updated);
}

// ───────── Pricing (settings) ─────────
// One blob at settings/pricing: { months: { "1": 729, ... "12": 529 } }.

function normalizePricing(months) {
  const out = {};
  for (let m = 1; m <= 12; m++) {
    const v = Number(months && months[m]);
    out[m] = Number.isFinite(v) && v > 0 ? Math.round(v) : DEFAULT_PRICING[m];
  }
  return out;
}

async function getPricing() {
  const doc = await getOne(STORES.settings, "pricing");
  return normalizePricing(doc && doc.months);
}

async function setPricing(months) {
  const clean = normalizePricing(months);
  await store(STORES.settings).setJSON("pricing", { id: "pricing", months: clean, updatedAt: nowIso() });
  return clean;
}

// ───────── Waivers (binary blob storage) ─────────

async function saveWaiver(rentalId, buffer, contentType) {
  const s = store(STORES.waivers);
  const key = `${rentalId}/${nowIso()}`;
  await s.set(key, buffer, { metadata: { contentType, rentalId } });
  return key;
}

async function getWaiver(key) {
  const s = store(STORES.waivers);
  const blob = await s.get(key, { type: "arrayBuffer" });
  const meta = await s.getMetadata(key);
  return { blob, metadata: meta?.metadata };
}

module.exports = {
  STORES,
  newId,
  nowIso,
  store,
  listChambers,
  getChamber,
  createChamber,
  updateChamber,
  archiveChamber,
  listRentals,
  getRental,
  createRental,
  updateRental,
  findRentalConflict,
  autoTransitionRentals,
  listWaitlist,
  createWaitlistEntry,
  updateWaitlistEntry,
  listBookings,
  getBooking,
  createBooking,
  updateBooking,
  listCustomers,
  listManualCustomers,
  createManualCustomer,
  updateManualCustomer,
  listReviews,
  listPublishedReviews,
  createReview,
  updateReview,
  DEFAULT_PRICING,
  getPricing,
  setPricing,
  getMachineTypes,
  setMachineTypes,
  getChamberTypes,
  setChamberTypes,
  machineTypeForChamber,
  getServiceArea,
  setServiceArea,
  getNotifications,
  setNotifications,
  countAvailableToday,
  availabilityByType,
  machineTypePoolFull,
  nextAvailableByChamber,
  saveWaiver,
  getWaiver,
};
