// Admin session cookie handling — unit-tested (pure parts) in test/session.test.js.
//
// Netlify Functions are stateless, so "session" here means: a cryptographically
// random, unguessable ID (the cookie's only content — no JWT, nothing to forge
// or decode) that's looked up server-side against a record in the
// `adminSessions` Blobs store. Long-lived with a sliding expiry, specifically
// to fix "I keep getting signed out" — Netlify Identity's own ~1h access token
// is unrelated to and unaffected by this; this is a second, independent auth
// path (see _lib/admin.js's requireAuth, which now accepts either).

const crypto = require("crypto");

const COOKIE_NAME = "pb_admin_session";
// Flat (non-sliding) 90-day lifetime from login. This is the whole fix for
// "I keep getting signed out" — deliberately simple: no server-side refresh
// bookkeeping, requireAuth only ever needs to *read* a session, never write
// one, which is what keeps it a single async Blobs GET per request rather
// than a GET-then-maybe-PUT. Re-authenticating (one passkey tap) every 90
// days of actual inactivity is a trivial cost next to that simplicity.
const SESSION_TTL_MS = 90 * 24 * 60 * 60 * 1000; // 90 days

function newSessionId() {
  return crypto.randomBytes(32).toString("base64url");
}

// Cookies are Secure unless we're clearly on plain-http localhost (local
// preview/dev) — Secure cookies are silently dropped by browsers over http.
function isLocalHttp(event) {
  const host = (event.headers && (event.headers.host || event.headers.Host)) || "";
  // Netlify's edge always sets x-forwarded-proto in production (it's the
  // reverse proxy in front of every Function); a local dev/preview server
  // typically doesn't send this header at all, since there's no proxy — so
  // "missing" should default to "http", not "https", or local testing would
  // silently mark the cookie Secure and browsers would drop it over plain http.
  const proto = (event.headers && (event.headers["x-forwarded-proto"] || event.headers["X-Forwarded-Proto"])) || "http";
  return proto !== "https" && /^(localhost|127\.0\.0\.1)(:\d+)?$/.test(host);
}

function buildSessionCookie(sessionId, event) {
  const attrs = [`${COOKIE_NAME}=${sessionId}`, "Path=/", "HttpOnly", "SameSite=Lax", `Max-Age=${Math.floor(SESSION_TTL_MS / 1000)}`];
  if (!isLocalHttp(event)) attrs.push("Secure");
  return attrs.join("; ");
}

function buildClearCookie(event) {
  const attrs = [`${COOKIE_NAME}=`, "Path=/", "HttpOnly", "SameSite=Lax", "Max-Age=0"];
  if (!isLocalHttp(event)) attrs.push("Secure");
  return attrs.join("; ");
}

// Parses the raw `Cookie` request header. Never throws on malformed input.
function parseCookies(header) {
  const out = {};
  String(header || "").split(";").forEach((part) => {
    const i = part.indexOf("=");
    if (i === -1) return;
    const k = part.slice(0, i).trim();
    const v = part.slice(i + 1).trim();
    if (k) out[k] = decodeURIComponent(v);
  });
  return out;
}

function getSessionIdFromEvent(event) {
  const header = event.headers && (event.headers.cookie || event.headers.Cookie);
  return parseCookies(header)[COOKIE_NAME] || null;
}

function newSessionRecord(sessionId, { credentialId, deviceLabel } = {}) {
  const now = Date.now();
  return {
    id: sessionId,
    createdAt: new Date(now).toISOString(),
    expiresAt: new Date(now + SESSION_TTL_MS).toISOString(),
    lastSeenAt: new Date(now).toISOString(),
    credentialId: credentialId || null,
    deviceLabel: deviceLabel || null,
  };
}

// True when a stored session record is still valid right now.
function sessionIsValid(record, now) {
  if (!record || !record.expiresAt) return false;
  return new Date(record.expiresAt).getTime() > (now == null ? Date.now() : now);
}

module.exports = {
  COOKIE_NAME,
  SESSION_TTL_MS,
  newSessionId,
  isLocalHttp,
  buildSessionCookie,
  buildClearCookie,
  parseCookies,
  getSessionIdFromEvent,
  newSessionRecord,
  sessionIsValid,
};
