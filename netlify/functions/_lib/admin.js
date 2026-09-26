// Shared helpers for admin endpoints

function requireAuth(event, context) {
  const user = context.clientContext && context.clientContext.user;
  if (!user) {
    return {
      statusCode: 401,
      body: JSON.stringify({ error: "unauthorized" }),
    };
  }
  return null;
}

// The signed-in admin's email, for audit trails (e.g. who gave SMS consent).
// Only meaningful after requireAuth has confirmed a session exists.
function adminEmail(context) {
  const user = context.clientContext && context.clientContext.user;
  return (user && user.email) || null;
}

function parseBody(event) {
  if (!event.body) return {};
  const contentType = (event.headers["content-type"] || event.headers["Content-Type"] || "").toLowerCase();
  if (contentType.includes("application/json")) {
    try {
      return JSON.parse(event.body);
    } catch {
      return {};
    }
  }
  const params = new URLSearchParams(event.body);
  return Object.fromEntries(params);
}

// Pull the resource id (and optional sub-action) from a path like:
//   /api/admin/chambers/abc-123          (original request, most common)
//   /api/admin/waitlist/abc-123/convert
//   /.netlify/functions/admin-chambers/abc-123  (rewritten, fallback)
// Pass the bare segment name ("chambers", "rentals", "bookings", "waitlist", "customers").
function parsePathSegments(event, segmentName) {
  const path = event.path || "";
  const segments = path.split("/").filter(Boolean);
  const idx = segments.findIndex((s) => s === segmentName || s === `admin-${segmentName}`);
  if (idx === -1) return { id: null, action: null };
  return {
    id: segments[idx + 1] || null,
    action: segments[idx + 2] || null,
  };
}

function json(statusCode, body) {
  return {
    statusCode,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  };
}

module.exports = { requireAuth, adminEmail, parseBody, parsePathSegments, json };
