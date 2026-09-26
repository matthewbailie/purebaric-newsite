// Business metrics for the admin Home tab, computed in the browser from the
// rentals/bookings/chambers the portal already loads. Pure, so it is unit-tested
// in test/dashboard-metrics.test.js.
//
// Definitions (keep in sync with RUNBOOK §11):
//  - A rental counts on a day when it is not cancelled and start <= day <= end.
//  - Monthly-equivalent revenue: a monthly rental's rate; a custom weekly rental's
//    weekly rate x 52/12.
//  - MRR = sum of monthly-equivalent revenue of the rentals counting that day.
//    Monthly points are month-end snapshots (today, for the current month).
//  - Subscribers = distinct renter emails with a counting rental that day.
//  - Average price = MRR / counting rentals (per chamber, not per customer).
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.PurebaricMetrics = api;
})(typeof window !== 'undefined' ? window : globalThis, function () {
  'use strict';

  const WEEKS_PER_MONTH = 52 / 12;
  const DAYS_PER_MONTH = 30.44;
  const DAY_MS = 86400000;

  const day10 = (v) => String(v || '').slice(0, 10);
  const utc = (iso) => { const [y, m, d] = iso.split('-').map(Number); return Date.UTC(y, m - 1, d); };
  const iso = (ms) => new Date(ms).toISOString().slice(0, 10);
  const addDays = (isoDay, n) => iso(utc(isoDay) + n * DAY_MS);
  const monthEnd = (year, month) => iso(Date.UTC(year, month + 1, 0));
  const monthStart = (year, month) => iso(Date.UTC(year, month, 1));
  const daysInclusive = (a, b) => Math.round((utc(b) - utc(a)) / DAY_MS) + 1;

  function monthlyEquivalent(r) {
    const rate = Number(r.monthlyRate) || 0;
    return r.rateType === 'weekly' ? rate * WEEKS_PER_MONTH : rate;
  }
  function isCounted(r) {
    return !!r && r.status !== 'cancelled' && !!day10(r.startDate) && !!day10(r.endDate);
  }
  function activeOn(r, day) {
    return isCounted(r) && day10(r.startDate) <= day && day10(r.endDate) >= day;
  }
  const emailOf = (r) => String((r.renter && r.renter.email) || '').trim().toLowerCase() || `rental:${r.id}`;

  function subscriberSet(rentals, day) {
    const set = new Set();
    rentals.forEach((r) => { if (activeOn(r, day)) set.add(emailOf(r)); });
    return set;
  }

  function snapshot(rentals, day) {
    let mrr = 0, count = 0;
    const chambers = new Set();
    rentals.forEach((r) => {
      if (!activeOn(r, day)) return;
      mrr += monthlyEquivalent(r);
      count += 1;
      if (r.chamberId) chambers.add(r.chamberId);
    });
    return {
      day,
      mrr: Math.round(mrr),
      rentals: count,
      subscribers: subscriberSet(rentals, day).size,
      avgPrice: count ? Math.round(mrr / count) : null,
      chambersInUse: chambers.size,
    };
  }

  // 12 monthly points for a calendar year. Months after `today` are null (no data
  // yet); the current month is measured at `today`, past months at month end.
  function yearSeries(rentals, year, today) {
    const out = [];
    for (let m = 0; m < 12; m += 1) {
      if (monthStart(year, m) > today) { out.push(null); continue; }
      const end = monthEnd(year, m);
      out.push({ month: m, ...snapshot(rentals, end > today ? today : end) });
    }
    return out;
  }
  const seriesHasActivity = (series) => series.some((p) => p && (p.rentals > 0 || p.mrr > 0));

  function remainingMonths(r, today) {
    const from = day10(r.startDate) > today ? day10(r.startDate) : today;
    const end = day10(r.endDate);
    return end < from ? 0 : daysInclusive(from, end) / DAYS_PER_MONTH;
  }

  // Same estimate the Customers tab uses for "Lifetime paid": a recorded
  // paidAmount wins, otherwise a non-cancelled rental is assumed paid in full for
  // its whole term, a cancelled one with nothing recorded counts $0.
  // start + k calendar months, clamped to the target month's last day (Jan 31 + 1 month = Feb 28).
  function addMonthsClamped(isoDay, k) {
    const [y, m, d] = isoDay.split('-').map(Number);
    const idx = (m - 1) + k;
    const year = y + Math.floor(idx / 12);
    const month = ((idx % 12) + 12) % 12;
    const lastDay = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
    return iso(Date.UTC(year, month, Math.min(d, lastDay)));
  }

  // Charges still to come in [today, today + days] for rentals still being billed.
  // The first payment is at the start date, so renewals are the later billing dates: each monthly
  // anniversary of the start (weekly rentals: every 7 days). A date after the rental's end is not a
  // renewal, so the final period has none. Returns [{ rental, date, amount }] soonest first.
  function upcomingRenewals(rentals, today, days = 7) {
    const last = addDays(today, days);
    const out = [];
    (rentals || []).forEach((r) => {
      if (!r || (r.status !== 'active' && r.status !== 'scheduled')) return;
      const start = day10(r.startDate), end = day10(r.endDate);
      if (!start || !end) return;
      const weekly = r.rateType === 'weekly';
      for (let k = 1; k <= 520; k += 1) {
        const date = weekly ? addDays(start, 7 * k) : addMonthsClamped(start, k);
        if (date > end || date > last) break;
        if (date >= today) out.push({ rental: r, date, amount: Number(r.monthlyRate) || 0 });
      }
    });
    return out.sort((a, b) => a.date.localeCompare(b.date) || String(a.rental.id).localeCompare(String(b.rental.id)));
  }

  // Running rentals whose last day is within `days` days from today, soonest first. Mirrors
  // rentalsEndingSoon in netlify/functions/_lib/rental-ending.js (test/rental-ending.test.js keeps them equal).
  function endingSoon(rentals, today, days = 10) {
    const last = addDays(today, days);
    return (rentals || [])
      .filter((r) => r && (r.status === 'active' || r.status === 'scheduled') && day10(r.endDate) >= today && day10(r.endDate) <= last)
      .sort((a, b) => day10(a.endDate).localeCompare(day10(b.endDate)) || String(a.id).localeCompare(String(b.id)));
  }

  function lifetimePaid(r) {
    const paid = Number(r.paidAmount) || 0;
    if (paid > 0) return paid;
    if (r.status === 'cancelled' || !day10(r.startDate) || !day10(r.endDate)) return 0;
    const days = daysInclusive(day10(r.startDate), day10(r.endDate));
    const periods = r.rateType === 'weekly' ? Math.max(1, Math.round(days / 7)) : Math.max(1, Math.round(days / DAYS_PER_MONTH));
    return (Number(r.monthlyRate) || 0) * periods;
  }

  function overview({ rentals = [], bookings = [], chambers = [], today }) {
    const monthOfToday = Number(today.slice(5, 7)) - 1;
    const year = Number(today.slice(0, 4));
    const now = snapshot(rentals, today);
    const prevMonthEnd = addDays(monthStart(year, monthOfToday), -1);
    const prev = snapshot(rentals, prevMonthEnd);
    const yearAgoEnd = monthEnd(year - 1, monthOfToday);
    const yearAgo = snapshot(rentals, yearAgoEnd);

    const nowSet = subscriberSet(rentals, today);
    const prevSet = subscriberSet(rentals, prevMonthEnd);
    const newSubscribers = [...nowSet].filter((e) => !prevSet.has(e)).length;
    const lostSubscribers = [...prevSet].filter((e) => !nowSet.has(e)).length;

    const activeChambers = chambers.filter((c) => c.status === 'active').length;

    const counted = rentals.filter(isCounted);
    const contractedRemaining = Math.round(counted.reduce((s, r) => s + monthlyEquivalent(r) * remainingMonths(r, today), 0));

    // Ending within 30 days and not already followed by another rental for the same customer.
    const horizon = addDays(today, 30);
    const renewalsDue = { count: 0, mrr: 0 };
    counted.forEach((r) => {
      const end = day10(r.endDate);
      if (!(day10(r.startDate) <= today && end >= today && end <= horizon)) return;
      const email = emailOf(r);
      const renewed = counted.some((o) => o !== r && emailOf(o) === email && day10(o.startDate) > end);
      if (renewed) return;
      renewalsDue.count += 1; renewalsDue.mrr += monthlyEquivalent(r);
    });
    renewalsDue.mrr = Math.round(renewalsDue.mrr);
    const startingSoon = { count: 0, mrr: 0 };
    counted.forEach((r) => {
      const start = day10(r.startDate);
      if (start > today && start <= horizon) { startingSoon.count += 1; startingSoon.mrr += monthlyEquivalent(r); }
    });
    startingSoon.mrr = Math.round(startingSoon.mrr);

    const monthly = counted.filter((r) => r.rateType !== 'weekly');
    const avgTermMonths = monthly.length
      ? Math.round((monthly.reduce((s, r) => s + Math.max(1, Math.round(daysInclusive(day10(r.startDate), day10(r.endDate)) / DAYS_PER_MONTH)), 0) / monthly.length) * 10) / 10
      : null;

    const since = addDays(today, -90);
    const recent = bookings.filter((b) => !b.outOfArea && day10(b.createdAt) >= since);
    const converted = recent.filter((b) => b.status === 'converted').length;

    return {
      today,
      mrr: now.mrr,
      arr: now.mrr * 12,
      subscribers: now.subscribers,
      activeRentals: now.rentals,
      avgPrice: now.avgPrice,
      prevMonth: prev,
      yearAgo,
      mrrChangeMonth: now.mrr - prev.mrr,
      newSubscribers,
      lostSubscribers,
      utilization: { inUse: now.chambersInUse, activeChambers, pct: activeChambers ? Math.round((now.chambersInUse / activeChambers) * 100) : null },
      contractedRemaining,
      renewalsDue,
      startingSoon,
      lifetimeRevenue: Math.round(rentals.reduce((s, r) => s + lifetimePaid(r), 0)),
      avgTermMonths,
      conversion: { requests: recent.length, converted, pct: recent.length ? Math.round((converted / recent.length) * 100) : null },
    };
  }

  return { monthlyEquivalent, isCounted, activeOn, snapshot, yearSeries, seriesHasActivity, overview, lifetimePaid, upcomingRenewals, endingSoon };
});
