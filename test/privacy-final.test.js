// Guard for the merged /privacy page (Proof-reader's combined Version A with the
// Option B remarketing disclosure). Whatever order pixel-fix-minimal,
// homepage-personalization and lead-source-tracking merge in, this must pass on
// the final tree; a merge that brings back an older paragraph fails here.
const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const html = fs.readFileSync(path.join(root, "privacy.html"), "utf8");
const text = html.replace(/<[^>]+>/g, "").replace(/&amp;/g, "&").replace(/\s+/g, " ");

test("privacy.html has the required combined-version phrases", () => {
  for (const s of [
    "expires after 90 days",
    "If you send a request, we also note on it which of those two groups you were in.",
    "Meta (Facebook), through its pixel",
  ]) assert.ok(text.includes(s), s);
});

test("privacy.html has none of the retired wording", () => {
  for (const s of ["turn analytics off below", "cookie banner"]) assert.ok(!text.toLowerCase().includes(s), s);
  assert.ok(!/does not enable personalized advertising or remarketing/i.test(text), "Option B replaces the old remarketing line");
});

test("privacy.html carries Version A + Option B word for word, in order", () => {
  const parts = [
    "We honor Global Privacy Control and Do Not Track. If your browser sends either signal, or you turn off analytics on this device, Google Analytics and the Meta (Facebook) pixel don't load at all.",
    "To learn which ads, searches, or websites bring people to us, this site also keeps a note in your own browser (local storage) of how you first arrived: the campaign tags and ad click codes in the link you followed, the website that sent you, the first page you saw, and when. It holds no name, contact details, address, or health information, and it expires after 90 days. It reaches us only if you send a request, join the waitlist, or send us a message, together with that submission. With a request, we also note whether you used a phone or a computer. It isn't created or sent when your browser sends Global Privacy Control or Do Not Track, or when you turn off analytics or personalization, and turning off analytics also erases it.",
    "We may use the Meta pixel to show our own ads again, on Facebook and Instagram, to people who've visited our site. If your browser sends Global Privacy Control or Do Not Track, or you turn off analytics on this device, the pixel doesn't load and you won't be included. Purebaric does not send names, email addresses, phone numbers, addresses, ZIP codes, health information, notes, or form contents to Google Analytics or Google Ads.",
    "If you send a request, we also note on it which of those two groups you were in. None of this is kept or sent if you turn off analytics or personalization, or if your browser sends Global Privacy Control or Do Not Track.",
  ];
  let at = text.indexOf("Turn off analytics on this device");
  assert.ok(at > 0);
  for (const p of parts) {
    const i = text.indexOf(p, at);
    assert.ok(i > at, p.slice(0, 60));
    at = i;
  }
  assert.ok(text.includes("Meta (Facebook), through its pixel, unless you opt out, so we can measure whether our Facebook and Instagram ads led to a request, and show our ads again to past visitors. It doesn't receive your name, email, phone, address, ZIP, city, or the contents of your messages."));
  assert.match(html, /Turn off analytics on this device<\/button><\/p>\s*<p>We honor Global Privacy Control/);
});

test("form labels use the Proof-reader's 3.1 wording; stored values unchanged", () => {
  for (const page of ["book.html", "contact.html", "waitlist.html"]) {
    const h = fs.readFileSync(path.join(root, page), "utf8");
    assert.match(h, /Which best describes you\?/, page);
    assert.doesNotMatch(h, />Customer type/, page);
    assert.match(h, /<option value="home">Home user<\/option>/, page);
    assert.match(h, /<option value="recovery">After workouts or activity<\/option>/, page);
    assert.match(h, /<option value="performance">Part of my training routine<\/option>/, page);
    for (const v of ["athlete", "gym", "clinic", "salon", "other", "wellness", "business_amenity"]) assert.match(h, new RegExp(`value="${v}"`), page);
  }
});
