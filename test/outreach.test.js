const { test } = require("node:test");
const assert = require("node:assert/strict");
const out = require("../netlify/functions/_lib/outreach");
const tpl = require("../netlify/functions/_lib/outreach-template");

const row = { business: "Hell's Gate Gym", industry: "Gyms and fitness centers", templateId: "gyms-and-fitness", owner: "Mike Symkoviak",
  email: "Mike@HellsGateGym.com", email_confidence: "high", city: "Murray", zip: "84107", county: "Salt Lake", personal_note_hook: "open 24/7" };

test("prospectId is stable and keyed by email when present", () => {
  assert.equal(out.prospectId(row), out.prospectId({ ...row, business: "renamed" }));
  assert.notEqual(out.prospectId(row), out.prospectId({ ...row, email: "" }));
  assert.match(out.prospectId(row), /^p_[0-9a-f]{20}$/);
});

test("normalizeProspect derives the greeting name, lowercases the email, starts as new with a token", () => {
  const p = out.normalizeProspect(row);
  assert.equal(p.firstName, "Mike");
  assert.equal(p.email, "mike@hellsgategym.com");
  assert.equal(p.status, "new");
  assert.match(p.unsubToken, /^[0-9a-f]{32}$/);
  assert.equal(p.templateId, "gyms-and-fitness");
});

test("re-import keeps status, token and the owner's edits", () => {
  const first = out.normalizeProspect(row);
  const sent = out.markSent(first, "re_123");
  const edited = out.applyPatch(sent, { personalNote: "custom note", firstName: "Michael" });
  const again = out.normalizeProspect({ ...row, owner: "Someone Else", personal_note: "from research" }, edited);
  assert.equal(again.status, "sent");
  assert.equal(again.unsubToken, first.unsubToken);
  assert.equal(again.resendId, "re_123");
  assert.equal(again.personalNote, "custom note");
  assert.equal(again.firstName, "Michael");
});

test("sendBlocker refuses without postal address, email, template, or when already sent", () => {
  const settings = out.cleanSettings({ postalAddress: "123 Main St, Lehi, UT 84043" });
  const p = out.normalizeProspect(row);
  assert.equal(out.sendBlocker(p, settings), null);
  assert.match(out.sendBlocker(p, out.cleanSettings({})), /postal address/);
  assert.match(out.sendBlocker({ ...p, email: "" }, settings), /no email/);
  assert.match(out.sendBlocker({ ...p, templateId: "nope" }, settings), /template/);
  assert.match(out.sendBlocker(out.markSent(p, "x"), settings), /status is sent/);
  assert.equal(out.sendBlocker(out.markFailed(p, "boom"), settings), null, "a failed send may be retried");
});

test("a feed row with an initial status keeps it, and a customer is never sendable", () => {
  const p = out.normalizeProspect({ business: "Rest Recovery Wellness (Ephraim)", industry: "Recovery studios and med spas", templateId: "recovery-studios-and-med-spas", city: "Ephraim", email: "", status: "customer" });
  assert.equal(p.status, "customer");
  assert.match(out.sendBlocker({ ...p, email: "x@y.com" }, out.cleanSettings({ postalAddress: "x" })), /status is customer/);
  assert.equal(out.normalizeProspect({ business: "A", city: "B", status: "bogus" }).status, "new");
});

test("sentToday counts only today's real sends", () => {
  const now = new Date("2026-10-03T18:00:00Z");
  const ps = [{ sentAt: "2026-10-03T01:00:00Z" }, { sentAt: "2026-10-02T23:59:00Z" }, { sentAt: null }];
  assert.equal(out.sentToday(ps, now), 1);
});

test("applyPatch validates status and records history", () => {
  const p = out.normalizeProspect(row);
  const next = out.applyPatch(p, { status: "replied", by: "me" });
  assert.equal(next.status, "replied");
  assert.equal(next.history.at(-1).event, "status:replied");
  assert.throws(() => out.applyPatch(p, { status: "bogus" }), /invalid status/);
});

test("Resend bounce and complaint move a sent prospect, nothing else", () => {
  const sent = out.markSent(out.normalizeProspect(row), "re_1");
  assert.equal(out.applyResendEvent(sent, "delivered").status, "sent");
  assert.equal(out.applyResendEvent(sent, "bounced").status, "bounced");
  assert.equal(out.applyResendEvent(sent, "complained").status, "unsubscribed");
  const replied = out.applyPatch(sent, { status: "replied" });
  assert.equal(out.applyResendEvent(replied, "bounced").status, "replied");
});

test("cleanSettings clamps the cap and keeps defaults", () => {
  const s = out.cleanSettings({ dailyCap: "999", fromName: "" });
  assert.equal(s.dailyCap, 200);
  assert.equal(s.fromName, out.DEFAULT_SETTINGS.fromName);
  assert.equal(out.cleanSettings({ dailyCap: 0 }).dailyCap, 1);
});

test("publicView strips the unsubscribe token", () => {
  const p = out.normalizeProspect(row);
  assert.equal(out.publicView(p).unsubToken, undefined);
});

test("greetingName handles the owner strings research produces", () => {
  const cases = {
    "Sam (Samantha) Butler; co-owner Kaitlyn Faraone": "Sam",
    "Zac & Lynndsey Eldridge": "Zac and Lynndsey",
    "Devin/Nina Pearson": "Devin and Nina",
    "Dr. Stuart B. Porter (with Hayley)": "Stuart",
    "GM Greg Larsen": "Greg",
    "owners Setema Gali/Samuel Sells": "Setema and Samuel",
    "Matthew Nelson DPT": "Matthew",
    "KC Logan PT and Jason Huffaker MPA": "KC and Jason",
    "": "",
  };
  for (const [input, expected] of Object.entries(cases)) assert.equal(tpl.greetingName(input), expected, input);
});

test("render fills every token, escapes the business name, and carries the compliance footer", () => {
  const r = tpl.render({ categoryId: "salons-and-beauty", firstName: "", businessName: "Lash & Co", personalNote: "your reviews mention the quiet room",
    unsubscribeUrl: "https://purebaric.com/api/outreach/unsubscribe?p=p_1&t=abc", postalAddress: "123 Main St, Lehi, UT 84043" });
  for (const s of [r.subject, r.html, r.text]) assert.doesNotMatch(s, /\[(First name|Business name|Personal note)\]/);
  assert.match(r.html, /Hi Lash &amp; Co team,/);
  assert.match(r.html, /your reviews mention the quiet room\./);
  assert.match(r.html, /unsubscribe\?p=p_1&amp;t=abc/);
  assert.match(r.html, /123 Main St, Lehi, UT 84043/);
  assert.match(r.html, /purebaric\.com\/business\?utm_source=email&utm_medium=outreach&utm_campaign=b2b-salons-and-beauty/);
  assert.match(r.html, /purebaric-business-prospectus\.pdf/);
  assert.match(r.text, /Unsubscribe: https:\/\/purebaric\.com\/api\/outreach\/unsubscribe\?p=p_1&t=abc/);
  assert.throws(() => tpl.render({ categoryId: "nope" }), /unknown outreach category/);
});

test("every category renders with a subject, no leftover tokens when fully personalized", () => {
  for (const c of tpl.CATEGORIES) {
    const r = tpl.render({ categoryId: c.id, firstName: "Jordan", businessName: "Summit Strength", personalNote: "", postalAddress: "x" });
    assert.ok(r.subject.length > 10, c.id);
    assert.doesNotMatch(r.html, /\[(First name|Business name|Personal note)\]/, c.id);
    assert.doesNotMatch(r.text, /\[(First name|Business name|Personal note)\]/, c.id);
  }
});
