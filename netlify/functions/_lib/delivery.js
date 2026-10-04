// Delivery availability for the "book a chamber" mode: which days the owner delivers, and on which of
// those days a chamber of a given style (and a machine) is free for the whole rental window.
// Pure: no storage, no network. Dates are YYYY-MM-DD strings; "today" is the owner's day (Mountain time).
"use strict";

const MODES = ["request", "book"];
const DEFAULTS = {
  mode: "request",            // request = reservation request (current site); book = pick a delivery date
  weekdaysOff: [0, 6],        // 0 = Sunday ... 6 = Saturday; never deliver on these
  blockedDates: [],           // specific YYYY-MM-DD days with no deliveries
  leadDays: 2,                // earliest delivery is this many days out
  horizonDays: 90,            // how far ahead a customer may book
  deliveryNote: "We will text or call to confirm the exact delivery time. Deliveries run until 9 p.m.",
};
const ISO = /^(\d{4})-(\d{2})-(\d{2})$/;
const HOLD_STATUSES = new Set(["new", "contacted", "approved"]);

function normalizeConfig(input) {
  const c = { ...DEFAULTS, ...(input || {}) };
  c.mode = MODES.includes(c.mode) ? c.mode : DEFAULTS.mode;
  const days = Array.isArray(c.weekdaysOff) ? c.weekdaysOff : String(c.weekdaysOff || "").split(",");
  c.weekdaysOff = [...new Set(days.map(d => parseInt(d, 10)).filter(d => d >= 0 && d <= 6))].sort();
  const blocked = Array.isArray(c.blockedDates) ? c.blockedDates : String(c.blockedDates || "").split(/[\s,]+/);
  c.blockedDates = [...new Set(blocked.map(d => String(d || "").trim()).filter(d => ISO.test(d) && parseIso(d)))].sort();
  const lead = parseInt(c.leadDays, 10);
  c.leadDays = Number.isFinite(lead) ? Math.max(0, Math.min(60, lead)) : DEFAULTS.leadDays;
  const hz = parseInt(c.horizonDays, 10);
  c.horizonDays = Number.isFinite(hz) ? Math.max(7, Math.min(180, hz)) : DEFAULTS.horizonDays;
  c.deliveryNote = String(c.deliveryNote || DEFAULTS.deliveryNote).trim().slice(0, 300) || DEFAULTS.deliveryNote;
  return c;
}

function parseIso(iso) {
  const m = ISO.exec(String(iso || ""));
  if (!m) return null;
  const y = +m[1], mo = +m[2], d = +m[3];
  const dt = new Date(Date.UTC(y, mo - 1, d));
  if (dt.getUTCFullYear() !== y || dt.getUTCMonth() !== mo - 1 || dt.getUTCDate() !== d) return null;
  return dt;
}
const fmt = dt => dt.toISOString().slice(0, 10);
function addDays(iso, n) { const dt = parseIso(iso); dt.setUTCDate(dt.getUTCDate() + n); return fmt(dt); }
function weekday(iso) { return parseIso(iso).getUTCDay(); }

// Same rule as the admin and rental-dates.js: end = start + N calendar months - 1 day, clamped to month end.
function addMonthsInclusive(iso, months) {
  const s = parseIso(iso); if (!s || !(months >= 1)) return "";
  const y = s.getUTCFullYear(), mo = s.getUTCMonth() + months, day = s.getUTCDate();
  const ty = y + Math.floor(mo / 12), tm = ((mo % 12) + 12) % 12;
  const last = new Date(Date.UTC(ty, tm + 1, 0)).getUTCDate();
  const ann = new Date(Date.UTC(ty, tm, Math.min(day, last)));
  ann.setUTCDate(ann.getUTCDate() - 1);
  return fmt(ann);
}

// The owner's calendar day in Utah, so a late-night booking does not shift "today".
function mountainToday(now = new Date()) {
  const p = new Intl.DateTimeFormat("en-US", { timeZone: "America/Denver", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(now);
  const g = t => (p.find(x => x.type === t) || {}).value;
  return `${g("year")}-${g("month")}-${g("day")}`;
}

function isDeliveryDay(config, iso) {
  if (!parseIso(iso)) return false;
  if (config.weekdaysOff.includes(weekday(iso))) return false;
  return !config.blockedDates.includes(iso);
}

const overlaps = (aS, aE, bS, bE) => aS <= bE && aE >= bS;
const liveRental = r => r && (r.status === "scheduled" || r.status === "active") && r.startDate && r.endDate;
const styleOf = c => String(c.style || c.posture || "lying").toLowerCase() === "sitting" ? "sitting" : "lying";

// Bookings made in book mode that the owner has not yet converted or rejected reserve their window.
function holdsFrom(bookings) {
  return (bookings || []).filter(b => b && b.bookingMode === "book" && HOLD_STATUSES.has(b.status) && b.startDate && b.endDate)
    .map(b => ({ style: styleOf({ style: b.chamberStyle }), startDate: b.startDate, endDate: b.endDate }));
}

// How many chamber+machine pairs of this style are free for the whole window.
function capacity({ chambers, machines, rentals, holds }, style, start, end) {
  const busy = (rentals || []).filter(liveRental).filter(r => overlaps(start, end, r.startDate, r.endDate));
  const freeC = (chambers || []).filter(c => c.status === "active" && styleOf(c) === style && !busy.some(r => r.chamberId === c.id)).length;
  const freeM = (machines || []).filter(m => m.status === "active" && !busy.some(r => r.machineId === m.id)).length;
  const hs = (holds || []).filter(h => overlaps(start, end, h.startDate, h.endDate));
  const holdC = hs.filter(h => h.style === style).length;
  return Math.max(0, Math.min(freeC - holdC, freeM - hs.length));
}

// Every day from the lead time to the horizon, with whether delivery of `style` for `months` can start then.
function availableDates({ config, chambers, machines, rentals, holds, style, months, today }) {
  const c = normalizeConfig(config);
  const st = styleOf({ style });
  const mo = Math.max(1, Math.min(12, parseInt(months, 10) || 1));
  const from = addDays(today, c.leadDays);
  const out = [];
  for (let i = 0; i <= c.horizonDays - c.leadDays; i++) {
    const date = addDays(from, i);
    const end = addMonthsInclusive(date, mo);
    const ok = isDeliveryDay(c, date) && capacity({ chambers, machines, rentals, holds }, st, date, end) > 0;
    out.push({ date, ok });
  }
  return out;
}

// Server-side check for one chosen date (the client's list may be stale).
function dateAvailable(args) {
  const { config, style, months, today, date } = args;
  const c = normalizeConfig(config);
  if (!parseIso(date)) return { ok: false, reason: "invalid date" };
  if (date < addDays(today, c.leadDays)) return { ok: false, reason: "too soon" };
  if (date > addDays(today, c.horizonDays)) return { ok: false, reason: "beyond the booking window" };
  if (!isDeliveryDay(c, date)) return { ok: false, reason: "no deliveries that day" };
  const mo = Math.max(1, Math.min(12, parseInt(months, 10) || 1));
  const end = addMonthsInclusive(date, mo);
  const cap = capacity(args, styleOf({ style }), date, end);
  return cap > 0 ? { ok: true, endDate: end } : { ok: false, reason: "no chamber free for that window" };
}

module.exports = { MODES, DEFAULTS, HOLD_STATUSES, normalizeConfig, parseIso, addDays, addMonthsInclusive, mountainToday, isDeliveryDay,
  holdsFrom, capacity, availableDates, dateAvailable, styleOf };
