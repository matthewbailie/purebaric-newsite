const { countAvailableToday } = require("./_lib/storage");

exports.handler = async () => {
  try {
    const { available, total } = await countAvailableToday();
    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "public, max-age=60",
      },
      body: JSON.stringify({ available, total }),
    };
  } catch (err) {
    console.error("availability error", err);
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: err.message || "availability_failed", stack: err.stack }),
    };
  }
};
