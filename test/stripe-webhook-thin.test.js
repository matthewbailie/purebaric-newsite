const { test } = require("node:test");
const assert = require("node:assert/strict");
const { handler } = require("../netlify/functions/stripe-webhook-thin");

test("thin webhook placeholder accepts POST and rejects other methods", async () => {
  assert.equal((await handler({ httpMethod: "POST", body: "{}" })).statusCode, 200);
  assert.equal((await handler({ httpMethod: "GET" })).statusCode, 405);
});
