const {
  getAuthChallenge,
  deleteAuthChallenge,
  getPasskeyCredential,
  putPasskeyCredential,
  putAdminSession,
} = require("./_lib/storage");
const { verifyAuthentication } = require("./_lib/passkeys");
const { json, parseBody } = require("./_lib/admin");
const { newSessionId, newSessionRecord, buildSessionCookie } = require("./_lib/session");

// A login attempt has 5 minutes to complete the passkey ceremony before its
// challenge is considered stale (matches the ~60s the browser itself allows
// per the generateAuthenticationOptions() default timeout, with slack for a
// slow human).
const CHALLENGE_TTL_MS = 5 * 60 * 1000;

// POST /api/auth/login-verify — public, no auth (this IS the login flow).
// body: { nonce, response } where `response` is exactly what
// @simplewebauthn/browser's startAuthentication() resolves with.
exports.handler = async (event) => {
  if (event.httpMethod !== "POST") return json(405, { error: "method_not_allowed" });
  try {
    const body = parseBody(event);
    const { nonce, response } = body;
    if (!nonce || !response) return json(400, { error: "nonce and response required" });

    const challengeRecord = await getAuthChallenge(nonce);
    await deleteAuthChallenge(nonce); // one-time use, regardless of outcome below
    if (!challengeRecord || Date.now() - new Date(challengeRecord.createdAt).getTime() > CHALLENGE_TTL_MS) {
      return json(400, { error: "challenge_expired", message: "That sign-in attempt expired. Try again." });
    }

    const credentialId = response.id;
    const stored = credentialId ? await getPasskeyCredential(credentialId) : null;
    if (!stored) {
      return json(401, { error: "unknown_credential", message: "That passkey isn't registered on this admin portal." });
    }

    let result;
    try {
      result = await verifyAuthentication(event, response, challengeRecord.challenge, stored);
    } catch (err) {
      console.error("passkey login verification error", err.message);
      return json(401, { error: "verification_failed", message: "Passkey verification failed. Try again, or sign in with email + password." });
    }
    if (!result.verified) {
      return json(401, { error: "verification_failed", message: "Passkey verification failed. Try again, or sign in with email + password." });
    }

    // Persist the new signature counter (replay-attack defense — a real
    // authenticator's counter only ever increases) and last-used timestamp.
    await putPasskeyCredential({
      ...stored,
      counter: result.authenticationInfo.newCounter,
      lastUsedAt: new Date().toISOString(),
    });

    const sessionId = newSessionId();
    await putAdminSession(newSessionRecord(sessionId, { credentialId: stored.id, deviceLabel: stored.deviceLabel }));

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json", "Set-Cookie": buildSessionCookie(sessionId, event) },
      body: JSON.stringify({ ok: true, deviceLabel: stored.deviceLabel || null }),
    };
  } catch (err) {
    console.error("auth-login-verify error", err);
    return json(500, { error: err.message || "internal_error" });
  }
};
