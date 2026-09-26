const { getAdminSession, deleteAdminSession } = require("./_lib/storage");
const { getSessionIdFromEvent, buildClearCookie } = require("./_lib/session");

// POST /api/auth/logout — public (there's nothing to authorize; it only ever
// clears the caller's own cookie/session, and no-ops harmlessly if neither
// exists). Deletes the server-side session record too, not just the cookie,
// so a lost/stolen device's session can't be replayed after "signing out."
exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: JSON.stringify({ error: "method_not_allowed" }) };
  }
  try {
    const sessionId = getSessionIdFromEvent(event);
    if (sessionId) {
      const existing = await getAdminSession(sessionId);
      if (existing) await deleteAdminSession(sessionId);
    }
  } catch (err) {
    console.error("auth-logout error", err);
    // Still clear the cookie client-side even if the Blobs delete failed.
  }
  return {
    statusCode: 200,
    headers: { "Content-Type": "application/json", "Set-Cookie": buildClearCookie(event) },
    body: JSON.stringify({ ok: true }),
  };
};
