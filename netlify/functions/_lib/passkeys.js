// WebAuthn (passkey) registration + authentication, wrapping @simplewebauthn/server.
// Pure request-shaping helpers here are unit-tested in test/passkeys.test.js;
// the actual generate*/verify* calls are the library's own well-tested logic,
// not re-tested here.
//
// Single-owner design: there's one real admin account, so there's no
// per-user lookup — a fixed userID/userName stands in for "the owner."
// Multiple *credentials* (one per registered device) all belong to that one
// owner, which is exactly the "sign in easily on any device" requirement —
// register a passkey on each device once, from an already-authenticated
// session (see admin-passkeys.js), then sign in with it going forward.

const {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
} = require("@simplewebauthn/server");

const RP_NAME = "Purebaric Admin";
const USER_NAME = "Purebaric Admin";
// Fixed WebAuthn user handle for the single owner account. Any 1-64 byte
// value works; this one is just a stable, recognizable constant.
const USER_ID = Buffer.from("purebaric-owner-v1");

// Derive the WebAuthn RP ID + expected origin from the incoming request, so
// this works unmodified in production (purebaric.com) and in local preview
// (localhost:PORT) without hardcoding either. The RP ID is the bare hostname
// (no scheme/port); the origin needs the full scheme+host.
function rpAndOriginFromEvent(event) {
  const host = (event.headers && (event.headers.host || event.headers.Host)) || "purebaric.com";
  // See the matching comment in _lib/session.js's isLocalHttp: Netlify's edge
  // always sets this in production; local dev typically doesn't send it at
  // all, so a missing header should default to "http", not "https".
  const proto = (event.headers && (event.headers["x-forwarded-proto"] || event.headers["X-Forwarded-Proto"])) || "http";
  const hostname = host.split(":")[0];
  return { rpID: hostname, origin: `${proto}://${host}` };
}

// Blobs stores JSON only — a credential's raw public key (Uint8Array on the
// wire) is kept as a base64url string on disk and converted back on read.
function toStoredCredential(record) {
  return { ...record, publicKey: Buffer.from(record.publicKey).toString("base64url") };
}
function fromStoredCredential(stored) {
  return { ...stored, publicKey: Buffer.from(stored.publicKey, "base64url") };
}

async function buildRegistrationOptions(event, existingCredentials) {
  const { rpID } = rpAndOriginFromEvent(event);
  return generateRegistrationOptions({
    rpName: RP_NAME,
    rpID,
    userID: USER_ID,
    userName: USER_NAME,
    attestationType: "none",
    // residentKey "required" + userVerification "required": a fully
    // discoverable/usernameless passkey — Face ID/Touch ID/Windows Hello can
    // prompt directly on the login screen with nothing typed.
    authenticatorSelection: { residentKey: "required", userVerification: "required", authenticatorAttachment: "platform" },
    excludeCredentials: (existingCredentials || []).map((c) => ({ id: c.id, transports: c.transports })),
  });
}

async function verifyRegistration(event, response, expectedChallenge) {
  const { rpID, origin } = rpAndOriginFromEvent(event);
  return verifyRegistrationResponse({ response, expectedChallenge, expectedOrigin: origin, expectedRPID: rpID });
}

async function buildAuthenticationOptions(event) {
  const { rpID } = rpAndOriginFromEvent(event);
  // No allowCredentials on purpose — a fully discoverable/usernameless flow;
  // the OS presents whichever registered passkey(s) it holds for this RP.
  return generateAuthenticationOptions({ rpID, userVerification: "required" });
}

async function verifyAuthentication(event, response, expectedChallenge, storedCredential) {
  const { rpID, origin } = rpAndOriginFromEvent(event);
  return verifyAuthenticationResponse({
    response,
    expectedChallenge,
    expectedOrigin: origin,
    expectedRPID: rpID,
    credential: fromStoredCredential(storedCredential),
  });
}

module.exports = {
  RP_NAME,
  USER_NAME,
  rpAndOriginFromEvent,
  toStoredCredential,
  fromStoredCredential,
  buildRegistrationOptions,
  verifyRegistration,
  buildAuthenticationOptions,
  verifyAuthentication,
};
