const { getPricing, getBusinessPricing } = require("./_lib/storage");

// Public: current monthly rate per rental length (1-12). The whole website reads
// this so a price change in the admin reflects everywhere.
exports.handler = async () => {
  try {
    const [months, business] = await Promise.all([getPricing(), getBusinessPricing()]);
    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "public, max-age=60",
      },
      body: JSON.stringify({ months, business }),
    };
  } catch (err) {
    console.error("pricing-public error", err);
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: err.message || "pricing_failed" }),
    };
  }
};
