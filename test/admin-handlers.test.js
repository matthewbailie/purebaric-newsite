// Handler-level smoke tests for the admin functions that have no pure core of their own: each handler
// runs against stubbed auth and storage, so the request shape, status codes and what gets written are
// checked without Netlify, Blobs or a login. (Stubs replace ./_lib/storage and ./_lib/admin for the
// handler under test only.)
const { test } = require("node:test");
const assert = require("node:assert/strict");
const path = require("path");
const Module = require("module");

const FN = path.join(__dirname, "..", "netlify", "functions");
const W = require("../netlify/functions/_lib/waiver");

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
  try {
    const file = path.join(FN, handlerFile);
    delete require.cache[file];
    return require(file);
  } finally { Module._load = orig; }
}
const adminStub = () => ({
  requireAuth: async () => null,
  adminEmail: () => "owner@example.com",
  parseBody: (e) => (e.body ? JSON.parse(e.body) : {}),
  parsePathSegments: (e, seg) => { const parts = String(e.path || "").split("/").filter(Boolean); const i = parts.indexOf(seg); return { id: i >= 0 ? parts[i + 1] || null : null, action: null }; },
  json: (statusCode, body) => ({ statusCode, body: JSON.stringify(body) }),
});
const call = (handler, method, p, body, query) => handler({ httpMethod: method, path: p, body: body && JSON.stringify(body), queryStringParameters: query || {}, headers: { "user-agent": "test" } }, {});
const png = "data:image/png;base64," + Buffer.concat([Buffer.from("iVBORw0KGgo=", "base64"), Buffer.alloc(400)]).toString("base64");

test("waiver: a finger signature is stored on the rental and the signed copy renders; the home and business texts differ", async () => {
  const rentals = { r1: { id: "r1", rentalType: "business", businessName: "Rest Recovery" } };
  const saved = [];
  const storage = {
    STORES: { rentals: "rentals" },
    store: () => ({ get: async (id) => rentals[id] || null }),
    saveWaiver: async (rentalId, buf, type) => { saved.push({ rentalId, bytes: buf.length, type }); return `${rentalId}/sig`; },
    getWaiver: async () => ({ blob: Buffer.from("png"), metadata: { contentType: "image/png" } }),
    updateRental: async (id, patch) => { rentals[id] = { ...rentals[id], ...patch }; return rentals[id]; },
  };
  const { handler } = loadWithStubs("admin-waiver.js", { "_lib/storage": storage, "_lib/admin": adminStub() });
  const text = JSON.parse((await call(handler, "GET", "/api/admin/waiver/text", null, { kind: "business" })).body);
  assert.equal(text.kind, "business");
  assert.ok(text.sections.some((s) => s.heading === "1. Equipment and Services"));
  const home = JSON.parse((await call(handler, "GET", "/api/admin/waiver/text")).body);
  assert.equal(home.kind, "home");
  const bad = await call(handler, "POST", "/api/admin/waiver/sign", { rentalId: "r1", signerName: "Cassie", agreed: true, signaturePng: png, waiverVersion: text.version, kind: "business" });
  assert.equal(bad.statusCode, 400); assert.match(bad.body, /business name/);
  const ok = await call(handler, "POST", "/api/admin/waiver/sign", { rentalId: "r1", signerName: "Cassie Johnson", signerTitle: "Owner", businessName: "Rest Recovery", agreed: true, signaturePng: png, waiverVersion: text.version, kind: "business" });
  assert.equal(ok.statusCode, 200);
  assert.equal(saved[0].type, "image/png");
  assert.equal(rentals.r1.waiverSigned.kind, "business");
  assert.equal(rentals.r1.waiverSigned.version, W.WAIVER_VERSIONS.business);
  assert.equal(rentals.r1.waiverFileKey, "r1/sig");
  const page = await call(handler, "GET", "/api/admin/waiver", null, { rentalId: "r1" });
  assert.equal(page.statusCode, 200);
  assert.match(page.body, /Business Rental Agreement and Liability Waiver/);
  assert.match(page.body, /Cassie Johnson, Owner/);
  const missing = await call(handler, "POST", "/api/admin/waiver/sign", { rentalId: "nope", signerName: "X", agreed: true, signaturePng: png, waiverVersion: W.WAIVER_VERSION });
  assert.equal(missing.statusCode, 404);
});

test("routes: the Utah plan loads from the bundle, progress is saved per day, and unknown days are 404", async () => {
  const settings = {};
  const storage = { STORES: { settings: "settings" }, store: () => ({ get: async (k) => settings[k] || null, setJSON: async (k, v) => { settings[k] = v; } }) };
  const { handler } = loadWithStubs("admin-routes.js", { "_lib/storage": storage, "_lib/admin": adminStub() });
  const all = JSON.parse((await call(handler, "GET", "/api/admin/routes")).body);
  assert.ok(all.plan.days.length > 50);
  assert.equal(all.summary.delivered, 0);
  const day = all.plan.days[0];
  const done = JSON.parse((await call(handler, "PATCH", `/api/admin/routes/${day.n}`, { completed: true })).body);
  assert.equal(done.summary.daysDone, 1);
  assert.equal(done.summary.delivered, day.stops.length);
  assert.ok(settings["routeProgress:utah"].days[String(day.n)].completedAt);
  const one = JSON.parse((await call(handler, "PATCH", `/api/admin/routes/${day.n}`, { delivered: [day.stops[0].id] })).body);
  assert.equal(one.summary.delivered, 1);
  assert.equal((await call(handler, "PATCH", "/api/admin/routes/99999", { completed: true })).statusCode, 404);
  assert.equal((await call(handler, "DELETE", "/api/admin/routes/1")).statusCode, 405);
});

test("reviews: delete is refused, archive and publish update the record", async () => {
  const db = { x: { id: "x", status: "rejected", text: "t", createdAt: "2026-01-01T00:00:00Z" } };
  const storage = {
    nowIso: () => "2026-10-14T00:00:00Z",
    listReviews: async () => Object.values(db),
    updateReview: async (id, patch) => { if (!db[id]) return null; db[id] = { ...db[id], ...patch }; return db[id]; },
  };
  const { handler } = loadWithStubs("admin-reviews.js", { "_lib/storage": storage, "_lib/admin": adminStub() });
  assert.equal((await call(handler, "DELETE", "/api/admin/reviews/x")).statusCode, 405);
  const archived = JSON.parse((await call(handler, "PATCH", "/api/admin/reviews/x", { status: "archived" })).body);
  assert.equal(archived.review.status, "archived");
  const published = JSON.parse((await call(handler, "PATCH", "/api/admin/reviews/x", { status: "published" })).body);
  assert.equal(published.review.publishedAt, "2026-10-14T00:00:00Z");
  assert.ok(db.x);
});
