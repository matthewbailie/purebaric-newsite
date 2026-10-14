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
