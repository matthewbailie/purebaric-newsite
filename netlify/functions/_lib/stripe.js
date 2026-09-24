// Stripe client helper. Returns null when STRIPE_SECRET_KEY is unset so the
// feature stays inert (endpoints report "not configured") until the owner adds
// keys in Netlify. The stripe package is required lazily for the same reason.

let cached = null;

function stripeClient() {
  const key = (process.env.STRIPE_SECRET_KEY || "").trim();
  if (!key) return null;
  if (cached) return cached;
  const Stripe = require("stripe");
  cached = new Stripe(key, { apiVersion: "2024-06-20" });
  return cached;
}

function isTestKey() {
  return (process.env.STRIPE_SECRET_KEY || "").startsWith("sk_test_");
}

module.exports = { stripeClient, isTestKey };
