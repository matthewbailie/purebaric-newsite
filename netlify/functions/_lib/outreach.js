// Business outreach: the prospect list the owner emails from the admin Outreach tab.
//
// A prospect is one business (gym, studio, clinic, salon, team) from the research workbook
// (_internal/outreach/purebaric_b2b_email_prospects.xlsx), imported into the "outreach" Blobs store
// with a status the owner moves as emails go out and replies come in. Pure helpers live here so they
// can be unit-tested; storage and Resend calls live in admin-outreach.js.
const crypto = require("crypto");
const { greetingName, categoryById } = require("./outreach-template");

const STATUSES = ["new", "sent", "bounced", "replied", "interested", "customer", "declined", "unsubscribed", "skipped", "failed"];
// Statuses that a bulk send may pick up. Everything else is final or manual.
const SENDABLE = new Set(["new", "failed"]);

const DEFAULT_SETTINGS = {
  fromName: "Matthew Bailie, Purebaric",
  fromEmail: "hello@purebaric.com",
  replyTo: "hello@purebaric.com",
  postalAddress: "",          // CAN-SPAM: a valid physical postal address; sending is refused while this is blank
  dailyCap: 25,               // cold-email ramp: keep this low for the first weeks
  subjectIndex: 0,            // which of the category's subject lines to use
  autoSend: false,            // the scheduled sender (outreach-daily.js) only runs while this is on
  lastAutoRun: null,          // { at, trigger, sent, failed, sentToday, remaining } written by the sender
  lastSummaryDay: "",         // YYYY-MM-DD of the last daily summary email, so it goes once a day
};

function cleanSettings(input) {
  const s = { ...DEFAULT_SETTINGS, ...(input || {}) };
  s.fromName = String(s.fromName || DEFAULT_SETTINGS.fromName).trim().slice(0, 80);
  s.fromEmail = String(s.fromEmail || DEFAULT_SETTINGS.fromEmail).trim().toLowerCase().slice(0, 120);
  s.replyTo = String(s.replyTo || DEFAULT_SETTINGS.replyTo).trim().toLowerCase().slice(0, 120);
  s.postalAddress = String(s.postalAddress || "").trim().slice(0, 200);
  const cap = parseInt(s.dailyCap, 10);
  s.dailyCap = Math.max(1, Math.min(200, Number.isFinite(cap) ? cap : DEFAULT_SETTINGS.dailyCap));
  s.subjectIndex = Math.max(0, Math.min(2, parseInt(s.subjectIndex, 10) || 0));
  s.autoSend = s.autoSend === true || s.autoSend === 1 || s.autoSend === "1" || s.autoSend === "true";
  s.lastAutoRun = s.lastAutoRun && typeof s.lastAutoRun === "object" ? s.lastAutoRun : null;
  s.lastSummaryDay = String(s.lastSummaryDay || "").slice(0, 10);
  return s;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i;
function cleanEmail(e) {
  const v = String(e || "").trim().toLowerCase();
  return EMAIL_RE.test(v) ? v : "";
}

// Stable id for a prospect so re-imports update rather than duplicate: the email when there is one,
// else the normalized business name + city.
function prospectId(row) {
  const email = cleanEmail(row.email);
  const base = email || `${String(row.business || "").toLowerCase().replace(/[^a-z0-9]/g, "")}|${String(row.city || "").toLowerCase().replace(/[^a-z0-9]/g, "")}`;
  return "p_" + crypto.createHash("sha1").update(base).digest("hex").slice(0, 20);
}

function newToken() {
  return crypto.randomBytes(16).toString("hex");
}

// Shape of a stored prospect. Import rows come from _internal/outreach/prospects.json (written by
// make_prospect_list.py from the research files). `existing` is the stored record, if any; its
// status, history and edits win over the import.
function normalizeProspect(row, existing) {
  const templateId = row.templateId || row.template || (categoryById(row.industry) ? row.industry : "");
  const cat = categoryById(templateId);
  const p = {
    id: existing ? existing.id : prospectId(row),
    business: String(row.business || "").trim().slice(0, 160),
    industry: String(row.industry || "").trim().slice(0, 80),
    templateId: cat ? cat.id : String(templateId || "").trim(),
    owner: String(row.owner || "").trim().slice(0, 160),
    ownerTitle: String(row.ownerTitle || row.owner_title || "").trim().slice(0, 80),
    firstName: "",
    email: cleanEmail(row.email),
    emailConfidence: String(row.emailConfidence || row.email_confidence || (row.email ? "medium" : "none")).trim(),
    phone: String(row.phone || "").trim().slice(0, 40),
    website: String(row.website || "").trim().slice(0, 200),
    address: String(row.address || "").trim().slice(0, 200),
    city: String(row.city || "").trim().slice(0, 80),
    zip: String(row.zip || "").trim().slice(0, 10),
    county: String(row.county || "").trim().slice(0, 40),
    // No personal notes. The feed's personal_note and hook were drafted by a research pass and are not
    // verified, so they are dropped here: the email asserts nothing about the business beyond its name.
    notes: String(row.notes || "").trim().slice(0, 1500),
    // a row can arrive with a status already set (e.g. "customer" for a business that signed before any email)
    status: STATUSES.includes(String(row.status || "").trim().toLowerCase()) ? String(row.status).trim().toLowerCase() : "new",
    unsubToken: newToken(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    sentAt: null,
    resendId: null,
    lastEvent: null,
    lastError: null,
    history: [],
  };
  p.firstName = greetingName(p.owner);
  if (existing) {
    // keep what the owner has done or edited in the portal
    for (const k of ["status", "sentAt", "resendId", "lastEvent", "lastError", "history", "unsubToken", "createdAt"]) {
      if (existing[k] !== undefined && existing[k] !== null) p[k] = existing[k];
    }
    for (const k of ["firstName", "email", "notes"]) {
      if (existing.edited && existing.edited.includes(k)) p[k] = existing[k];
    }
    p.edited = existing.edited || [];
  }
  return p;
}

// Fields the owner may change from the portal, and how.
function applyPatch(p, patch) {
  const next = { ...p, edited: [...(p.edited || [])] };
  const mark = k => { if (!next.edited.includes(k)) next.edited.push(k); };
  if (patch.firstName !== undefined) { next.firstName = String(patch.firstName || "").trim().slice(0, 60); mark("firstName"); }
  if (patch.email !== undefined) { next.email = cleanEmail(patch.email); mark("email"); }
  if (patch.notes !== undefined) { next.notes = String(patch.notes || "").trim().slice(0, 1500); mark("notes"); }
  if (patch.templateId !== undefined && categoryById(patch.templateId)) next.templateId = patch.templateId;
  if (patch.status !== undefined) {
    const s = String(patch.status || "").trim().toLowerCase();
    if (!STATUSES.includes(s)) throw new Error(`invalid status: ${s}`);
    next.status = s;
    next.history = [...(p.history || []), { at: new Date().toISOString(), event: `status:${s}`, by: patch.by || "admin" }];
  }
  next.updatedAt = new Date().toISOString();
  return next;
}

// How many real sends happened today (UTC day), for the daily cap. Tests pass `now`.
function sentToday(prospects, now = new Date()) {
  const day = now.toISOString().slice(0, 10);
  return prospects.filter(p => p.sentAt && String(p.sentAt).slice(0, 10) === day).length;
}

// Why a prospect cannot be sent right now, or null when it can.
function sendBlocker(p, settings) {
  if (!p) return "not found";
  if (!settings || !settings.postalAddress) return "postal address not set in Outreach settings (required on every email)";
  if (!p.email) return "no email address";
  if (!categoryById(p.templateId)) return "no email template for this industry";
  if (!SENDABLE.has(p.status)) return `status is ${p.status}`;
  return null;
}

function markSent(p, resendId) {
  const at = new Date().toISOString();
  return { ...p, status: "sent", sentAt: at, resendId: resendId || null, lastError: null, updatedAt: at,
    history: [...(p.history || []), { at, event: "sent", resendId: resendId || null }] };
}

function markFailed(p, error) {
  const at = new Date().toISOString();
  return { ...p, status: "failed", lastError: String(error || "send failed").slice(0, 400), updatedAt: at,
    history: [...(p.history || []), { at, event: "failed", error: String(error || "").slice(0, 400) }] };
}

// Map a Resend last_event onto our status. Only moves forward from "sent".
function applyResendEvent(p, lastEvent) {
  const ev = String(lastEvent || "").toLowerCase();
  const at = new Date().toISOString();
  const next = { ...p, lastEvent: ev || p.lastEvent, updatedAt: at };
  if (p.status === "sent" && (ev === "bounced" || ev === "complained")) {
    next.status = ev === "complained" ? "unsubscribed" : "bounced";
    next.history = [...(p.history || []), { at, event: `resend:${ev}` }];
  }
  return next;
}

// Summary counts for the tab header.
function stats(prospects, now = new Date()) {
  const byStatus = {};
  for (const s of STATUSES) byStatus[s] = 0;
  const byIndustry = {};
  let withEmail = 0;
  for (const p of prospects) {
    byStatus[p.status] = (byStatus[p.status] || 0) + 1;
    byIndustry[p.industry] = (byIndustry[p.industry] || 0) + 1;
    if (p.email) withEmail++;
  }
  return { total: prospects.length, withEmail, byStatus, byIndustry, sentToday: sentToday(prospects, now) };
}

// What the browser gets: everything but the unsubscribe token.
function publicView(p) {
  const { unsubToken, ...rest } = p;
  return rest;
}

module.exports = { STATUSES, SENDABLE, DEFAULT_SETTINGS, cleanSettings, cleanEmail, prospectId, normalizeProspect,
  applyPatch, sentToday, sendBlocker, markSent, markFailed, applyResendEvent, stats, publicView };
