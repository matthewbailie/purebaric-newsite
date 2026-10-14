// Driving paths for the admin Outreach tab.
//   GET   /api/admin/routes            -> { plan, progress, summary }
//   PATCH /api/admin/routes/<dayN>     -> body { completed?, delivered?: [stopId], note? } -> { progress, summary }
// The plan is the bundled _internal/outreach/routes_utah.json (written by make_route_plan.py, see
// netlify.toml included_files); progress is one JSON record in the settings store.
const fs = require("fs");
const path = require("path");
const { requireAuth, parseBody, parsePathSegments, json } = require("./_lib/admin");
const { store, STORES } = require("./_lib/storage");
const R = require("./_lib/routes");

const PROGRESS_KEY = "routeProgress:utah";

function loadPlan() {
  const candidates = [
    path.join(__dirname, "..", "..", "_internal", "outreach", "routes_utah.json"),
    path.join(process.cwd(), "_internal", "outreach", "routes_utah.json"),
  ];
  for (const c of candidates) if (fs.existsSync(c)) return JSON.parse(fs.readFileSync(c, "utf8"));
  throw new Error("routes_utah.json not found in the deploy; run make_route_plan.py route_config_utah.json and redeploy");
}

exports.handler = async (event, context) => {
  const authErr = await requireAuth(event, context);
  if (authErr) return authErr;
  const { id } = parsePathSegments(event, "routes");
  const method = event.httpMethod;
  try {
    const plan = loadPlan();
    const s = store(STORES.settings);
    let progress = null;
    try { progress = await s.get(PROGRESS_KEY, { type: "json" }); } catch (e) { progress = null; }
    progress = R.normalizeProgress(progress);

    if (method === "GET") {
      return json(200, { plan, progress, summary: R.summarize(plan, progress) });
    }
    if (method === "PATCH" && id) {
      const day = (plan.days || []).find((d) => String(d.n) === String(id));
      if (!day) return json(404, { error: "unknown_day" });
      const body = parseBody(event) || {};
      const next = R.applyPatch(progress, day, body, new Date().toISOString());
      await s.setJSON(PROGRESS_KEY, next);
      return json(200, { progress: next, summary: R.summarize(plan, next) });
    }
    return json(405, { error: "method_not_allowed" });
  } catch (err) {
    console.error("admin-routes error", err);
    return json(500, { error: err.message || "internal_error" });
  }
};
