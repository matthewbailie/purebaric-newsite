const { test } = require("node:test");
const assert = require("node:assert/strict");
const {
  COOKIE_NAME,
  newSessionId,
  isLocalHttp,
  buildSessionCookie,
  buildClearCookie,
  parseCookies,
  getSessionIdFromEvent,
  newSessionRecord,
  sessionIsValid,
} = require("../netlify/functions/_lib/session");

test("newSessionId produces long, unique, URL-safe ids", () => {
  const a = newSessionId(), b = newSessionId();
  assert.notEqual(a, b);
  assert.ok(a.length >= 32);
  assert.match(a, /^[A-Za-z0-9_-]+$/); // base64url only
});

test("isLocalHttp only true for plain-http localhost/127.0.0.1", () => {
  assert.equal(isLocalHttp({ headers: { host: "localhost:5056" } }), true);
  assert.equal(isLocalHttp({ headers: { host: "127.0.0.1:5056" } }), true);
  assert.equal(isLocalHttp({ headers: { host: "localhost:5056", "x-forwarded-proto": "https" } }), false);
  assert.equal(isLocalHttp({ headers: { host: "purebaric.com", "x-forwarded-proto": "https" } }), false);
  assert.equal(isLocalHttp({ headers: {} }), false); // no host -> not localhost
});

test("buildSessionCookie is Secure on a real host, not Secure on local http", () => {
  const prod = buildSessionCookie("abc123", { headers: { host: "purebaric.com", "x-forwarded-proto": "https" } });
  assert.match(prod, /^pb_admin_session=abc123;/);
  assert.match(prod, /HttpOnly/);
  assert.match(prod, /SameSite=Lax/);
  assert.match(prod, /Secure/);
  assert.match(prod, /Max-Age=\d+/);

  const local = buildSessionCookie("abc123", { headers: { host: "localhost:5056" } });
  assert.doesNotMatch(local, /Secure/);
});

test("buildClearCookie expires immediately and carries no session value", () => {
  const c = buildClearCookie({ headers: { host: "purebaric.com", "x-forwarded-proto": "https" } });
  assert.match(c, /^pb_admin_session=;/);
  assert.match(c, /Max-Age=0/);
});

test("parseCookies handles multiple cookies, whitespace, and malformed input without throwing", () => {
  assert.deepEqual(parseCookies("a=1; b=2;c=3"), { a: "1", b: "2", c: "3" });
  assert.deepEqual(parseCookies(""), {});
  assert.deepEqual(parseCookies(undefined), {});
  assert.deepEqual(parseCookies("garbage-no-equals; a=1"), { a: "1" });
});

test("getSessionIdFromEvent reads the session cookie out of a request event", () => {
  assert.equal(getSessionIdFromEvent({ headers: { cookie: `${COOKIE_NAME}=xyz789; other=1` } }), "xyz789");
  assert.equal(getSessionIdFromEvent({ headers: {} }), null);
  assert.equal(getSessionIdFromEvent({ headers: { cookie: "other=1" } }), null);
});

test("newSessionRecord carries a ~90-day expiry and the passed-in credential/device info", () => {
  const rec = newSessionRecord("sid1", { credentialId: "cred1", deviceLabel: "My iPhone" });
  assert.equal(rec.id, "sid1");
  assert.equal(rec.credentialId, "cred1");
  assert.equal(rec.deviceLabel, "My iPhone");
  const days = (new Date(rec.expiresAt) - new Date(rec.createdAt)) / 86400000;
  assert.ok(days > 89 && days < 91, `expected ~90 days, got ${days}`);
});

test("sessionIsValid checks expiry against 'now', not real wall-clock time", () => {
  const rec = newSessionRecord("sid1");
  assert.equal(sessionIsValid(rec, Date.now()), true);
  assert.equal(sessionIsValid(rec, Date.now() + 91 * 24 * 60 * 60 * 1000), false); // 91 days later
  assert.equal(sessionIsValid(null, Date.now()), false);
  assert.equal(sessionIsValid({}, Date.now()), false);
});
