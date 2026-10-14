// The home rental waiver as the admin shows it for a finger signature, plus the checks on a signing
// and the self-contained HTML of a signed copy. Pure; tested in test/waiver.test.js.
// Text source: the owner's attorney-reviewed "Purebaric - Home - Rental Waiver" (sections 1 to 11).
// Change WAIVER_VERSION whenever the wording changes so each signed record says which text it covers.

const WAIVER_VERSION = "home-2026-10";

const PROVIDERS = {
  utah: { name: "Matthew Bailie / Purebaric", phone: "(801) 602-2134", email: "hello@purebaric.com", state: "Utah" },
  tennessee: { name: "Michael Bailie / Purebaric", phone: "(801) 884-2113", email: "mlebailie@hotmail.com", state: "Tennessee" },
};
const providerFor = (market) => PROVIDERS[String(market || "utah").toLowerCase()] || PROVIDERS.utah;

// Each section: heading, then items of { t: "p" | "b" (bold paragraph) | "li", text }.
const SECTIONS = [
  { heading: "1. Purpose of this Agreement", items: [
    { t: "b", text: "This Waiver & Release of Liability (“Agreement”) applies to the rental and personal use of a mild Hyperbaric Oxygen Therapy (mHBOT) chamber provided for home use. By signing this Agreement, I acknowledge that I am choosing to use the chamber voluntarily and fully assume all risks associated with its use." },
    { t: "b", text: "I understand that the chamber is provided for general wellness and relaxation only and is not a medical device and is not intended to diagnose, treat, cure, or prevent any disease. No medical advice is being provided." },
    { t: "p", text: "I understand that I should consult my physician before participating in mHBOT." },
  ] },
  { heading: "2. Acknowledgment of Risks", items: [
    { t: "p", text: "I understand that using a hyperbaric chamber involves certain risks, which may include but are not limited to:" },
    { t: "li", text: "Ear or sinus discomfort or barotrauma" }, { t: "li", text: "Headache, dizziness, anxiety, or claustrophobia" }, { t: "li", text: "Temporary vision changes" },
    { t: "li", text: "Fatigue or lightheadedness" }, { t: "li", text: "Fire hazard if oxygen safety rules are not followed" }, { t: "li", text: "Personal injury due to improper operation or exiting the chamber" },
    { t: "li", text: "Worsening of unknown or pre-existing medical conditions" },
    { t: "b", text: "I understand that the following conditions may be contraindications, and I agree to consult a physician before use if any apply:" },
    { t: "li", text: "Pneumothorax (collapsed lung) or severe lung disease" }, { t: "li", text: "Ear, sinus, or respiratory infections" }, { t: "li", text: "Uncontrolled seizures" }, { t: "li", text: "Pregnancy" },
    { t: "li", text: "Fever or illness" }, { t: "li", text: "Implanted devices, pacemakers, or medical hardware" }, { t: "li", text: "Recent surgery" }, { t: "li", text: "Any condition my physician advises against" },
    { t: "p", text: "I agree to discontinue use and seek medical attention if I experience discomfort or unusual symptoms." },
  ] },
  { heading: "3. No Medical Advice or Claims", items: [
    { t: "p", text: "I understand and agree that:" },
    { t: "li", text: "The rental provider is not a medical professional" }, { t: "li", text: "No diagnosis, treatment, or cure is being offered" }, { t: "li", text: "Results are not guaranteed" }, { t: "li", text: "I am fully responsible for my own health decisions" },
    { t: "b", text: "I agree that I will not rely on the chamber in place of medical care." },
  ] },
  { heading: "4. Assumption of Responsibility", items: [
    { t: "p", text: "I accept full responsibility for:" },
    { t: "li", text: "My own health and safety" }, { t: "li", text: "Proper use of the chamber" }, { t: "li", text: "Ensuring no prohibited items enter the chamber" }, { t: "li", text: "Following all instructions provided" },
    { t: "p", text: "I also understand that:" },
    { t: "li", text: "The chamber must only be used by trained household members" }, { t: "li", text: "Children may only use it under direct adult supervision" }, { t: "li", text: "I will not allow unauthorized users" },
  ] },
  { heading: "5. Safety Rules (Required)", items: [
    { t: "p", text: "I agree to follow all safety rules, including:" },
    { t: "li", text: "NO smoking, flames, sparks, heaters, electronics, vaping, or ignition sources near or inside the chamber" }, { t: "li", text: "Do not exceed recommended pressure levels" }, { t: "li", text: "Do not modify equipment" },
    { t: "li", text: "Keep pets and children away from controls" }, { t: "li", text: "Keep the chamber clean and free of oils, chemicals, or aerosols" }, { t: "li", text: "Stop use immediately if I feel unwell" },
    { t: "p", text: "Failure to follow safety rules may result in serious injury or death." },
  ] },
  { heading: "6. Release of Liability", items: [
    { t: "b", text: "In consideration of renting and using the chamber, I voluntarily release and hold harmless the business owner, contractors, affiliates, and representatives from any and all liability, claims, demands, actions, or causes of action arising out of or related to my participation, including but not limited to:" },
    { t: "li", text: "Personal injury" }, { t: "li", text: "Medical complications" }, { t: "li", text: "Worsening of conditions" }, { t: "li", text: "Property damage" }, { t: "li", text: "Wrongful death" },
    { t: "b", text: "This release applies to myself, my heirs, executors, administrators, and assigns." },
    { t: "p", text: "I understand that I am giving up substantial legal rights by signing this Agreement." },
  ] },
  { heading: "7. Indemnification", items: [
    { t: "p", text: "I agree to indemnify and defend the rental provider from any claims brought by third parties arising out of my use or misuse of the chamber, including use by household members or guests." },
  ] },
  { heading: "8. Equipment Responsibility", items: [
    { t: "p", text: "I agree that:" },
    { t: "li", text: "I am responsible for the safe care of the chamber during the rental period" }, { t: "li", text: "I will return it in similar condition" }, { t: "li", text: "I am financially responsible for loss or damage due to misuse, neglect, or unauthorized repair" },
    { t: "p", text: "Normal wear and tear is excluded." },
  ] },
  { heading: "9. Payment & Refund Policy", items: [
    { t: "p", text: "I understand that:" },
    { t: "li", text: "Rental fees are non-refundable once the rental term begins" }, { t: "li", text: "Late return fees may apply" }, { t: "li", text: "Damaged equipment charges may be assessed if applicable" },
  ] },
  { heading: "10. Emergency Protocol", items: [
    { t: "p", text: "If I experience discomfort, distress, or medical symptoms:" },
    { t: "li", text: "I will slowly depressurize and exit the chamber" }, { t: "li", text: "I will seek appropriate medical care" }, { t: "li", text: "I will contact the rental provider regarding any incident" },
    { t: "p", text: "If an emergency occurs, I will call 911." },
  ] },
  { heading: "11. Entire Agreement", items: [
    { t: "p", text: "I confirm that:" },
    { t: "li", text: "I have read this Agreement fully" }, { t: "li", text: "I understand its contents" }, { t: "li", text: "I am signing voluntarily" }, { t: "li", text: "No verbal statements modify this Agreement" },
    { t: "li", text: "If any portion is found unenforceable, the remainder shall still apply." },
  ] },
];

function waiverText(market) {
  return { version: WAIVER_VERSION, title: "Waiver & Release of Liability", provider: providerFor(market), sections: SECTIONS };
}

const MAX_SIGNATURE_BYTES = 600 * 1024;
// Checks a signing request. Returns { ok, error } or { ok, signing } with cleaned values and the PNG bytes.
function validateSigning(body) {
  const b = body || {};
  const name = String(b.signerName || "").trim().slice(0, 120);
  if (!b.rentalId) return { ok: false, error: "rentalId required" };
  if (!name) return { ok: false, error: "The renter's name is required" };
  if (b.agreed !== true) return { ok: false, error: "The renter must confirm they have read and agree to the waiver" };
  const m = /^data:image\/png;base64,([A-Za-z0-9+/=]+)$/.exec(String(b.signaturePng || ""));
  if (!m) return { ok: false, error: "A signature is required" };
  const png = Buffer.from(m[1], "base64");
  if (png.length < 200) return { ok: false, error: "The signature looks empty; please sign again" };
  if (png.length > MAX_SIGNATURE_BYTES) return { ok: false, error: "The signature image is too large" };
  const version = String(b.waiverVersion || "");
  if (version !== WAIVER_VERSION) return { ok: false, error: "The waiver text changed while this page was open; reload and sign again" };
  return { ok: true, signing: {
    rentalId: String(b.rentalId), signerName: name,
    signerEmail: String(b.signerEmail || "").trim().slice(0, 160), signerPhone: String(b.signerPhone || "").trim().slice(0, 40),
    signerAddress: String(b.signerAddress || "").trim().slice(0, 240),
    equipmentCondition: String(b.equipmentCondition || "").trim().slice(0, 300),
    market: String(b.market || "utah").toLowerCase() === "tennessee" ? "tennessee" : "utah",
    png,
  } };
}

const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
function renderItems(items) {
  let html = "", inList = false;
  for (const it of items) {
    if (it.t === "li") { if (!inList) { html += "<ul>"; inList = true; } html += `<li>${esc(it.text)}</li>`; continue; }
    if (inList) { html += "</ul>"; inList = false; }
    html += it.t === "b" ? `<p><strong>${esc(it.text)}</strong></p>` : `<p>${esc(it.text)}</p>`;
  }
  if (inList) html += "</ul>";
  return html;
}

// A complete, printable copy of a signed waiver: the text as signed, the renter's details, the
// signature image and the signing record. `record` is rental.waiverSigned; `signatureDataUrl` is the PNG.
function renderSignedHtml(record, signatureDataUrl) {
  const w = waiverText(record.market);
  const signedAt = record.at ? new Date(record.at) : null;
  const when = signedAt ? signedAt.toLocaleString("en-US", { timeZone: "America/Denver", dateStyle: "long", timeStyle: "short" }) + " (Mountain time)" : "";
  const body = w.sections.map((s) => `<h2>${esc(s.heading)}</h2>${renderItems(s.items)}`).join("");
  return `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="robots" content="noindex">
<title>Signed waiver, ${esc(record.name)}</title>
<style>body{font:15px/1.55 Georgia,serif;color:#2b2320;background:#fff;margin:0;padding:28px;max-width:760px;margin:0 auto}h1{font-size:24px;margin:0 0 4px}h2{font-size:16px;margin:22px 0 6px;color:#9a4f3a}p{margin:0 0 8px}ul{margin:0 0 10px 22px}table{border-collapse:collapse;margin:10px 0 18px}td{padding:4px 12px 4px 0;vertical-align:top}td:first-child{color:#6f635b;white-space:nowrap}.sig{border:1px solid #e6dccd;border-radius:8px;padding:10px;background:#faf7f2;display:inline-block;margin:6px 0}.sig img{max-width:100%;height:auto;display:block}.muted{color:#6f635b;font-size:13px}@media print{body{padding:0}}</style></head><body>
<h1>${esc(w.title)}</h1><p class="muted">Purebaric home chamber rental. Signed electronically; waiver text version ${esc(w.version)}.</p>
<table><tr><td>Provider / Business</td><td>${esc(w.provider.name)}<br>${esc(w.provider.phone)} / ${esc(w.provider.email)}</td></tr>
<tr><td>Renter</td><td>${esc(record.name)}</td></tr>
${record.address ? `<tr><td>Address</td><td>${esc(record.address)}</td></tr>` : ""}
${record.email || record.phone ? `<tr><td>Phone / Email</td><td>${esc([record.phone, record.email].filter(Boolean).join(" / "))}</td></tr>` : ""}
<tr><td>Rental</td><td>${esc(record.rentalId)}</td></tr></table>
${body}
<h2>12. Acknowledgment & Signature</h2>
<table><tr><td>Renter name</td><td>${esc(record.name)}</td></tr><tr><td>Signed</td><td>${esc(when)}</td></tr>
<tr><td>Signature</td><td><div class="sig"><img src="${signatureDataUrl}" alt="Signature of ${esc(record.name)}" width="400"></div></td></tr>
${record.equipmentCondition ? `<tr><td>Equipment condition at delivery</td><td>${esc(record.equipmentCondition)}</td></tr>` : ""}
<tr><td>Signing record</td><td class="muted">Signed on the provider's device in the renter's presence, after confirming they had read the agreement. ${record.userAgent ? esc(record.userAgent) : ""}</td></tr></table>
</body></html>`;
}

module.exports = { WAIVER_VERSION, PROVIDERS, providerFor, waiverText, validateSigning, renderSignedHtml, MAX_SIGNATURE_BYTES };
