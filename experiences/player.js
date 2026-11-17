/* Experience player, shared by every page under /experiences/<slug>/.
   No libraries, no network requests, no analytics, no storage.

   What it does (read this first)
   ------------------------------
   1. SUPPORT CHECK. If the experience uses a flickering light, we measure the screen's real refresh
      rate with requestAnimationFrame and only allow the light when every flicker rate in the
      experience divides evenly into whole frames (see support.js). There is NO override. The audio does
      not depend on the screen, so it can always run.
   2. FLICKER. Driven by counting display frames (not timers, not CSS animations). With N = refresh /
      rate frames per cycle, the first floor(N/2) frames are "on" (or a smooth wave for slow rates).
      Only one thing changes per frame: the opacity of one pre-rendered glow element.
   3. AUDIO (Web Audio). "am" mode: music whose volume is modulated by one shared oscillator at the
      stage rate (and, for 40 Hz, a looped buffer of exactly 40 soft pulses per second, phase locked to it).
      "binaural" mode: left and right ears get tones `hz` apart. A quiet pink-noise bed and a sparse
      bell melody are NOT modulated.
   4. SCHEDULE. An experience can step through several rates over the session (e.g. 10 -> 2 Hz).
      Light and sound change together at each step.

   Graph (am):  modOsc(stage Hz) -> modDepth -> padMod.gain;  chords -> padMix -> padMod -> mix
                pulseSource(loop) -> pulseGain -> mix;  noise -> lowpass -> ambGain -> mix;  bells -> mix
   Graph (binaural): chords split into left/right buses (notes -beat/2 and +beat/2) -> merger -> mix
   Both:        mix -> delay (12 ms + offset) -> compressor -> fade -> volume -> destination
*/
(function () {
'use strict';

var SUP = window.PBSupport;
var EXP = null;
(window.EXPERIENCES || []).forEach(function (e) { if (e.slug === document.body.getAttribute('data-experience')) EXP = e; });

function $(id) { return document.getElementById(id); }
function raf(fn) { return window.requestAnimationFrame(fn); }
function median(a) {
  var s = a.slice().sort(function (x, y) { return x - y; });
  var m = s.length >> 1;
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}
function fmt1(x) { return (Math.round(x * 10) / 10).toFixed(1); }
function esc(t) { return String(t).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }

if (!EXP || !SUP) {
  document.body.innerHTML = '<div style="padding:28px;font:17px system-ui;color:#ebe6de;background:#06060a;min-height:100vh">' +
    '<p>We could not find that experience.</p><p><a style="color:#ffaa5a" href="/experiences/">Back to all experiences</a></p></div>';
  return;
}

/* ---------- Constants ---------- */
var SKIP_FRAMES = 30;          // warm-up frames ignored by the refresh check
var SAMPLE_FRAMES = 240;       // timestamps recorded by the refresh check
var OFF_LEVEL = 0.20;          // off level = 20% of the on level (80% modulation depth)
var BASE_DELAY_MS = 12;        // audio always has 12 ms of delay so the offset slider can go -12..+12
var STAGES = EXP.stages;
var FREQS = STAGES.map(function (s) { return s.hz; });
var USES_LIGHT = !!EXP.light;
var MAX_F = Math.max.apply(null, FREQS);

var params = new URLSearchParams(location.search);
var SIM = parseFloat(params.get('simulate'));
if (!(SIM > 0)) SIM = 0;                 // ?simulate=<Hz> fakes the measured refresh rate (debug)

var UA = navigator.userAgent || '';
var IS_IOS = /iPhone|iPad|iPod/.test(UA) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
var IS_IOS_CHROME = /CriOS/.test(UA);
var IS_ANDROID = /Android/.test(UA);
var AC = window.AudioContext || window.webkitAudioContext;

/* ---------- Page shell ---------- */
document.title = EXP.title + ' | Purebaric';
document.body.innerHTML =
'<main id="screen-check" class="screen"><div class="wrap"><div class="brand">Purebaric</div>' +
  '<h1>Checking your screen</h1><p class="muted">Measuring how fast your screen refreshes. Keep this page open and your phone still. It takes a few seconds.</p>' +
  '<div class="bar" aria-hidden="true"><i></i></div></div></main>' +

'<main id="screen-ready" class="screen" hidden><div class="wrap">' +
  '<div class="brand">Purebaric</div>' +
  '<a class="back" href="/experiences/">&larr; All experiences</a>' +
  '<h1>' + esc(EXP.title) + '</h1>' +
  '<p class="muted">' + esc(EXP.tagline) + '</p>' +
  '<div id="sim-banner" class="notice sim" hidden>SIMULATED: the light is never started in this mode. Sound only.</div>' +
  '<div id="done-note" class="notice done" hidden></div>' +
  '<div id="ios-chrome" class="notice safari" hidden><b>Open this page in Safari.</b> Chrome on iPhone cannot use the Safari setting listed below.</div>' +

  '<section class="card" aria-label="This experience" aria-live="polite">' +
    '<h2>This experience</h2><div class="what">' +
      '<div class="row2"><span class="lab">Light</span><div><span class="val" id="light-val"></span>' +
        '<span class="badge wait" id="light-badge">Checking…</span><span class="det" id="light-det"></span></div></div>' +
      '<div class="row2"><span class="lab">Sound</span><div><span class="val" id="sound-val"></span>' +
        '<span class="badge wait" id="sound-badge">Checking…</span><span class="det" id="sound-det"></span></div></div>' +
    '</div>' +
    '<a class="research-link" href="/experiences/#' + esc(EXP.slug) + '">About the research &rarr;</a>' +
  '</section>' +

  '<section id="screen-card" class="card" aria-label="Screen check" hidden>' +
    '<div class="readouts" data-readouts></div>' +
    '<div id="verdict-card" style="margin-top:14px"><h2 id="verdict-title">Checking…</h2>' +
    '<p id="verdict-text" class="muted" style="margin:0"></p>' +
    '<div style="margin-top:14px"><button id="btn-recheck" class="btn ghost" type="button">Re-check screen</button></div></div>' +
  '</section>' +

  '<section id="tips-card" class="card" hidden><h2>How to fix it</h2>' +
    '<details id="tips-ios"><summary>iPhone</summary><ol>' +
      '<li>Use <b>Safari</b> (not Chrome).</li>' +
      '<li>Use an iPhone 13 Pro or later on iOS 18 or later.</li>' +
      '<li>Go to <b>Settings &gt; Apps &gt; Safari &gt; Advanced &gt; Feature Flags</b> and turn <b>off</b> “Prefer Page Rendering Updates near 60fps”. Then force quit and reopen Safari.</li>' +
      '<li>Turn off <b>Low Power Mode</b>.</li></ol></details>' +
    '<details id="tips-android"><summary>Android</summary><ol>' +
      '<li>Use <b>Chrome</b>.</li>' +
      '<li>Set the screen to its highest <i>fixed</i> refresh rate. On a Pixel: Settings &gt; Display &gt; Smooth Display. On a Samsung: Settings &gt; Display &gt; Motion smoothness. Names vary by phone.</li>' +
      '<li>Turn off <b>Battery Saver</b>.</li>' +
      '<li>If your phone offers 120 Hz, choose it. Some rates (like 144 Hz) do not divide evenly into every flicker rate.</li></ol></details>' +
  '</section>' +

  (USES_LIGHT ?
  '<section class="card" aria-label="Light safety"><h2>Light safety</h2>' +
    '<label class="row"><input type="checkbox" id="safety"><span class="small">I understand this uses flashing light. Do not use it if you or anyone in your family has photosensitive epilepsy or seizures triggered by flashing lights. Stop if you feel dizzy, get a headache or feel unwell. This is for relaxation only and is not medical treatment.</span></label>' +
    '<p class="muted small" style="margin:10px 0 0">You will be asked again every session. Sound only does not need this.</p></section>' : '') +

  (EXP.audio.mode === 'binaural' ?
  '<div class="headphones"><b>Put on stereo headphones first.</b> A binaural beat only works when each ear hears its own tone. It will not work through a speaker.</div>' : '') +

  '<section class="card" aria-label="Settings"><h2>Session</h2>' +
    '<div class="field"><div class="top"><span id="dur-label">Length</span></div>' +
      '<div class="seg" role="radiogroup" aria-labelledby="dur-label">' +
        [15, 30, 60].map(function (m) {
          return '<label><input type="radio" name="dur" value="' + m + '"' + (m === EXP.minutes ? ' checked' : '') + '><span>' + m + ' min</span></label>';
        }).join('') + '</div></div>' +
    (USES_LIGHT ?
    '<div class="field"><div class="top"><label for="intensity">Light intensity</label><output id="intensity-out">40%</output></div>' +
      '<input type="range" id="intensity" min="10" max="100" step="1" value="40">' +
      '<p class="muted small" style="margin:4px 0 0">Use your phone in a dim room at about half screen brightness.</p></div>' : '') +
    '<div class="field"><div class="top"><label for="volume">Volume</label><output id="volume-out">25%</output></div>' +
      '<input type="range" id="volume" min="0" max="100" step="1" value="25"></div>' +
    '<details><summary>Advanced</summary><div class="field" style="margin-top:6px">' +
      '<div class="top"><label for="phase">Sound timing offset</label><output id="phase-out">0 ms</output></div>' +
      '<input type="range" id="phase" min="-12" max="12" step="1" value="0">' +
      '<p class="muted small" style="margin:4px 0 0">Nudges the sound earlier or later against the light, to make up for speaker or Bluetooth delay.</p></div></details>' +
  '</section>' +

  '<div class="btns">' +
    (USES_LIGHT ?
      '<button id="btn-both" class="btn primary" type="button" disabled>Start light and sound</button>' +
      '<p id="both-hint" class="muted small" style="margin:-2px 2px 4px"></p>' +
      '<button id="btn-sound" class="btn" type="button">Start sound only</button>' :
      '<button id="btn-sound" class="btn primary" type="button">Start experience</button>') +
  '</div>' +
'</div></main>' +

'<section id="screen-session" hidden aria-label="Session">' +
  '<div id="drift"><div id="glow"></div></div>' +
  '<div id="banner" role="status" hidden><div id="banner-text"></div><button id="btn-retry" class="btn" type="button">Retry check</button></div>' +
  '<div id="overlay" class="show">' +
    '<div class="ov-top"><div id="timer" aria-live="off">60:00</div><div id="chip" role="status">Starting…</div>' +
      '<div id="wake-note" hidden>Could not keep the screen awake. Please keep it awake manually.</div></div>' +
    '<div class="ov-bottom">' + (USES_LIGHT ? '<div class="readouts" data-readouts></div>' : '') +
      '<button id="btn-stop" class="btn" type="button">Stop</button></div>' +
  '</div></section>';

$('screen-session').style.setProperty('--glow-rgb', EXP.glowRGB || '255,170,90');
$('light-val').textContent = EXP.visualText;
$('sound-val').textContent = EXP.soundText;

/* ======================================================================
   1. REFRESH CHECK
   ====================================================================== */
var checkToken = 0;
/* Resolves {hz, frameMs, stablePct, drifted} or null if aborted (page hidden / superseded).
   The page is completely static while this runs. */
function measureRefresh(token) {
  return new Promise(function (resolve) {
    var seen = 0, ts = [];
    function tick(t) {
      if (token !== checkToken || document.hidden) { resolve(null); return; }
      if (seen < SKIP_FRAMES) { seen++; raf(tick); return; }
      ts.push(t);
      if (ts.length < SAMPLE_FRAMES) { raf(tick); return; }
      var iv = [];
      for (var i = 1; i < ts.length; i++) iv.push(ts[i] - ts[i - 1]);
      var med = median(iv);
      // Stability: share of intervals within 75%..125% of the median.
      var good = iv.filter(function (d) { return d >= 0.75 * med && d <= 1.25 * med; });
      var stablePct = 100 * good.length / iv.length;
      // Mean of the good intervals = total time / frame count, a finer rate when timestamps are quantised.
      var mean = good.reduce(function (a, b) { return a + b; }, 0) / good.length;
      // Adaptive refresh check: median of the first 60 vs last 60 intervals.
      var a = median(iv.slice(0, 60)), b = median(iv.slice(-60));
      resolve({ hz: 1000 / mean, frameMs: med, stablePct: stablePct, drifted: Math.abs(a - b) / a > 0.03 });
    }
    raf(tick);
  });
}

/* ======================================================================
   2. FLICKER ENGINE (frame counting)
   ====================================================================== */
var glow = $('glow');
var FL = {
  active: false, raf: 0, f: 40, k: 3, nOn: 1, frameMs: 1000 / 120, unit: null, meanU: 0.33,
  idx: 0, off: 0, last: 0, dropped: 0,
  depth: 0, target: 0,              // 0 = steady glow, 1 = full 80% pulse
  onL: 0.4, offL: 0.08, lastOpacity: -1, first: true,
  wStart: 0, wFrames: 0, wLate: 0, badWin: 0,
  cT: new Float64Array(80), cC: new Float64Array(80), cN: 0, cH: 0,   // cycle-start ring
  align: null, onPause: null, wave: 'square', state: 'off'            // off | running | paused
};

/* Per-frame brightness (0..1) for one cycle. "square": first floor(k/2) frames on. "smooth": raised
   cosine, gentler for slow rates. */
function buildUnit(k, wave) {
  var u = new Float32Array(k), sum = 0, nOn = Math.floor(k / 2);
  for (var i = 0; i < k; i++) {
    u[i] = wave === 'smooth' ? 0.5 * (1 + Math.cos(2 * Math.PI * i / k)) : (i < nOn ? 1 : 0);
    sum += u[i];
  }
  FL.meanU = sum / k;
  return u;
}
function setIntensity(pct) {
  FL.onL = pct / 100;
  FL.offL = FL.onL * OFF_LEVEL;
  if (!FL.active) writeOpacity(steadyLevel());
}
function steadyLevel() {
  // Time-average of the pulse, so fading in/out of the flicker does not jump in brightness.
  var m = FL.state === 'off' ? 0.4 : FL.meanU;
  return FL.offL + m * (FL.onL - FL.offL);
}
function writeOpacity(v) {
  if (v !== FL.lastOpacity) { glow.style.opacity = v; FL.lastOpacity = v; }
}
function resetWindow() { FL.wStart = 0; FL.wFrames = 0; FL.wLate = 0; FL.badWin = 0; FL.cN = 0; FL.cH = 0; FL.first = true; }

function flickerStart(f, k, frameMs, alignFn, wave) {
  flickerHalt();
  FL.f = f; FL.k = k; FL.nOn = Math.floor(k / 2); FL.frameMs = frameMs; FL.wave = wave || 'square';
  FL.unit = buildUnit(k, FL.wave);
  FL.idx = 0; FL.off = 0; FL.last = 0; FL.dropped = 0;
  FL.depth = 0; FL.target = 1;
  resetWindow();
  FL.align = alignFn || null; FL.state = 'running'; FL.active = true;
  FL.raf = raf(flickerTick);
}
function flickerSetStage(f, k) {                   // next step of a schedule: new rate, same session
  FL.f = f; FL.k = k; FL.nOn = Math.floor(k / 2);
  FL.unit = buildUnit(k, FL.wave);
  FL.idx = 0; FL.off = 0;
  resetWindow();
}
function flickerHalt() {
  FL.active = false;
  if (FL.raf) { cancelAnimationFrame(FL.raf); FL.raf = 0; }
}
function flickerSteadyNow() {                      // Stop: instantly a steady glow
  flickerHalt(); FL.depth = 0; FL.target = 0; FL.state = 'off';
  writeOpacity(steadyLevel());
}
function flickerPause(reason) {                    // fade out to a steady dim glow
  if (FL.state !== 'running') return;
  FL.target = 0; FL.state = 'paused';
  if (FL.onPause) FL.onPause(reason);
}

/* One call per display frame. Keep this tiny: no allocation, no layout, one style write. */
function flickerTick(t) {
  if (!FL.active) return;
  FL.raf = raf(flickerTick);

  if (FL.first) {
    FL.first = false; FL.last = t; FL.idx = 0; FL.wStart = t;
    if (FL.align) FL.off = FL.align(t, FL.frameMs, FL.k) | 0;   // line the first cycle up with the sound
  } else {
    var dt = t - FL.last;
    if (dt > 1.5 * FL.frameMs) {
      // Late frame: re-sync the phase from the timestamp and count what we missed.
      var adv = Math.round(dt / FL.frameMs); if (adv < 2) adv = 2;
      FL.idx += adv; FL.dropped += adv - 1; FL.wLate++;
    } else {
      FL.idx++;
    }
    FL.last = t; FL.wFrames++;
  }

  var pos = FL.idx + FL.off;
  var phase = pos % FL.k;                          // frame position inside the cycle
  if (phase === 0) {                               // cycle start: remember when, for the live readout
    FL.cT[FL.cH] = t; FL.cC[FL.cH] = (pos / FL.k) | 0;
    FL.cH = (FL.cH + 1) % 80; if (FL.cN < 80) FL.cN++;
  }

  // Smooth the depth between steady (0) and full pulse (1) over ~1.5 s.
  var step = FL.frameMs / 1500;
  if (FL.depth < FL.target) { FL.depth += step; if (FL.depth > FL.target) FL.depth = FL.target; }
  else if (FL.depth > FL.target) { FL.depth -= step; if (FL.depth < 0) FL.depth = 0; }

  var steady = steadyLevel();
  var lvl = FL.offL + FL.unit[phase] * (FL.onL - FL.offL);
  writeOpacity(steady + FL.depth * (lvl - steady));

  if (FL.target === 0 && FL.depth === 0) { flickerHalt(); return; }   // faded out: stop spending frames

  // Live monitor over a rolling 1 s window.
  if (FL.state === 'running' && t - FL.wStart >= 1000) {
    var hzWin = FL.wFrames / (t - FL.wStart) * 1000;
    var rateBad = Math.abs(hzWin / FL.f - FL.k) > SUP.tolN(FL.k);
    if (FL.wLate > 3) { flickerPause('late'); }
    else if (rateBad) { if (++FL.badWin >= 2) flickerPause('rate'); }
    else FL.badWin = 0;
    FL.wStart = t; FL.wFrames = 0; FL.wLate = 0;
  }
}

/* Achieved flicker rate from the real cycle-start timestamps (null until enough data). */
function achievedHz() {
  var need = FL.f >= 8 ? 8 : 3;
  if (FL.cN < need) return null;
  var oldest = (FL.cH - FL.cN + 80) % 80, newest = (FL.cH - 1 + 80) % 80;
  var dtms = FL.cT[newest] - FL.cT[oldest], dc = FL.cC[newest] - FL.cC[oldest];
  return dtms > 0 && dc > 0 ? dc / dtms * 1000 : null;
}

/* ======================================================================
   3. AUDIO (Web Audio API)
   ====================================================================== */
var PAD_G = 1.0;
var PULSE_LEVEL = 0.30;
var AMB_LEVEL = 0.03;
var BELL_LEVEL = 0.035;

// Calm A major / A sus chord loop. Every note sits between 220 Hz (A3) and 880 Hz (A5).
var CHORDS = [
  [220.00, 329.63, 440.00, 554.37],   // A    (A3 E4 A4 C#5)
  [220.00, 246.94, 329.63, 440.00],   // Asus2 (A3 B3 E4 A4)
  [293.66, 369.99, 440.00, 554.37],   // D    (D4 F#4 A4 C#5)
  [329.63, 440.00, 493.88, 659.25]    // Esus (E4 A4 B4 E5)
];
var CHORD_LEN = 16, CHORD_FADE = 4, CHORD_STEP = CHORD_LEN - CHORD_FADE;   // 12 s apart
var BELLS = [1108.73, 1318.51, 1479.98, 1760.00, 1975.53];                 // A major pentatonic > 1 kHz

function volToGain(v) { var x = v / 100; return 0.9 * x * x; }             // gentle curve, low default

/* One second of audio holding exactly `hz` pulses. Pulse k starts at sample round(k*sr/hz), so even at
   44100 Hz (not divisible by 40) the loop is exactly 1 s long and timing is sample accurate.
   Shape: 5 ms attack, long exponential decay, then a gap. */
function makePulseBuffer(ctx, hz) {
  hz = hz || 40;
  var sr = ctx.sampleRate;
  var buf = ctx.createBuffer(1, sr, sr);
  var d = buf.getChannelData(0);
  var atk = 0.005, tau = 0.006, taper = 0.003;
  for (var k = 0; k < hz; k++) {
    var s = Math.round(k * sr / hz), e = Math.round((k + 1) * sr / hz);
    var len = e - s, dur = len / sr;
    for (var i = 0; i < len; i++) {
      var t = i / sr;
      var env = t < atk ? t / atk : Math.exp(-(t - atk) / tau);
      if (t > dur - taper) env *= 0.5 * (1 + Math.cos(Math.PI * (t - (dur - taper)) / taper));
      d[s + i] = 0.9 * env * Math.sin(2 * Math.PI * 500 * t);
    }
  }
  return buf;
}

/* ~12 s of pink noise (Paul Kellet filter) with the ends cross-faded so the loop has no seam. */
function makePinkBuffer(ctx) {
  var sr = ctx.sampleRate, len = sr * 12, xf = Math.floor(sr * 0.75);
  var raw = new Float32Array(len + xf);
  var b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
  for (var i = 0; i < raw.length; i++) {
    var w = Math.random() * 2 - 1;
    b0 = 0.99886 * b0 + w * 0.0555179; b1 = 0.99332 * b1 + w * 0.0750759;
    b2 = 0.96900 * b2 + w * 0.1538520; b3 = 0.86650 * b3 + w * 0.3104856;
    b4 = 0.55000 * b4 + w * 0.5329522; b5 = -0.7616 * b5 - w * 0.0168980;
    raw[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + w * 0.5362) * 0.11; b6 = w * 0.115926;
  }
  var buf = ctx.createBuffer(1, len, sr), d = buf.getChannelData(0);
  for (var j = 0; j < len; j++) d[j] = raw[j];
  for (var x = 0; x < xf; x++) {                   // blend the tail into the head
    var f = x / xf;
    d[x] = raw[x] * Math.sqrt(f) + raw[len + x] * Math.sqrt(1 - f);
  }
  return buf;
}

/* Build the whole graph on any BaseAudioContext (live or offline, for testing).
   opts: {volume 0-100, phaseMs, fadeIn s, t0 s, mode 'am'|'binaural', pulses bool, hz start rate, offline}.
   Returns a controller. */
function buildAudio(ctx, opts) {
  var T0 = opts.t0 != null ? opts.t0 : ctx.currentTime + 0.12;
  var mode = opts.mode || 'am', hz0 = opts.hz || 40;
  var sources = [];

  // Phase model of the modulation oscillator: segments of constant rate, so the light can line up
  // with the sound even after the rate has stepped.
  var segs = [{ t: T0, cyc: 0, hz: hz0 }];
  function seg(t) { var s = segs[0]; for (var i = 0; i < segs.length; i++) if (segs[i].t <= t) s = segs[i]; return s; }
  function cyclesAt(t) { var s = seg(t); return s.cyc + s.hz * (t - s.t); }

  var mix = ctx.createGain();
  var delay = ctx.createDelay(0.1);
  delay.delayTime.value = (BASE_DELAY_MS + (opts.phaseMs || 0)) / 1000;
  var comp = ctx.createDynamicsCompressor();      // gentle: peaks stay well below the threshold
  comp.threshold.value = -8; comp.knee.value = 20; comp.ratio.value = 2;
  comp.attack.value = 0.02; comp.release.value = 0.25;
  var fade = ctx.createGain(); fade.gain.value = 0;
  var vol = ctx.createGain(); vol.gain.value = volToGain(opts.volume);
  mix.connect(delay); delay.connect(comp); comp.connect(fade); fade.connect(vol); vol.connect(ctx.destination);
  var fi = opts.fadeIn != null ? opts.fadeIn : 10;
  fade.gain.setValueAtTime(0, T0);
  fade.gain.linearRampToValueAtTime(1, T0 + Math.max(fi, 0.005));

  // --- pad: chords, either amplitude modulated at the stage rate (am) or split L/R (binaural) ---
  var modOsc = null, padIn = [], busL = null, busR = null;
  if (mode === 'am') {
    modOsc = ctx.createOscillator(); modOsc.type = 'sine'; modOsc.frequency.value = hz0;
    var modDepth = ctx.createGain(); modDepth.gain.value = 0.8 * PAD_G / 1.8;
    var padMod = ctx.createGain(); padMod.gain.value = PAD_G / 1.8;
    modOsc.connect(modDepth); modDepth.connect(padMod.gain);
    var padMix = ctx.createBiquadFilter(); padMix.type = 'lowpass'; padMix.frequency.value = 2400;
    padMix.connect(padMod); padMod.connect(mix);
    modOsc.start(T0); sources.push(modOsc);
    padIn = [padMix];
  } else {
    var merger = ctx.createChannelMerger(2);
    busL = ctx.createBiquadFilter(); busL.type = 'lowpass'; busL.frequency.value = 2400;
    busR = ctx.createBiquadFilter(); busR.type = 'lowpass'; busR.frequency.value = 2400;
    var bin = ctx.createGain(); bin.gain.value = 0.55;
    busL.connect(merger, 0, 0); busR.connect(merger, 0, 1); merger.connect(bin); bin.connect(mix);
  }

  // --- soft pulse layer (40 Hz design): looped buffer, exactly hz pulses per second ---
  if (opts.pulses && mode === 'am') {
    var pulse = ctx.createBufferSource(); pulse.buffer = makePulseBuffer(ctx, hz0); pulse.loop = true;
    var pulseGain = ctx.createGain(); pulseGain.gain.value = PULSE_LEVEL;
    pulse.connect(pulseGain); pulseGain.connect(mix);
    pulse.start(T0); sources.push(pulse);
  }

  // --- ambient bed (unmodulated): quiet filtered pink noise with a slow swell ---
  var noise = ctx.createBufferSource(); noise.buffer = makePinkBuffer(ctx); noise.loop = true;
  var lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 1100; lp.Q.value = 0.4;
  var amb = ctx.createGain(); amb.gain.value = AMB_LEVEL;
  var swell = ctx.createOscillator(); swell.frequency.value = 1 / 16;      // 16 s swell
  var swellDepth = ctx.createGain(); swellDepth.gain.value = AMB_LEVEL * 0.6;
  swell.connect(swellDepth); swellDepth.connect(amb.gain);
  noise.connect(lp); lp.connect(amb); amb.connect(mix);
  noise.start(T0); swell.start(T0); sources.push(noise, swell);

  // --- melody bus (unmodulated) ---
  var melody = ctx.createGain(); melody.gain.value = 1; melody.connect(mix);

  // Chords and bells are scheduled in advance by scheduleAhead().
  var nextChord = 0, nextBell = T0 + 8;
  function scheduleChord(n) {
    var s = T0 + n * CHORD_STEP, e = s + CHORD_LEN;
    var g = ctx.createGain();
    g.gain.setValueAtTime(0, s);
    g.gain.linearRampToValueAtTime(1, s + CHORD_FADE);
    g.gain.setValueAtTime(1, e - CHORD_FADE);
    g.gain.linearRampToValueAtTime(0, e);
    var cleanup = function (o, og) { o.onended = function () { try { o.disconnect(); og.disconnect(); } catch (x) {} }; };
    if (mode === 'am') {
      g.connect(padIn[0]);
      CHORDS[n % CHORDS.length].forEach(function (f) {
        [['sine', 0.14, 0], ['triangle', 0.04, 3]].forEach(function (v) {
          var o = ctx.createOscillator(); o.type = v[0]; o.frequency.value = f; o.detune.value = v[2];
          var og = ctx.createGain(); og.gain.value = v[1];
          o.connect(og); og.connect(g);
          o.start(s); o.stop(e + 0.05); cleanup(o, og);
        });
      });
    } else {
      // Binaural: every note is heard at f - beat/2 in the left ear and f + beat/2 in the right ear.
      var beat = seg(s).hz, gl = ctx.createGain(), gr = ctx.createGain();
      g.connect(gl); g.connect(gr); gl.connect(busL); gr.connect(busR);
      CHORDS[n % CHORDS.length].forEach(function (f) {
        [[-beat / 2, gl], [beat / 2, gr]].forEach(function (side) {
          var o = ctx.createOscillator(); o.type = 'sine'; o.frequency.value = f + side[0];
          var og = ctx.createGain(); og.gain.value = 0.16;
          o.connect(og); og.connect(side[1]);
          o.start(s); o.stop(e + 0.05); cleanup(o, og);
        });
      });
    }
  }
  function scheduleBell(t) {
    var f = BELLS[(Math.random() * BELLS.length) | 0];
    [[1, 1, 5], [2.76, 0.22, 2.2]].forEach(function (p) {
      var o = ctx.createOscillator(); o.type = 'sine'; o.frequency.value = f * p[0];
      var g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.linearRampToValueAtTime(BELL_LEVEL * p[1], t + 0.012);
      g.gain.exponentialRampToValueAtTime(0.0001, t + p[2]);
      o.connect(g); g.connect(melody); o.start(t); o.stop(t + p[2] + 0.1);
      o.onended = function () { try { o.disconnect(); g.disconnect(); } catch (x) {} };
    });
  }
  function scheduleAhead(upTo) {
    while (T0 + nextChord * CHORD_STEP < upTo + 20) scheduleChord(nextChord++);
    while (nextBell < upTo + 20) { scheduleBell(nextBell); nextBell += 6 + Math.random() * 4; }
  }
  scheduleAhead(ctx.currentTime);

  var timer = null;
  if (!opts.offline) timer = setInterval(function () { scheduleAhead(ctx.currentTime); }, 1000);

  function holdFade(p, t) {
    if (p.cancelAndHoldAtTime) { try { p.cancelAndHoldAtTime(t); return; } catch (x) {} }
    var v = p.value; p.cancelScheduledValues(t); p.setValueAtTime(v, t);
  }
  return {
    T0: T0, scheduleAhead: scheduleAhead,
    delayMs: function () { return delay.delayTime.value * 1000; },
    cyclesAt: cyclesAt,
    /* Next step of a schedule: the modulation rate changes at `at` (the phase carries on smoothly). */
    setStage: function (hz, at) {
      at = at != null ? at : ctx.currentTime + 0.05;
      segs.push({ t: at, cyc: cyclesAt(at), hz: hz });
      if (modOsc) modOsc.frequency.setValueAtTime(hz, at);
    },
    setVolume: function (v) { vol.gain.setTargetAtTime(volToGain(v), ctx.currentTime, 0.05); },
    setPhase: function (ms) { delay.delayTime.setTargetAtTime((BASE_DELAY_MS + ms) / 1000, ctx.currentTime, 0.05); },
    fadeOut: function (sec) {
      var t = ctx.currentTime; holdFade(fade.gain, t);
      fade.gain.linearRampToValueAtTime(0, t + sec);
    },
    stop: function () {
      if (timer) clearInterval(timer);
      sources.forEach(function (s) { try { s.stop(); } catch (x) {} });
    }
  };
}

function createContext() {
  if (!AC) return null;
  try { return new AC({ sampleRate: 48000, latencyHint: 'playback' }); }
  catch (e) { try { return new AC(); } catch (e2) { return null; } }
}

/* ======================================================================
   4. UI and session control
   ====================================================================== */
var S = { check: null, checking: false, sess: null };
var wakeLock = null;

function showScreen(name) {
  $('screen-check').hidden = name !== 'check';
  $('screen-ready').hidden = name !== 'ready';
  $('screen-session').hidden = name !== 'session';
  document.body.style.overflow = name === 'session' ? 'hidden' : '';
}

document.querySelectorAll('[data-readouts]').forEach(function (el) {
  el.innerHTML =
    '<div><span class="k">Refresh rate</span><span class="v r-hz">…</span></div>' +
    '<div><span class="k">Frames per cycle</span><span class="v r-n">…</span></div>' +
    '<div><span class="k">Stable frames</span><span class="v r-stable">…</span></div>' +
    '<div><span class="k">Verdict</span><span class="badge r-badge">Checking</span></div>';
});
function setAll(cls, text) { document.querySelectorAll(cls).forEach(function (e) { e.textContent = text; }); }
function setBadge(text, kind) {
  document.querySelectorAll('.r-badge').forEach(function (b) {
    b.textContent = text; b.className = 'badge r-badge' + (kind ? ' ' + kind : '');
  });
}
function setRow(which, kind, badge, detail) {
  var b = $(which + '-badge'); b.textContent = badge; b.className = 'badge ' + kind;
  $(which + '-det').textContent = detail || '';
}
function freqList(arr) { return arr.length > 1 ? arr.slice(0, -1).join(', ') + ' and ' + arr[arr.length - 1] : String(arr[0]); }

function reasonText(c) {
  var need = Math.max(55, 2 * MAX_F);
  if (c.reason === 'NOT_MULTIPLE') {
    var bad = c.stages.filter(function (s) { return !s.ok; }).map(function (s) { return s.hz; });
    var t = FREQS.length === 1
      ? 'Your screen refreshes at ' + fmt1(c.hz) + ' Hz, which is not a whole multiple of ' + FREQS[0] + '. A ' + FREQS[0] + ' Hz flicker cannot be drawn accurately, so the light is disabled. Sound still works.'
      : 'Your screen refreshes at ' + fmt1(c.hz) + ' Hz, which cannot draw ' + freqList(bad) + ' Hz flicker accurately (the refresh rate must be a whole multiple of the flicker rate). The light is disabled. Sound still works.';
    if (c.hz < 2 * MAX_F) t += ' You need a screen running at ' + 2 * MAX_F + ' Hz or faster.';
    return t;
  }
  if (c.reason === 'UNSTABLE')
    return 'Your screen’s refresh rate is changing or frames are being skipped. The light is disabled. Sound still works.';
  if (c.reason === 'TOO_SLOW')
    return 'Your screen is refreshing at only ' + fmt1(c.hz) + ' Hz. The light needs ' + need + ' Hz or faster, so it is disabled. Sound still works.';
  return '';
}

function renderSupport() {
  var c = S.check;
  // Sound row
  if (!AC) setRow('sound', 'bad', 'Not supported', 'This browser cannot play Web Audio. Try Safari or Chrome.');
  else if (EXP.audio.mode === 'binaural') setRow('sound', 'ok', 'Supported', 'Plays on any device. Use stereo headphones: the beat disappears on a speaker.');
  else setRow('sound', 'ok', 'Supported', 'Plays on any device, through speakers or headphones.');
  // Light row
  if (!USES_LIGHT) setRow('light', 'ok', 'Supported', 'Works on any screen. There is no flicker, only a steady soft glow.');
  else if (S.checking || !c) setRow('light', 'wait', 'Checking…', 'Measuring your screen.');
  else if (c.pass) {
    var fr = c.stages.map(function (s) { return s.k; }).join(', ');
    setRow('light', 'ok', SIM ? 'Supported (simulated)' : 'Supported',
      (FREQS.length === 1 ? 'Each cycle is ' + c.k + ' frames' : 'Frames per cycle: ' + fr) + ' on your ' + fmt1(c.hz) + ' Hz screen.');
  } else setRow('light', 'bad', 'Not supported', reasonText(c));
}

function renderCheck() {
  renderSupport();
  if (!USES_LIGHT) { updateButtons(); return; }
  var c = S.check;
  $('screen-card').hidden = false;
  if (S.checking || !c) {
    setAll('.r-hz', '…'); setAll('.r-n', '…'); setAll('.r-stable', '…'); setBadge('Checking', '');
    $('verdict-title').textContent = 'Checking…';
    $('verdict-text').textContent = 'Measuring your screen. Keep the page open.';
    $('screen-card').className = 'card'; $('tips-card').hidden = true; $('ios-chrome').hidden = true;
  } else {
    setAll('.r-hz', fmt1(c.hz) + ' Hz' + (c.label ? ' ≈' + c.label : ''));
    setAll('.r-n', FREQS.length === 1 ? c.N.toFixed(2)
      : c.stages.map(function (s) { return s.ok ? s.k : s.N.toFixed(2); }).join(' / '));
    setAll('.r-stable', fmt1(c.stablePct) + '%' + (c.drifted ? ', drifting' : ''));
    if (c.pass) {
      setBadge(SIM ? 'Ready (simulated)' : 'Ready', 'ok');
      $('verdict-title').textContent = FREQS.length === 1 ? 'Your screen can show ' + FREQS[0] + ' Hz light' : 'Your screen can show this light pattern';
      $('verdict-text').textContent = FREQS.length === 1
        ? 'Each flicker cycle is exactly ' + c.k + ' frames (' + fmt1(c.hz) + ' Hz screen). The light and the sound are both available.'
        : 'Every step divides evenly into your ' + fmt1(c.hz) + ' Hz screen. The light and the sound are both available.';
      $('screen-card').className = 'card pass'; $('tips-card').hidden = true; $('ios-chrome').hidden = true;
    } else {
      setBadge('Not supported', 'bad');
      $('verdict-title').textContent = 'Light not available on this screen';
      $('verdict-text').textContent = reasonText(c);
      $('screen-card').className = 'card fail';
      $('tips-card').hidden = false;
      $('ios-chrome').hidden = !IS_IOS_CHROME;
      $('tips-ios').open = IS_IOS; $('tips-android').open = IS_ANDROID;
      if (!IS_IOS && !IS_ANDROID) { $('tips-ios').open = true; $('tips-android').open = true; }
    }
  }
  updateButtons();
}

function updateButtons() {
  var busy = !!S.sess;
  $('btn-sound').disabled = busy || !AC;
  if (!USES_LIGHT) return;
  var c = S.check, ok = !!(c && c.pass && !S.checking && !SIM);
  var checked = $('safety').checked;
  $('btn-both').disabled = !(ok && checked && !busy);
  $('btn-recheck').disabled = S.checking || busy;
  var hint = '';
  if (SIM) hint = 'Light is off in simulate mode.';
  else if (S.checking || !c) hint = 'Checking your screen…';
  else if (!c.pass) hint = 'Light is off because the screen check did not pass.';
  else if (!checked) hint = 'Tick the safety box above to turn on the light.';
  $('both-hint').textContent = hint;
}

async function runCheck() {
  if (!USES_LIGHT) return;
  var my = ++checkToken;
  S.checking = true; renderCheck();
  var m;
  if (SIM) {
    m = { hz: SIM, frameMs: 1000 / SIM, stablePct: 100, drifted: false };   // fake measurement
    await new Promise(function (r) { setTimeout(r, 900); });
  } else {
    m = await measureRefresh(my);
  }
  if (my !== checkToken || !m) return;                // superseded or aborted
  S.check = SUP.evaluateRefresh(m.hz, m.stablePct, m.drifted, FREQS);
  S.check.frameMs = m.frameMs;
  S.checking = false;
  if (!S.sess) showScreen('ready');
  renderCheck();
  return S.check;
}

// --- settings wiring ---
if (USES_LIGHT) {
  $('intensity').addEventListener('input', function () {
    $('intensity-out').textContent = this.value + '%'; setIntensity(+this.value);
  });
  $('safety').addEventListener('change', updateButtons);
  $('btn-recheck').addEventListener('click', function () { runCheck(); });
  $('btn-both').addEventListener('click', function () { startSession('both'); });
}
$('volume').addEventListener('input', function () {
  $('volume-out').textContent = this.value + '%';
  if (S.sess && S.sess.audio) S.sess.audio.setVolume(+this.value);
});
$('phase').addEventListener('input', function () {
  var v = +this.value; $('phase-out').textContent = (v > 0 ? '+' : '') + v + ' ms';
  if (S.sess && S.sess.audio) S.sess.audio.setPhase(v);
});
$('btn-sound').addEventListener('click', function () { startSession('sound'); });
$('btn-stop').addEventListener('click', function () { endSession('stopped'); });
$('btn-retry').addEventListener('click', function () { retryInSession(); });
if (SIM) $('sim-banner').hidden = false;

/* ---------- Session ---------- */
function showOverlay() {
  var ov = $('overlay'); ov.classList.add('show');
  clearTimeout(showOverlay.t);
  showOverlay.t = setTimeout(function () { ov.classList.remove('show'); }, 5000);
}
$('screen-session').addEventListener('pointerdown', function (e) {
  if (!$('overlay').classList.contains('show')) { e.preventDefault(); showOverlay(); }
  else showOverlay();
});
document.addEventListener('keydown', function (e) {
  if (!S.sess) return;
  if (e.key === 'Escape') endSession('stopped'); else showOverlay();
});

function fmtTime(ms) {
  var s = Math.max(0, Math.ceil(ms / 1000)), m = Math.floor(s / 60);
  return (m < 10 ? '0' : '') + m + ':' + (s % 60 < 10 ? '0' : '') + (s % 60);
}

async function acquireWake() {
  var note = $('wake-note');
  if (!('wakeLock' in navigator)) { note.hidden = false; return; }
  try {
    wakeLock = await navigator.wakeLock.request('screen');
    wakeLock.addEventListener('release', function () { wakeLock = null; });
    note.hidden = true;
  } catch (e) { note.hidden = false; }
}
function releaseWake() {
  if (wakeLock) { try { wakeLock.release(); } catch (e) {} wakeLock = null; }
}

function setBanner(text, showRetry) {
  $('banner-text').textContent = text;
  $('btn-retry').hidden = !showRetry;
  $('banner').hidden = !text;
}

/* Align the first light cycle of a step with the sound's cycle using the audio clock, so the two start
   roughly in step. (The offset slider handles any remaining speaker delay.) */
function makeAligner(ctx, audio) {
  return function (tFrame, frameMs, k) {
    try {
      var ts = ctx.getOutputTimestamp();
      if (ctx.state !== 'running' || !ts || !ts.performanceTime) return 0;
      var heard = ts.contextTime + (tFrame - ts.performanceTime) / 1000 - audio.delayMs() / 1000;
      var frac = audio.cyclesAt(heard); frac = frac - Math.floor(frac);
      return Math.round(frac * k) % k;
    } catch (e) { return 0; }
  };
}

function stageIndexAt(frac) {
  var acc = 0;
  for (var i = 0; i < STAGES.length; i++) { acc += STAGES[i].frac; if (frac < acc - 1e-9) return i; }
  return STAGES.length - 1;
}

function startLight(s) {
  var c = S.check, st = c.stages[s.stageIdx];
  flickerStart(STAGES[s.stageIdx].hz, st.k, c.frameMs, s.ctx && s.audio ? makeAligner(s.ctx, s.audio) : null, EXP.wave || (FREQS.some(function (f) { return f < 8; }) ? 'smooth' : 'square'));
  setBanner('', false);
  s.flicker = true;
}

function applyStage(s, idx) {
  s.stageIdx = idx;
  var hz = STAGES[idx].hz;
  if (s.audio) s.audio.setStage(hz);
  if (s.flicker && FL.active && S.check && S.check.pass) flickerSetStage(hz, S.check.stages[idx].k);
}

function startSession(mode) {
  if (S.sess) return;
  // The light can never start unless the check passed AND the safety box is ticked.
  if (mode === 'both' && !(USES_LIGHT && S.check && S.check.pass && !S.checking && !SIM && $('safety').checked)) return;

  // Audio MUST be created/resumed synchronously inside the tap (iPhone). Also play a short silent
  // buffer in the same tap to unlock output.
  var ctx = createContext(), audio = null;
  if (ctx) {
    try {
      if (ctx.state === 'suspended') ctx.resume();
      var sb = ctx.createBuffer(1, 1, 22050), ss = ctx.createBufferSource();
      ss.buffer = sb; ss.connect(ctx.destination); ss.start(0);
      audio = buildAudio(ctx, { volume: +$('volume').value, phaseMs: +$('phase').value, fadeIn: 10,
        mode: EXP.audio.mode, pulses: !!EXP.audio.pulses, hz: STAGES[0].hz });
    } catch (e) { audio = null; }
  }

  ++checkToken;                       // abort any measurement in progress
  var minutes = +document.querySelector('input[name=dur]:checked').value;
  var s = S.sess = {
    mode: mode, ctx: ctx, audio: audio, flicker: false, ended: false, stageIdx: 0, minutes: minutes,
    startAt: performance.now(), endAt: performance.now() + minutes * 60000, fadedOut: false, tick: 0, chip: 0
  };
  document.body.classList.add('in-session');
  setIntensity(USES_LIGHT ? +$('intensity').value : 40);
  FL.state = 'off'; writeOpacity(steadyLevel());
  setBanner('', false);
  showScreen('session'); showOverlay();
  updateButtons();
  acquireWake();

  FL.onPause = function (reason) {
    setBanner(reason === 'hidden'
      ? 'Flicker paused because the page was hidden. Tap Retry check to bring the light back.'
      : 'Flicker paused because the screen timing was unreliable. Audio continues.', true);
  };

  s.tick = setInterval(function () {
    var now = performance.now(), left = s.endAt - now;
    $('timer').textContent = fmtTime(left);
    var idx = stageIndexAt(Math.min(0.9999, (now - s.startAt) / (s.minutes * 60000)));
    if (idx !== s.stageIdx && !s.fadedOut) applyStage(s, idx);
    if (left <= 10000 && !s.fadedOut) {        // 10 s fade out at the end
      s.fadedOut = true;
      if (s.audio) s.audio.fadeOut(Math.max(1, left / 1000));
      if (s.flicker) flickerPause('end');
      setBanner('', false);
    }
    if (left <= 0) endSession('timer');
  }, 250);
  $('timer').textContent = fmtTime(s.endAt - performance.now());
  s.chip = setInterval(updateChip, 500); updateChip();

  var go = function () {
    if (S.sess !== s || s.ended) return;
    if (mode === 'both') startLight(s);
  };
  if (ctx && ctx.state !== 'running') { ctx.resume().then(go, go); } else go();
}

function updateChip() {
  var s = S.sess; if (!s) return;
  var chip = $('chip');
  if (!USES_LIGHT) { chip.textContent = 'Playing: ' + EXP.soundText.split(':')[0]; return; }
  if (s.mode === 'sound') { chip.textContent = 'Sound only. Light is off.'; return; }
  if (!s.flicker) { chip.textContent = 'Starting the light…'; return; }
  if (FL.state === 'paused' || (!FL.active && FL.state !== 'running')) {
    chip.textContent = 'Light paused. Audio continues.'; return;
  }
  var f = achievedHz(), screenHz = S.check ? Math.round(S.check.hz) : 0;
  var step = STAGES.length > 1 ? ', step ' + (s.stageIdx + 1) + ' of ' + STAGES.length : '';
  if (f == null) { chip.textContent = 'Starting the light…' + step; return; }
  var ok = Math.abs(f - FL.f) <= Math.max(0.5, FL.f * 0.02);
  chip.textContent = (ok ? 'Verified ' : 'Measuring ') + fmt1(f) + ' Hz on a ' + screenHz + ' Hz screen, ' + FL.dropped + ' dropped frames' + step;
}

async function retryInSession() {
  var s = S.sess; if (!s || s.mode !== 'both') return;
  setBanner('Checking the screen again…', false);
  flickerSteadyNow();
  var my = ++checkToken;
  var m = await measureRefresh(my);
  if (!S.sess || S.sess !== s || my !== checkToken || !m) {
    if (S.sess === s) setBanner('Could not check the screen. Keep the page open and try again.', true);
    return;
  }
  S.check = SUP.evaluateRefresh(m.hz, m.stablePct, m.drifted, FREQS); S.check.frameMs = m.frameMs;
  renderCheck();
  if (S.check.pass && !s.fadedOut) startLight(s);
  else setBanner('The light stays off. ' + reasonText(S.check).replace(' Sound still works.', ' Audio continues.'), true);
}

function endSession(reason) {
  var s = S.sess; if (!s || s.ended) return;
  s.ended = true;
  clearInterval(s.tick); clearInterval(s.chip); clearTimeout(showOverlay.t);
  flickerSteadyNow();                               // light: steady glow at once
  FL.onPause = null;
  if (s.audio) {                                    // audio: fade out, then tear down
    var fast = reason === 'timer';
    try { if (!s.fadedOut) s.audio.fadeOut(fast ? 0.3 : 1.5); } catch (e) {}
    setTimeout(function () {
      try { s.audio.stop(); } catch (e) {}
      try { s.ctx.close(); } catch (e) {}
    }, fast ? 500 : 1800);
  }
  releaseWake();
  S.sess = null;
  document.body.classList.remove('in-session');
  if (USES_LIGHT) $('safety').checked = false;      // ask again every session
  var note = $('done-note');
  note.textContent = reason === 'timer'
    ? 'Session finished. Take a moment before you get up.'
    : 'Session stopped.';
  note.hidden = false;
  showScreen('ready');
  renderCheck();
  runCheck();                                       // measure again for the next session
}

/* ---------- Page visibility ---------- */
document.addEventListener('visibilitychange', function () {
  var s = S.sess;
  if (document.hidden) {
    if (s) { if (FL.state === 'running') flickerPause('hidden'); }
    else ++checkToken;                              // abort a measurement; it restarts when visible
  } else {
    if (s) {
      if (s.ctx && s.ctx.state === 'suspended') s.ctx.resume();
      acquireWake();
      showOverlay();
    } else {
      runCheck();                                   // re-run the check when the page returns
    }
  }
});

/* Test hooks: pure functions and read-only state, no way to bypass the check. */
window.__h40 = {
  exp: EXP, evaluateRefresh: SUP.evaluateRefresh, buildAudio: buildAudio, makePulseBuffer: makePulseBuffer,
  achievedHz: achievedHz, state: function () { return { FL: FL, S: S }; }
};

/* ---------- Start: automatic check on load. Nothing else starts by itself. ---------- */
setIntensity(40);
if (USES_LIGHT) { showScreen('check'); runCheck(); }
else { showScreen('ready'); renderCheck(); }
})();
