// Works out what a rental has actually been paid, from Stripe's own payment records, so the
// portal's "paid" total can't drift from what Stripe collected. Used by the webhook (on every
// payment or refund event) and by the rental form's "Sync payments from Stripe" button. Because it
// recomputes the whole total from Stripe each time, replaying an event is always safe.
// Pure apart from the `stripe` client passed in — unit-tested with a fake in test/stripe-sync.test.js.

const DAY = 86400000;
// Calendar day of a Stripe timestamp in Mountain time, the business's day. Using the UTC day
// put a late-evening payment on the next day, which kept a paid rental out of the admin's MRR.
const MT = new Intl.DateTimeFormat("en-US", { timeZone: "America/Denver", year: "numeric", month: "2-digit", day: "2-digit" });
const isoOf = (seconds) => { const p = Object.fromEntries(MT.formatToParts(new Date(seconds * 1000)).map((x) => [x.type, x.value])); return `${p.year}-${p.month}-${p.day}`; };
const day10 = (v) => String(v || "").slice(0, 10);
const utc = (d) => { const [y, m, dd] = d.split("-").map(Number); return Date.UTC(y, m - 1, dd); };
const addDays = (d, n) => new Date(utc(d) + n * DAY).toISOString().slice(0, 10);
function addMonths(d, k) {
  const [y, m, dd] = d.split("-").map(Number);
  const idx = m - 1 + k, year = y + Math.floor(idx / 12), month = ((idx % 12) + 12) % 12;
  return new Date(Date.UTC(year, month, Math.min(dd, new Date(Date.UTC(year, month + 1, 0)).getUTCDate()))).toISOString().slice(0, 10);
}

// What should have been collected by `today`: one payment at the start date and one on each later
// billing date (monthly anniversaries; every 7 days for a weekly rental) up to the rental's end.
function amountDueToDate(rental, today) {
  const start = day10(rental.startDate), end = day10(rental.endDate);
  const rate = Number(rental.monthlyRate) || 0;
  if (!start || !end || !rate || start > today) return 0;
  const last = end < today ? end : today;
  let n = 0;
  for (let k = 0; k < 600; k += 1) {
    const date = rental.rateType === "weekly" ? addDays(start, 7 * k) : addMonths(start, k);
    if (date > last) break;
    n += 1;
  }
  return rate * n;
}

// unpaid: nothing received. paid: at least what is due so far. partial: some, but less than due.
function statusFor(rental, total, today) {
  if (total <= 0.005) return "unpaid";
  return total + 0.005 >= amountDueToDate(rental, today) ? "paid" : "partial";
}

// All succeeded Stripe payments that belong to this rental: those tagged with its id (payment links),
// plus those from a Stripe customer with the renter's email that were made during the rental
// (from 14 days before it starts to 14 days after it ends). Refunds are netted off.
async function collectPayments(stripe, rental) {
  const email = String((rental.renter && rental.renter.email) || "").trim().toLowerCase();
  const from = addDays(day10(rental.startDate), -14), to = addDays(day10(rental.endDate), 14);
  const byId = new Map();
  const consider = (pi) => {
    if (!pi || pi.status !== "succeeded" || byId.has(pi.id)) return;
    const taggedFor = pi.metadata && pi.metadata.rental_id;
    if (taggedFor && taggedFor !== rental.id) return; // belongs to a different rental
    const date = isoOf(pi.created);
    if (!taggedFor && (date < from || date > to)) return;
    const charge = pi.latest_charge && typeof pi.latest_charge === "object" ? pi.latest_charge : null;
    const received = (pi.amount_received != null ? pi.amount_received : pi.amount) || 0;
    const refunded = (charge && charge.amount_refunded) || 0;
    byId.set(pi.id, { id: pi.id, date, amount: (received - refunded) / 100, refunded: refunded / 100 });
  };
  try {
    const found = await stripe.paymentIntents.search({ query: `metadata['rental_id']:'${rental.id}'`, limit: 100, expand: ["data.latest_charge"] });
    (found.data || []).forEach(consider);
  } catch (err) { console.error("stripe payment search failed", err.message); }
  if (email) {
    const customers = await stripe.customers.list({ email, limit: 20 });
    for (const c of customers.data || []) {
      const list = await stripe.paymentIntents.list({ customer: c.id, limit: 100, expand: ["data.latest_charge"] });
      (list.data || []).forEach(consider);
    }
  }
  return [...byId.values()].sort((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id));
}

// The fields to save on the rental so its paid total, status and payment history match Stripe.
async function syncRentalPayments(stripe, rental, today) {
  const payments = await collectPayments(stripe, rental);
  const total = Math.round(payments.reduce((s, p) => s + p.amount, 0) * 100) / 100;
  const last = payments.filter((p) => p.amount > 0).pop();
  return {
    payments,
    total,
    patch: {
      stripePayments: payments,
      paidAmount: total,
      paymentStatus: statusFor(rental, total, today),
      paymentDate: last ? last.date : rental.paymentDate || null,
      paymentMethod: payments.length ? "stripe" : rental.paymentMethod || "",
      stripePaymentIntentId: last ? last.id : rental.stripePaymentIntentId || null,
      stripeSyncedAt: new Date().toISOString(),
    },
  };
}

// Which rental does a payment from `email` on `date` belong to? The renter's rental running that day;
// else the next one to start; else the most recent one. Cancelled rentals are ignored.
function pickRental(rentals, email, date) {
  const mine = (rentals || []).filter((r) => r.status !== "cancelled" && String((r.renter && r.renter.email) || "").trim().toLowerCase() === String(email || "").trim().toLowerCase() && day10(r.startDate));
  if (!mine.length) return null;
  const running = mine.filter((r) => day10(r.startDate) <= date && day10(r.endDate) >= date);
  if (running.length) return running.sort((a, b) => day10(b.startDate).localeCompare(day10(a.startDate)))[0];
  const upcoming = mine.filter((r) => day10(r.startDate) > date).sort((a, b) => day10(a.startDate).localeCompare(day10(b.startDate)));
  if (upcoming.length) return upcoming[0];
  return mine.sort((a, b) => day10(b.startDate).localeCompare(day10(a.startDate)))[0];
}

module.exports = { amountDueToDate, statusFor, collectPayments, syncRentalPayments, pickRental };
