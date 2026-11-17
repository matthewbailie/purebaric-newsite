// Experiences hub: data sanity, safety guard, and screen-support logic.
const test = require("node:test");
const assert = require("node:assert");
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const root = path.join(__dirname, "..", "experiences");
const sandbox = { window: {} };
vm.runInNewContext(fs.readFileSync(path.join(root, "data.js"), "utf8"), sandbox);
const EXPERIENCES = sandbox.window.EXPERIENCES;
const SUP = require(path.join(root, "support.js"));

test("there is at least one experience and slugs are unique", () => {
  assert.ok(Array.isArray(EXPERIENCES) && EXPERIENCES.length >= 1);
  const slugs = EXPERIENCES.map((e) => e.slug);
  assert.strictEqual(new Set(slugs).size, slugs.length);
});

for (const e of EXPERIENCES) {
  test(`${e.slug}: has a page that loads the shared player`, () => {
    const page = fs.readFileSync(path.join(root, e.slug, "index.html"), "utf8");
    assert.match(page, new RegExp(`data-experience="${e.slug}"`));
    assert.match(page, /\/experiences\/player\.js/);
    assert.match(page, /\/experiences\/data\.js/);
    assert.match(page, /\/experiences\/support\.js/);
    assert.match(page, /name="robots" content="noindex/);
  });

  test(`${e.slug}: required fields and a coherent schedule`, () => {
    for (const k of ["title", "tagline", "overview", "why", "note", "visualText", "soundText"]) {
      assert.ok(typeof e[k] === "string" && e[k].length >= (k === "title" ? 3 : 10), `${k} missing`);
    }
    assert.ok(["early", "small", "mixed"].includes(e.evidence.level));
    assert.ok(["am", "binaural"].includes(e.audio.mode));
    const total = e.stages.reduce((a, s) => a + s.frac, 0);
    assert.ok(Math.abs(total - 1) < 1e-9, "stage fractions must add up to 1");
    for (const s of e.stages) assert.ok(s.hz > 0 && s.hz <= 60);
  });

  test(`${e.slug}: SAFETY no flicker rate in the 15 to 25 Hz band`, () => {
    // The most seizure-provoking range for photosensitive epilepsy. Steady (no-light) experiences are exempt.
    if (!e.light) return;
    for (const s of e.stages) assert.ok(s.hz < 15 || s.hz > 25, `${s.hz} Hz flicker is in the 15-25 Hz band`);
  });

  test(`${e.slug}: pulse layer only for a single steady rate`, () => {
    if (e.audio.pulses) assert.strictEqual(e.stages.length, 1);
  });

  test(`${e.slug}: research is linked over https and says what it showed`, () => {
    assert.ok(e.studies.length >= 3, "list at least 3 sources");
    for (const s of e.studies) {
      assert.match(s.url, /^https:\/\//);
      assert.ok(s.label.length > 5 && s.summary.length > 25, "label and plain-language summary required");
    }
    // honest framing: the note must say how early the evidence is and must not claim a cure
    const text = [e.overview, e.why, e.note].join(" ").toLowerCase();
    assert.doesNotMatch(text, /\b(cures?|treats|prevents|reverses)\b(?! has| in people)/);
    assert.match(e.note.toLowerCase(), /not|small|mice|early|mixed|pilot|preliminary/);
  });
}

test("support: 40 Hz light needs a 120/240 Hz-class screen", () => {
  const ok = (hz) => SUP.evaluateRefresh(hz, 100, false, [40]).pass;
  for (const hz of [80, 120, 160, 200, 240]) assert.ok(ok(hz), `${hz} should pass`);
  for (const hz of [60, 90, 144, 165]) assert.ok(!ok(hz), `${hz} should fail`);
});

test("support: 10 Hz alpha works on ordinary 60 and 90 Hz screens but not 144", () => {
  const ok = (hz) => SUP.evaluateRefresh(hz, 100, false, [10]).pass;
  for (const hz of [60, 59.94, 90, 120, 240]) assert.ok(ok(hz), `${hz} should pass`);
  assert.ok(!ok(144));
});

test("support: a multi-step schedule needs every step to fit", () => {
  const wd = (hz) => SUP.evaluateRefresh(hz, 100, false, [10, 6, 4, 2]);
  assert.ok(wd(120).pass && wd(60).pass && wd(240).pass);
  assert.ok(!wd(90).pass, "4 Hz needs 22.5 frames at 90 Hz");
  assert.ok(!wd(144).pass, "10 Hz needs 14.4 frames at 144 Hz");
  assert.deepStrictEqual(wd(120).stages.map((s) => s.k), [12, 20, 30, 60]);
});

test("support: unstable or too-slow screens always fail, whatever the rate", () => {
  assert.strictEqual(SUP.evaluateRefresh(120, 97.9, false, [10]).reason, "UNSTABLE");
  assert.strictEqual(SUP.evaluateRefresh(120, 100, true, [10]).reason, "UNSTABLE");
  assert.strictEqual(SUP.evaluateRefresh(48, 100, false, [10]).reason, "TOO_SLOW");
  assert.strictEqual(SUP.evaluateRefresh(60, 100, false, [40]).reason, "NOT_MULTIPLE");
});

test("hub: renders from data.js and is unlisted", () => {
  const hub = fs.readFileSync(path.join(root, "index.html"), "utf8");
  assert.match(hub, /\/experiences\/data\.js/);
  assert.match(hub, /name="robots" content="noindex/);
  assert.match(hub, /not intended to diagnose, treat, cure, or prevent any disease/);
});
