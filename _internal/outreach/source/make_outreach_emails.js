#!/usr/bin/env node
// Generates the B2B cold-outreach email templates in _internal/outreach/email-templates/.
// The copy lives in netlify/functions/_lib/outreach-template.js (shared with the admin Outreach tab).
//
//   node _internal/outreach/source/make_outreach_emails.js
//
// Edit the copy in the shared module, re-run this,
// and every file (master, industry emails, plain-text versions, composer) is rebuilt.
// No dependencies.

'use strict';
const fs = require('fs');
const path = require('path');

const OUT = path.join(__dirname, '..', 'email-templates');
fs.mkdirSync(OUT, { recursive: true });

const { CATEGORIES, STANDARD_TILES, C, SANS, email, plainText } = require(path.join(__dirname, '..', '..', '..', 'netlify', 'functions', '_lib', 'outreach-template.js'));
const N = require(path.join(__dirname, '..', '..', '..', 'netlify', 'functions', '_lib', 'outreach-template.js')).N;

// ---- composer page: pick an industry, fill in the business, copy into Gmail
function composer() {
  const data = JSON.stringify(CATEGORIES.map(c => ({ id: c.id, label: c.label, subjects: c.subjects, html: email(c), text: plainText(c) })));
  return `<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Purebaric outreach email composer</title>
<style>
:root{--ink:${C.ink};--muted:${C.muted};--cream:${C.cream};--cream2:${C.cream2};--terra:${C.terra};--terra-d:${C.terraD};--terra-bg:${C.terraBg};--line:${C.line};--card:${C.card}}
*{box-sizing:border-box}
body{margin:0;background:var(--cream2);font-family:Inter,${SANS};color:var(--ink);line-height:1.5}
.top{position:sticky;top:0;z-index:2;background:var(--ink);color:#f7f2ea;padding:14px 18px;display:flex;gap:12px;align-items:center;flex-wrap:wrap}
.top strong{font-size:15px;margin-right:auto}
.top button,.top a.btn{background:var(--terra);color:#fff;border:0;border-radius:8px;padding:11px 18px;font-size:14px;font-weight:700;cursor:pointer;text-decoration:none}
.top button.ghost{background:transparent;border:1px solid rgba(255,255,255,.4)}
.top #msg{font-size:13px;color:#e6dac8;width:100%}
.layout{display:grid;grid-template-columns:360px 1fr;gap:0;min-height:calc(100vh - 62px)}
.side{background:var(--card);border-right:1px solid var(--line);padding:22px 20px}
.side h2{font-size:13px;letter-spacing:.14em;text-transform:uppercase;color:var(--terra-d);margin:0 0 14px}
label{display:block;font-size:13px;font-weight:600;margin:14px 0 5px}
input,select,textarea{width:100%;font:inherit;font-size:15px;padding:10px 12px;border:1px solid var(--line);border-radius:8px;background:#fff;color:var(--ink)}
textarea{min-height:84px;resize:vertical}
.hint{font-size:12.5px;color:var(--muted);margin-top:5px}
.subjects{margin-top:18px}
.subj{display:flex;gap:8px;align-items:flex-start;background:var(--terra-bg);border-radius:8px;padding:9px 10px;margin-bottom:8px;font-size:13.5px}
.subj button{flex:none;background:#fff;border:1px solid var(--line);border-radius:6px;padding:4px 8px;font-size:12px;cursor:pointer;color:var(--terra-d);font-weight:700}
.preview{padding:0;background:var(--cream2)}
iframe{width:100%;height:calc(100vh - 62px);border:0;display:block}
.warn{background:#fff6e5;border:1px solid #f1d7a3;border-radius:8px;padding:9px 11px;font-size:12.5px;margin-top:16px;color:#6b4e12}
@media(max-width:860px){.layout{grid-template-columns:1fr}.side{border-right:0;border-bottom:1px solid var(--line)}iframe{height:900px}}
</style></head>
<body>
<div class="top">
  <strong>Purebaric outreach email</strong>
  <button id="copyHtml">Copy email for Gmail</button>
  <button id="copyText" class="ghost">Copy plain text</button>
  <button id="dl" class="ghost">Download .html</button>
  <span id="msg">Pick an industry, fill in the business, then copy and paste into a new Gmail message. Attach purebaric_facility_prospectus.pdf.</span>
</div>
<div class="layout">
  <aside class="side">
    <h2>Personalize</h2>
    <label for="cat">Industry</label>
    <select id="cat"></select>
    <label for="first">First name</label>
    <input id="first" placeholder="[First name]" autocomplete="off">
    <label for="biz">Business name</label>
    <input id="biz" placeholder="[Business name]" autocomplete="off">
    <label for="note">Personal note (one sentence, optional)</label>
    <textarea id="note" placeholder="One sentence you know to be true about this business. Leave blank if you are not certain."></textarea>
    <div class="hint">Only something you have seen yourself: their website, a review you read, a visit. Never a guess. Leave blank to omit.</div>
    <div class="subjects">
      <h2>Subject lines</h2>
      <div id="subjects"></div>
    </div>
    <div class="warn" id="warn" hidden>Fill in the first name and business name before copying. Unfilled tokens are highlighted in the preview.</div>
  </aside>
  <main class="preview"><iframe id="frame" title="Email preview"></iframe></main>
</div>
<div id="stage" style="position:absolute;left:-9999px;top:0;width:600px;"></div>
<script>
var DATA=${data};
var $=function(id){return document.getElementById(id)};
var sel=$('cat');DATA.forEach(function(c,i){var o=document.createElement('option');o.value=i;o.textContent=c.label;sel.appendChild(o)});
try{var saved=JSON.parse(localStorage.getItem('pb-outreach')||'{}');if(saved.cat!=null)sel.value=saved.cat;if(saved.first)$('first').value=saved.first;if(saved.biz)$('biz').value=saved.biz;if(saved.note)$('note').value=saved.note}catch(e){}
function vals(){return {cat:sel.value,first:$('first').value.trim(),biz:$('biz').value.trim(),note:$('note').value.trim()}}
function fill(s,v,mark){
  var first=v.first||(mark?'<mark>[First name]</mark>':'[First name]');
  var biz=v.biz||(mark?'<mark>[Business name]</mark>':'[Business name]');
  var note=v.note?(/[.!?]$/.test(v.note)?v.note:v.note+'.'):'';
  s=s.split('[Personal note] ').join(note?note+' ':'');
  s=s.split('[Personal note]').join(note);
  s=s.split(encodeURIComponent('[Business name]')).join(encodeURIComponent(v.biz||'[Business name]'));
  return s.split('[First name]').join(first).split('[Business name]').join(biz);
}
function render(){
  var v=vals(),c=DATA[v.cat];
  try{localStorage.setItem('pb-outreach',JSON.stringify(v))}catch(e){}
  $('frame').srcdoc=fill(c.html,v,true);
  var sj=$('subjects');sj.innerHTML='';
  c.subjects.forEach(function(s){var d=document.createElement('div');d.className='subj';var t=document.createElement('span');t.textContent=fill(s,v,false);var b=document.createElement('button');b.textContent='Copy';b.onclick=function(){navigator.clipboard.writeText(t.textContent).then(function(){say('Subject copied.')})};d.appendChild(t);d.appendChild(b);sj.appendChild(d)});
  $('warn').hidden=!!(v.first&&v.biz);
}
function say(m){$('msg').textContent=m}
function bodyHtml(){var v=vals(),c=DATA[v.cat];var m=fill(c.html,v,false).match(/<body[^>]*>([\\s\\S]*)<\\/body>/);return m?m[1]:''}
function bodyText(){var v=vals(),c=DATA[v.cat];return fill(c.text,v,false).replace(/^Subject:.*\\n(Alt subjects:.*\\n)?\\n?/,'')}
['cat','first','biz','note'].forEach(function(id){$(id).addEventListener('input',render)});
$('copyHtml').onclick=async function(){
  var v=vals();if(!v.first||!v.biz){say('Fill in the first name and business name first.');$('warn').hidden=false;return}
  var stage=$('stage');stage.innerHTML=bodyHtml();var ok=false;
  try{await navigator.clipboard.write([new ClipboardItem({'text/html':new Blob([stage.innerHTML],{type:'text/html'}),'text/plain':new Blob([bodyText()],{type:'text/plain'})})]);ok=true}
  catch(e){var r=document.createRange();r.selectNodeContents(stage);var s=getSelection();s.removeAllRanges();s.addRange(r);ok=document.execCommand('copy');s.removeAllRanges()}
  say(ok?'Copied. Click into a new Gmail message and paste, then set the subject and attach the prospectus.':'Copy failed. Use Download .html and open it in a browser, then select all and copy.');
};
$('copyText').onclick=async function(){var v=vals();if(!v.first||!v.biz){say('Fill in the first name and business name first.');return}await navigator.clipboard.writeText(bodyText());say('Plain text copied.')};
$('dl').onclick=function(){var v=vals(),c=DATA[v.cat];var html=fill(c.html,v,false);var a=document.createElement('a');a.href=URL.createObjectURL(new Blob([html],{type:'text/html'}));a.download='purebaric-'+c.id+'-'+(v.biz||'template').toLowerCase().replace(/[^a-z0-9]+/g,'-')+'.html';a.click()};
render();
</script>
</body></html>
`;
}

// ---- write everything
const written = [];
const master = email({
  id: 'master', label: 'Master template', eyebrow: 'A new profit line for [kind of business]', subjects: ['[Subject: the extra monthly net for [Business name], or the space it takes]'], preheader: '[Preheader: the proof people already pay for it nearby, and the monthly net]',
  headline: 'One chamber in a 4 x 8 ft corner nets [Business name] an estimated ' + N.net + ' a month',
  opener: '[Opener: where their clients pay for this today, that the revenue stays with them, and that it takes a 4 x 8 ft corner. Name [Business name].]',
  whyLine: '[One line: who books it at this kind of business and how it sells (packs, memberships, paired with a visit).]',
  tiles: STANDARD_TILES,
});
fs.writeFileSync(path.join(OUT, '00_master_template.html'), master); written.push('00_master_template.html');
for (const c of CATEGORIES) {
  fs.writeFileSync(path.join(OUT, `${c.id}.html`), email(c)); written.push(`${c.id}.html`);
  fs.writeFileSync(path.join(OUT, `${c.id}.txt`), plainText(c)); written.push(`${c.id}.txt`);
}
fs.writeFileSync(path.join(OUT, 'composer.html'), composer()); written.push('composer.html');
console.log('wrote', written.length, 'files to', OUT, '|', N);
