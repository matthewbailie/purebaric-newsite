// Promotions list: email normalisation, the public sign-up handler, the admin list handler,
// and the waitlist form's checkbox landing on the list. Storage is stubbed.
const { test } = require("node:test");
const assert = require("node:assert/strict");
const path = require("path");
const Module = require("module");
const fs = require("fs");

const FN = path.join(__dirname, "..", "netlify", "functions");
const { normalizePromoEmail } = require("../netlify/functions/_lib/storage");

function loadWithStubs(handlerFile, stubs) {
  const resolved = {};
  for (const [rel, impl] of Object.entries(stubs)) resolved[path.join(FN, rel.endsWith(".js") ? rel : rel + ".js")] = impl;
  const orig = Module._load;
  Module._load = function (req, parent, ...rest) {
    if (parent && parent.filename) {
      let full = path.resolve(path.dirname(parent.filename), req);
      if (!full.endsWith(".js") && !full.endsWith(".json")) full += ".js";
      if (resolved[full]) return resolved[full];
    }
    return orig.call(this, req, parent, ...rest);
  };
  try { const file = path.join(FN, handlerFile); delete require.cache[file]; return require(file); }
  finally { Module._load = orig; }
}
const form = (obj) => ({ httpMethod: "POST", headers: { "content-type": "application/x-www-form-urlencoded" }, body: new URLSearchParams(obj).toString() });

test("normalizePromoEmail: trims, lowercases, rejects junk", () => {
  assert.equal(normalizePromoEmail("  Jane@Example.COM "), "jane@example.com");
  assert.equal(normalizePromoEmail("not an email"), "");
  assert.equal(normalizePromoEmail(""), "");
  assert.equal(normalizePromoEmail("a@b"), "");
});

test("promo-join: stores a valid email with its source, rejects a bad one, drops the honeypot", async () => {
  const added = [];
  const h = loadWithStubs("promo-join.js", { "_lib/storage": { normalizePromoEmail, addPromoSubscriber: async (r) => { added.push(r); return r; } } }).handler;
  let r = await h(form({ email: "Jane@Example.com", source: "homepage" }));
  assert.equal(r.statusCode, 200); assert.equal(JSON.parse(r.body).ok, true);
  assert.deepEqual(added[0], { email: "jane@example.com", name: undefined, phone: undefined, source: "homepage" });
  r = await h(form({ email: "nope" }));
  assert.equal(r.statusCode, 400); assert.equal(JSON.parse(r.body).error, "invalid_email");
  r = await h(form({ email: "bot@example.com", "bot-field": "x" }));
  assert.equal(r.statusCode, 200); assert.equal(added.length, 1);
  r = await h(form({ email: "odd@example.com", source: "<script>" }));
  assert.equal(added[1].source, "homepage");
  r = await h({ httpMethod: "GET", headers: {} });
  assert.equal(r.statusCode, 405);
});

test("waitlist-join: the promotions checkbox adds the person to the list; unticked does not", async () => {
  const added = [];
  const stubs = {
    "_lib/storage": { createWaitlistEntry: async (d) => ({ id: "w1", ...d }), addPromoSubscriber: async (r) => { added.push(r); return r; } },
    "_lib/email": { notifyAdminWaitlistJoin: async () => {} },
  };
  const h = loadWithStubs("waitlist-join.js", stubs).handler;
  let r = await h(form({ first_name: "Jane", last_name: "Doe", email: "jane@example.com", phone: "801", opt_in_updates: "yes" }));
  assert.equal(r.statusCode, 200); assert.equal(JSON.parse(r.body).promo, true);
  assert.deepEqual(added, [{ email: "jane@example.com", name: "Jane Doe", phone: "801", source: "waitlist" }]);
  r = await h(form({ first_name: "No", email: "no@example.com" }));
  assert.equal(JSON.parse(r.body).promo, false); assert.equal(added.length, 1);
});

test("admin-promo-list: GET lists newest first, DELETE removes by email, auth is required", async () => {
  const removed = [];
  const admin = {
    requireAuth: async (e) => (e.headers.auth ? null : { statusCode: 401, body: "no" }),
    parsePathSegments: (e, seg) => { const parts = String(e.path || "").split("/").filter(Boolean); const i = parts.indexOf(seg); return { id: i >= 0 ? parts[i + 1] || null : null }; },
    json: (statusCode, body) => ({ statusCode, body: JSON.stringify(body) }),
  };
  const storage = { listPromoSubscribers: async () => [{ id: "b@x.com", email: "b@x.com", createdAt: "2026-10-22" }], removePromoSubscriber: async (id) => { removed.push(id); return true; } };
  const h = loadWithStubs("admin-promo-list.js", { "_lib/admin": admin, "_lib/storage": storage }).handler;
  let r = await h({ httpMethod: "GET", path: "/api/admin/promo-list", headers: {} }, {});
  assert.equal(r.statusCode, 401);
  r = await h({ httpMethod: "GET", path: "/api/admin/promo-list", headers: { auth: 1 } }, {});
  assert.equal(JSON.parse(r.body).subscribers[0].email, "b@x.com");
  r = await h({ httpMethod: "DELETE", path: "/api/admin/promo-list/" + encodeURIComponent("b@x.com"), headers: { auth: 1 } }, {});
  assert.equal(r.statusCode, 200); assert.deepEqual(removed, ["b@x.com"]);
});

test("pages and redirects: waitlist checkbox says promotions, homepage has the sign-up, routes exist", () => {
  const root = path.join(__dirname, "..");
  const wl = fs.readFileSync(path.join(root, "waitlist.html"), "utf8");
  assert.match(wl, /occasional promotions from Purebaric/);
  assert.match(wl, /name="opt_in_updates"/);
  const idx = fs.readFileSync(path.join(root, "index.html"), "utf8");
  assert.match(idx, /id="promoForm"/); assert.match(idx, /\/api\/promo-join/);
  const adm = fs.readFileSync(path.join(root, "admin.html"), "utf8");
  assert.match(adm, /data-sub="promo"/); assert.match(adm, /\/api\/admin\/promo-list/);
  const toml = fs.readFileSync(path.join(root, "netlify.toml"), "utf8");
  assert.match(toml, /from = "\/api\/promo-join"/); assert.match(toml, /from = "\/api\/admin\/promo-list\/\*"/);
});
