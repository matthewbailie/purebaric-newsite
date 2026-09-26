// Pure helpers for the weekly "rentals ending soon" digest (see rental-ending-notify.js).
// The same rule is mirrored client-side in dashboard-metrics.js (endingSoon) for the admin
// list the alert links to; test/rental-ending.test.js keeps the two identical.

const LOOKAHEAD_DAYS = 10; // "a week and a half"; longer than the 7-day run interval, so no rental slips between runs
const DAY_MS = 86400000;
const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/;

const utc = (iso) => { const [y, m, d] = iso.split("-").map(Number); return Date.UTC(y, m - 1, d); };

function daysUntil(endDate, today) {
  return Math.round((utc(endDate) - utc(today)) / DAY_MS);
}

// Rentals still running (or scheduled) whose last day falls from today through `days` days out,
// soonest first. A digest, not a once-per-rental alert: a rental due to end can appear in two
// consecutive weekly digests, which doubles as a reminder.
function rentalsEndingSoon(rentals, today, days = LOOKAHEAD_DAYS) {
  return (rentals || [])
    .filter((r) => {
      if (!r || (r.status !== "active" && r.status !== "scheduled")) return false;
      if (!ISO_DAY.test(r.endDate || "")) return false;
      const left = daysUntil(r.endDate, today);
      return left >= 0 && left <= days;
    })
    .sort((a, b) => a.endDate.localeCompare(b.endDate) || String(a.id).localeCompare(String(b.id)));
}

// Deep links into the admin: sign in if needed, then confirm before any Stripe change.
// Opening a link never cancels anything.
function cancelLink(rentalId) {
  return `https://purebaric.com/admin?cancelRental=${encodeURIComponent(rentalId)}`;
}
const endingSoonLink = () => "https://purebaric.com/admin?endingSoon=1";

function shortDate(iso) {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
}

// Admin SMS policy (RUNBOOK §7f): never any customer name, phone, address or email in a text; a
// count, the earliest end date and an opaque link are fine. Ends with the STOP/HELP footer.
function endingSmsText(list, days = LOOKAHEAD_DAYS) {
  const n = list.length;
  return `Purebaric: ${n} rental${n === 1 ? "" : "s"} ${n === 1 ? "ends" : "end"} within the next ${days} days (first: ${shortDate(list[0].endDate)}). Review ${n === 1 ? "it" : "them"} or cancel Stripe subscriptions: ${endingSoonLink()} Reply STOP to opt out or HELP for help.`;
}

module.exports = { LOOKAHEAD_DAYS, daysUntil, rentalsEndingSoon, cancelLink, endingSoonLink, shortDate, endingSmsText };
