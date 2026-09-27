const {
  listPasskeyCredentials,
  getPasskeyCredential,
  putPasskeyCredential,
  deletePasskeyCredential,
  getAuthChallenge,
  deleteAuthChallenge,
  putAuthChallenge,
  newId,
} = require("./_lib/storage");
const { buildRegistrationOptions, verifyRegistration, toStoredCredential } = require("./_lib/passkeys");
const { requireAuth, sessionIdentity, parseBody, parsePathSegments, json } = require("./_lib/admin");

const CHALLENGE_TTL_MS = 5 * 60 * 1000;

// Everything here requires an existing, valid session (Netlify Identity OR
// our own passkey session — see _lib/admin.js's requireAuth) — you can only
// register a *new* device's passkey once you're already signed in on some
// device, exactly like adding a second key to any account. This is what
// prevents a stranger from just registering their own passkey and taking
// over the admin portal.
//
// GET    /api/admin/passkeys                 -> list registered devices
// POST   /api/admin/passkeys/register-options -> start registering a new one
// POST   /api/admin/passkeys/register-verify  -> finish registering it
// DELETE /api/admin/passkeys/:id              -> remove a device's passkey
exports.handler = async (event, context) => {
  const authErr = await requireAuth(event, context);
  if (authErr) return authErr;

  const { id } = parsePathSegments(event, "passkeys");
  const method = event.httpMethod;

  try {
    if (method === "GET" && !id) {
      const creds = await listPasskeyCredentials();
      const list = creds
        .map((c) => ({ id: c.id, deviceLabel: c.deviceLabel, createdAt: c.createdAt, lastUsedAt: c.lastUsedAt }))
        .sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));
      // `me`: who is signed in right now, so the admin can show the account name (also how a passkey login is detected).
      return json(200, { passkeys: list, me: await sessionIdentity(event, context) });
    }

    if (method === "POST" && id === "register-options") {
      const existing = await listPasskeyCredentials();
      const options = await buildRegistrationOptions(event, existing);
      const nonce = newId();
      await putAuthChallenge(nonce, options.challenge);
      return json(200, { options, nonce });
    }

    if (method === "POST" && id === "register-verify") {
      const body = parseBody(event);
      const { nonce, response, deviceLabel } = body;
      if (!nonce || !response) return json(400, { error: "nonce and response required" });

      const challengeRecord = await getAuthChallenge(nonce);
      await deleteAuthChallenge(nonce);
      if (!challengeRecord || Date.now() - new Date(challengeRecord.createdAt).getTime() > CHALLENGE_TTL_MS) {
        return json(400, { error: "challenge_expired", message: "That registration attempt expired. Try again." });
      }

      let result;
      try {
        result = await verifyRegistration(event, response, challengeRecord.challenge);
      } catch (err) {
        console.error("passkey registration verification error", err.message);
        return json(400, { error: "verification_failed", message: err.message || "Could not verify that passkey." });
      }
      if (!result.verified || !result.registrationInfo) {
        return json(400, { error: "verification_failed", message: "Could not verify that passkey." });
      }

      const { credential } = result.registrationInfo;
      const record = toStoredCredential({
        id: credential.id,
        publicKey: credential.publicKey,
        counter: credential.counter,
        transports: credential.transports || [],
        deviceLabel: (deviceLabel || "").trim().slice(0, 60) || "Unnamed device",
        createdAt: new Date().toISOString(),
        lastUsedAt: null,
      });
      await putPasskeyCredential(record);
      return json(201, { passkey: { id: record.id, deviceLabel: record.deviceLabel, createdAt: record.createdAt } });
    }

    if (method === "DELETE" && id) {
      const existing = await getPasskeyCredential(id);
      if (!existing) return json(404, { error: "not_found" });
      await deletePasskeyCredential(id);
      return json(200, { ok: true });
    }

    return json(405, { error: "method_not_allowed" });
  } catch (err) {
    console.error("admin-passkeys error", err);
    return json(500, { error: err.message || "internal_error", stack: err.stack });
  }
};
