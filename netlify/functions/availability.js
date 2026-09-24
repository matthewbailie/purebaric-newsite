const { countAvailableToday, availabilityByType } = require("./_lib/storage");

// GET /api/availability            -> { available, total, byType }  (today's window)
// GET /api/availability?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD
//   -> byType reflects that window; available/total still reflect today.
exports.handler = async (event) => {
  try {
    const q = (event && event.queryStringParameters) || {};
    const window = {};
    if (/^\d{4}-\d{2}-\d{2}$/.test(q.startDate || "")) window.startDate = q.startDate;
    if (/^\d{4}-\d{2}-\d{2}$/.test(q.endDate || "")) window.endDate = q.endDate;

    const [{ available, total }, byType] = await Promise.all([
      countAvailableToday(),
      availabilityByType(window),
    ]);
    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "public, max-age=60",
      },
      body: JSON.stringify({ available, total, byType }),
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
