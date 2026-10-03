// The daily outreach sender's logic: which prospects go next, when to stop, when to pause. Pure except
// for the injected `io` (storage, delivery, notification), so it is tested without Blobs or Resend.
const out = require("./outreach");
const { categoryById } = require("./outreach-template");

const SUB_BATCH = 5;          // emails per scheduled run; runs repeat every 10 minutes until the daily cap
const SYNC_PER_RUN = 4;       // Resend status checks per run (bounces and complaints)
const SPACING_MS = 500;       // between sends; Resend allows 2 requests a second
const BOUNCE_SAMPLE = 20;     // guard only once this many recent sends exist
const BOUNCE_MAX = 0.05;      // pause auto-send above 5% bounces or complaints in the last 50 sends

const CONF = { high: 0, medium: 1 };
const failures = p => (p.history || []).filter(h => h.event === "failed").length;

// Rows the automation may send to: new (or failed once, for a transient error), with an email and a template.
function sendable(prospects, settings) {
  return prospects.filter(p => !out.sendBlocker(p, settings) && (p.status === "new" || failures(p) < 2));
}

// Highest-confidence emails first, interleaved across industries so a batch is not one template over and over.
function pickBatch(prospects, settings, max) {
  if (max <= 0) return [];
  const pool = sendable(prospects, settings)
    .map((p, i) => ({ p, i }))
    .sort((a, b) => ((CONF[a.p.emailConfidence] ?? 2) - (CONF[b.p.emailConfidence] ?? 2)) || (a.i - b.i));
  const lanes = new Map();
  for (const { p } of pool) {
    const k = p.templateId;
    if (!lanes.has(k)) lanes.set(k, []);
    lanes.get(k).push(p);
  }
  const picked = [];
  while (picked.length < max && lanes.size) {
    for (const [k, lane] of [...lanes]) {
      if (picked.length >= max) break;
      picked.push(lane.shift());
      if (!lane.length) lanes.delete(k);
    }
  }
  return picked;
}

// Bounces and complaints among the last 50 sends (whatever their status became).
function bounceRate(prospects) {
  const recent = prospects
    .filter(p => p.sentAt && ["sent", "bounced", "unsubscribed", "replied", "interested", "customer", "declined"].includes(p.status))
    .sort((a, b) => String(b.sentAt).localeCompare(String(a.sentAt)))
    .slice(0, 50);
  const bad = recent.filter(p => p.status === "bounced" || (p.history || []).some(h => h.event === "resend:complained")).length;
  return { sample: recent.length, bad, rate: recent.length ? bad / recent.length : 0 };
}

const sleep = ms => new Promise(r => setTimeout(r, ms));

// One run. `io` supplies: getSettings, putSettings, listProspects, putProspect, deliver(p, settings, to),
// syncRecent({limit}), notify({subject, text}). `trigger` is "schedule" (honours the auto-send switch) or "manual".
async function runBatch(io, { max = SUB_BATCH, now = new Date(), trigger = "schedule", sleepFn = sleep } = {}) {
  const settings = await io.getSettings();
  const day = now.toISOString().slice(0, 10);
  const result = { trigger, day, sent: 0, failed: 0, skipped: null, sentToday: 0, remaining: 0 };
  if (trigger === "schedule" && !settings.autoSend) { result.skipped = "auto-send is off"; return result; }
  if (trigger === "schedule" && !out.inSendWindow(settings, now)) { result.skipped = "outside the chosen days and time"; return result; }
  if (!settings.postalAddress) { result.skipped = "postal address not set"; return result; }

  if (io.syncRecent) { try { await io.syncRecent({ limit: SYNC_PER_RUN }); } catch (e) { /* next run */ } }
  let all = await io.listProspects();

  const br = bounceRate(all);
  if (br.sample >= BOUNCE_SAMPLE && br.rate > BOUNCE_MAX) {
    await io.putSettings({ ...settings, autoSend: false, lastAutoRun: { at: now.toISOString(), trigger, sent: 0, failed: 0, note: `paused: ${br.bad} of the last ${br.sample} sends bounced or complained` } });
    await io.notify({ subject: "Purebaric outreach paused: bounce rate too high",
      text: `Auto-send paused itself. ${br.bad} of the last ${br.sample} outreach emails bounced or were marked as spam (${Math.round(br.rate * 100)}%). Check the Outreach tab, clean the list, then switch auto-send back on.` });
    result.skipped = "paused: bounce rate"; return result;
  }

  const before = out.sentToday(all, now);
  const room = Math.min(max, settings.dailyCap - before);
  const batch = pickBatch(all, settings, room);
  for (let i = 0; i < batch.length; i++) {
    const p = batch[i];
    try {
      const { resendId, subject } = await io.deliver(p, settings, p.email);
      const sent = out.markSent(p, resendId, subject);
      sent.history[sent.history.length - 1].by = trigger === "manual" ? "admin:auto-batch" : "auto";
      await io.putProspect(sent); result.sent++;
    } catch (e) {
      await io.putProspect(out.markFailed(p, e.message)); result.failed++;
    }
    if (i < batch.length - 1) await sleepFn(SPACING_MS);
  }

  all = await io.listProspects();
  result.sentToday = out.sentToday(all, now);
  result.remaining = sendable(all, settings).length;
  const capReached = result.sentToday >= settings.dailyCap;
  const done = result.remaining === 0;
  const next = { ...settings, lastAutoRun: { at: now.toISOString(), trigger, sent: result.sent, failed: result.failed, sentToday: result.sentToday, remaining: result.remaining } };

  if (done) {
    next.autoSend = false;
    await io.notify({ subject: "Purebaric outreach: every business email has been sent",
      text: `The last business outreach email went out today. ${result.sentToday} sent today; nothing sendable remains in the list. Auto-send switched itself off. Replies go to hello@purebaric.com; mark them replied, interested, or declined in the Outreach tab.` });
    next.lastSummaryDay = day;
  } else if ((capReached || batch.length < room) && next.lastSummaryDay !== day && (result.sent || trigger === "manual")) {
    await io.notify({ subject: `Purebaric outreach: ${result.sentToday} sent today, ${result.remaining} to go`,
      text: `Today's batch is done: ${result.sentToday} of ${settings.dailyCap} sent${result.failed ? `, ${result.failed} failed (see the Outreach tab)` : ""}. ${result.remaining} prospects still to email. The next batch goes out on the next weekday morning.` });
    next.lastSummaryDay = day;
  }
  await io.putSettings(next);
  return result;
}

module.exports = { SUB_BATCH, SYNC_PER_RUN, SPACING_MS, BOUNCE_SAMPLE, BOUNCE_MAX, sendable, pickBatch, bounceRate, runBatch };
