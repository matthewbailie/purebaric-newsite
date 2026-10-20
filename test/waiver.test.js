const { test } = require("node:test");
const assert = require("node:assert/strict");
const W = require("../netlify/functions/_lib/waiver");

// A 1x1 transparent PNG padded past the "looks empty" floor.
const tinyPng = Buffer.concat([Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==", "base64"), Buffer.alloc(300)]);
const dataUrl = "data:image/png;base64," + tinyPng.toString("base64");
const good = { rentalId: "r1", signerName: " Jane Renter ", agreed: true, signaturePng: dataUrl, waiverVersion: W.WAIVER_VERSION, signerEmail: "j@x.com" };

test("the waiver text has the eleven numbered sections and the market's provider", () => {
  const w = W.waiverText("utah");
  assert.equal(w.sections.length, 11);
  assert.equal(w.sections[0].heading, "1. Purpose of this Agreement");
  assert.equal(w.sections[10].heading, "11. Entire Agreement");
  assert.equal(w.provider.name, "Matthew Bailie / Purebaric");
  assert.equal(W.waiverText("tennessee").provider.name, "Michael Bailie / Purebaric");
  assert.equal(W.waiverText("nowhere").provider.state, "Utah");
  assert.ok(w.sections.every((s) => s.items.length > 0));
});

test("a business rental gets the business agreement, with its own version and the exhibits", () => {
  const b = W.waiverText("utah", "business");
  assert.equal(b.kind, "business");
  assert.equal(b.title, "Business Rental Agreement and Liability Waiver");
  assert.notEqual(b.version, W.waiverText("utah", "home").version);
  const heads = b.sections.map((s) => s.heading);
  assert.ok(heads.includes("1. Equipment and Services"));
  assert.ok(heads.includes("11. General Terms"));
  assert.ok(heads.some((h) => /^Exhibit C/.test(h)));
  assert.ok(!heads.some((h) => /^Signatures/.test(h)));
  assert.ok(b.sections.every((s) => s.items.length > 0));
  assert.equal(W.waiverText("tennessee", "business").sections.some((s) => s.items.some((i) => /Tennessee/.test(i.text))), true);
  // a business signing needs the business name and the business version
  const ok = W.validateSigning({ ...good, kind: "business", businessName: "Rest Recovery", signerTitle: "Owner", waiverVersion: b.version });
  assert.equal(ok.ok, true); assert.equal(ok.signing.kind, "business"); assert.equal(ok.signing.businessName, "Rest Recovery");
  assert.match(W.validateSigning({ ...good, kind: "business", waiverVersion: b.version }).error, /business name/);
  assert.match(W.validateSigning({ ...good, kind: "business", businessName: "X" }).error, /changed/);
  const html = W.renderSignedHtml({ at: "2026-10-14T03:30:00.000Z", kind: "business", businessName: "Rest & Recovery", name: "Cassie Johnson", signerTitle: "Owner", rentalId: "r1", market: "utah" }, "data:image/png;base64,AAAA");
  assert.match(html, /Business Rental Agreement and Liability Waiver/);
  assert.match(html, /Rest &amp; Recovery/);
  assert.match(html, /Cassie Johnson, Owner/);
  assert.match(html, /1\. Equipment and Services/);
});

test("a signing needs a rental, a name, agreement, a real PNG and the current text version", () => {
  const ok = W.validateSigning(good);
  assert.equal(ok.ok, true);
  assert.equal(ok.signing.signerName, "Jane Renter");
  assert.equal(ok.signing.market, "utah");
  assert.ok(Buffer.isBuffer(ok.signing.png));
  assert.match(W.validateSigning({ ...good, rentalId: "" }).error, /rentalId/);
  assert.match(W.validateSigning({ ...good, signerName: "  " }).error, /name/);
  assert.match(W.validateSigning({ ...good, agreed: "yes" }).error, /agree/);
  assert.match(W.validateSigning({ ...good, signaturePng: "data:image/jpeg;base64,AAAA" }).error, /signature/i);
  assert.match(W.validateSigning({ ...good, signaturePng: "data:image/png;base64,AAAA" }).error, /empty/);
  assert.match(W.validateSigning({ ...good, waiverVersion: "old" }).error, /changed/);
  assert.match(W.validateSigning({ ...good, signaturePng: "data:image/png;base64," + Buffer.alloc(W.MAX_SIGNATURE_BYTES + 10).toString("base64") }).error, /too large/);
});

test("the signed copy carries the text, the renter, the time in Mountain time and the signature image, escaped", () => {
  const html = W.renderSignedHtml({ at: "2026-10-14T03:30:00.000Z", name: "Jane <Renter>", email: "j@x.com", rentalId: "r1", market: "utah", equipmentCondition: "Clean, no marks" }, "data:image/png;base64,AAAA");
  assert.match(html, /Jane &lt;Renter&gt;/);
  assert.match(html, /1\. Purpose of this Agreement/);
  assert.match(html, /11\. Entire Agreement/);
  assert.match(html, /Oct(ober)? 13, 2026/);
  assert.match(html, /Mountain time/);
  assert.match(html, /src="data:image\/png;base64,AAAA"/);
  assert.match(html, /Clean, no marks/);
  assert.match(html, /Matthew Bailie \/ Purebaric/);
});

test("home rentals take further signers: adults for themselves, a parent or guardian for a minor", () => {
  const adult = W.validateSigning({ ...good, role: "adult" });
  assert.equal(adult.ok, true); assert.equal(adult.signing.role, "adult"); assert.equal(adult.signing.minorName, "");
  assert.match(W.validateSigning({ ...good, role: "guardian" }).error, /minor's name/);
  assert.match(W.validateSigning({ ...good, role: "guardian", minorName: "Sam", minorAge: 18 }).error, /0 to 17/);
  const g = W.validateSigning({ ...good, role: "guardian", minorName: " Sam Renter ", minorAge: "12" });
  assert.equal(g.ok, true); assert.equal(g.signing.role, "guardian"); assert.equal(g.signing.minorName, "Sam Renter"); assert.equal(g.signing.minorAge, 12);
  const biz = W.waiverText("utah", "business");
  assert.match(W.validateSigning({ ...good, kind: "business", businessName: "X", waiverVersion: biz.version, role: "guardian", minorName: "Sam", minorAge: 9 }).error, /one authorized signer/);
  const html = W.renderSignedHtml({ at: "2026-10-19T20:00:00.000Z", name: "Jane Renter", rentalId: "r1", market: "utah" }, "data:image/png;base64,AAAA", [
    { record: { role: "adult", name: "Tom Renter", at: "2026-10-19T20:05:00.000Z" }, dataUrl: "data:image/png;base64,BBBB" },
    { record: { role: "guardian", name: "Jane Renter", minorName: "Sam Renter", minorAge: 12, at: "2026-10-19T20:06:00.000Z" }, dataUrl: "" },
  ]);
  assert.match(html, /12\. Acknowledgment &amp; Signatures|12\. Acknowledgment & Signatures/);
  assert.match(html, /Adult user<\/td><td>Tom Renter/);
  assert.match(html, /13\. Minors: Parent or Guardian Consent/);
  assert.match(html, /Minor<\/td><td>Sam Renter, age 12/);
  assert.match(html, /Signature image missing/);
});
