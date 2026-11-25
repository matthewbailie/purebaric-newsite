// Admin "Site OKRs & Analytics → Leads by Campaign": real leads grouped by the campaign (or other source)
// that brought them, per /workspace/purebaric-team/pdm/spec-admin-campaign-leads-tab.md and the O&P
// measurement plan (opt/leads-by-campaign-measurement-plan.md). Pure: the handlers (admin-campaign-leads.js,
// admin-campaigns.js) read the stores and pass plain arrays in, so every rule is unit-tested with fixtures
// (test/campaign-leads.test.js).
//
// Rules worth knowing before changing anything:
//  - Real leads, partial leads, TEST/internal and one-person-one-lead come from _lib/constellation.js, so the
//    group totals always equal the OKRs tab's real-lead count for the same range. A mismatch is a bug.
//  - First matching rule wins (RULES below, in the plan's order). Every lead lands in exactly one group.
//  - Null leadSource: the browser sends no privacy marker, so a site-form lead from before the Release 3
//    cutoff is "Before source tracking" and any later one with nothing else to go on is "Unattributed".
//    There is no separate privacy group and no new capture.
//  - Spend is only what an admin typed into the campaign list (Meta and Google, from Demand Gen's daily
//    check). There are no ad-platform API reads. No spend entries for the range means no spend or cost shown.
//  - Counts only: no percentages or conversion rates. Cost per real lead shows its n.
//  - The payload is aggregates and campaign-list rows only: no names, emails, phones, notes or record ids.

const C = require("./constellation");

const DAY_MS = 86400000;
const CHANNELS = ["Meta", "Google", "Marketplace", "KSL", "Retention email", "Outreach", "Other"];
const SPEND_SOURCES = ["manual", "none"];
const SPEND_SOURCE_LABEL = { manual: "Entered by hand (daily)", none: "No spend source" };

const RULES = {
  campaign: "UTM campaign tag",
  intake: "Portal campaign tag (intake)",
  utm_unlisted: "UTM tag, no matching campaign row",
  click: "Ad click ID, no campaign tag",
  referrer: "Referrer or landing page only",
  self: "Self-reported only",
  offsite: "Intake source tag, no campaign tag",
  before: "Before source tracking",
  none: "No source data",
};

const UNATTRIBUTED_NOTE = "Includes privacy opt-outs and leads captured without source data.";
const BEFORE_NOTE = "Site-form leads from before Nov 24, 2026, 2:33 PM MT, when source tracking went live.";

// R&O intake source tags (source-<value>, specs/opt-source-tags.md §2). Site-form values are not off-site.
const SITE_SOURCE_TAGS = new Set(["site-form", "contact-form", "booking-form", "booking", "waitlist", "waitlist-form", "unknown"]);
const OFFSITE_LABEL = {
  "hello-email": "hello@ email",
  "phone-text": "Phone or text",
  messenger: "Facebook Messenger",
  marketplace: "Facebook Marketplace",
  ksl: "KSL",
  referral: "Referral",
  outreach: "Outreach",
  gbp: "Google Business Profile",
  "waitlist-email": "Waitlist email",
};

const lc = (v) => String(v || "").trim().toLowerCase();
const isDay = (v) => /^\d{4}-\d{2}-\d{2}$/.test(String(v || "")) && !Number.isNaN(Date.parse(v + "T00:00:00Z"));
const dayOf = (iso) => C.mtDayOfMs(Date.parse(iso));
const tagKey = (v) => lc(v).replace(/_/g, "-");
const money = (n) => Math.round(Number(n) * 100) / 100;
const usd = (n) => "$" + Number(n).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

// ───────── Campaign list (admin form; add and end only) ─────────
function cleanText(v, max) { return String(v == null ? "" : v).replace(/[\u0000-\u001f<>]/g, "").trim().slice(0, max); }

// Validates a new row against the existing list. Returns { row } or { error }.
function newCampaign(input = {}, rows = [], { nowIso = new Date().toISOString(), id } = {}) {
  const name = cleanText(input.name, 80);
  if (!name) return { error: "Name is required." };
  const utmCampaign = lc(input.utmCampaign);
  if (!/^[a-z0-9][a-z0-9_\-]{0,59}$/.test(utmCampaign)) return { error: "UTM campaign tag: lowercase letters, numbers, _ or - only." };
  if (rows.some((r) => lc(r.utmCampaign) === utmCampaign)) return { error: "That UTM campaign tag is already in the list." };
  const channel = CHANNELS.find((c) => lc(c) === lc(input.channel));
  if (!channel) return { error: "Choose a channel." };
  const owner = cleanText(input.owner, 60);
  if (!owner) return { error: "Owner is required." };
  if (!isDay(input.start)) return { error: "Start date is required." };
  const end = input.end ? String(input.end) : "";
  if (end && (!isDay(end) || end < input.start)) return { error: "End date must be on or after the start date." };
  const spendSource = SPEND_SOURCES.includes(input.spendSource) ? input.spendSource : (["Meta", "Google"].includes(channel) ? "manual" : "none");
  let portalTag = tagKey(input.portalTag);
  if (portalTag && !/^[a-z0-9][a-z0-9\-]{0,59}$/.test(portalTag)) return { error: "Portal tag: lowercase letters, numbers or - only." };
  if (!portalTag) portalTag = "campaign-" + tagKey(utmCampaign);
  if (rows.some((r) => r.portalTag === portalTag)) return { error: "That portal tag is already used by another campaign." };
  return {
    row: {
      id: id || `cmp_${utmCampaign}`,
      name, utmCampaign, channel, owner, start: input.start, end: end || null, spendSource, portalTag,
      spend: [], createdAt: nowIso, endedAt: null,
    },
  };
}

// Sets (or brings forward) a campaign's end date. Rows are never deleted.
function endCampaign(rows, id, end, { nowIso = new Date().toISOString() } = {}) {
  const row = rows.find((r) => r.id === id);
  if (!row) return { error: "Campaign not found." };
  if (!isDay(end) || end < row.start) return { error: "End date must be on or after the start date." };
  if (row.end && end > row.end) return { error: "A campaign can be ended early, not extended. Add a new row instead." };
  return { rows: rows.map((r) => (r.id === id ? { ...r, end, endedAt: nowIso } : r)) };
}

// Records one day's hand-entered spend (from Demand Gen's daily check). Entering a day again replaces it.
function setSpend(rows, id, day, amount, { nowIso = new Date().toISOString(), today } = {}) {
  const row = rows.find((r) => r.id === id);
  if (!row) return { error: "Campaign not found." };
  if (row.spendSource !== "manual") return { error: "This campaign has no spend source." };
  if (!isDay(day) || day < row.start || (row.end && day > row.end) || (today && day > today)) return { error: "Spend date must be inside the campaign's run, and not in the future." };
  const n = Number(amount);
  if (!Number.isFinite(n) || n < 0 || n > 100000) return { error: "Spend must be a dollar amount from 0 to 100,000." };
  const spend = (row.spend || []).filter((s) => s.day !== day).concat({ day, amount: money(n), enteredAt: nowIso }).sort((a, b) => a.day.localeCompare(b.day));
  return { rows: rows.map((r) => (r.id === id ? { ...r, spend } : r)) };
}

// ───────── Grouping ─────────
// Rule 1 window: the lead's MT day falls within start to end + 30 days (open-ended while no end is set).
function inCampaignWindow(day, row) {
  if (day < row.start) return false;
  return !row.end || day <= C.addDays(row.end, 30);
}

function sourceTags(rec) {
  return (Array.isArray(rec.tags) ? rec.tags : []).map(tagKey).filter((t) => t.startsWith("source-")).map((t) => t.slice(7));
}

// records: one person's stored records, oldest first ({ kind, at, raw }). rows: the campaign list.
// Returns { key, label, rule, campaignId? }.
function attribute(records, rows, cutoffMs) {
  const byUtm = new Map(rows.map((r) => [lc(r.utmCampaign), r]));
  const byTag = new Map();
  for (const r of rows) { byTag.set(r.portalTag || "campaign-" + tagKey(r.utmCampaign), r); }
  const ls = (r) => (r.raw && r.raw.leadSource && typeof r.raw.leadSource === "object" ? r.raw.leadSource : null);

  // 1. UTM campaign tag = a list row, lead inside the row's window.
  for (const r of records) {
    const row = ls(r) && byUtm.get(lc(ls(r).utmCampaign));
    if (row && inCampaignWindow(dayOf(r.at), row)) return { key: "campaign:" + row.id, label: row.name, rule: "campaign", campaignId: row.id };
  }
  // 2. Portal campaign tag set by R&O at intake (a campaign-* tag, the row's portal tag, or a `campaign` field).
  for (const r of records) {
    const tags = (Array.isArray(r.raw.tags) ? r.raw.tags : []).map(tagKey);
    if (r.raw.campaign) tags.push("campaign-" + tagKey(r.raw.campaign));
    for (const t of tags) {
      const row = byTag.get(t) || (t.startsWith("campaign-") ? rows.find((x) => "campaign-" + tagKey(x.utmCampaign) === t) : null);
      if (row) return { key: "campaign:" + row.id, label: row.name, rule: "intake", campaignId: row.id };
    }
    const loose = tags.find((t) => t.startsWith("campaign-"));
    if (loose) return { key: "intake:" + loose, label: `Portal tag ${loose} (not in campaign list)`, rule: "intake" };
  }
  // UTM campaign tag that is not in the list, or arrived outside its row's window: never credited to a campaign.
  for (const r of records) {
    const utm = ls(r) && lc(ls(r).utmCampaign);
    if (!utm) continue;
    const label = byUtm.has(utm) ? `UTM ${utm} (outside the campaign window)` : `UTM ${utm} (not in campaign list)`;
    return { key: "utm:" + utm, label, rule: "utm_unlisted" };
  }
  // 3. Click id with no campaign tag.
  for (const r of records) if (ls(r) && ls(r).gclid) return { key: "click:google", label: "Google Ads (untagged)", rule: "click" };
  for (const r of records) if (ls(r) && ls(r).fbclid) return { key: "click:meta", label: "Meta paid (untagged)", rule: "click" };
  // 4. Referrer / landing path only.
  for (const r of records) if (ls(r) && (ls(r).referrer || ls(r).landingPath)) return { key: "organic", label: "Organic / referral", rule: "referrer" };
  // 5. Self-reported "How did you hear about us?" only (never merged with tracked rows).
  for (const r of records) if (r.raw.heardAbout) return { key: "self:" + r.raw.heardAbout, label: `Self-reported: ${r.raw.heardAbout}`, rule: "self" };
  // Off-site leads (hello@, DMs, KSL, phone or text) with an R&O source tag but no campaign tag.
  const siteForm = records.some((r) => r.kind !== "customer");
  if (!siteForm) {
    for (const r of records) {
      const off = sourceTags(r.raw).find((t) => !SITE_SOURCE_TAGS.has(t));
      if (off) return { key: "offsite:" + off, label: `${OFFSITE_LABEL[off] || "Source tag " + off}, untagged`, rule: "offsite" };
    }
  }
  // Null leadSource: before the Release 3 cutoff, else Unattributed (privacy opt-outs land here too).
  if (records.length && Date.parse(records[0].at) < cutoffMs) return { key: "before", label: "Before source tracking", rule: "before", note: BEFORE_NOTE };
  return { key: "unattributed", label: "Unattributed", rule: "none", note: UNATTRIBUTED_NOTE };
}

function groupByPerson(records) {
  const map = new Map();
  for (const r of records) {
    const k = C.personKey(r);
    if (!map.has(k)) map.set(k, []);
    map.get(k).push(r);
  }
  return [...map.entries()].map(([key, recs]) => {
    recs.sort((a, b) => String(a.at).localeCompare(String(b.at)));
    return { key, firstAt: recs[0].at, firstDay: dayOf(recs[0].at), records: recs };
  });
}

// Default range: the last 30 MT days ending today, or a campaign's run window (start to end, or today).
function resolveRange({ from, to, campaignId, rows = [], today }) {
  if (campaignId) {
    const row = rows.find((r) => r.id === campaignId);
    if (row) { const end = row.end && row.end < today ? row.end : today; return { from: row.start, to: end < row.start ? row.start : end, campaignId: row.id }; }
  }
  if (isDay(from) && isDay(to) && from <= to) return { from, to, campaignId: null };
  return { from: C.addDays(today, -29), to: today, campaignId: null };
}

function spendInRange(row, from, to) {
  const entries = (row.spend || []).filter((s) => s.day >= from && s.day <= to);
  return entries.length ? { amount: money(entries.reduce((t, s) => t + Number(s.amount || 0), 0)), days: entries.length } : null;
}

// input: { bookings, waitlist, customers, contacts, campaigns, subs, stripe: { configured, error }, nowMs,
//          from, to, campaignId, config, fetchedAt: { portalMs, stripeMs } }
function buildCampaignReport(input) {
  const cfg = input.config;
  const nowMs = input.nowMs;
  const today = C.mtDayOfMs(nowMs);
  const rows = (input.campaigns || []).slice();
  const range = resolveRange({ from: input.from, to: input.to, campaignId: input.campaignId, rows, today });
  const toDay = range.to < today ? range.to : today;
  const inRange = (day) => day >= range.from && day <= toDay;
  const cutoffMs = Date.parse(cfg.leadSourceCutoff);
  const stripeOk = !!(input.stripe && input.stripe.configured && !input.stripe.error);

  // Real leads: the OKRs tab's records, one person = one lead, first touch in range.
  const all = C.leadRecords(input, { keepInternal: true });
  const real = groupByPerson(all.filter((r) => !r.isInternal)).filter((p) => inRange(p.firstDay));
  const internalReal = groupByPerson(all.filter((r) => r.isInternal)).filter((p) => inRange(p.firstDay)).length;
  const portalRealLeads = C.dedupeLeads(C.leadRecords(input)).filter((l) => inRange(l.firstDay)).length;

  // Partial leads: step-1-only bookings, same exclusions, shown on their own (never added to real leads).
  const partialAll = (input.bookings || []).filter((b) => C.isPartialBooking(b) && b.createdAt)
    .map((b) => ({ kind: "booking", id: b.id, at: b.createdAt, email: b.email, phone: b.phone, name: [b.firstName, b.lastName].filter(Boolean).join(" "), firstName: b.firstName, lastName: b.lastName, internal: b.internal, raw: b }));
  const partialInternalFlag = (r) => C.isInternal(r);
  const partial = groupByPerson(partialAll.filter((r) => !partialInternalFlag(r))).filter((p) => inRange(p.firstDay));
  const internalPartial = groupByPerson(partialAll.filter(partialInternalFlag)).filter((p) => inRange(p.firstDay)).length;

  const starts = C.firstPaidStartByEmail(input.subs || [], cfg);
  const groups = new Map();
  const ensure = (a) => {
    if (!groups.has(a.key)) groups.set(a.key, { key: a.key, label: a.label, rule: a.rule, ruleLabel: RULES[a.rule], campaignId: a.campaignId || null, note: a.note || "", realLeads: 0, partialLeads: 0, payingRentals: 0 });
    return groups.get(a.key);
  };
  // Every campaign that ran during the range gets a row, even at zero.
  for (const row of rows) {
    if (row.start <= toDay && (!row.end || row.end >= range.from)) ensure({ key: "campaign:" + row.id, label: row.name, rule: "campaign", campaignId: row.id });
  }
  ensure({ key: "unattributed", label: "Unattributed", rule: "none", note: UNATTRIBUTED_NOTE });
  for (const p of real) {
    const g = ensure(attribute(p.records, rows, cutoffMs));
    g.realLeads += 1;
    if (stripeOk && C.reachedRental({ key: p.key, firstAt: p.firstAt }, starts, cfg)) g.payingRentals += 1;
  }
  for (const p of partial) ensure(attribute(p.records, rows, cutoffMs)).partialLeads += 1;

  const rowById = new Map(rows.map((r) => [r.id, r]));
  const out = [...groups.values()].map((g) => {
    const row = g.campaignId ? rowById.get(g.campaignId) : null;
    let spend = null, spendDisplay = null, cplDisplay = null, cpl = null;
    if (row) {
      const s = row.spendSource === "manual" ? spendInRange(row, range.from, toDay) : null;
      if (s) {
        spend = s.amount; spendDisplay = `${usd(s.amount)} (${s.days} day${s.days === 1 ? "" : "s"} entered)`;
        if (g.realLeads >= 1) { cpl = money(s.amount / g.realLeads); cplDisplay = `${usd(cpl)} (n=${g.realLeads})`; }
        else cplDisplay = "No real leads yet";
      } else spendDisplay = row.spendSource === "manual" ? "No spend entered for this range" : "No spend source";
    }
    return {
      ...g,
      channel: row ? row.channel : null,
      dates: row ? `${row.start} to ${row.end || "open"}` : null,
      owner: row ? row.owner : null,
      payingRentals: stripeOk ? g.payingRentals : null,
      spend, spendDisplay, cpl, cplDisplay,
    };
  });
  const order = ["campaign", "intake", "utm_unlisted", "click", "referrer", "self", "offsite", "before", "none"];
  out.sort((a, b) => order.indexOf(a.rule) - order.indexOf(b.rule) || b.realLeads - a.realLeads || a.label.localeCompare(b.label));

  const totalReal = out.reduce((t, g) => t + g.realLeads, 0);
  return {
    updated: C.lastUpdated({ nowMs, portalMs: input.fetchedAt && input.fetchedAt.portalMs, stripeMs: stripeOk ? input.fetchedAt && input.fetchedAt.stripeMs : null }),
    range: { from: range.from, to: range.to, toDay, campaignId: range.campaignId, today },
    stripe: { configured: !!(input.stripe && input.stripe.configured), ok: stripeOk },
    groups: out,
    totals: {
      realLeads: totalReal,
      partialLeads: out.reduce((t, g) => t + g.partialLeads, 0),
      payingRentals: stripeOk ? out.reduce((t, g) => t + (g.payingRentals || 0), 0) : null,
      portalRealLeads,
      reconciled: totalReal === portalRealLeads,
    },
    internal: { realLeads: internalReal, partialLeads: internalPartial },
    campaigns: rows.map(publicRow),
  };
}

// What the admin sees of a campaign-list row (no ids beyond the row's own, no lead data).
function publicRow(r) {
  return {
    id: r.id, name: r.name, utmCampaign: r.utmCampaign, channel: r.channel, owner: r.owner, start: r.start, end: r.end || null,
    spendSource: r.spendSource, spendSourceLabel: SPEND_SOURCE_LABEL[r.spendSource] || r.spendSource, portalTag: r.portalTag,
    spend: (r.spend || []).map((s) => ({ day: s.day, amount: s.amount })),
  };
}

module.exports = {
  CHANNELS, SPEND_SOURCES, SPEND_SOURCE_LABEL, RULES, UNATTRIBUTED_NOTE, BEFORE_NOTE, OFFSITE_LABEL,
  newCampaign, endCampaign, setSpend, inCampaignWindow, attribute, groupByPerson, resolveRange, spendInRange,
  buildCampaignReport, publicRow,
};
