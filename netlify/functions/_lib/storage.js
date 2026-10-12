const { getStore } = require("@netlify/blobs");
const { renterKey } = require("./customer-key");
const crypto = require("crypto");
const inventory = require("./inventory");
const serviceArea = require("./servicearea");
const delivery = require("./delivery");
const notifications = require("./notifications");
const layout = require("./layout");
const sms = require("./sms");
const stripeLib = require("./stripe");

const STORES = {
  chambers: "chambers",
  machines: "machines",
  rentals: "rentals",
  waitlist: "waitlist",
  waivers: "waivers",
  bookings: "bookings",
  customers: "customers",
  reviews: "reviews",
  settings: "settings",
  // Passkey admin auth (see _lib/passkeys.js, _lib/session.js).
  passkeyCredentials: "passkeyCredentials",
  adminSessions: "adminSessions",
  authChallenges: "authChallenges",
};

// Monthly rate per rental length (1-12 months). Editable in the admin (Pricing
// tab) and read by the whole site via /api/pricing. Defaults match the historic
// tiered rate() (1mo 729, 2-3mo 659, 4-11mo 579, 12mo 529).
const DEFAULT_PRICING = {
  1: 729, 2: 659, 3: 659, 4: 579, 5: 579, 6: 579,
  7: 579, 8: 579, 9: 579, 10: 579, 11: 579, 12: 529,
};

// Business rentals: $979 base, 10% off from 3 months, 15% from 6, 20% at 12 (editable in the admin Pricing tab).
const DEFAULT_BUSINESS_PRICING = {
  1: 979, 2: 979, 3: 881, 4: 881, 5: 881, 6: 832,
  7: 832, 8: 832, 9: 832, 10: 832, 11: 832, 12: 783,
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
//   style: "lying"|"sitting", status: "active"|"maintenance"|"archived",
//   notes, createdAt, archivedAt }
// "active" = rentable, "maintenance" = temporarily out of service, "archived" = soft-deleted.
// Live state (available/scheduled/inuse) is derived from rentals, not stored.

function withStyle(c) {
  return { ...c, style: inventory.chamberStyleOf(c) };
}

async function listChambers({ includeArchived = false } = {}) {
  const all = await listAll(STORES.chambers);
  return all
    .filter((c) => includeArchived || c.status !== "archived")
    .map(withStyle)
    .sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));
}

async function getChamber(id) {
  const c = await getOne(STORES.chambers, id);
  return c ? withStyle(c) : null;
}

async function createChamber({ name, style, notes = "" }) {
  const c = {
    id: newId(),
    name,
    style: inventory.normalizeStyle(style),
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
  if (typeof patch.style !== "undefined") updated.style = inventory.normalizeStyle(patch.style);
  return putOne(STORES.chambers, updated);
}

async function archiveChamber(id) {
  return updateChamber(id, { status: "archived", archivedAt: nowIso() });
}

// ───────── Machines ─────────
// shape: { id, name, status: "active"|"maintenance"|"archived", notes, createdAt, archivedAt }
// A machine = oxygen enricher + pressurizer + AC. A rental reserves one machine.

async function listMachines({ includeArchived = false } = {}) {
  const all = await listAll(STORES.machines);
  return all
    .filter((m) => includeArchived || m.status !== "archived")
    .sort((a, b) => (a.name || "").localeCompare(b.name || "", undefined, { numeric: true }));
}

async function getMachine(id) {
  return getOne(STORES.machines, id);
}

async function createMachine({ name, notes = "" }) {
  const m = {
    id: newId(),
    name,
    status: "active",
    notes,
    createdAt: nowIso(),
    archivedAt: null,
  };
  return putOne(STORES.machines, m);
}

async function updateMachine(id, patch) {
  const existing = await getOne(STORES.machines, id);
  if (!existing) return null;
  return putOne(STORES.machines, { ...existing, ...patch, id });
}

async function archiveMachine(id) {
  return updateMachine(id, { status: "archived", archivedAt: nowIso() });
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

// Returns the overlapping rental that would double-book the same chamber (or,
// when machineId is given, the same machine) over the window, else null.
// Cancelled/completed rentals are ignored.
async function findRentalConflict({ chamberId, machineId, startDate, endDate, excludeRentalId }) {
  if ((!chamberId && !machineId) || !startDate || !endDate) return null;
  const all = await listAll(STORES.rentals);
  return (
    all.find((r) =>
      r.id !== excludeRentalId &&
      (r.status === "scheduled" || r.status === "active") &&
      (chamberId ? r.chamberId === chamberId : r.machineId === machineId) &&
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
  // Units whose maintenance window has passed come back into service on their own.
  for (const [storeName, update] of [[STORES.chambers, updateChamber], [STORES.machines, updateMachine]]) {
    for (const u of await listAll(storeName)) {
      if (u.status === "maintenance" && u.maintenanceUntil && u.maintenanceUntil <= today) {
        await update(u.id, { status: "active", maintenanceUntil: "", maintenanceSince: "" });
        transitioned.push({ id: u.id, from: "maintenance", to: "active" });
      }
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
//   holdExpiresAt, notifiedChamberId, createdAt, notifiedAt, convertedRentalId,
//   wantsDiscount (asked for a reduced rate; contact when chambers sit idle), discountPrice (the monthly rate they asked for,
//   quoted in the chamber-ready email/text), source ("admin" when added by hand)
//   rentalType "residential"|"business" with businessName (admin-entered entries; website joins are residential),
//   confirmToken (random per hold; the Confirm button in the chamber-ready email), convertedBookingId, confirmedAt
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

// Delivery availability + website booking mode (settings key "deliveryAvailability"); rules in _lib/delivery.js.
async function getDeliveryAvailability() {
  const doc = await getOne(STORES.settings, "deliveryAvailability");
  return delivery.normalizeConfig(doc || {});
}
async function setDeliveryAvailability(input) {
  const clean = delivery.normalizeConfig(input);
  await store(STORES.settings).setJSON("deliveryAvailability", { id: "deliveryAvailability", ...clean, updatedAt: nowIso() });
  return clean;
}
// Bookings made in book mode that still reserve their window (see delivery.holdsFrom).
async function bookingHolds() {
  return delivery.holdsFrom(await listAll(STORES.bookings));
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

// ───────── Integration keys (settings) — Twilio + Stripe ─────────
// Secrets stored at settings/twilio and settings/stripe, editable in the admin.
// Portal config wins when complete; otherwise env vars are used. Getters here
// return the FULL config (secrets included) for internal use only — admin
// endpoints must mask before returning to the browser.

async function getTwilioConfig() {
  const doc = (await getOne(STORES.settings, "twilio")) || {};
  const stored = {
    accountSid: (doc.accountSid || "").trim(),
    authToken: (doc.authToken || "").trim(),
    fromNumber: (doc.fromNumber || "").trim(),
  };
  const paused = !!doc.paused;
  if (sms.isComplete(stored)) return { ...stored, paused, source: paused ? "paused" : "stored" };
  const env = sms.twilioConfigFromEnv();
  if (env) return { ...env, paused, source: paused ? "paused" : "env" };
  return { ...stored, paused, source: "none" };
}

async function setTwilioConfig(cfg) {
  const prev = (await getOne(STORES.settings, "twilio")) || {};
  const clean = {
    accountSid: (cfg.accountSid || "").trim(),
    // Keep the existing token when the field is left blank (never re-typed).
    authToken: (cfg.authToken || "").trim() || (prev.authToken || ""),
    fromNumber: (cfg.fromNumber || "").trim(),
    // Pause flag: keep the keys, send by carrier email-to-text instead (see sms.isComplete).
    paused: typeof cfg.paused === "boolean" ? cfg.paused : !!prev.paused,
  };
  await store(STORES.settings).setJSON("twilio", { id: "twilio", ...clean, updatedAt: nowIso() });
  return { ok: true };
}

async function getStripeConfig() {
  const doc = (await getOne(STORES.settings, "stripe")) || {};
  const stored = {
    secretKey: (doc.secretKey || "").trim(),
    webhookSecret: (doc.webhookSecret || "").trim(),
  };
  if (stored.secretKey) return { ...stored, source: "stored" };
  const env = stripeLib.stripeSecretFromEnv();
  if (env.secretKey) return { ...env, source: "env" };
  return { ...stored, source: "none" };
}

async function setStripeConfig(cfg) {
  const prev = (await getOne(STORES.settings, "stripe")) || {};
  const clean = {
    secretKey: (cfg.secretKey || "").trim() || (prev.secretKey || ""),
    webhookSecret: (cfg.webhookSecret || "").trim() || (prev.webhookSecret || ""),
  };
  await store(STORES.settings).setJSON("stripe", { id: "stripe", ...clean, updatedAt: nowIso() });
  return { ok: true };
}

// ───────── Availability ─────────

async function inventoryInputs() {
  const [chambers, machines, rentals] = await Promise.all([
    listChambers(),
    listMachines(),
    listAll(STORES.rentals),
  ]);
  return { chambers, machines, rentals };
}

async function countAvailableToday() {
  const today = new Date().toISOString().slice(0, 10);
  const { chambers, machines, rentals } = await inventoryInputs();
  const busyIds = new Set(
    rentals.filter((r) => inventory.rentalOccupiesWindow(r, today, today)).map((r) => r.chamberId)
  );
  const total = chambers.filter((c) => c.status === "active").length;
  const available = inventory.computeAvailableCount(chambers, machines, rentals, today, today);
  return { available, total, busyIds: [...busyIds] };
}

// Per chamber-style availability for a date window (defaults to today). Used by
// the public booking form.
async function availabilityByType({ startDate, endDate } = {}) {
  const today = new Date().toISOString().slice(0, 10);
  const start = startDate || today;
  const end = endDate || start;
  const { chambers, machines, rentals } = await inventoryInputs();
  return inventory.computeAvailabilityByStyle(chambers, machines, rentals, start, end);
}

// True when every active unit of a kind ("chamberId" | "machineId") is booked
// across the window. Used to warn on admin rental create/edit.
async function unitPoolFull({ kind, startDate, endDate, excludeRentalId } = {}) {
  const { chambers, machines, rentals } = await inventoryInputs();
  const units = kind === "machineId" ? machines : chambers;
  return inventory.unitPoolFull(units, rentals, kind, startDate, endDate, excludeRentalId);
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

// Upsert by email: a derived customer (one who only exists via their
// rentals/bookings/waitlist so far, no manual record yet) gets a manual
// record created the *first* time someone saves an edit for them. Without
// this check, every such save would call createManualCustomer again and pile
// up a fresh duplicate record per save, since the client only knows to PATCH
// once a manualId already exists on the customer it fetched.
async function createManualCustomer(data) {
  const email = normalizeEmail(data.email);
  const phone = String(data.phone || "").replace(/\D/g, "");
  // Merge into an existing record only on a real match: same email, or (no email) same phone number.
  const all = await listManualCustomers();
  const existing = email
    ? all.find((c) => normalizeEmail(c.email) === email)
    : (phone ? all.find((c) => !normalizeEmail(c.email) && String(c.phone || "").replace(/\D/g, "") === phone) : null);
  if (existing) {
    return updateManualCustomer(existing.id, {
      name: data.name || "",
      phone: data.phone || "",
      address: data.address || { street: "", city: "", state: "", zip: "" },
      notes: data.notes || "",
      tags: data.tags || [],
    });
  }
  const c = {
    id: newId(),
    email,
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
  // `key` groups a person's records; it is their email when they have one (rentals may fall back to
  // phone or name, see customer-key.js), and `email` is '' for someone with no email on file.
  function ensure(email, keyOverride) {
    const key = keyOverride || normalizeEmail(email);
    if (!key) return null;
    if (!map.has(key)) {
      map.set(key, {
        key,
        email: normalizeEmail(email) || "",
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
    const c = ensure(r.renter && r.renter.email, renterKey(r.renter));
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

function normalizeBusinessPricing(months) {
  const out = {};
  for (let m = 1; m <= 12; m++) {
    const v = Number(months && months[m]);
    out[m] = Number.isFinite(v) && v > 0 ? Math.round(v) : DEFAULT_BUSINESS_PRICING[m];
  }
  return out;
}
async function getBusinessPricing() {
  const doc = await getOne(STORES.settings, "businessPricing");
  return normalizeBusinessPricing(doc && doc.months);
}
async function setBusinessPricing(months) {
  const clean = normalizeBusinessPricing(months);
  await store(STORES.settings).setJSON("businessPricing", { id: "businessPricing", months: clean, updatedAt: nowIso() });
  return clean;
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

// ───────── Admin card layout (order of draggable cards per section) ─────────
async function getAdminLayout() {
  const doc = await getOne(STORES.settings, "adminLayout");
  return layout.cleanLayout(doc && doc.orders);
}
async function setAdminLayout(orders) {
  const clean = layout.cleanLayout(orders);
  await store(STORES.settings).setJSON("adminLayout", { id: "adminLayout", orders: clean, updatedAt: nowIso() });
  return clean;
}

// ───────── Passkey credentials + admin sessions (see _lib/passkeys.js, _lib/session.js) ─────────
// One admin "account" — there's a single real owner — so these are keyed only
// by their own id (credentialId / sessionId / challenge nonce), not by a user id.

async function listPasskeyCredentials() {
  return listAll(STORES.passkeyCredentials);
}
async function getPasskeyCredential(credentialId) {
  return getOne(STORES.passkeyCredentials, credentialId);
}
async function putPasskeyCredential(cred) {
  return putOne(STORES.passkeyCredentials, cred);
}
async function deletePasskeyCredential(credentialId) {
  await store(STORES.passkeyCredentials).delete(credentialId);
}

async function getAuthChallenge(nonce) {
  return getOne(STORES.authChallenges, nonce);
}
async function putAuthChallenge(nonce, challenge) {
  await store(STORES.authChallenges).setJSON(nonce, { id: nonce, challenge, createdAt: nowIso() });
}
async function deleteAuthChallenge(nonce) {
  await store(STORES.authChallenges).delete(nonce);
}

async function getAdminSession(sessionId) {
  return getOne(STORES.adminSessions, sessionId);
}
async function putAdminSession(session) {
  return putOne(STORES.adminSessions, session);
}
async function deleteAdminSession(sessionId) {
  await store(STORES.adminSessions).delete(sessionId);
}

module.exports = {
  inventoryInputs,
  getDeliveryAvailability,
  setDeliveryAvailability,
  bookingHolds,
  STORES,
  newId,
  nowIso,
  store,
  listPasskeyCredentials,
  getPasskeyCredential,
  putPasskeyCredential,
  deletePasskeyCredential,
  getAdminLayout,
  setAdminLayout,
  getAuthChallenge,
  putAuthChallenge,
  deleteAuthChallenge,
  getAdminSession,
  putAdminSession,
  deleteAdminSession,
  listChambers,
  getChamber,
  createChamber,
  updateChamber,
  archiveChamber,
  listMachines,
  getMachine,
  createMachine,
  updateMachine,
  archiveMachine,
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
  DEFAULT_BUSINESS_PRICING,
  getBusinessPricing,
  setBusinessPricing,
  getPricing,
  setPricing,
  getServiceArea,
  setServiceArea,
  getNotifications,
  setNotifications,
  getTwilioConfig,
  setTwilioConfig,
  getStripeConfig,
  setStripeConfig,
  countAvailableToday,
  availabilityByType,
  unitPoolFull,
  nextAvailableByChamber,
  saveWaiver,
  getWaiver,
};
