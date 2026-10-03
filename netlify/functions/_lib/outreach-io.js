// Outreach storage, rendering and delivery, shared by the admin Outreach tab (admin-outreach.js) and the
// scheduled sender (outreach-daily.js). Everything that touches Blobs, Resend or the templates lives here.
const { store, nowIso } = require("./storage");
const { send } = require("./email");
const tpl = require("./outreach-template");
const out = require("./outreach");

const STORE = "outreach";
const SETTINGS_KEY = "settings";
const SITE = "https://purebaric.com";

async function listProspects() {
  const s = store(STORE);
  const { blobs } = await s.list();
  const items = await Promise.all(blobs.filter(b => b.key !== SETTINGS_KEY).map(b => s.get(b.key, { type: "json" })));
  return items.filter(Boolean);
}
async function getProspect(id) { return store(STORE).get(id, { type: "json" }); }
async function putProspect(p) { await store(STORE).setJSON(p.id, p); return p; }
async function getSettings() { return out.cleanSettings(await store(STORE).get(SETTINGS_KEY, { type: "json" })); }
async function putSettings(s) { const clean = out.cleanSettings(s); await store(STORE).setJSON(SETTINGS_KEY, { ...clean, updatedAt: nowIso() }); return clean; }

function unsubscribeUrl(p) {
  return `${SITE}/api/outreach/unsubscribe?p=${encodeURIComponent(p.id)}&t=${encodeURIComponent(p.unsubToken)}`;
}

function renderFor(p, settings, overrides = {}) {
  return tpl.render({
    categoryId: overrides.templateId || p.templateId,
    firstName: overrides.firstName !== undefined ? overrides.firstName : p.firstName,
    businessName: overrides.businessName !== undefined ? overrides.businessName : p.business,
    subjectIndex: settings.subjectIndex,
    unsubscribeUrl: p.unsubToken ? unsubscribeUrl(p) : "",
    postalAddress: settings.postalAddress,
  });
}

function fromHeader(settings) {
  return `${settings.fromName.replace(/[<>"]/g, "")} <${settings.fromEmail}>`;
}

async function deliver(p, settings, to, { isTest = false } = {}) {
  const r = renderFor(p, settings);
  const headers = p.unsubToken ? {
    "List-Unsubscribe": `<${unsubscribeUrl(p)}>, <mailto:${settings.replyTo}?subject=unsubscribe>`,
    "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
  } : {};
  const subject = isTest ? `[Business outreach TEST for ${p.business}] ${r.subject}` : r.subject;
  const res = await send({ to, subject, html: r.html, text: r.text, from: fromHeader(settings), replyTo: settings.replyTo, headers });
  return { resendId: res && res.data && res.data.id, subject };
}

// Refresh delivery state (bounced, complained) from Resend for recently sent emails. `limit` bounds the
// number of API calls so the scheduled sender stays inside its time budget; rows are checked least
// recently checked first, so every recent send gets looked at within a few runs.
async function syncRecent({ limit = 500, maxAgeDays = 21 } = {}) {
  const { Resend } = require("resend");
  const key = process.env.RESEND_API_KEY;
  if (!key) throw new Error("RESEND_API_KEY not set");
  const resend = new Resend(key);
  const cutoff = Date.now() - maxAgeDays * 86400000;
  const all = await listProspects();
  const due = all
    .filter(p => p.resendId && p.status === "sent" && p.sentAt && Date.parse(p.sentAt) >= cutoff)
    .sort((a, b) => String(a.lastSyncAt || "").localeCompare(String(b.lastSyncAt || "")))
    .slice(0, limit);
  let checked = 0, changed = 0;
  for (const p of due) {
    try {
      const r = await resend.emails.get(p.resendId);
      const ev = r && r.data && (r.data.last_event || r.data.lastEvent);
      checked++;
      const next = { ...out.applyResendEvent(p, ev), lastSyncAt: nowIso() };
      await putProspect(next);
      if (next.status !== p.status || next.lastEvent !== p.lastEvent) changed++;
    } catch (e) { /* leave as is; the next sync retries */ }
  }
  return { checked, changed };
}

module.exports = { STORE, SETTINGS_KEY, SITE, listProspects, getProspect, putProspect, getSettings, putSettings,
  unsubscribeUrl, renderFor, fromHeader, deliver, syncRecent };
