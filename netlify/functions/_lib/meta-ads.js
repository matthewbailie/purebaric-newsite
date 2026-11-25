// Meta Marketing API spend read for the admin Site OKRs & Analytics tab. Read-only (Insights GET), at
// request time with a short in-memory cache (no Blobs writes). Runs only when BOTH env vars are present:
//   META_ADS_TOKEN       system-user token with ads_read (secret; Production only)
//   META_AD_ACCOUNT_ID   the ad account, "act_<digits>" or just the digits
// Missing either var, or any error, returns { ok:false, reason } and the caller falls back to the
// hand-entered spend in the campaign list (shown as static with " *" and "Last updated").
// The token is sent in the Authorization header (never in a URL), never logged, and scrubbed from any
// error text before it leaves this module.

const GRAPH_VERSION = "v23.0";
const CACHE_MS = 5 * 60 * 1000;
const MAX_PAGES = 20;
const _cache = new Map();

function normAccount(v) {
  const s = String(v || "").trim();
  if (/^act_\d{3,30}$/.test(s)) return s;
  if (/^\d{3,30}$/.test(s)) return "act_" + s;
  return null;
}
// { token, accountId } when both vars are set and the account id is well-formed, else null.
// Callers only ever see the boolean `configured` and the account id; the token stays in this module's callers.
function metaEnv(env = process.env) {
  const token = env.META_ADS_TOKEN ? String(env.META_ADS_TOKEN).trim() : "";
  const accountId = normAccount(env.META_AD_ACCOUNT_ID);
  return token && accountId ? { token, accountId } : null;
}
function metaConfigured(env = process.env) { return !!metaEnv(env); }

const scrub = (text, token) => (token ? String(text).split(token).join("[redacted]") : String(text)).replace(/access_token=[^&\s]+/g, "access_token=[redacted]");

// Spend by campaign name (and total) for MT days from..to inclusive. Meta reports in the ad account's
// time zone; keep the account on America/Denver so days line up with the portal.
async function fetchMetaSpend({ token, accountId, from, to, fetchFn = fetch, nowMs = Date.now(), version = GRAPH_VERSION, useCache = true }) {
  if (!token || !normAccount(accountId)) return { ok: false, reason: "Meta spend is not set up: META_ADS_TOKEN and META_AD_ACCOUNT_ID are both needed." };
  const acct = normAccount(accountId);
  const key = `${acct}|${from}|${to}`;
  const hit = useCache && _cache.get(key);
  if (hit && nowMs - hit.at < CACHE_MS) return hit.value;
  const params = new URLSearchParams({ level: "campaign", fields: "campaign_name,spend", time_range: JSON.stringify({ since: from, until: to }), limit: "500" });
  let url = `https://graph.facebook.com/${version}/${acct}/insights?${params}`;
  const byCampaign = {};
  try {
    for (let page = 0; url && page < MAX_PAGES; page++) {
      const res = await fetchFn(url, { method: "GET", headers: { Authorization: `Bearer ${token}` } });
      const j = await res.json();
      if (!res.ok || j.error) throw new Error((j.error && j.error.message) || `HTTP ${res.status}`);
      for (const r of j.data || []) {
        const name = String(r.campaign_name || "").trim();
        const n = Number(r.spend);
        if (name && Number.isFinite(n)) byCampaign[name] = Math.round(((byCampaign[name] || 0) + n) * 100) / 100;
      }
      const next = j.paging && j.paging.next;
      url = next ? next.replace(/([?&])access_token=[^&]*&?/, "$1").replace(/[?&]$/, "") : null;
    }
  } catch (e) {
    return { ok: false, reason: `Meta spend could not be read: ${scrub((e && e.message) || "error", token)}` };
  }
  const total = Math.round(Object.values(byCampaign).reduce((t, v) => t + v, 0) * 100) / 100;
  const value = { ok: true, readMs: nowMs, total, byCampaign };
  if (useCache) _cache.set(key, { at: nowMs, value });
  return value;
}

module.exports = { GRAPH_VERSION, CACHE_MS, normAccount, metaEnv, metaConfigured, fetchMetaSpend, _cache };
