// Admin "Site OKRs & Analytics → Leads by Campaign": real leads grouped by the campaign (or other known source)
// that brought them, per /workspace/purebaric-team/pdm/spec-admin-campaign-leads-tab.md Rev 2 (Matthew's
// 12:32 PM MT review; Proof-reader sign-off ~12:50 PM MT Nov 25, 2026) and the O&P measurement plan FINAL v2
// (opt/leads-by-campaign-measurement-plan.md). Pure: the handlers (admin-campaign-leads.js, admin-campaigns.js)
// read the stores and pass plain arrays in, so every rule is unit-tested (test/campaign-leads.test.js).
//
// Rules worth knowing before changing anything:
//  - Real leads, partial leads, TEST/internal and one-person-one-lead come from _lib/constellation.js.
//    Visible row real leads + the no-source footnote N always equal the OKRs tab's real-lead count for the
//    range. A mismatch is a bug.
//  - First matching rule wins. Every row has a human name, a Platform (campaign rows: the list's Platform;
//    source rows: PLATFORM below, or none), and for Meta a Channel (Paid / Organic). The rule that matched is
//    only a tooltip ("Matched by").
//  - No placeholder rows: no Unattributed, Before source tracking or TEST/internal row. Leads with no source
//    are the footnote: M from before the Release 3 cutoff (Nov 24, 2026, 2:33 PM MT), K after it (privacy
//    setting or blocked storage; no marker is captured, by design) plus leftovers with no mapped source.
//    Zero-count campaign rows come back flagged `empty` and the page hides them unless "Show empty campaigns".
//  - Spend: a Meta or Google Ads row with an "Ad platform campaign name" reads spend live (Google Ads cost via
//    GA4; Meta via the Marketing API when META_ADS_TOKEN and META_AD_ACCOUNT_ID are set). Otherwise spend is
//    what an admin typed into the campaign list, shown as static (" *" plus "Last updated"). The ad name is
//    only used to match spend, never to group leads.
//  - Counts only: no percentages or conversion rates. Cost per real lead shows its n.
//  - The payload is aggregates and campaign-list rows only: no names, emails, phones, notes or record ids.

const C = require("./constellation");
const S = require("./static-metrics");
const P = require("./campaign-platform");

const DAY_MS = 86400000;
const CHANNELS = Object.keys(P.LEGACY_CHANNEL); // pre-Rev 2 channel values, still accepted on add
const SPEND_SOURCES = ["manual", "none"];
const SPEND_SOURCE_LABEL = { manual: "Entered by hand (daily)", none: "No spend source" };

// "Matched by" tooltip per rule (kept live strings from the PR #37 sign-off, except "source": see the
// strings file; it needs the Proof-reader).
const RULES = {
  campaign: "UTM campaign tag",
  intake: "Portal campaign tag (intake)",
  utm_unlisted: "UTM tag, no matching campaign row",
  click: "Ad click ID, no campaign tag",
  source: "UTM source, no campaign tag",
  referrer: "Referrer or landing page only",
  self: "Self-reported only",
  offsite: "Intake source tag, no campaign tag",
};

// Known sources with no campaign: human name, Platform and (Meta only) Channel. Spec Rev 2 mapping table.
const SOURCE = {
  meta: { label: "Meta, no campaign", platform: "Meta" },
  google_ads: { label: "Google Ads, no campaign", platform: "Google Ads" },
  outreach: { label: "Email outreach, no campaign", platform: "Email outreach" },
  marketplace: { label: "Facebook Marketplace, no campaign", platform: "Facebook Marketplace" },
  ksl: { label: "KSL, no campaign", platform: "KSL" },
  google_search: { label: "Google search, no campaign", platform: "Organic / Google search" },
  gbp: { label: "Google Business Profile, no campaign", platform: "Organic / Google search" },
  referral: { label: "Referral, no campaign", platform: "Referral" },
  phone: { label: "Phone or text, no campaign", platform: "Phone or text" },
  hello: { label: "Email inbox (hello@), no campaign", platform: "Email inbox" },
  messenger: { label: "Facebook Messenger, no campaign", platform: "Meta", channel: "Organic" },
  direct: { label: "Direct visit, no campaign", platform: null },
};
// R&O off-site intake tags → SOURCE key. PdM calls: hello@ = Email inbox; Messenger = Meta Organic; GBP =
// Organic / Google search. Tags with no approved name (e.g. waitlist-email) fall to the no-source footnote.
const OFFSITE_SOURCE = { "hello-email": "hello", "phone-text": "phone", messenger: "messenger", marketplace: "marketplace",
  ksl: "ksl", referral: "referral", outreach: "outreach", gbp: "gbp" };
// Self-reported answers ("How did you first hear about us?") → Platform (row stays "Self-reported: <answer>").
const SELF_PLATFORM = { "Facebook or Instagram": ["Meta", "Organic"], "Facebook Marketplace": ["Facebook Marketplace"], "Google search": ["Organic / Google search"],
  "Google Maps": ["Organic / Google search"], "Friend or family": ["Referral"], "Gym, studio, clinic or salon": ["Referral"] };
// utm_source values → Platform for UTM/portal-tag rows with no list row.
function platformOfSource(src) {
  const v = lc(src);
  if (!v) return null;
  if (v.includes("marketplace")) return "Facebook Marketplace";
  if (/^(fb|facebook|ig|instagram|meta)$/.test(v)) return "Meta";
  if (v === "google") return "Google Ads";
  if (v === "gbp") return "Organic / Google search";
  if (v === "ksl") return "KSL";
  if (/outreach|email/.test(v)) return "Email outreach";
  return null;
}

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
  // Platform is required (Rev 2). A pre-Rev 2 caller may still send only the old channel list.
  const legacy = CHANNELS.find((c) => lc(c) === lc(input.channel));
  const platform = input.platform ? P.PLATFORMS.find((x) => x === input.platform) : (legacy ? P.LEGACY_CHANNEL[legacy] : null);
  if (!platform) return { error: "Choose a platform." };
  const channel = platform === "Meta" ? (P.META_CHANNELS.find((c) => lc(c) === lc(input.channel)) || "Paid") : null;
  const owner = cleanText(input.owner, 60);
  if (!owner) return { error: "Owner is required." };
  if (!isDay(input.start)) return { error: "Start date is required." };
  const end = input.end ? String(input.end) : "";
  if (end && (!isDay(end) || end < input.start)) return { error: "End date must be on or after the start date." };
  const spendSource = SPEND_SOURCES.includes(input.spendSource) ? input.spendSource : (P.AD_PLATFORMS.includes(platform) ? "manual" : "none");
  let portalTag = tagKey(input.portalTag);
  if (portalTag && !/^[a-z0-9][a-z0-9\-]{0,59}$/.test(portalTag)) return { error: "Portal tag: lowercase letters, numbers or - only." };
  if (!portalTag) portalTag = "campaign-" + tagKey(utmCampaign);
  if (rows.some((r) => r.portalTag === portalTag)) return { error: "That portal tag is already used by another campaign." };
  // Only Meta and Google Ads rows can read spend live, so only they keep an ad platform campaign name.
  const adsCampaignName = P.AD_PLATFORMS.includes(platform) ? cleanText(input.adsCampaignName, 120) : "";
  return {
    row: {
      id: id || `cmp_${utmCampaign}`,
      name, utmCampaign, platform, channel, owner, start: input.start, end: end || null, spendSource, portalTag,
      adsCampaignName: adsCampaignName || null, adsCampaignNameAt: adsCampaignName ? nowIso : null,
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

// Sets or clears the optional ad platform campaign name (Google Ads or Meta, exactly as named there). Used
// only to match live spend to the row; it never changes which leads the row gets.
function setAdsName(rows, id, name, { nowIso = new Date().toISOString() } = {}) {
  const row = rows.find((r) => r.id === id);
  if (!row) return { error: "Campaign not found." };
  if (!P.AD_PLATFORMS.includes(P.platformOf(row))) return { error: "Only Meta and Google campaigns have an ad platform campaign name." };
  const adsCampaignName = cleanText(name, 120) || null;
  return { rows: rows.map((r) => (r.id === id ? { ...r, adsCampaignName, adsCampaignNameAt: nowIso } : r)) };
}

// Live spend for one row from the ad-platform reads, or null when there is no live read for it.
// live: { google: { ok, byCampaign }, meta: { ok, byCampaign } } (by campaign name, for the report's range).
function liveSpendFor(row, live) {
  if (!row || !row.adsCampaignName || !live) return null;
  const platform = P.platformOf(row);
  const from = platform === "Google Ads" ? "Google Ads" : platform === "Meta" ? "Meta" : null;
  if (!from) return null;
  const src = platform === "Google Ads" ? live.google : live.meta;
  // A live payload was given but this platform is missing, empty, errored or unmatched: unknown, not a live $0.
  if (src == null || !src.ok || !src.byCampaign) return { unknown: true, from };
  const want = lc(row.adsCampaignName);
  let amount = 0, matched = false;
  for (const [name, v] of Object.entries(src.byCampaign)) if (lc(name) === want) { matched = true; amount += Number(v) || 0; }
  if (!matched) return { unknown: true, from };
  return { amount: money(amount), from };
}

// Records one day's hand-entered spend (from Demand Gen's daily check). Entering a day again replaces it.
function setSpend(rows, id, day, amount, { nowIso = new Date().toISOString(), today } = {}) {
  const row = rows.find((r) => r.id === id);
  if (!row) return { error: "Campaign not found." };
  if (row.spendSource !== "manual") return { error: "This campaign has no spend source." };
  if (!isDay(day) || day < row.start || (row.end && day > row.end) || (today && day > today)) return { error: "Spend date must be inside the campaign's run, and not in the future." };
  const n = Number(amount);
  if (!Number.isFinite(n) || n < 0 || n > 100000) return { error: "Spend must be between $0 and $100,000." };
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

const hostOf = (url) => { try { return new URL(url).hostname.replace(/^www\./, "").toLowerCase(); } catch (e) { return ""; } };
const isGoogleHost = (h) => /(^|\.)google\.[a-z.]+$/.test(h);
const isMetaHost = (h) => /(^|\.)(facebook\.com|fb\.com|instagram\.com|messenger\.com)$/.test(h) || h === "l.facebook.com" || h === "lm.facebook.com";

// A group for a known source with no campaign.
const src = (k, rule, extra = {}) => ({ key: "source:" + k, label: SOURCE[k].label, rule, platform: SOURCE[k].platform, channel: SOURCE[k].channel || null, ...extra });

// records: one person's stored records, oldest first ({ kind, at, raw }). rows: the campaign list.
// Returns a group { key, label, rule, platform, channel, campaignId? }, or { noSource: "before" | "after" }
// for a lead with nothing to go on (the footnote, never a row).
function attribute(records, rows, cutoffMs) {
  const byUtm = new Map(rows.map((r) => [lc(r.utmCampaign), r]));
  const byTag = new Map();
  for (const r of rows) { byTag.set(r.portalTag || "campaign-" + tagKey(r.utmCampaign), r); }
  const ls = (r) => (r.raw && r.raw.leadSource && typeof r.raw.leadSource === "object" ? r.raw.leadSource : null);
  const campaign = (row, rule) => ({ key: "campaign:" + row.id, label: row.name, rule, campaignId: row.id, platform: P.platformOf(row), channel: P.metaChannelOf(row) });
  const metaChannel = (l) => (l.fbclid || /paid|cpc|ads?|paid_social/.test(lc(l.utmMedium)) ? "Paid" : "Organic");
  const firstOffsite = () => {
    for (const r of records) for (const t of sourceTags(r.raw)) if (OFFSITE_SOURCE[t]) return SOURCE[OFFSITE_SOURCE[t]];
    return null;
  };

  // 1. UTM campaign tag = a list row, lead inside the row's window.
  for (const r of records) {
    const row = ls(r) && byUtm.get(lc(ls(r).utmCampaign));
    if (row && inCampaignWindow(dayOf(r.at), row)) return campaign(row, "campaign");
  }
  // 2. Portal campaign tag set by R&O at intake (a campaign-* tag, the row's portal tag, or a `campaign` field).
  for (const r of records) {
    const tags = (Array.isArray(r.raw.tags) ? r.raw.tags : []).map(tagKey);
    if (r.raw.campaign) tags.push("campaign-" + tagKey(r.raw.campaign));
    for (const t of tags) {
      const row = byTag.get(t) || (t.startsWith("campaign-") ? rows.find((x) => "campaign-" + tagKey(x.utmCampaign) === t) : null);
      if (row) return campaign(row, "intake");
    }
    const loose = tags.find((t) => t.startsWith("campaign-"));
    if (loose) {
      const off = firstOffsite();
      return { key: "intake:" + loose, label: `Portal tag ${loose}, no campaign in the list`, rule: "intake", platform: off ? off.platform : null, channel: off ? off.channel || null : null };
    }
  }
  // UTM campaign tag that is not in the list, or arrived outside its row's window: never credited to a campaign.
  for (const r of records) {
    const utm = ls(r) && lc(ls(r).utmCampaign);
    if (!utm) continue;
    const listed = byUtm.get(utm);
    const platform = listed ? P.platformOf(listed) : platformOfSource(ls(r).utmSource);
    const channel = platform === "Meta" ? (listed ? P.metaChannelOf(listed) : metaChannel(ls(r))) : null;
    return { key: "utm:" + utm, label: listed ? `UTM ${utm}, outside the campaign window` : `UTM ${utm}, no campaign in the list`, rule: "utm_unlisted", platform, channel };
  }
  // 3. Click id with no campaign tag.
  for (const r of records) if (ls(r) && ls(r).gclid) return src("google_ads", "click");
  for (const r of records) if (ls(r) && ls(r).fbclid) return src("meta", "click", { channel: "Paid" });
  // UTM source / medium with no campaign tag (lead-source.js channelOf signals).
  for (const r of records) {
    const l = ls(r); if (!l) continue;
    const s0 = lc(l.utmSource), med = lc(l.utmMedium);
    if (!s0 && !med) {
      // lead-source.js channelOf() result, when it was stored without the raw UTM values.
      const ch = { "Meta paid": ["meta", "Paid"], "Meta organic": ["meta", "Organic"], "Google Ads": ["google_ads"], "Facebook Marketplace": ["marketplace"],
        "Email / outreach": ["outreach"], "Organic search": ["google_search"] }[l.channel];
      if (ch) return src(ch[0], "source", ch[1] ? { channel: ch[1] } : {});
      continue;
    }
    if (s0.includes("marketplace")) return src("marketplace", "source");
    if (/^(fb|facebook|ig|instagram|meta)$/.test(s0)) return src("meta", "source", { channel: metaChannel(l) });
    if (s0 === "google" && /cpc|paid|ads?/.test(med)) return src("google_ads", "source");
    if (s0 === "gbp") return src("gbp", "source");
    if (s0 === "google") return src("google_search", "source");
    if (s0 === "ksl") return src("ksl", "source");
    if (/email|newsletter|outreach/.test(med) || /outreach/.test(s0)) return src("outreach", "source");
  }
  // 4. Referrer / landing path only.
  for (const r of records) {
    const l = ls(r); if (!l) continue;
    const host = hostOf(l.referrer);
    if (host && isGoogleHost(host)) return src("google_search", "referrer");
    if (host && isMetaHost(host)) return src("meta", "referrer", { channel: "Organic" });
    if (host) return { key: "site:" + host, label: `Other website: ${host}`, rule: "referrer", platform: "Other website", channel: null };
    if (l.landingPath) return src("direct", "referrer");
  }
  // 5. Self-reported "How did you hear about us?" only (never merged with tracked rows).
  for (const r of records) {
    if (!r.raw.heardAbout) continue;
    const [platform = null, channel = null] = SELF_PLATFORM[r.raw.heardAbout] || [];
    return { key: "self:" + r.raw.heardAbout, label: `Self-reported: ${r.raw.heardAbout}`, rule: "self", platform, channel };
  }
  // Off-site leads (hello@, Messenger, KSL, phone or text, …) with an R&O source tag but no campaign tag.
  if (!records.some((r) => r.kind !== "customer")) {
    for (const r of records) {
      const t = sourceTags(r.raw).find((x) => OFFSITE_SOURCE[x]);
      if (t) return src(OFFSITE_SOURCE[t], "offsite");
    }
  }
  // Nothing to go on: the no-source footnote, split at the Release 3 cutoff.
  return { noSource: records.length && Date.parse(records[0].at) < cutoffMs ? "before" : "after" };
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
  return entries.length ? { amount: money(entries.reduce((t, s) => t + Number(s.amount || 0), 0)), days: entries.length, lastEnteredAt: S.latest(entries.map((s) => s.enteredAt)) } : null;
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
    if (!groups.has(a.key)) groups.set(a.key, { key: a.key, label: a.label, rule: a.rule, ruleLabel: RULES[a.rule], campaignId: a.campaignId || null,
      platform: a.platform || null, channel: a.channel || null, realLeads: 0, partialLeads: 0, payingRentals: 0 });
    return groups.get(a.key);
  };
  // Every campaign that ran during the range gets a group; the page hides it while it is empty.
  for (const row of rows) {
    if (row.start <= toDay && (!row.end || row.end >= range.from)) ensure({ key: "campaign:" + row.id, label: row.name, rule: "campaign", campaignId: row.id, platform: P.platformOf(row), channel: P.metaChannelOf(row) });
  }
  const noSource = { before: 0, after: 0 };
  for (const p of real) {
    const a = attribute(p.records, rows, cutoffMs);
    if (a.noSource) { noSource[a.noSource] += 1; continue; }
    const g = ensure(a);
    g.realLeads += 1;
    if (stripeOk && C.reachedRental({ key: p.key, firstAt: p.firstAt }, starts, cfg)) g.payingRentals += 1;
  }
  // Partial leads with no source have no row and are not in the footnote (it counts real leads only).
  let partialNoSource = 0;
  for (const p of partial) {
    const a = attribute(p.records, rows, cutoffMs);
    if (a.noSource) partialNoSource += 1; else ensure(a).partialLeads += 1;
  }

  const rowById = new Map(rows.map((r) => [r.id, r]));
  const out = [...groups.values()].map((g) => {
    const row = g.campaignId ? rowById.get(g.campaignId) : null;
    let spend = null, spendDisplay = null, cplDisplay = null, cpl = null, spendStatic = false, spendUpdated = null;
    const liveSpend = liveSpendFor(row, input.liveSpend);
    if (row && liveSpend && liveSpend.unknown) {
      spendDisplay = "No data yet";
      cplDisplay = "—";
    } else if (row && liveSpend) {
      spend = liveSpend.amount; spendDisplay = `${usd(spend)} (live from ${liveSpend.from})`;
      if (g.realLeads >= 1) { cpl = money(spend / g.realLeads); cplDisplay = `${usd(cpl)} (${g.realLeads === 1 ? "1 real lead" : g.realLeads + " real leads"})`; }
      else cplDisplay = "No real leads yet";
    } else if (row) {
      const s = row.spendSource === "manual" ? spendInRange(row, range.from, toDay) : null;
      if (row.spendSource === "manual") { spendStatic = true; spendUpdated = s ? S.stamp(s.lastEnteredAt) : null; }
      if (s) {
        spend = s.amount; spendDisplay = `${usd(s.amount)} (${s.days} day${s.days === 1 ? "" : "s"} entered)`;
        if (g.realLeads >= 1) { cpl = money(s.amount / g.realLeads); cplDisplay = `${usd(cpl)} (${g.realLeads === 1 ? "1 real lead" : g.realLeads + " real leads"})`; }
        else cplDisplay = "No real leads yet";
      } else spendDisplay = row.spendSource === "manual" ? "No spend entered for this range" : "No spend source";
    }
    return {
      ...g,
      dates: row ? `${row.start} to ${row.end || "open"}` : null,
      owner: row ? row.owner : null,
      payingRentals: stripeOk ? g.payingRentals : null,
      empty: g.realLeads === 0 && g.partialLeads === 0,
      spend, spendDisplay, cpl, cplDisplay, spendStatic, spendUpdated,
    };
  });
  const order = ["campaign", "intake", "utm_unlisted", "click", "source", "referrer", "self", "offsite"];
  out.sort((a, b) => order.indexOf(a.rule) - order.indexOf(b.rule) || b.realLeads - a.realLeads || a.label.localeCompare(b.label));

  const totalReal = out.reduce((t, g) => t + g.realLeads, 0);
  const n = noSource.before + noSource.after;
  // Campaigns with spend above $0 in the range and no real leads (spec sign-off footnote; live spend when read, else entered).
  const spendNoLeads = out.filter((g) => g.campaignId && g.realLeads === 0 && g.spend > 0).map((g) => `${g.label} (${usd(g.spend)})`);
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
      reconciled: totalReal + n === portalRealLeads,
    },
    noSource: { total: n, before: noSource.before, after: noSource.after, partialLeads: partialNoSource,
      footnote: n === 0 ? null : noSourceFootnote(n, noSource.before, noSource.after) },
    // Monday coverage input (OPT v2): attributed ÷ (attributed + K), post-Release-3 leads only.
    coverage: { attributedAfterCutoff: real.filter((p) => Date.parse(p.firstAt) >= cutoffMs).length - noSource.after, noSourceAfterCutoff: noSource.after },
    spendNoLeadsFootnote: spendNoLeads.length ? `Campaigns with spend but no leads in this range: ${spendNoLeads.join(", ")}` : null,
    internal: { realLeads: internalReal, partialLeads: internalPartial },
    campaigns: rows.map(publicRow),
    staticFootnote: S.STATIC_FOOTNOTE,
  };
}

// Proof-reader-signed footnote (singular and plural).
function noSourceFootnote(n, m, k) {
  const rest = `with no source (${m} before tracking began Nov 24, 2:33 PM MT; ${k} after, from a privacy setting or blocked storage).`;
  return n === 1 ? `1 lead ${rest}` : `${n} leads ${rest}`;
}

// What the admin sees of a campaign-list row (no ids beyond the row's own, no lead data).
function publicRow(r) {
  return {
    id: r.id, name: r.name, utmCampaign: r.utmCampaign, platform: P.platformOf(r), channel: P.metaChannelOf(r), owner: r.owner, start: r.start, end: r.end || null,
    spendSource: r.spendSource, spendSourceLabel: SPEND_SOURCE_LABEL[r.spendSource] || r.spendSource, portalTag: r.portalTag,
    spend: (r.spend || []).map((s) => ({ day: s.day, amount: s.amount })),
    adsCampaignName: r.adsCampaignName || null,
    lastUpdated: S.stamp(S.latest(r.createdAt, r.endedAt, r.adsCampaignNameAt, (r.spend || []).map((s) => s.enteredAt))),
  };
}

module.exports = {
  CHANNELS, SPEND_SOURCES, SPEND_SOURCE_LABEL, RULES, SOURCE, OFFSITE_SOURCE, SELF_PLATFORM, noSourceFootnote,
  newCampaign, endCampaign, setSpend, setAdsName, liveSpendFor, inCampaignWindow, attribute, groupByPerson, resolveRange, spendInRange,
  buildCampaignReport, publicRow,
};
