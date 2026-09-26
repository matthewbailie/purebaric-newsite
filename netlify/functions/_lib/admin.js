// Shared helpers for admin endpoints
//
// Two independent ways to be authenticated, either is sufficient:
//  1. Netlify Identity — the original login (email + password), ~1h JWT,
//     auto-parsed by Netlify into context.clientContext.user. Kept working
//     unchanged as the recovery/bootstrap path (see _lib/passkeys.js).
//  2. A passkey session — our own long-lived (90-day flat) cookie, checked
//     by looking up its id in the adminSessions Blobs store (see
//     _lib/session.js, auth-login-verify.js). This is what actually fixes
//     "signed out too often" — it isn't tied to Identity's short JWT life.
const { getSessionIdFromEvent, sessionIsValid } = require("./session");
const { getAdminSession } = require("./storage");

async function requireAuth(event, context) {
  const identityUser = context.clientContext && context.clientContext.user;
  if (identityUser) return null;

  const sessionId = getSessionIdFromEvent(event);
  if (sessionId) {
    const record = await getAdminSession(sessionId);
    if (sessionIsValid(record)) return null;
  }
  return {
    statusCode: 401,
    body: JSON.stringify({ error: "unauthorized" }),
  };
}

// An identifier for the signed-in admin, for audit trails (e.g. who gave SMS
// consent). Only meaningful after requireAuth has confirmed a session
// exists. Identity logins have a real email; passkey sessions don't have an
// "email" concept (there's one owner, N devices) so this falls back to the
// device's own label instead.
async function adminEmail(event, context) {
  const user = context.clientContext && context.clientContext.user;
  if (user && user.email) return user.email;
  const sessionId = getSessionIdFromEvent(event);
  if (sessionId) {
    const record = await getAdminSession(sessionId);
    if (sessionIsValid(record) && record.deviceLabel) return `passkey:${record.deviceLabel}`;
  }
  return null;
}

function parseBody(event) {
  if (!event.body) return {};
  const contentType = (event.headers["content-type"] || event.headers["Content-Type"] || "").toLowerCase();
  if (contentType.includes("application/json")) {
    try {
      return JSON.parse(event.body);
    } catch {
      return {};
    }
  }
  const params = new URLSearchParams(event.body);
  return Object.fromEntries(params);
}

// Pull the resource id (and optional sub-action) from a path like:
//   /api/admin/chambers/abc-123          (original request, most common)
//   /api/admin/waitlist/abc-123/convert
//   /.netlify/functions/admin-chambers/abc-123  (rewritten, fallback)
// Pass the bare segment name ("chambers", "rentals", "bookings", "waitlist", "customers").
function parsePathSegments(event, segmentName) {
  const path = event.path || "";
  const segments = path.split("/").filter(Boolean);
  const idx = segments.findIndex((s) => s === segmentName || s === `admin-${segmentName}`);
  if (idx === -1) return { id: null, action: null };
  return {
    id: segments[idx + 1] || null,
    action: segments[idx + 2] || null,
  };
}

function json(statusCode, body) {
  return {
    statusCode,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  };
}

module.exports = { requireAuth, adminEmail, parseBody, parsePathSegments, json };
