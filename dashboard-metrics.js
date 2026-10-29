// Business metrics for the admin Home tab, computed in the browser from the
// rentals/bookings/chambers the portal already loads. Pure, so it is unit-tested
// in test/dashboard-metrics.test.js.
//
// Definitions (keep in sync with RUNBOOK §11):
//  - A rental counts on a day when it is neither cancelled nor still scheduled,
//    and countsFrom <= day <= end, where countsFrom is the start date or, for a
//    rental that has already been paid, the first payment date if earlier. That
//    matches Stripe's MRR, which counts a subscription from the day it is paid,
//    not from the delivery date. Scheduled rentals stay in "Starting soon" until
//    they are explicitly/automatically made active.
//  - Monthly-equivalent revenue: a monthly rental's rate; a custom weekly rental's
//    weekly rate x 52/12.
//  - MRR = sum of monthly-equivalent revenue of the rentals counting that day.
//    Monthly points are month-end snapshots (today, for the current month).
//    A rental that starts and ends inside one month therefore never shows in a
//    month-end MRR figure.
//  - Subscribers = distinct renter emails with a counting rental that day.
//    Each monthly point also carries peakSubscribers: the highest subscriber
//    count on any single day in that month, from the 1st through the
//    measurement day. A month-end snapshot rewrites itself when someone
//    leaves mid-month (October would drop from 8 to 7 the day after a
//    subscriber's last day), erasing the fact that 8 people were subscribed
//    during the month. The peak cannot go down as the month goes on, so it
//    preserves that history. The chart and table use the peak; the KPI at
//    the top of the Home tab still shows today's count.
//  - Weekly subscribers (weekSeries, for the subscribers chart only): the
//    chart is week by week, not month by month. Weeks run Monday to Sunday,
//    each point is the subscriber snapshot at the Sunday ending the week
//    (today, for the current week; Dec 31 for the final partial week).
//    That is what shows a mid-month change, like 8 dropping to 7, in the
//    week it happened, instead of only at the month's end. The monthly
//    table below the chart still shows peak subscribers per month.
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
  // The day a rental starts counting as recurring revenue: its start date, or the day of its first
  // recorded payment if that came earlier (a paid rental is live in Stripe before delivery day).
  function countsFrom(r) {
    const start = day10(r.startDate);
    if (!r || r.paymentStatus === 'unpaid' || !r.paymentStatus) return start;
    const dates = [day10(r.paymentDate), ...((r.stripePayments || []).map((p) => day10(p && p.date)))].filter(Boolean);
    const first = dates.sort()[0];
    return first && first < start ? first : start;
  }
  function activeOn(r, day) {
    return isCounted(r) && r.status !== 'scheduled' && countsFrom(r) <= day && day10(r.endDate) >= day;
  }
  // Mirrors renterKey in netlify/functions/_lib/customer-key.js: name, else email, else phone (else this rental alone).
  const emailOf = (r) => {
    const p = (r && r.renter) || {};
    const name = String(p.name || '').trim().toLowerCase().replace(/\s+/g, ' ');
    if (name) return `name:${name}`;
    const email = String(p.email || '').trim().toLowerCase();
    if (email) return email;
    const digits = String(p.phone || '').replace(/\D/g, '').replace(/^1(?=\d{10}$)/, '');
    return digits ? `phone:${digits}` : `rental:${r.id}`;
  };

  function subscriberSet(rentals, day) {
    const set = new Set();
    rentals.forEach((r) => { if (activeOn(r, day)) set.add(emailOf(r)); });
    return set;
  }

  // Whole months of a rental's term (at least 1), e.g. a 90-day rental is 3.
  const termMonths = (r) => Math.max(1, Math.round(daysInclusive(day10(r.startDate), day10(r.endDate)) / DAYS_PER_MONTH));
  // Average term of the monthly-billed, non-cancelled rentals in the list, to one decimal.
  function avgTermMonths(rentals) {
    const monthly = rentals.filter((r) => isCounted(r) && r.rateType !== 'weekly');
    return monthly.length ? Math.round((monthly.reduce((s, r) => s + termMonths(r), 0) / monthly.length) * 10) / 10 : null;
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
      // Running average rental length: every rental that had started by this day (same rule as the Home card).
      avgLength: avgTermMonths(rentals.filter((r) => isCounted(r) && day10(r.startDate) <= day)),
      chambersInUse: chambers.size,
    };
  }

  // Highest distinct-subscriber count on any day in [fromDay, toDay], using
  // the same counting rule as snapshot(). Scans day by day; the upper bound
  // is the number of distinct renters with a countable rental, so it can
  // stop early once every such renter is counted on one day.
  function peakSubscribersInRange(rentals, fromDay, toDay) {
    const countable = (rentals || []).filter((r) => isCounted(r) && r.status !== 'scheduled');
    const ceiling = new Set(countable.map(emailOf)).size;
    let peak = 0;
    for (let day = fromDay; day <= toDay; day = addDays(day, 1)) {
      const n = subscriberSet(countable, day).size;
      if (n > peak) peak = n;
      if (peak >= ceiling) break;
    }
    return peak;
  }

  // 12 monthly points for a calendar year. Months after `today` are null (no data
  // yet); the current month is measured at `today`, past months at month end.
  // Every point also carries peakSubscribers (see the header comment): the
  // highest subscriber count on any day in the month up to the measurement
  // day, so a mid-month departure does not rewrite the month's history.
  function yearSeries(rentals, year, today) {
    const out = [];
    for (let m = 0; m < 12; m += 1) {
      if (monthStart(year, m) > today) { out.push(null); continue; }
      const end = monthEnd(year, m);
      const day = end > today ? today : end;
      const point = snapshot(rentals, day);
      point.peakSubscribers = peakSubscribersInRange(rentals, monthStart(year, m), day);
      out.push({ month: m, ...point });
    }
    return out;
  }

  // One snapshot per Monday-to-Sunday week in the year, measured at the
  // Sunday ending the week (today for the current week, Dec 31 for the
  // final partial week). Weeks after `today` still appear, with a null
  // subscriber count, so the x axis keeps its month ticks through
  // December. The first week is
  // the one containing Jan 1, so it can start in the previous December;
  // its point is still measured inside this year. Each point carries
  // weekStart/weekEnd plus the usual snapshot fields (day is the day the
  // snapshot was taken). Series for different years line up by week
  // index from the start of the year, not by calendar date.
  function weekSeries(rentals, year, today) {
    const jan1 = `${year}-01-01`;
    const dec31 = `${year}-12-31`;
    const back = (new Date(utc(jan1)).getUTCDay() + 6) % 7; // days since Monday
    let weekStart = addDays(jan1, -back);
    const out = [];
    while (weekStart <= dec31) {
      const weekEnd = addDays(weekStart, 6);
      const end = weekEnd > dec31 ? dec31 : weekEnd;
      if (weekStart > today) {
        // Future week: keep the slot (so month ticks and the prior-year
        // line stay aligned) with no count, rather than dropping it.
        out.push({ weekStart, weekEnd: end, day: end, mrr: 0, rentals: 0, subscribers: null, avgPrice: null, avgLength: null, chambersInUse: 0 });
      } else {
        const day = end > today ? today : end;
        out.push({ weekStart, weekEnd: end, ...snapshot(rentals, day) });
      }
      weekStart = addDays(weekStart, 7);
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

  // Rentals starting or ending within `days` days of today (inclusive), soonest first. Each row is
  // { kind: 'start'|'end', date, rental }; a rental that starts and ends inside the window appears twice.
  function startsAndEnds(rentals, today, days = 10) {
    const last = addDays(today, days);
    const out = [];
    (rentals || []).forEach((r) => {
      if (!r || r.status === 'cancelled') return;
      const start = day10(r.startDate), end = day10(r.endDate);
      if ((r.status === 'scheduled' || r.status === 'active') && start >= today && start <= last) out.push({ kind: 'start', date: start, rental: r });
      if ((r.status === 'scheduled' || r.status === 'active') && end >= today && end <= last) out.push({ kind: 'end', date: end, rental: r });
    });
    return out.sort((a, b) => a.date.localeCompare(b.date) || a.kind.localeCompare(b.kind) || String(a.rental.id).localeCompare(String(b.rental.id)));
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
      if (activeOn(r, today)) return; // already paid and counting in MRR, even if delivery is later
      if (start > today && start <= horizon) { startingSoon.count += 1; startingSoon.mrr += monthlyEquivalent(r); }
    });
    startingSoon.mrr = Math.round(startingSoon.mrr);

    const avgTerm = avgTermMonths(counted);

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
      avgTermMonths: avgTerm,
      conversion: { requests: recent.length, converted, pct: recent.length ? Math.round((converted / recent.length) * 100) : null },
    };
  }

  return { monthlyEquivalent, isCounted, countsFrom, activeOn, avgTermMonths, snapshot, yearSeries, peakSubscribersInRange, weekSeries, seriesHasActivity, overview, lifetimePaid, upcomingRenewals, endingSoon, startsAndEnds };
});
