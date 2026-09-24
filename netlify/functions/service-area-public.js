const { getServiceArea } = require("./_lib/storage");

// GET /api/service-area -> { prefixes, zips } (public; used by the ZIP checkers
// on book.html / index.html / service-area.html).
exports.handler = async () => {
  try {
    const area = await getServiceArea();
    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json", "Cache-Control": "public, max-age=300" },
      body: JSON.stringify(area),
    };
  } catch (err) {
    console.error("service-area error", err);
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: err.message || "service_area_failed" }),
    };
  }
};
