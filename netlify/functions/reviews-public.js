const { listPublishedReviews } = require("./_lib/storage");

// Public, unauthenticated: returns only PUBLISHED reviews, with just the fields
// safe to show on the site (no status, no internal timestamps beyond publish).
exports.handler = async () => {
  try {
    const all = await listPublishedReviews();
    const reviews = all.map((r) => ({
      id: r.id,
      firstName: r.firstName,
      lastInitial: r.lastInitial,
      city: r.city || "",
      text: r.text,
      createdAt: r.createdAt,
      publishedAt: r.publishedAt,
    }));
    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json",
        // No caching: a review archived or unpublished in admin must disappear
        // from the homepage and /reviews on the next load, not up to a minute later.
        "Cache-Control": "no-store",
      },
      body: JSON.stringify({ reviews }),
    };
  } catch (err) {
    console.error("reviews-public error", err);
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: err.message || "reviews_failed" }),
    };
  }
};
