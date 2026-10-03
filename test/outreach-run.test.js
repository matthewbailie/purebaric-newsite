// The scheduled outreach sender: batch selection, the bounce guard, the daily cap, and the owner notices.
const { test } = require("node:test");
const assert = require("node:assert/strict");
const run = require("../netlify/functions/_lib/outreach-run");
const out = require("../netlify/functions/_lib/outreach");

const settings = out.cleanSettings({ postalAddress: "1 Main St, Lehi, UT 84043", dailyCap: 20, autoSend: true, autoDays: [0, 1, 2, 3, 4, 5, 6], autoTime: "00:00" });
const mk = (i, over = {}) => ({ id: "p" + i, business: "Biz " + i, email: `b${i}@example.com`, emailConfidence: "medium",
  templateId: "gyms-and-fitness", status: "new", history: [], unsubToken: "t", ...over });

test("pickBatch takes high-confidence emails first and interleaves industries", () => {
  const rows = [
    mk(1, { emailConfidence: "medium" }), mk(2, { emailConfidence: "high" }), mk(3, { emailConfidence: "high", templateId: "salons-and-beauty" }),
    mk(4, { emailConfidence: "low" }), mk(5, { emailConfidence: "high" }), mk(6, { status: "sent" }), mk(7, { email: "" }), mk(8, { templateId: "nope" }),
  ];
  const ids = run.pickBatch(rows, settings, 4).map(p => p.id);
  assert.deepEqual(ids, ["p2", "p3", "p5", "p1"]);
  assert.deepEqual(run.pickBatch(rows, settings, 0), []);
});

test("a prospect that failed twice is left alone; one failure is retried", () => {
  const once = mk(1, { status: "failed", history: [{ event: "failed" }] });
  const twice = mk(2, { status: "failed", history: [{ event: "failed" }, { event: "failed" }] });
  assert.deepEqual(run.sendable([once, twice], settings).map(p => p.id), ["p1"]);
});

test("bounceRate looks at the last 50 sends", () => {
  const rows = [];
  for (let i = 0; i < 60; i++) rows.push(mk(i, { status: i < 3 ? "bounced" : "sent", sentAt: new Date(Date.UTC(2026, 9, 1, 0, 0, i)).toISOString() }));
  const br = run.bounceRate(rows);
  assert.equal(br.sample, 50);
  assert.equal(br.bad, 0, "the three bounces are the oldest sends, outside the last 50");
  rows[59].status = "bounced";
  assert.equal(run.bounceRate(rows).bad, 1);
});

function fakeIo(rows, s) {
  const state = { settings: { ...s }, rows: new Map(rows.map(r => [r.id, r])), delivered: [], notices: [] };
  const io = {
    getSettings: async () => out.cleanSettings(state.settings),
    putSettings: async (n) => { state.settings = out.cleanSettings(n); },
    listProspects: async () => [...state.rows.values()],
    putProspect: async (p) => { state.rows.set(p.id, p); },
    deliver: async (p) => { if (p.email.startsWith("bad")) throw new Error("Resend API error [422]"); state.delivered.push(p.id); return { resendId: "re_" + p.id }; },
    notify: async (n) => { state.notices.push(n); },
  };
  return { io, state };
}
const fast = () => Promise.resolve();

test("runBatch respects the auto-send switch, the daily cap, spaces across runs, and summarises once", async () => {
  const rows = []; for (let i = 0; i < 8; i++) rows.push(mk(i));
  const off = fakeIo(rows, { ...settings, autoSend: false });
  assert.equal((await run.runBatch(off.io, { sleepFn: fast })).skipped, "auto-send is off");
  assert.equal((await run.runBatch(off.io, { trigger: "manual", sleepFn: fast })).sent, 5, "manual runs ignore the switch");

  const { io, state } = fakeIo(rows, { ...settings, dailyCap: 7 });
  const r1 = await run.runBatch(io, { sleepFn: fast });
  assert.equal(r1.sent, 5); assert.equal(r1.sentToday, 5); assert.equal(r1.remaining, 3);
  assert.equal(state.notices.length, 0, "no summary until the cap is reached");
  const r2 = await run.runBatch(io, { sleepFn: fast });
  assert.equal(r2.sent, 2, "stops at the daily cap"); assert.equal(r2.sentToday, 7);
  assert.equal(state.notices.length, 1); assert.match(state.notices[0].subject, /7 sent today, 1 to go/);
  const r3 = await run.runBatch(io, { sleepFn: fast });
  assert.equal(r3.sent, 0); assert.equal(state.notices.length, 1, "the summary goes once a day");
  assert.equal(state.settings.lastAutoRun.sentToday, 7);
});

test("runBatch records failures, finishes the list, and switches itself off", async () => {
  const rows = [mk(1), mk(2, { email: "bad@example.com" }), mk(3)];
  const { io, state } = fakeIo(rows, settings);
  const r = await run.runBatch(io, { sleepFn: fast });
  assert.equal(r.sent, 2); assert.equal(r.failed, 1);
  assert.equal(state.rows.get("p2").status, "failed");
  assert.equal(r.remaining, 1, "the failed row is retried later");
  const r2 = await run.runBatch(io, { sleepFn: fast });
  assert.equal(r2.failed, 1); assert.equal(r2.remaining, 0, "second failure retires it");
  assert.equal(state.settings.autoSend, false);
  assert.match(state.notices[state.notices.length - 1].subject, /every business email has been sent/);
});

test("runBatch pauses on a high bounce rate and tells the owner", async () => {
  const rows = [];
  for (let i = 0; i < 25; i++) rows.push(mk(i, { status: i < 3 ? "bounced" : "sent", sentAt: new Date(Date.UTC(2026, 9, 1, 0, 0, i)).toISOString() }));
  rows.push(mk(99));
  const { io, state } = fakeIo(rows, settings);
  const r = await run.runBatch(io, { sleepFn: fast });
  assert.equal(r.skipped, "paused: bounce rate");
  assert.equal(state.settings.autoSend, false);
  assert.match(state.notices[0].subject, /paused/);
  assert.equal(state.delivered.length, 0);
});

test("the schedule honours the chosen days and start time in Mountain time", () => {
  const s = out.cleanSettings({ autoDays: [1, 3], autoTime: "10:00" });
  // 2026-10-05 is a Monday. 16:30 UTC = 10:30 a.m. MDT; 15:30 UTC = 9:30 a.m. MDT.
  assert.equal(out.inSendWindow(s, new Date("2026-10-05T16:30:00Z")), true);
  assert.equal(out.inSendWindow(s, new Date("2026-10-05T15:30:00Z")), false, "before the start time");
  assert.equal(out.inSendWindow(s, new Date("2026-10-06T16:30:00Z")), false, "Tuesday is not chosen");
  assert.equal(out.inSendWindow(s, new Date("2026-10-07T23:30:00Z")), true, "Wednesday 5:30 p.m., still that day");
  assert.deepEqual(out.cleanSettings({ autoDays: "6,0,9,x" }).autoDays, [0, 6]);
  assert.equal(out.cleanSettings({ autoTime: "25:99" }).autoTime, "10:00");
});

test("a scheduled run outside the window sends nothing; a manual run ignores the window", async () => {
  const rows = [mk(1), mk(2)];
  const { io, state } = fakeIo(rows, { ...settings, autoDays: [2], autoTime: "10:00" });
  const r = await run.runBatch(io, { now: new Date("2026-10-05T16:30:00Z"), sleepFn: fast });
  assert.equal(r.skipped, "outside the chosen days and time"); assert.equal(state.delivered.length, 0);
  const r2 = await run.runBatch(io, { now: new Date("2026-10-05T16:30:00Z"), trigger: "manual", sleepFn: fast });
  assert.equal(r2.sent, 2);
  assert.equal(state.rows.get("p1").sentSubject, null, "fake deliver returns no subject");
});
