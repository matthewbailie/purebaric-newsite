// Groups every record about a person (manual customer records, rentals, booking requests, waitlist
// entries) into one customer each. Pure, so it is unit-tested in test/customers.test.js.
//
// Identity (owner's rule, 13 Oct 2026): the customer's name. When two customer records share a name,
// the phone number tells them apart, so each of those customers is keyed by name plus phone. A record
// with no name is keyed by its email, then its phone. Derived records (rentals, bookings, waitlist)
// join the customer whose name they carry; if no customer has that name they join one with the same
// email or phone; otherwise they start a new customer.
const { renterKey, nameKey, phoneDigits, normEmail } = require("./customer-key");

const emptyAddress = () => ({ street: "", city: "", state: "", zip: "" });

function groupCustomers({ manualCustomers = [], rentals = [], bookings = [], waitlist = [] }) {
  const byKey = new Map();
  const make = (key, email) => {
    if (!byKey.has(key)) {
      byKey.set(key, { key, nameKey: "", phoneDigits: "", email: normEmail(email) || "", manualId: null, name: "", phone: "", address: emptyAddress(), notes: "", tags: [], rentals: [], bookings: [], waitlist: [], totalPaid: 0, firstSeen: null, lastActivity: null });
    }
    return byKey.get(key);
  };
  const touch = (c, iso) => {
    if (!iso) return;
    if (!c.firstSeen || iso < c.firstSeen) c.firstSeen = iso;
    if (!c.lastActivity || iso > c.lastActivity) c.lastActivity = iso;
  };

  // Manual records first: they are the source of truth for name, phone, address, notes and tags.
  // Names that appear on more than one manual record are the collisions that need the phone tie-break.
  const nameCount = {};
  manualCustomers.forEach((m) => { const n = nameKey(m.name); if (n) nameCount[n] = (nameCount[n] || 0) + 1; });
  const keyFor = (p) => {
    const n = nameKey(p && p.name);
    if (n && nameCount[n] > 1) return `name:${n}|phone:${phoneDigits(p.phone)}`;
    return renterKey(p);
  };
  manualCustomers.forEach((m) => {
    const key = keyFor(m);
    if (!key) return;
    const c = make(key, m.email);
    c.manualId = m.id;
    c.name = m.name || c.name;
    c.email = normEmail(m.email) || c.email;
    c.phone = m.phone || c.phone;
    c.address = m.address || c.address;
    c.notes = m.notes || c.notes;
    c.tags = m.tags || c.tags;
    c.nameKey = nameKey(c.name); c.phoneDigits = phoneDigits(c.phone);
    touch(c, m.createdAt); touch(c, m.updatedAt);
  });

  // Where a derived record (rental, booking, waitlist entry) belongs.
  const customerFor = (p) => {
    const n = nameKey(p.name), digits = phoneDigits(p.phone), email = normEmail(p.email);
    const all = [...byKey.values()];
    if (n) {
      const sameName = all.filter((c) => c.nameKey === n);
      if (sameName.length === 1) return sameName[0];
      if (sameName.length > 1) {
        return sameName.find((c) => digits && c.phoneDigits === digits) || sameName.find((c) => email && c.email === email) || sameName.find((c) => !c.phoneDigits) || sameName[0];
      }
    }
    if (email) { const byEmail = all.find((c) => c.email === email); if (byEmail) return byEmail; }
    if (digits) { const byPhone = all.find((c) => c.phoneDigits === digits); if (byPhone) return byPhone; }
    const key = keyFor(p);
    if (!key) return null;
    const c = make(key, email);
    c.name = p.name || ""; c.phone = p.phone || ""; c.nameKey = n; c.phoneDigits = digits;
    return c;
  };
  const fill = (c, p) => {
    if (!c.name && p.name) { c.name = p.name; c.nameKey = nameKey(p.name); }
    if (!c.phone && p.phone) { c.phone = p.phone; c.phoneDigits = phoneDigits(p.phone); }
    if (!c.email && p.email) c.email = normEmail(p.email);
  };

  rentals.forEach((r) => {
    const p = r.renter || {};
    const c = customerFor(p);
    if (!c) return;
    c.rentals.push(r); fill(c, p);
    c.totalPaid += Number(r.paidAmount) || 0;
    touch(c, r.createdAt);
  });
  bookings.forEach((b) => {
    const p = { name: `${b.firstName || ""} ${b.lastName || ""}`.trim(), email: b.email, phone: b.phone };
    const c = customerFor(p);
    if (!c) return;
    c.bookings.push(b); fill(c, p);
    touch(c, b.createdAt);
  });
  waitlist.forEach((w) => {
    const p = { name: w.name, email: w.email, phone: w.phone };
    const c = customerFor(p);
    if (!c) return;
    c.waitlist.push(w); fill(c, p);
    touch(c, w.createdAt);
  });

  return [...byKey.values()].sort((a, b) => (b.lastActivity || "").localeCompare(a.lastActivity || ""));
}

// Which existing manual record a new one should merge into: same name, unless both have phone numbers
// and they differ (then it is a different person with the same name). A record with no name merges by email.
function findMergeTarget(all, data) {
  const n = nameKey(data.name), digits = phoneDigits(data.phone), email = normEmail(data.email);
  if (n) {
    const sameName = (all || []).filter((c) => nameKey(c.name) === n);
    return sameName.find((c) => !digits || !phoneDigits(c.phone) || phoneDigits(c.phone) === digits) || null;
  }
  if (email) return (all || []).find((c) => normEmail(c.email) === email) || null;
  if (digits) return (all || []).find((c) => !nameKey(c.name) && phoneDigits(c.phone) === digits) || null;
  return null;
}

// Another manual record that already holds this email (not the record being saved, and not the
// same-person record a new save merges into). Used to stop duplicate customers on Add/Edit customer.
function emailOnAnotherCustomer(all, data, selfId) {
  const email = normEmail(data.email);
  if (!email) return null;
  const self = selfId || ((findMergeTarget(all, data) || {}).id);
  return (all || []).find((c) => normEmail(c.email) === email && c.id !== self) || null;
}

module.exports = { groupCustomers, findMergeTarget, emailOnAnotherCustomer };
