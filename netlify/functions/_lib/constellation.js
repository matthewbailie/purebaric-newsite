// The admin Metrics tab: constellation OKRs, KPIs and leading metrics, rolled up by America/Denver
// calendar period (spec: /workspace/purebaric-team/pdm/spec-admin-metrics-tab.md). Pure: the handler
// (admin-metrics.js) reads Stripe and the portal stores and passes plain arrays in, so every rule here is
// unit-tested with fixtures (test/constellation.test.js).
//
// Rules worth knowing before changing anything:
//  - Paying rentals and MRR come from Stripe only: livemode, a non-zero rate (a $0 or 100%-forever
//    subscription is a comp), not paused (status "paused" or pause_collection set) and not canceled.
//    This deliberately does NOT reuse stripe-billing.js's LIVE set (it includes "paused") or the Home
//    tab's portal-derived MRR (dashboard-metrics.js).
//  - Real leads = completed bookings + waitlist signups + Customers tagged "lead" + contact-form rows,
//    TEST/internal excluded, one person = one lead (real email, else phone; placeholder addresses are
//    never a key), first-touch date wins. A waitlist removal never subtracts.
//  - Targets, baselines and thresholds live in _data/metrics-config.json. Provisional rows carry no
//    status call until the glossary lock confirms them.
//  - The payload is aggregates only: counts, dollars, dates and labels. No names, emails, phones,
//    addresses, messages, notes or record ids leave this module.

const { isInternalLead } = require("./internal-lead");
const { isPlaceholderEmail } = require("./placeholder-email");
const { subscriptionAmount } = require("./stripe-billing");

const DAY_MS = 86400000;
const PERIODS = ["day", "week", "month", "quarter", "year"];

// ───────── America/Denver calendar ─────────
const MT_PARTS = new Intl.DateTimeFormat("en-US", {
  timeZone: "America/Denver", hourCycle: "h23",
  year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit",
});
function mtParts(ms) {
  const p = Object.fromEntries(MT_PARTS.formatToParts(new Date(ms)).map((x) => [x.type, x.value]));
  return { y: +p.year, m: +p.month, d: +p.day, h: +p.hour, mi: +p.minute, s: +p.second };
}
// The MT calendar day (YYYY-MM-DD) of an epoch-ms instant.
function mtDayOfMs(ms) {
  const p = mtParts(ms);
  return `${p.y}-${String(p.m).padStart(2, "0")}-${String(p.d).padStart(2, "0")}`;
}
// Epoch ms of 00:00 MT on a calendar day (DST-safe).
function mtMidnightMs(day) {
  const [y, m, d] = day.split("-").map(Number);
  const wall = Date.UTC(y, m - 1, d);
  let guess = wall + 7 * 3600000;
  for (let i = 0; i < 2; i += 1) {
    const p = mtParts(guess);
    const asWall = Date.UTC(p.y, p.m - 1, p.d, p.h, p.mi, p.s);
    guess += wall - asWall;
  }
  return guess;
}
const utcDay = (day) => { const [y, m, d] = day.split("-").map(Number); return Date.UTC(y, m - 1, d); };
const fmtDay = (ms) => new Date(ms).toISOString().slice(0, 10);
const addDays = (day, n) => fmtDay(utcDay(day) + n * DAY_MS);
const daysBetween = (a, b) => Math.round((utcDay(b) - utcDay(a)) / DAY_MS);

// Calendar period containing `day` (Mon–Sun weeks, calendar months/quarters/years), plus how much of it
// has elapsed as of `today` (both MT calendar days).
function periodBounds(period, day, today) {
  const p = PERIODS.includes(period) ? period : "day";
  const [y, m] = day.split("-").map(Number);
  let start, end;
  if (p === "day") { start = end = day; }
  else if (p === "week") {
    const dow = (new Date(utcDay(day)).getUTCDay() + 6) % 7; // Monday = 0
    start = addDays(day, -dow); end = addDays(start, 6);
  } else if (p === "month") {
    start = fmtDay(Date.UTC(y, m - 1, 1)); end = fmtDay(Date.UTC(y, m, 0));
  } else if (p === "quarter") {
    const q0 = Math.floor((m - 1) / 3) * 3;
    start = fmtDay(Date.UTC(y, q0, 1)); end = fmtDay(Date.UTC(y, q0 + 3, 0));
  } else {
    start = `${y}-01-01`; end = `${y}-12-31`;
  }
  const days = daysBetween(start, end) + 1;
  let elapsed;
  if (today < start) elapsed = 0;
  else if (today > end) elapsed = days;
  else elapsed = daysBetween(start, today) + 1;
  return { period: p, start, end, days, elapsed, complete: today > end, future: today < start };
}

// The instant the period's point-in-time values are read at: the end of the period, or for the current
// period the end of the last complete MT minute.
function asOfMs(bounds, nowMs) {
  const endMs = mtMidnightMs(addDays(bounds.end, 1)) - 1000;
  const lastMinute = Math.floor(nowMs / 60000) * 60000 - 1000;
  return Math.min(endMs, lastMinute);
}

// ───────── Stripe ─────────
function monthlyRate(sub) {
  const amount = subscriptionAmount(sub);
  const item = ((sub.items && sub.items.data) || [])[0] || {};
  const rec = (item.price && item.price.recurring) || item.plan || {};
  const n = Number(rec.interval_count) || 1;
  const per = { day: 365 / 12, week: 52 / 12, month: 1, year: 1 / 12 }[rec.interval || "month"] || 1;
  return Math.round((amount * per / n) * 100) / 100;
}
const isPausedNow = (sub) => sub.status === "paused" || !!sub.pause_collection;
const isComp = (sub) => subscriptionAmount(sub) <= 0;

// Was this subscription a paying rental at instant `ms`? History is rebuilt from start/end dates; the
// pause state and price are only known as they are now (Stripe keeps no history of either here).
function payingAt(sub, ms, cfg) {
  if (!sub) return false;
  if (cfg.requireLivemode && sub.livemode !== true) return false;
  if (["incomplete", "incomplete_expired"].includes(sub.status)) return false;
  if (isComp(sub) || isPausedNow(sub)) return false;
  const startMs = (sub.start_date || sub.created || 0) * 1000;
  if (!startMs || startMs > ms) return false;
  if (sub.trial_end && sub.trial_end * 1000 > ms) return false;
  const endedSec = sub.ended_at || (sub.status === "canceled" ? sub.canceled_at : null);
  if (endedSec) return endedSec * 1000 > ms;
  return (cfg.payingStatuses || ["active"]).includes(sub.status);
}

function stripeSnapshot(subs, ms, cfg) {
  const paying = (subs || []).filter((s) => payingAt(s, ms, cfg));
  const mrr = Math.round(paying.reduce((t, s) => t + monthlyRate(s), 0) * 100) / 100;
  return { count: paying.length, mrr, ids: new Set(paying.map((s) => s.id)) };
}

// New paid starts: subscriptions that became paying with a start in [fromDay, toDay] (MT) and were
// paying on their first day (so a later comp or a never-paid incomplete does not count).
function newPaidStarts(subs, fromDay, toDay, cfg) {
  return (subs || []).filter((s) => {
    const startSec = s.start_date || s.created;
    if (!startSec) return false;
    const d = mtDayOfMs(startSec * 1000);
    if (d < fromDay || d > toDay) return false;
    if (cfg.requireLivemode && s.livemode !== true) return false;
    if (["incomplete", "incomplete_expired"].includes(s.status) || isComp(s)) return false;
    return true;
  }).length;
}

// ───────── Portal leads ─────────
const normEmail = (e) => String(e || "").trim().toLowerCase();
const phoneKey = (p) => { const d = String(p || "").replace(/\D/g, ""); return d.length >= 7 ? d.slice(-10) : ""; };
function personKey(rec) {
  const e = normEmail(rec.email);
  if (e && e.includes("@") && !isPlaceholderEmail(e)) return "e:" + e;
  const ph = phoneKey(rec.phone);
  if (ph) return "p:" + ph;
  return "id:" + (rec.kind || "") + ":" + (rec.id || Math.random());
}
function isInternal(rec) {
  if (rec.internal === true) return true;
  return isInternalLead({ name: rec.name, firstName: rec.firstName, lastName: rec.lastName, email: rec.email });
}
const hasTag = (c, t) => Array.isArray(c.tags) && c.tags.some((x) => String(x).trim().toLowerCase() === t);
const isPartialBooking = (b) => b.status === "lead" || b.bookingMode === "lead";
const hasLeadSource = (r) => !!(r.leadSource && typeof r.leadSource === "object" && Object.values(r.leadSource).some(Boolean));

// Every record that counts toward a real lead, normalized. Internal/TEST rows are dropped here unless
// keepInternal is set (then each carries isInternal). `raw` is the stored record, for server-side grouping
// only (_lib/campaign-leads.js); it never goes into a report payload.
function leadRecords({ bookings = [], waitlist = [], customers = [], contacts = [] }, { keepInternal = false } = {}) {
  const out = [];
  for (const b of bookings) {
    if (isPartialBooking(b)) continue;
    out.push({ kind: "booking", id: b.id, at: b.createdAt, email: b.email, phone: b.phone, name: [b.firstName, b.lastName].filter(Boolean).join(" "), firstName: b.firstName, lastName: b.lastName, internal: b.internal, outOfArea: !!b.outOfArea, sourced: hasLeadSource(b), raw: b });
  }
  for (const w of waitlist) out.push({ kind: "waitlist", id: w.id, at: w.createdAt, email: w.email, phone: w.phone, name: w.name, internal: w.internal, outOfArea: w.category === "out-of-area", sourced: hasLeadSource(w), raw: w });
  for (const c of customers) {
    if (!hasTag(c, "lead")) continue;
    out.push({ kind: "customer", id: c.id, at: c.createdAt, email: c.email, phone: c.phone, name: c.name, internal: c.internal, outOfArea: hasTag(c, "out-of-area"), sourced: hasLeadSource(c) || (c.tags || []).some((t) => /^source-/i.test(String(t))), raw: c });
  }
  for (const m of contacts) out.push({ kind: "contact", id: m.id, at: m.createdAt, email: m.email, phone: m.phone, name: m.name, internal: m.internal, outOfArea: false, sourced: hasLeadSource(m), raw: m });
  const dated = out.filter((r) => r.at);
  if (keepInternal) return dated.map((r) => ({ ...r, isInternal: isInternal(r) }));
  return dated.filter((r) => !isInternal(r));
}

// One person = one lead. First touch (earliest record) wins; out-of-area if any record says so.
function dedupeLeads(records) {
  const byKey = new Map();
  for (const r of records) {
    const k = personKey(r);
    const cur = byKey.get(k);
    if (!cur) { byKey.set(k, { key: k, firstAt: r.at, outOfArea: r.outOfArea, firstSourced: r.sourced }); continue; }
    if (r.outOfArea) cur.outOfArea = true;
    if (r.at < cur.firstAt) { cur.firstAt = r.at; cur.firstSourced = r.sourced; }
  }
  return [...byKey.values()].map((l) => ({ ...l, firstDay: mtDayOfMs(Date.parse(l.firstAt)) }));
}

// Earliest non-comp (livemode when required) subscription start per Stripe customer email, in epoch ms.
function firstPaidStartByEmail(subs, cfg) {
  const out = new Map();
  for (const s of subs || []) {
    if ((cfg.requireLivemode && s.livemode !== true) || isComp(s)) continue;
    const e = normEmail(s.customer && typeof s.customer === "object" ? s.customer.email : "");
    if (!e) continue;
    const ms = (s.start_date || s.created) * 1000;
    if (!out.has(e) || ms < out.get(e)) out.set(e, ms);
  }
  return out;
}
// Lead → rental: the lead's email started a paying subscription from a day before first touch to
// leadToRentalDays (30) after it. Matched on the server only.
function reachedRental(lead, startsByEmail, cfg) {
  if (!lead.key.startsWith("e:")) return false;
  const ms = startsByEmail.get(lead.key.slice(2));
  const first = Date.parse(lead.firstAt);
  return ms != null && ms >= first - DAY_MS && ms <= first + (cfg.leadToRentalDays || 30) * DAY_MS;
}

const inPeriod = (day, b) => day >= b.start && day <= b.end;
const dayOf = (iso) => mtDayOfMs(Date.parse(iso));

// ───────── Status calls ─────────
// Stock with a deadline: on track at/above target, or when the remaining MT days can still close the gap
// at no more than `perWeek` new paid starts a week (and, for rentals, there is a free machine for each).
function deadlineStatus({ current, target, deadline, day, perWeek = 1, freeMachines = Infinity }) {
  if (target == null || !deadline) return null;
  if (current >= target) return "on_track";
  if (day > deadline) return "behind";
  const remainingDays = daysBetween(day, deadline) + 1;
  const reachable = Math.ceil(remainingDays / 7) * perWeek;
  const gap = target - current;
  return gap <= reachable && gap <= freeMachines ? "on_track" : "behind";
}
// Flow with a per-period target: expected-to-date = target × elapsed ÷ days.
function flowStatus({ actual, targetForPeriod, elapsed, days }) {
  if (targetForPeriod == null || !days) return null;
  const expected = targetForPeriod * (elapsed / days);
  return actual >= expected ? "on_track" : "behind";
}
const STATUS_LABEL = { on_track: "On track", behind: "Behind", too_thin: "Too thin to call", not_connected: "Not connected", no_data: "No data", provisional: "Provisional" };

// "Nov 25, 2026, 10:52 AM MT": when the numbers were read, shown on every panel so nobody takes them for live.
const MT_STAMP = new Intl.DateTimeFormat("en-US", { timeZone: "America/Denver", month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" });
function formatMt(ms) { return `${MT_STAMP.format(new Date(ms))} MT`; }
// The time the data behind the report was read: the earlier of the portal and Stripe reads (a panel is only as
// fresh as its oldest source), falling back to the time the report was computed.
function lastUpdated({ nowMs, portalMs, stripeMs }) {
  const times = [portalMs, stripeMs].filter((t) => Number.isFinite(t));
  const at = times.length ? Math.min(...times) : nowMs;
  return {
    at: new Date(at).toISOString(),
    label: `Last updated ${formatMt(at)}`,
    portalAt: Number.isFinite(portalMs) ? new Date(portalMs).toISOString() : null,
    stripeAt: Number.isFinite(stripeMs) ? new Date(stripeMs).toISOString() : null,
    computedAt: new Date(nowMs).toISOString(),
  };
}

const money = (n) => (n == null ? null : Math.round(n * 100) / 100);
const usd = (n) => "$" + Number(n).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

// ───────── Config ─────────
// The keys every config must carry; anything else (targets, baselines, notes) is optional and may be null.
const REQUIRED_METRICS = ["payingRentals", "mrr", "januaryTermEnds", "newPaidStarts", "realLeads", "leadToRental", "cpl", "cac",
  "personalization", "paidUtilization", "serviceableLeads", "waitlistSignups", "activeWaitlist", "leadSourceCoverage", "scrollDepth", "deviceSplit"];
function loadConfig(raw) {
  const cfg = raw || require("../_data/metrics-config.json");
  if (!cfg || typeof cfg.metrics !== "object") throw new Error("metrics config: missing metrics");
  for (const k of REQUIRED_METRICS) if (!cfg.metrics[k]) throw new Error(`metrics config: missing ${k}`);
  if (!cfg.scorecardTolerance) throw new Error("metrics config: missing scorecardTolerance");
  return cfg;
}

// ───────── The report ─────────
// input: { period, date (MT day inside the period, default today), nowMs, subs (Stripe subscriptions,
//          status=all), stripe: { configured, error }, bookings, waitlist, customers, contacts, machines,
//          rentals, config }
function buildReport(input) {
  const cfg = input.config;
  const M = cfg.metrics;
  const nowMs = input.nowMs;
  const today = mtDayOfMs(nowMs);
  const anchor = /^\d{4}-\d{2}-\d{2}$/.test(input.date || "") ? input.date : today;
  const b = periodBounds(input.period, anchor, today);
  const asOf = asOfMs(b, nowMs);
  const asOfDay = mtDayOfMs(asOf);
  const openMs = mtMidnightMs(b.start) - 1000; // end of the day before the period opens
  const subs = input.subs || [];
  const stripeOk = !!(input.stripe && input.stripe.configured && !input.stripe.error);
  const minN = cfg.tooThinMinN || 8;

  const machines = (input.machines || []).filter((m) => m.status !== "archived").length || cfg.machinesFallback || 8;

  // Stripe snapshots
  const end = stripeSnapshot(subs, asOf, cfg);
  const open = stripeSnapshot(subs, openMs, cfg);
  const startsInPeriod = b.future ? 0 : newPaidStarts(subs, b.start, b.complete ? b.end : asOfDay, cfg);
  const winFrom = M.newPaidStarts.windowStart, winTo = M.newPaidStarts.deadline;
  const startsInWindow = newPaidStarts(subs, winFrom, asOfDay < winTo ? asOfDay : winTo, cfg);

  // Portal leads
  const records = leadRecords(input);
  const leads = dedupeLeads(records);
  const leadsIn = leads.filter((l) => inPeriod(l.firstDay, b) && l.firstDay <= asOfDay);
  const realLeads = leadsIn.length;
  const outOfArea = leadsIn.filter((l) => l.outOfArea).length;
  const cutoffMs = Date.parse(cfg.leadSourceCutoff);
  const postCutoff = leadsIn.filter((l) => Date.parse(l.firstAt) >= cutoffMs);
  const sourced = postCutoff.filter((l) => l.firstSourced).length;

  const internalFree = (arr) => (arr || []).filter((r) => r.createdAt && !isInternal({ ...r, name: r.name || [r.firstName, r.lastName].filter(Boolean).join(" ") }));
  const bookings = internalFree(input.bookings);
  const completed = bookings.filter((x) => !isPartialBooking(x) && inPeriod(dayOf(x.createdAt), b) && dayOf(x.createdAt) <= asOfDay).length;
  const partialKeys = new Set(bookings.filter((x) => isPartialBooking(x) && inPeriod(dayOf(x.createdAt), b) && dayOf(x.createdAt) <= asOfDay).map((x) => personKey({ ...x, kind: "booking" })));
  const partial = partialKeys.size;

  const wl = internalFree(input.waitlist);
  const wlInPeriod = wl.filter((w) => inPeriod(dayOf(w.createdAt), b) && dayOf(w.createdAt) <= asOfDay).length;
  const wlCumulative = wl.filter((w) => dayOf(w.createdAt) <= asOfDay).length;
  const inactive = new Set(M.activeWaitlist.inactiveStatuses || []);
  const wlActive = wl.filter((w) => dayOf(w.createdAt) <= asOfDay && !inactive.has(w.status) && !w.removedAt).length;

  // Lead → rental: real leads whose first touch is in the 30 days ending as-of, and how many of them
  // started a paying subscription (matched on the Stripe customer's email) within 30 days of first touch.
  const cohortFrom = addDays(asOfDay, -((cfg.leadToRentalDays || 30) - 1));
  const cohort = leads.filter((l) => l.firstDay >= cohortFrom && l.firstDay <= asOfDay);
  const subStartsByEmail = firstPaidStartByEmail(subs, cfg);
  const converted = cohort.filter((l) => reachedRental(l, subStartsByEmail, cfg)).length;

  // Portal term ends × Stripe rates
  const subById = new Map(subs.map((s) => [s.id, s]));
  const linked = (input.rentals || []).filter((r) => r.stripeSubscriptionId && subById.has(r.stripeSubscriptionId));
  const riskTo = addDays(asOfDay, cfg.mrrAtRiskDays || 60);
  const atRisk = linked.filter((r) => ["active", "scheduled"].includes(r.status) && r.endDate > asOfDay && r.endDate <= riskTo && payingAt(subById.get(r.stripeSubscriptionId), asOf, cfg));
  const atRiskMrr = money(atRisk.reduce((t, r) => t + monthlyRate(subById.get(r.stripeSubscriptionId)), 0));
  const janStart = M.januaryTermEnds.from, janEnd = M.januaryTermEnds.to;
  const janEnds = linked.filter((r) => ["active", "scheduled"].includes(r.status) && r.endDate >= janStart && r.endDate <= janEnd && payingAt(subById.get(r.stripeSubscriptionId), asOf, cfg));
  const janMrr = money(janEnds.reduce((t, r) => t + monthlyRate(subById.get(r.stripeSubscriptionId)), 0));
  // Renewals kept: linked rentals whose term ended in the period (to date) and whose subscription is still
  // paying as of the period's end.
  const due = linked.filter((r) => r.endDate && inPeriod(r.endDate, b) && r.endDate <= asOfDay && r.status !== "cancelled");
  const kept = due.filter((r) => payingAt(subById.get(r.stripeSubscriptionId), asOf, cfg)).length;

  const stripeVal = (v) => (stripeOk ? v : null);
  const rows = [];
  const row = (r) => rows.push({
    status: null, provisional: false, value: null, display: null, target: null, stretch: null, progress: null, note: "", ...r,
  });
  const prov = (key) => !!(M[key] && M[key].provisional);
  const stripeMissing = stripeOk ? "" : (input.stripe && input.stripe.error ? "Stripe could not be read." : "Stripe is not configured.");

  // OKRs
  const pr = M.payingRentals;
  row({ id: "paying_rentals", section: "okr", label: "Paying rentals on rent (North Star)", source: "Stripe",
    value: stripeVal(end.count), display: stripeOk ? `${end.count} of ${machines} machines` : null,
    target: pr.target, stretch: pr.stretch, progress: stripeOk ? { current: end.count, target: pr.target, stretch: pr.stretch, targetLabel: "committed" } : null,
    status: stripeOk ? deadlineStatus({ current: end.count, target: pr.target, deadline: pr.deadline, day: asOfDay, perWeek: cfg.maxNewPaidStartsPerWeek, freeMachines: machines - end.count }) : "no_data",
    note: stripeMissing || `Committed ${pr.target} by ${pr.deadline}; stretch ${pr.stretch}.` });
  row({ id: "mrr", section: "okr", label: "MRR (guardrail: hold or grow)", source: "Stripe",
    value: stripeVal(end.mrr), display: stripeOk ? usd(end.mrr) : null,
    target: stripeOk ? open.mrr : null, stretch: M.mrr.stretchMarkers ? M.mrr.stretchMarkers[0] : null,
    progress: stripeOk ? { current: end.mrr, target: open.mrr, stretch: (M.mrr.stretchMarkers || [])[0] || null, markers: M.mrr.stretchMarkers || [], targetLabel: "opening MRR", money: true } : null,
    status: stripeOk ? (end.mrr >= open.mrr ? "on_track" : "behind") : "no_data",
    note: stripeMissing || `Opening MRR this period ${usd(open.mrr)}. ${(M.mrr.stretchMarkers || []).map(usd).join(" / ")} are stretch markers only, not the status call.` });
  row({ id: "january_term_ends", section: "okr", label: "January term ends kept", source: "Stripe rates + portal term ends", provisional: prov("januaryTermEnds"),
    value: stripeVal(janMrr), display: stripeOk ? `${usd(janMrr)} at risk · ${janEnds.length} rental${janEnds.length === 1 ? "" : "s"}` : null,
    status: stripeOk ? (prov("januaryTermEnds") ? "provisional" : null) : "no_data", note: stripeMissing || M.januaryTermEnds.note || "" });
  const nps = M.newPaidStarts;
  row({ id: "new_paid_starts_window", section: "okr", label: `New paid starts (${nps.windowStart} to ${nps.deadline})`, source: "Stripe",
    value: stripeVal(startsInWindow), display: stripeOk ? String(startsInWindow) : null, target: nps.target, stretch: nps.stretch,
    progress: stripeOk ? { current: startsInWindow, target: nps.target, stretch: nps.stretch, targetLabel: "committed" } : null,
    status: stripeOk ? deadlineStatus({ current: startsInWindow, target: nps.target, deadline: nps.deadline, day: asOfDay, perWeek: cfg.maxNewPaidStartsPerWeek }) : "no_data",
    note: stripeMissing || "Window start is an assumption; confirm at the Nov 26 lock." });
  const rl = M.realLeads;
  const leadTargetForPeriod = rl.targetPerWeek != null ? rl.targetPerWeek * (b.days / 7) : null;
  row({ id: "real_leads", section: "okr", label: "Real leads", source: "Portal", provisional: prov("realLeads"),
    value: realLeads, display: `${realLeads} total · ${realLeads - outOfArea} serviceable`,
    target: leadTargetForPeriod != null ? Math.round(leadTargetForPeriod * 10) / 10 : null,
    progress: leadTargetForPeriod != null ? { current: realLeads, target: Math.round(leadTargetForPeriod * 10) / 10, targetLabel: prov("realLeads") || !rl.targetInForce ? "proposed target" : "target" } : null,
    status: prov("realLeads") || !rl.targetInForce ? "provisional" : flowStatus({ actual: realLeads, targetForPeriod: leadTargetForPeriod, elapsed: b.elapsed, days: b.days }),
    note: rl.note || "" });
  row({ id: "lead_to_rental", section: "okr", label: `Lead → rental (${cfg.leadToRentalDays || 30}-day cohort)`, source: "Stripe + portal",
    value: null, display: `${converted} of ${cohort.length} real leads`,
    status: cohort.length < minN ? "too_thin" : null,
    note: cohort.length < minN ? `Too thin to call: fewer than ${minN} real leads in the cohort.` : `Rate ${Math.round((converted / cohort.length) * 100)}% (target ${Math.round(M.leadToRental.targetRate * 100)}%).` });
  if (cohort.length >= minN) {
    const rate = converted / cohort.length;
    rows[rows.length - 1].value = Math.round(rate * 1000) / 1000;
    rows[rows.length - 1].status = rate >= M.leadToRental.targetRate ? "on_track" : "behind";
  }
  row({ id: "cpl", section: "okr", label: "Cost per real lead", source: "Ads + portal", provisional: prov("cpl"), status: "not_connected", note: M.cpl.note || "" });
  row({ id: "cac", section: "okr", label: "CAC", source: "Ads + Stripe", provisional: prov("cac"), status: "not_connected", note: M.cac.note || "" });
  row({ id: "personalization", section: "okr", label: "Personalization exposure / lift", source: "GA4", provisional: prov("personalization"), status: "not_connected" });

  // KPIs
  const util = stripeOk ? end.count / machines : null;
  row({ id: "paid_utilization", section: "kpi", label: "Paid utilization", source: "Stripe ÷ portal machines",
    value: util == null ? null : Math.round(util * 1000) / 1000, display: stripeOk ? `${end.count}/${machines} (${(util * 100).toFixed(1)}%)` : null,
    target: M.paidUtilization.target, stretch: M.paidUtilization.stretch,
    progress: stripeOk ? { current: end.count, target: M.paidUtilization.target, stretch: M.paidUtilization.stretch, targetLabel: "committed" } : null, note: stripeMissing });
  const net = stripeOk ? money(end.mrr - open.mrr) : null;
  row({ id: "net_mrr_change", section: "kpi", label: "Net MRR change", source: "Stripe", value: net,
    display: stripeOk ? `${net >= 0 ? "+" : "−"}${usd(Math.abs(net))}` : null, note: stripeMissing });
  const arpu = stripeOk && end.count ? money(end.mrr / end.count) : null;
  row({ id: "arpu", section: "kpi", label: "ARPU", source: "Stripe", value: arpu, display: arpu == null ? (stripeOk ? "—" : null) : usd(arpu), note: stripeMissing });
  row({ id: "new_paid_starts", section: "kpi", label: "New paid starts (this period)", source: "Stripe", value: stripeVal(startsInPeriod), display: stripeOk ? String(startsInPeriod) : null, note: stripeMissing });
  row({ id: "completed_submits", section: "kpi", label: "Booking submits (completed)", source: "Portal bookings", value: completed, display: String(completed) });
  row({ id: "partial_leads", section: "kpi", label: "Partial leads (step 1 only)", source: "Portal bookings", value: partial, display: String(partial), note: "Own line; not a real lead." });
  row({ id: "renewals_kept", section: "kpi", label: "Renewals kept", source: "Stripe + portal",
    value: null, display: stripeOk ? `${kept} of ${due.length} due` : null,
    status: stripeOk ? (due.length < minN ? "too_thin" : null) : "no_data", note: stripeMissing || (due.length < minN ? "Counts only; too thin for a rate." : "") });

  // Leading
  row({ id: "mrr_at_risk", section: "leading", label: `MRR at risk (next ${cfg.mrrAtRiskDays || 60} days)`, source: "Portal term ends + Stripe rates",
    value: stripeVal(atRiskMrr), display: stripeOk ? `${usd(atRiskMrr)} · ${atRisk.length} rental${atRisk.length === 1 ? "" : "s"}` : null, note: stripeMissing });
  row({ id: "serviceable_leads", section: "leading", label: "Serviceable real leads", source: "Portal", provisional: prov("serviceableLeads"),
    value: realLeads - outOfArea, display: `${realLeads - outOfArea} (${outOfArea} out-of-area)` });
  row({ id: "waitlist_signups", section: "leading", label: "Waitlist signups", source: "Portal waitlist", provisional: prov("waitlistSignups"),
    value: wlInPeriod, display: `${wlInPeriod} this period · ${wlCumulative} all-time` });
  row({ id: "active_waitlist", section: "leading", label: "Active waitlist", source: "Portal waitlist", provisional: prov("activeWaitlist"),
    value: wlActive, display: String(wlActive), note: "Uses each entry's current status; past periods are approximate." });
  const covTarget = M.leadSourceCoverage.proposedTarget;
  row({ id: "lead_source_coverage", section: "leading", label: "Lead-source coverage (after Release 3)", source: "Portal lead-source fields", provisional: prov("leadSourceCoverage"),
    value: postCutoff.length >= minN ? Math.round((sourced / postCutoff.length) * 1000) / 1000 : null,
    display: `${sourced} of ${postCutoff.length} new real leads`,
    status: postCutoff.length < minN ? "too_thin" : "provisional",
    note: `Proposed target ${Math.round(covTarget * 100)}% by ${M.leadSourceCoverage.proposedBy}. Leads before the Release 3 cutoff are excluded.` });
  row({ id: "step1_to_step2", section: "leading", label: "Step 1 → step 2", source: "Portal bookings", value: null,
    display: `${partial} step-1 only · ${completed} completed`, status: "too_thin", note: "Counts, not a rate, at current volume." });
  row({ id: "renewal_touch", section: "leading", label: "Renewal touch on time", source: "R&O log (not captured)", status: "no_data" });
  row({ id: "reply_time", section: "leading", label: "Lead reply time / outreach reply", source: "Gmail / portal timestamps (not captured)", status: "no_data" });
  for (const [id, label, key] of [
    ["booking_completion_rate", "Booking completion rate", "bookingCompletionRate"],
    ["form_starts", "Form starts", "formStarts"],
    ["paid_form_start_rate", "Paid form-start rate", "paidFormStartRate"],
    ["booking_page_visits", "Booking page visits", "bookingPageVisits"],
    ["scroll_depth", "Scroll depth", "scrollDepth"],
    ["device_split", "Device split (widget engagement)", "deviceSplit"],
  ]) row({ id, section: "leading", label, source: "GA4", provisional: prov(key), status: "not_connected" });

  for (const r of rows) r.statusLabel = r.status ? STATUS_LABEL[r.status] : null;

  return {
    updated: lastUpdated({ nowMs, portalMs: input.fetchedAt && input.fetchedAt.portalMs, stripeMs: stripeOk ? input.fetchedAt && input.fetchedAt.stripeMs : null }),
    period: { name: b.period, start: b.start, end: b.end, days: b.days, elapsed: b.elapsed, complete: b.complete, asOf: new Date(asOf).toISOString(), asOfDay, today },
    stripe: { configured: !!(input.stripe && input.stripe.configured), ok: stripeOk, error: input.stripe && input.stripe.error ? "stripe_read_failed" : null,
      testModeOnly: subs.length > 0 && subs.every((s) => s.livemode !== true) },
    sources: { ga4: "not_connected", ads: "not_connected" },
    config: { version: cfg.version, provisionalCount: Object.values(M).filter((m) => m.provisional).length, scorecardTolerance: cfg.scorecardTolerance },
    rows,
  };
}

module.exports = {
  PERIODS, STATUS_LABEL,
  mtDayOfMs, mtMidnightMs, addDays, periodBounds, asOfMs,
  monthlyRate, payingAt, stripeSnapshot, newPaidStarts,
  personKey, leadRecords, dedupeLeads, isPartialBooking, isInternal, hasTag, firstPaidStartByEmail, reachedRental,
  deadlineStatus, flowStatus, loadConfig, buildReport, formatMt, lastUpdated,
};
