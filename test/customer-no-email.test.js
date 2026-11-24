// Add customer fix (Release 3): name is the only required field, "No email for this
// person", placeholder addresses never receive mail, and duplicate emails are refused.
const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");
const Module = require("module");

const root = path.join(__dirname, "..");
const { isPlaceholderEmail } = require("../netlify/functions/_lib/placeholder-email");
const { emailOnAnotherCustomer } = require("../netlify/functions/_lib/customers");

test("placeholder addresses are recognized", () => {
  assert.equal(isPlaceholderEmail("no-email+abc123@placeholder.invalid"), true);
  assert.equal(isPlaceholderEmail("NO-EMAIL+X@PLACEHOLDER.INVALID "), true);
  assert.equal(isPlaceholderEmail("jane@example.com"), false);
  assert.equal(isPlaceholderEmail(""), false);
  assert.equal(isPlaceholderEmail(null), false);
});

test("email send() never sends to a placeholder address (every email path goes through it)", async () => {
  const sent = [];
  const realLoad = Module._load;
  Module._load = function (req, ...rest) {
    if (req === "resend") return { Resend: class { constructor() { this.emails = { send: async (p) => { sent.push(p); return { data: { id: "x" }, error: null }; } }; } } };
    return realLoad.call(this, req, ...rest);
  };
  const prevKey = process.env.RESEND_API_KEY; process.env.RESEND_API_KEY = "test";
  const modPath = require.resolve("../netlify/functions/_lib/email");
  delete require.cache[modPath];
  try {
    const email = require(modPath);
    const r = await email.send({ to: "no-email+abc@placeholder.invalid", subject: "Waitlist offer", html: "<p>x</p>", text: "x" });
    assert.equal(r.skipped, "no_real_recipient");
    assert.equal(sent.length, 0);
    await email.send({ to: ["no-email+abc@placeholder.invalid", "real@example.com"], subject: "Receipt", html: "<p>x</p>", text: "x" });
    assert.equal(sent.length, 1);
    assert.deepEqual(sent[0].to, ["real@example.com"]);
  } finally {
    Module._load = realLoad; delete require.cache[modPath];
    if (prevKey === undefined) delete process.env.RESEND_API_KEY; else process.env.RESEND_API_KEY = prevKey;
  }
});

test("no other file calls Resend's send directly (placeholder filter can't be bypassed)", () => {
  const dir = path.join(root, "netlify", "functions");
  const files = [];
  (function walk(d) { for (const f of fs.readdirSync(d, { withFileTypes: true })) { const p = path.join(d, f.name); if (f.isDirectory()) walk(p); else if (p.endsWith(".js")) files.push(p); } })(dir);
  const direct = files.filter((f) => /emails\.send\(/.test(fs.readFileSync(f, "utf8")) && !f.endsWith(path.join("_lib", "email.js")));
  assert.deepEqual(direct, []);
});

test("duplicate email on another customer is detected; same person and empty email are not", () => {
  const all = [{ id: "a", name: "Jane Doe", email: "jane@example.com", phone: "" }];
  assert.equal(emailOnAnotherCustomer(all, { name: "Someone Else", email: "JANE@example.com" })?.id, "a");
  assert.equal(emailOnAnotherCustomer(all, { name: "Jane Doe", email: "jane@example.com" }), null);
  assert.equal(emailOnAnotherCustomer(all, { name: "Brig", email: "" }), null);
  assert.equal(emailOnAnotherCustomer(all, { name: "X", email: "jane@example.com" }, "a"), null);
});

test("admin Add customer form uses the approved strings and only Name is required", () => {
  const html = fs.readFileSync(path.join(root, "admin.html"), "utf8");
  for (const s of ["Email (optional)", "Phone (optional)", "No email for this person", "Placeholder, no email", "Add a name to save this customer."]) assert.ok(html.includes(s), s);
  assert.ok(!/\[name="email"\]'\)\.required = true/.test(html), "email must never be forced required");
  const api = fs.readFileSync(path.join(root, "netlify", "functions", "admin-customers.js"), "utf8");
  assert.ok(api.includes("That email is already on another customer. Search for them instead of adding a duplicate."));
  assert.ok(api.includes("Add a name to save this customer."));
});
