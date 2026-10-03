// Admin Outreach: the owner's business prospect list and the emails sent to it.
//
//   GET    /api/admin/outreach                 -> { prospects, stats, settings, templates }
//   PUT    /api/admin/outreach/settings        -> save sender settings (from name, postal address, daily cap, subject)
//   POST   /api/admin/outreach/import          -> upsert prospects from the bundled _internal/outreach/prospects.json
//   POST   /api/admin/outreach/preview  {id}   -> { subject, html, text } for one prospect, or {templateId, firstName, businessName}
//   POST   /api/admin/outreach/test     {id?, templateId?} -> sends that email to the owner's own inbox (never to the prospect)
//   POST   /api/admin/outreach/send     {ids}  -> sends to each prospect (daily cap, sendable status, email present), returns per-id results
//   POST   /api/admin/outreach/run             -> sends one automation batch now (see _lib/outreach-run.js)
//   POST   /api/admin/outreach/sync            -> refreshes delivery state for recently sent emails from Resend (bounced, complained)
//   PATCH  /api/admin/outreach/:id      {status|firstName|email|notes|templateId}
//
// Every email carries the unsubscribe link and the postal address (CAN-SPAM); sending is refused while the
// postal address is blank. Test sends go only to OWNER_EMAIL.
const fs = require("fs");
const path = require("path");
const { requireAuth, adminEmail, json, parseBody } = require("./_lib/admin");
const { send } = require("./_lib/email");
const { OWNER_EMAIL } = require("./_lib/owner");
const tpl = require("./_lib/outreach-template");
const out = require("./_lib/outreach");

const io = require("./_lib/outreach-io");
const { listProspects, getProspect, putProspect, getSettings, putSettings, deliver, renderFor } = io;
const { runBatch, SUB_BATCH } = require("./_lib/outreach-run");

const MAX_PER_CALL = 25;

// Reads the feed bundled with the function (netlify.toml included_files). Falls back to the repo path in dev.
function loadFeed() {
  const candidates = [
    path.join(__dirname, "..", "..", "_internal", "outreach", "prospects.json"),
    path.join(process.cwd(), "_internal", "outreach", "prospects.json"),
  ];
  for (const c of candidates) {
    if (fs.existsSync(c)) return JSON.parse(fs.readFileSync(c, "utf8"));
  }
  throw new Error("prospects.json not found in the deploy; run make_prospect_list.py and redeploy");
}

exports.handler = async (event, context) => {
  const authErr = await requireAuth(event, context);
  if (authErr) return authErr;

  const segs = (event.path || "").split("/").filter(Boolean);
  const i = segs.findIndex(s => s === "outreach" || s === "admin-outreach");
  const sub = i >= 0 ? segs[i + 1] || "" : "";
  const method = event.httpMethod;

  try {
    if (method === "GET" && !sub) {
      const [prospects, settings] = await Promise.all([listProspects(), getSettings()]);
      return json(200, {
        prospects: prospects.map(out.publicView),
        stats: out.stats(prospects),
        settings,
        testRecipient: OWNER_EMAIL,
        templates: tpl.CATEGORIES.map(c => ({ id: c.id, label: c.label, subjects: c.subjects })),
      });
    }

    if (method === "PUT" && sub === "settings") {
      const settings = await putSettings({ ...(await getSettings()), ...parseBody(event) });
      // settings PUT also answers with the local clock so the admin can show "next run"
      return json(200, { settings });
    }

    if (method === "POST" && sub === "import") {
      const feed = loadFeed();
      const existing = new Map((await listProspects()).map(p => [p.id, p]));
      let added = 0, updated = 0;
      for (const row of feed.prospects || []) {
        const id = out.prospectId(row);
        const prev = existing.get(id);
        const p = out.normalizeProspect(row, prev);
        await putProspect(p);
        prev ? updated++ : added++;
      }
      return json(200, { added, updated, total: existing.size + added, generated: feed.generated || null });
    }

    if (method === "POST" && sub === "preview") {
      const body = parseBody(event);
      const settings = await getSettings();
      const p = body.id ? await getProspect(body.id) : null;
      if (body.id && !p) return json(404, { error: "not_found" });
      const base = p || { id: "preview", business: body.businessName || "[Business name]", firstName: body.firstName || "", templateId: body.templateId, unsubToken: "" };
      const r = renderFor(base, settings, body);
      return json(200, { subject: r.subject, html: r.html, text: r.text, blocker: p ? out.sendBlocker(p, settings) : null });
    }

    if (method === "POST" && sub === "test") {
      const body = parseBody(event);
      const settings = await getSettings();
      let p = body.id ? await getProspect(body.id) : null;
      if (body.id && !p) return json(404, { error: "not_found" });
      if (!p) {
        // a placeholder prospect for the chosen template, so links and layout can be checked before any import.
        // Bracketed placeholders only: nothing here may read like a fact about a real business.
        p = { id: "test", business: body.businessName || "[Sample business]", firstName: body.firstName || "", templateId: body.templateId || "gyms-and-fitness", unsubToken: "test-token" };
      }
      if (!tpl.categoryById(p.templateId)) return json(400, { error: "no_template", message: "No email template for this industry." });
      const { resendId, subject } = await deliver(p, settings, OWNER_EMAIL, { isTest: true });
      return json(200, { ok: true, to: OWNER_EMAIL, subject, resendId, postalAddressSet: !!settings.postalAddress });
    }

    if (method === "POST" && sub === "send") {
      const body = parseBody(event);
      const ids = Array.isArray(body.ids) ? body.ids.slice(0, MAX_PER_CALL) : [];
      if (!ids.length) return json(400, { error: "no_ids" });
      const settings = await getSettings();
      const all = await listProspects();
      let remaining = settings.dailyCap - out.sentToday(all);
      const by = await adminEmail(event, context);
      const results = [];
      for (const id of ids) {
        const p = all.find(x => x.id === id);
        const blocker = out.sendBlocker(p, settings);
        if (blocker) { results.push({ id, ok: false, skipped: true, reason: blocker }); continue; }
        if (remaining <= 0) { results.push({ id, ok: false, skipped: true, reason: `daily cap of ${settings.dailyCap} reached` }); continue; }
        try {
          const { resendId, subject } = await deliver(p, settings, p.email);
          const sent = out.markSent(p, resendId, subject);
          sent.history[sent.history.length - 1].by = by || "admin";
          await putProspect(sent);
          remaining--;
          results.push({ id, ok: true, resendId, subject, to: p.email });
        } catch (e) {
          await putProspect(out.markFailed(p, e.message));
          results.push({ id, ok: false, error: e.message });
        }
      }
      return json(200, { results, sentToday: settings.dailyCap - remaining, dailyCap: settings.dailyCap });
    }

    // One automation batch right now (same selection, spacing and cap as the scheduled sender).
    if (method === "POST" && sub === "run") {
      const notify = ({ subject, text }) => send({ to: OWNER_EMAIL, subject, text, html: `<p>${text}</p>` });
      const r = await runBatch({ ...io, notify }, { trigger: "manual", max: SUB_BATCH });
      return json(200, r);
    }

    if (method === "POST" && sub === "sync") {
      return json(200, await io.syncRecent({ limit: 500, maxAgeDays: 21 }));
    }

    if (method === "PATCH" && sub) {
      const p = await getProspect(sub);
      if (!p) return json(404, { error: "not_found" });
      const body = parseBody(event);
      body.by = (await adminEmail(event, context)) || "admin";
      const next = out.applyPatch(p, body);
      await putProspect(next);
      return json(200, { prospect: out.publicView(next) });
    }

    return json(405, { error: "method_not_allowed" });
  } catch (err) {
    console.error("admin-outreach error", err);
    return json(err.message && /invalid status/.test(err.message) ? 400 : 500, { error: err.message || "internal_error" });
  }
};
