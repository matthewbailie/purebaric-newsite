const { test } = require("node:test");
const assert = require("node:assert/strict");
const {
  rpAndOriginFromEvent,
  toStoredCredential,
  fromStoredCredential,
} = require("../netlify/functions/_lib/passkeys");

test("rpAndOriginFromEvent derives the RP ID (bare hostname) and full origin from the request", () => {
  const prod = rpAndOriginFromEvent({ headers: { host: "purebaric.com", "x-forwarded-proto": "https" } });
  assert.equal(prod.rpID, "purebaric.com");
  assert.equal(prod.origin, "https://purebaric.com");

  const local = rpAndOriginFromEvent({ headers: { host: "localhost:5056" } });
  assert.equal(local.rpID, "localhost"); // no port in the RP ID
  assert.equal(local.origin, "http://localhost:5056"); // but the origin keeps the port
});

test("rpAndOriginFromEvent falls back sensibly when headers are missing", () => {
  const out = rpAndOriginFromEvent({ headers: {} });
  assert.equal(out.rpID, "purebaric.com");
});

test("toStoredCredential/fromStoredCredential round-trip the public key (Uint8Array <-> base64url string)", () => {
  const publicKey = new Uint8Array([1, 2, 3, 250, 255, 0]);
  const record = { id: "cred1", publicKey, counter: 0, transports: ["internal"], deviceLabel: "Test device" };

  const stored = toStoredCredential(record);
  assert.equal(typeof stored.publicKey, "string"); // JSON-safe
  assert.equal(stored.id, "cred1");
  assert.equal(stored.deviceLabel, "Test device");

  const restored = fromStoredCredential(stored);
  assert.ok(restored.publicKey instanceof Buffer);
  assert.deepEqual([...restored.publicKey], [1, 2, 3, 250, 255, 0]);
});
