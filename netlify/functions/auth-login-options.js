const { putAuthChallenge, newId } = require("./_lib/storage");
const { buildAuthenticationOptions } = require("./_lib/passkeys");
const { json } = require("./_lib/admin");

// POST /api/auth/login-options — public, no auth (this IS the login flow).
// Discoverable/usernameless: returns a challenge with no allowCredentials
// list, so the browser/OS presents whichever passkey(s) it holds for this
// site. The challenge is stashed server-side under a random nonce for
// login-verify to look up (short TTL, checked there).
exports.handler = async (event) => {
  if (event.httpMethod !== "POST") return json(405, { error: "method_not_allowed" });
  try {
    const options = await buildAuthenticationOptions(event);
    const nonce = newId();
    await putAuthChallenge(nonce, options.challenge);
    return json(200, { options, nonce });
  } catch (err) {
    console.error("auth-login-options error", err);
    return json(500, { error: err.message || "internal_error" });
  }
};
