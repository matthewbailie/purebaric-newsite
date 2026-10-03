// End-to-end test of the admin Outreach endpoints with in-memory Blobs and a stubbed mailer.
const { test, before } = require("node:test");
const assert = require("node:assert/strict");
const path = require("path");

// ---- stubs, installed before the handlers are required
const mem = new Map();
const storage = require("../netlify/functions/_lib/storage");
storage.store = (name) => ({
  async list() { return { blobs: [...mem.keys()].filter(k => k.startsWith(name + "/")).map(k => ({ key: k.slice(name.length + 1) })) }; },
  async get(key, opts) { const v = mem.get(name + "/" + key); return v === undefined ? null : (opts && opts.type === "json" ? JSON.parse(v) : v); },
  async setJSON(key, value) { mem.set(name + "/" + key, JSON.stringify(value)); },
  async delete(key) { mem.delete(name + "/" + key); },
});
const email = require("../netlify/functions/_lib/email");
const sent = [];
let failNext = false;
email.send = async (msg) => { if (failNext) { failNext = false; throw new Error("Resend API error [422]: bad address"); } sent.push(msg); return { data: { id: "re_" + sent.length } }; };
const admin = require("../netlify/functions/_lib/admin");
admin.requireAuth = async () => null;
admin.adminEmail = async () => "owner@test";

const handler = require("../netlify/functions/admin-outreach").handler;
const unsub = require("../netlify/functions/outreach-unsubscribe").handler;

const call = (method, sub, body, extra = {}) => handler({ httpMethod: method, path: "/api/admin/outreach" + (sub ? "/" + sub : ""), headers: { "content-type": "application/json" }, body: body ? JSON.stringify(body) : null, ...extra }, {});
const parse = r => JSON.parse(r.body);

let ids;
before(async () => {
  process.chdir(path.join(__dirname, ".."));
  const r = parse(await call("POST", "import"));
  assert.ok(r.added > 500, "imports the bundled prospects.json");
  const list = parse(await call("GET"));
  ids = list.prospects;
});

test("GET lists prospects without tokens, with stats, settings and templates", async () => {
  const r = parse(await call("GET"));
  assert.ok(r.prospects.length > 500);
  assert.equal(r.prospects[0].unsubToken, undefined);
  assert.equal(r.stats.total, r.prospects.length);
  assert.equal(r.settings.dailyCap, 25);
  assert.equal(r.templates.length, 6);
  assert.equal(r.testRecipient, "matthewbailie@gmail.com");
});

test("re-import updates in place instead of duplicating", async () => {
  const before = parse(await call("GET")).prospects.length;
  const r = parse(await call("POST", "import"));
  assert.equal(r.added, 0);
  assert.equal(r.updated, before);
  assert.equal(parse(await call("GET")).prospects.length, before);
});

test("preview renders the prospect's own email with greeting and unsubscribe link", async () => {
  const p = ids.find(x => x.email && x.firstName);
  const r = parse(await call("POST", "preview", { id: p.id }));
  assert.match(r.html, new RegExp("Hi " + p.firstName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + ","));
  assert.match(r.html, /api\/outreach\/unsubscribe\?p=p_[0-9a-f]{20}&amp;t=[0-9a-f]{32}/);
  assert.match(r.blocker, /postal address/);
});

test("test send goes to the owner only, flagged as a test, even before the postal address is set", async () => {
  const p = ids.find(x => x.email);
  sent.length = 0;
  const r = parse(await call("POST", "test", { id: p.id }));
  assert.equal(r.ok, true);
  assert.equal(r.to, "matthewbailie@gmail.com");
  assert.equal(sent[0].to, "matthewbailie@gmail.com");
  assert.match(sent[0].subject, /^\[Business outreach TEST for /);
  assert.equal(r.postalAddressSet, false);
  assert.equal(parse(await call("GET")).prospects.find(x => x.id === p.id).status, "new", "a test does not change status");
});

test("send is refused until the postal address is saved", async () => {
  const p = ids.find(x => x.email);
  const r = parse(await call("POST", "send", { ids: [p.id] }));
  assert.equal(r.results[0].ok, false);
  assert.match(r.results[0].reason, /postal address/);
});

test("send delivers from the configured sender with unsubscribe headers, marks sent, respects the cap", async () => {
  const s = parse(await call("PUT", "settings", { postalAddress: "123 Main St, Lehi, UT 84043", dailyCap: 2, fromName: "Matthew Bailie, Purebaric" })).settings;
  assert.equal(s.dailyCap, 2);
  const three = ids.filter(x => x.email).slice(0, 3).map(x => x.id);
  sent.length = 0;
  const r = parse(await call("POST", "send", { ids: three }));
  assert.deepEqual(r.results.map(x => x.ok), [true, true, false]);
  assert.match(r.results[2].reason, /daily cap/);
  assert.equal(sent.length, 2);
  assert.equal(sent[0].from, "Matthew Bailie, Purebaric <hello@purebaric.com>");
  assert.equal(sent[0].replyTo, "hello@purebaric.com");
  assert.match(sent[0].headers["List-Unsubscribe"], /unsubscribe\?p=/);
  assert.equal(sent[0].headers["List-Unsubscribe-Post"], "List-Unsubscribe=One-Click");
  assert.doesNotMatch(sent[0].subject, /TEST/);
  const after = parse(await call("GET")).prospects;
  assert.equal(after.find(x => x.id === three[0]).status, "sent");
  assert.equal(after.find(x => x.id === three[0]).resendId, "re_1");
  assert.equal(after.find(x => x.id === three[2]).status, "new");
  // already sent: skipped, not resent
  const again = parse(await call("POST", "send", { ids: [three[0]] }));
  assert.match(again.results[0].reason, /status is sent/);
});

test("a failed send is recorded and can be retried", async () => {
  await call("PUT", "settings", { postalAddress: "123 Main St, Lehi, UT 84043", dailyCap: 50 });
  const p = ids.filter(x => x.email)[5];
  failNext = true;
  const r = parse(await call("POST", "send", { ids: [p.id] }));
  assert.equal(r.results[0].ok, false);
  assert.match(r.results[0].error, /Resend API error/);
  assert.equal(parse(await call("GET")).prospects.find(x => x.id === p.id).status, "failed");
  const r2 = parse(await call("POST", "send", { ids: [p.id] }));
  assert.equal(r2.results[0].ok, true);
});

test("PATCH edits survive a re-import; invalid status is a 400", async () => {
  const p = ids.filter(x => x.email)[7];
  const r = parse(await call("PATCH", p.id, { firstName: "Pat", status: "replied" }));
  assert.equal(r.prospect.firstName, "Pat");
  assert.equal(r.prospect.status, "replied");
  await call("POST", "import");
  const after = parse(await call("GET")).prospects.find(x => x.id === p.id);
  assert.equal(after.firstName, "Pat");
  assert.equal(after.status, "replied");
  const bad = await call("PATCH", p.id, { status: "nope" });
  assert.equal(bad.statusCode, 400);
});

test("unsubscribe link marks the prospect, wrong token does nothing, one-click POST works", async () => {
  const p = ids.filter(x => x.email)[9];
  const raw = JSON.parse(mem.get("outreach/" + p.id));
  const wrong = await unsub({ httpMethod: "GET", queryStringParameters: { p: p.id, t: "0".repeat(32) } });
  assert.equal(wrong.statusCode, 200);
  assert.equal(JSON.parse(mem.get("outreach/" + p.id)).status, "new");
  const ok = await unsub({ httpMethod: "GET", queryStringParameters: { p: p.id, t: raw.unsubToken } });
  assert.match(ok.body, /unsubscribed/);
  assert.equal(JSON.parse(mem.get("outreach/" + p.id)).status, "unsubscribed");
  const q = ids.filter(x => x.email)[10];
  const rawq = JSON.parse(mem.get("outreach/" + q.id));
  const post = await unsub({ httpMethod: "POST", queryStringParameters: { p: q.id, t: rawq.unsubToken } });
  assert.equal(post.body, "unsubscribed");
  assert.equal(JSON.parse(mem.get("outreach/" + q.id)).history.at(-1).via, "one-click");
  // unsubscribed prospects are never sent
  const r = parse(await call("POST", "send", { ids: [p.id] }));
  assert.match(r.results[0].reason, /status is unsubscribed/);
});
