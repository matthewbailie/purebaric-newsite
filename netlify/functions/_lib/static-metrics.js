// Static (team-entered) metrics on admin "Site OKRs & Analytics". A metric that can't be read live from its
// source carries " *" after its name, the footnote below on its sub-tab, and "Last updated <date time MT>"
// from a time stored server-side when the value was saved (never the browser's clock).
//
// Team-entered values with no other home (renewal touch on time, lead reply time) live in one settings
// Blobs doc, "staticMetrics": { values: { [id]: { value, note, updatedAt } }, updatedAt }. Only the ids in
// STATIC_IDS can be saved. No personal information belongs here: values and notes are short aggregate text.

// Same format as constellation.formatMt ("Nov 25, 2026, 12:40 PM MT"); kept here so constellation can require this file.
const MT_STAMP = new Intl.DateTimeFormat("en-US", { timeZone: "America/Denver", month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" });
const formatMt = (ms) => `${MT_STAMP.format(new Date(ms))} MT`;

const STATIC_FOOTNOTE = "* Static: updated by the team; accurate only when kept current.";
const STATIC_IDS = {
  renewal_touch: { label: "Renewal touch on time", who: "Retention & Ops" },
  reply_time: { label: "Lead reply time / outreach reply", who: "Retention & Ops" },
};

const clean = (v, max) => String(v == null ? "" : v).replace(/[\u0000-\u001f<>]/g, " ").replace(/\s+/g, " ").trim().slice(0, max);

function staticLabel(label, isStatic) { return isStatic ? `${label} *` : label; }

// { at, label } for a stored ISO time, or null when nothing was ever saved.
function stamp(iso) {
  const ms = Date.parse(iso || "");
  return Number.isFinite(ms) ? { at: new Date(ms).toISOString(), label: `Last updated ${formatMt(ms)}` } : null;
}
// The latest of several ISO times (any may be missing).
function latest(...isos) {
  const ms = isos.flat().map((x) => Date.parse(x || "")).filter(Number.isFinite);
  return ms.length ? new Date(Math.max(...ms)).toISOString() : null;
}

// Validates one save and returns the new doc (server stamps updatedAt) or { error }.
function saveStatic(doc, id, input = {}, { nowIso = new Date().toISOString() } = {}) {
  if (!STATIC_IDS[id]) return { error: "That metric can't be edited here." };
  const value = clean(input.value, 80);
  if (!value) return { error: "Enter a value." };
  const note = clean(input.note, 300);
  const values = { ...((doc && doc.values) || {}) };
  values[id] = { value, note, updatedAt: nowIso };
  return { doc: { id: "staticMetrics", values, updatedAt: nowIso } };
}

function publicValues(doc) {
  const out = {};
  for (const id of Object.keys(STATIC_IDS)) {
    const v = doc && doc.values && doc.values[id];
    out[id] = v ? { value: v.value, note: v.note || "", lastUpdated: stamp(v.updatedAt) } : { value: null, note: "", lastUpdated: null };
  }
  return out;
}

module.exports = { STATIC_FOOTNOTE, STATIC_IDS, staticLabel, stamp, latest, saveStatic, publicValues };
