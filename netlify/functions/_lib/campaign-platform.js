// Platforms for admin "Leads by Campaign" (Rev 2 spec, Proof-reader sign-off ~12:50 PM MT Nov 25, 2026).
// A campaign-list row stores `platform` (one of PLATFORMS) and, for Meta only, `channel` "Paid" or "Organic".
// Rows saved before Rev 2 stored the old channel list in `channel` ("Meta", "Google", "Marketplace", "KSL",
// "Retention email", "Outreach", "Other"); platformOf / metaChannelOf read both shapes, so no migration.

const PLATFORMS = ["Meta", "Google Ads", "Email outreach", "Retention email", "Facebook Marketplace", "KSL",
  "Organic / Google search", "Referral", "Phone or text", "Other website", "Email inbox"];
const META_CHANNELS = ["Paid", "Organic"];
const LEGACY_CHANNEL = { Meta: "Meta", Google: "Google Ads", Marketplace: "Facebook Marketplace", KSL: "KSL",
  "Retention email": "Retention email", Outreach: "Email outreach", Other: null };
// Platforms whose spend can be read live (Google Ads through GA4, Meta through the Marketing API).
const AD_PLATFORMS = ["Meta", "Google Ads"];

function platformOf(row) {
  if (!row) return null;
  if (row.platform) return PLATFORMS.includes(row.platform) ? row.platform : null;
  return Object.prototype.hasOwnProperty.call(LEGACY_CHANNEL, row.channel) ? LEGACY_CHANNEL[row.channel] : null;
}
function metaChannelOf(row) {
  if (platformOf(row) !== "Meta") return null;
  if (row.platform) return META_CHANNELS.includes(row.channel) ? row.channel : "Paid";
  return "Paid"; // pre-Rev 2 Meta rows were paid ad campaigns
}

module.exports = { PLATFORMS, META_CHANNELS, LEGACY_CHANNEL, AD_PLATFORMS, platformOf, metaChannelOf };
