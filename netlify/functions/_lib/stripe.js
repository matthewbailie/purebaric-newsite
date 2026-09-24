// Stripe client helper. The config (secret key + webhook secret) is resolved by
// storage.getStripeConfig() (portal settings first, else env vars) and passed
// in. Returns null when no secret key is set so the feature stays inert. The
// stripe package is required lazily so it's only loaded when actually used.

function stripeSecretFromEnv() {
  return {
    secretKey: (process.env.STRIPE_SECRET_KEY || "").trim(),
    webhookSecret: (process.env.STRIPE_WEBHOOK_SECRET || "").trim(),
  };
}

// cfg: { secretKey }. Returns a Stripe client or null.
function stripeClientFrom(cfg) {
  const key = ((cfg && cfg.secretKey) || "").trim();
  if (!key) return null;
  const Stripe = require("stripe");
  return new Stripe(key, { apiVersion: "2024-06-20" });
}

module.exports = { stripeSecretFromEnv, stripeClientFrom };
