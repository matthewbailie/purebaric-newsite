#!/usr/bin/env node
// Generates the B2B cold-outreach email templates in _internal/outreach/email-templates/.
//
//   node _internal/outreach/source/make_outreach_emails.js
//
// One master template + one content block per industry. Edit the copy here, re-run,
// and every file (master, industry emails, plain-text versions, composer) is rebuilt.
// No dependencies.

'use strict';
const fs = require('fs');
const path = require('path');

const OUT = path.join(__dirname, '..', 'email-templates');
fs.mkdirSync(OUT, { recursive: true });

// ---- the numbers, in one place (same assumptions as make_prospectus.py and business.html)
const PRICE = 75, RENT = 979, SUPPLY = 1.30, FEE = 500, DAYS = 26;
const money = n => '$' + Math.round(n).toLocaleString('en-US');
const scen = perDay => { const n = perDay * DAYS; const gross = n * PRICE; return { n, gross, net: gross - RENT - n * SUPPLY }; };
const LIGHT = scen(2), MOD = scen(4);
const BREAKEVEN = Math.ceil(RENT / (PRICE - SUPPLY));
const N = {
  rent: money(RENT), net: money(MOD.net), netLight: money(LIGHT.net), netYear: '$' + (Math.round(MOD.net * 12 / 1000)) + ',000',
  breakeven: BREAKEVEN, fee: money(FEE), supply: '$' + SUPPLY.toFixed(2), sessionsMod: MOD.n,
};

// ---- brand (warm.css tokens)
const C = { ink: '#2b2320', muted: '#6f635b', cream: '#f7f2ea', cream2: '#efe7db', terra: '#b8654d', terraD: '#9a4f3a', terraBg: '#f4e7df', line: '#e6dccd', card: '#fffdf9', soft: '#e6dac8' };
const SANS = "-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";
const SITE = 'https://purebaric.com';
const PHONE = '(801) 901-0873', TEL = '+18019010873', EMAIL = 'hello@purebaric.com';

// The proof of demand, used in every revenue email: people are already paying for this nearby.
const DEMAND = 'Recovery studios in Lehi, Orem, and Salt Lake City charge $79 to $129 for a 60-minute session and sell 20-packs for $1,400 to $2,580.';

// Standard money tiles (hero + three). Teams get their own set.
const STANDARD_TILES = {
  hero: { k: 'Estimated net revenue', v: N.net, unit: 'per month', p: `at four sessions a day, after rental and supplies. Two a day nets about ${N.netLight}.` },
  small: [
    { k: 'Your cost', v: N.rent, unit: 'per month', p: 'to rent, on a 12-month term' },
    { k: 'Break-even', v: `${N.breakeven} sessions`, unit: '', p: 'a month, about one every other day you are open' },
    { k: 'Space needed', v: '5 x 8 ft', unit: '', p: 'of floor space and a wall outlet' },
  ],
};

// ---- the industries. Tokens: [First name], [Business name], [Personal note]
const CATEGORIES = [
  {
    id: 'gyms-and-fitness',
    label: 'Gyms and fitness centers',
    eyebrow: 'For gyms and fitness centers',
    subjects: [
      'Your members are paying $79 an hour for this across town',
      'A recovery room for [Business name] in 5 x 8 ft',
      '14 sessions a month to break even on a hyperbaric chamber',
    ],
    preheader: `Members already drive to recovery studios and pay $79 to $129 a session. Put it where they train. One chamber nets an estimated ${N.net} a month.`,
    headline: 'Recovery your members already pay for, on your floor instead of across town',
    opener: 'Your members train hard at [Business name], and the ones who take recovery seriously are already driving to a recovery studio for it. A mild hyperbaric chamber in a 5 x 8 ft corner keeps that spend, and that visit, inside your gym, and gives you revenue that is not dues.',
    whoTitle: 'Who books at a gym, and why',
    why: `${DEMAND} Your members are the people buying those packs. A 60-minute session is quiet time on a rest day: lie down, nap, scroll, and leave. It is a reason to come in on the days they do not train.`,
    who: [
      'Members who train hard and already spend on recovery: massage, sauna, compression boots.',
      'Weekend competitors, race-season runners, and masters athletes between hard weeks.',
      'Personal-training clients whose trainer builds recovery into their plan.',
    ],
    fitTitle: 'How it fits your membership',
    fit: 'Sell single sessions at the front desk, bundle 10- and 20-session packs, or add sessions to a premium membership tier. You set the prices and keep the revenue.',
    cta: 'Worth 15 minutes to see if it fits [Business name]?',
    tiles: STANDARD_TILES,
  },
  {
    id: 'crossfit-and-performance',
    label: 'CrossFit and performance gyms',
    eyebrow: 'For CrossFit and performance gyms',
    subjects: [
      'Recovery for the athletes at [Business name] who train five days a week',
      'A hyperbaric chamber on the floor at [Business name], no purchase',
      '14 sessions a month to break even on a hyperbaric chamber',
    ],
    preheader: `Your five-day-a-week athletes already pay $79 to $129 a session for hyperbaric across town. One chamber nets an estimated ${N.net} a month.`,
    headline: 'Recovery your athletes will book between training blocks',
    opener: 'Your athletes at [Business name] train five or more days a week and feel it. A mild hyperbaric chamber on the floor gives them 60 quiet minutes to recover from the week, and gives you a new amenity to sell without adding a coach, a class, or square footage you do not have.',
    whoTitle: 'Who books at a performance gym, and why',
    why: `${DEMAND} Your competitive members are already in those studios. A session is 60 minutes lying down at 1.5 ATA, breathing 95 to 99.9% oxygen, and it slots in after a heavy day or during a deload. It is the recovery tool they ask about and go elsewhere to find.`,
    who: [
      'Competitive athletes in a heavy block or prepping for the Open, a comp, or a race.',
      'Members training five or more days a week who already pay for recovery somewhere else.',
      'Clients in your performance, sports-prep, or masters programs.',
    ],
    fitTitle: 'How it fits your programming',
    fit: 'Offer it as an add-on to unlimited memberships, sell comp-prep session packs, or run it as a members-only perk at a flat monthly rate. You set the prices and keep the revenue.',
    cta: 'Worth 15 minutes to see if it fits [Business name]?',
    tiles: STANDARD_TILES,
  },
  {
    id: 'sports-teams-and-athletics',
    label: 'Sports teams and athletic programs',
    eyebrow: 'For sports teams and athletic programs',
    subjects: [
      'A hyperbaric chamber in the [Business name] training room this season, no capital purchase',
      'Stop sending athletes across town for hyperbaric sessions',
      'Recovery station for [Business name]: 5 x 8 ft, $979 a month, serviced',
    ],
    preheader: 'A 1.5 ATA mild hyperbaric chamber in your training room, installed, staff trained, and serviced, for $979 a month. No procurement cycle, no maintenance contract.',
    headline: 'A hyperbaric chamber in your training room this season, without a capital purchase',
    opener: 'Your athletes at [Business name] ask for hyperbaric, and the answer today is usually a clinic across town or a six-figure hard-shell chamber that has to clear procurement. A Purebaric chamber in your training room gives them 60-minute sessions on their own schedule, on a monthly rental your department can approve, and we service it.',
    whoTitle: 'Who uses it, and why',
    why: 'Athletes use mild hyperbaric as a recovery session between games, travel, and heavy training weeks: 60 minutes lying down at 1.5 ATA, breathing 95 to 99.9% oxygen, phone in hand. One chamber runs up to 8 sessions in a 10-hour day, so a roster can rotate through it over a week.',
    who: [
      'Athletes in season, recovering between games and road trips.',
      'Athletes in heavy training blocks, pre-season and off-season.',
      'Athletes you currently send to a clinic across town for sessions.',
    ],
    fitTitle: 'How it fits your training room',
    fit: 'Run it like any other recovery station. Your athletic trainers start and end each session; we train them in person and leave a written runbook. It is a general-wellness amenity, not a medical device, and the consent templates describe it that way.',
    cta: 'Worth 15 minutes to see if it fits your training room?',
    intro: 'Purebaric is a Lehi company. I rent 1.5 ATA mild hyperbaric chambers to homes across the Wasatch Front, and I place the same chambers in businesses and athletic programs. I deliver and install the chamber, train your athletic trainers, and service it myself. If something stops working, I fix it.',
    handle: [
      ['Delivery and install', 'in your training room, in days.'],
      ['Athletic trainer training and a runbook', 'so your staff runs sessions with confidence and can train new hires.'],
      ['Consent-form templates and an athlete information sheet', 'ready for your intake process.'],
      ['Equipment service and ongoing support.', 'No maintenance contract. If something stops working, we fix it.'],
      ['What it asks of you:', 'a 5 x 8 ft spot, a wall outlet, and about 15 minutes of staff time per session.'],
    ],
    tiles: {
      hero: { k: 'Your cost', v: N.rent, unit: 'per month', p: `for the chamber and machine on a 12-month term, plus a one-time ${N.fee} for delivery, installation, training, and initial supplies. Service included.` },
      small: [
        { k: 'Capacity', v: 'Up to 8', unit: 'sessions', p: 'in a 10-hour day, one athlete at a time' },
        { k: 'Session', v: '60 min', unit: '', p: 'at 1.5 ATA, breathing 95 to 99.9% oxygen' },
        { k: 'Space needed', v: '5 x 8 ft', unit: '', p: 'of floor space and a wall outlet' },
      ],
    },
  },
  {
    id: 'recovery-studios-and-med-spas',
    label: 'Recovery studios and med spas',
    eyebrow: 'For recovery studios and med spas',
    subjects: [
      'How often does someone ask [Business name] for hyperbaric?',
      'Hyperbaric on the [Business name] menu, no purchase, in 5 x 8 ft',
      '14 sessions a month to break even on a hyperbaric chamber',
    ],
    preheader: `Studios across the Wasatch Front already charge $79 to $129 a session for hyperbaric. Add it without buying a chamber. One chamber nets an estimated ${N.net} a month.`,
    headline: 'The service your clients ask for and go elsewhere to find',
    opener: 'Your clients at [Business name] already book cold plunge, sauna, cryo, or IV, and some of them are asking whether you have hyperbaric. A mild hyperbaric chamber fits in the space of a twin bed and goes on your menu without buying a chamber, servicing a machine, or guessing whether it will sell.',
    whoTitle: 'Who books at a recovery studio, and why',
    why: `${DEMAND} Those studios are your competitors, and the clients paying them are your clients. A session is 60 minutes lying down at 1.5 ATA, breathing 95 to 99.9% oxygen, and it pairs naturally with a plunge or a drip.`,
    who: [
      'Clients already buying sauna, cold plunge, massage, or IV.',
      'Members on a recovery membership who would make a chamber their weekly session.',
      'Clients who ask whether you offer hyperbaric and book it somewhere else.',
    ],
    fitTitle: 'How it fits your menu',
    fit: 'Add it as a standalone service, bundle it with cold plunge or IV, and include it in your top membership tier. You set the prices and keep the revenue; our estimates use $75 a session, below the local single-session rate.',
    cta: 'Worth 15 minutes to see if it fits [Business name]?',
    tiles: STANDARD_TILES,
  },
  {
    id: 'physical-therapy-and-sports-medicine',
    label: 'Physical therapy, chiropractic, and sports medicine',
    eyebrow: 'For physical therapy, chiropractic, and sports medicine clinics',
    subjects: [
      'A cash-pay wellness service for [Business name], no billing codes',
      'What your discharged patients could keep coming in for',
      '14 sessions a month to break even on a hyperbaric chamber',
    ],
    preheader: `A self-pay wellness session patients book before or after a visit. No claims, no codes, run by the staff you have. One chamber nets an estimated ${N.net} a month.`,
    headline: 'A cash-pay wellness service your patients can book around their visits',
    opener: 'Patients at [Business name] walk in already focused on recovery, and the active ones are paying a recovery studio for hyperbaric on top of what they pay you. A mild hyperbaric chamber in a 5 x 8 ft room gives them a self-pay wellness session before or after a visit: no claims, no codes, no new hire, and revenue that does not depend on a payer.',
    whoTitle: 'Who books at a clinic, and why',
    why: `${DEMAND} Your athletes and active patients are the ones buying those packs. Clinics already run cash-pay wellness lines beside care, such as compression boots, red light, and massage; this is another one, with a clear line between it and treatment.`,
    who: [
      'Active patients and athletes you already see, who want a wellness session alongside their visits.',
      'Patients who finish a plan of care and want a reason to keep coming in.',
      'Staff and family of patients who hear about it at the front desk.',
    ],
    fitTitle: 'How it fits your practice',
    fit: 'Offer it as a cash-pay general-wellness service with single sessions and packs. It is not a medical treatment, and the consent templates and marketing language we provide describe it that way, so it sits beside your clinical services without blurring them. Have your counsel review the templates and confirm coverage with your insurer, as you would for any wellness line.',
    cta: 'Worth 15 minutes to see if it fits [Business name]?',
    tiles: STANDARD_TILES,
  },
  {
    id: 'salons-and-beauty',
    label: 'Salons and beauty studios',
    eyebrow: 'For salons, lash lounges, and beauty studios',
    subjects: [
      'Sixty quiet minutes your regulars would add to their appointment',
      'A new service for [Business name] with no new hire',
      '14 sessions a month to break even on a hyperbaric chamber',
    ],
    preheader: `Regulars add a 60-minute session before or after their appointment. No new hire, no treatment room. One chamber nets an estimated ${N.net} a month.`,
    headline: 'An hour your regulars would add to their appointment',
    opener: 'Your clients at [Business name] already come in every few weeks and treat the appointment as time for themselves. A mild hyperbaric session is 60 quiet minutes they can add before or after a fill, color, or cut: no needles, no downtime, nothing for your artists to perform. It is a new service you can sell without hiring anyone.',
    whoTitle: 'Who books at a salon, and why',
    why: 'Beauty clients book it for the hour: lie back in a private chamber, breathe oxygen through a mask, nap or scroll, and walk out. Many also come to it for the early research on hyperbaric oxygen and skin, which the client pamphlet we make for you summarizes plainly, citations and limits included. Across the Wasatch Front, studios charge $79 to $129 for that hour.',
    who: [
      'Regulars who come in for a fill, color, or cut every few weeks and would add an hour.',
      'Clients who want time to fully switch off and would pay for it.',
      'Clients who already spend on skin care, facials, and wellness.',
    ],
    fitTitle: 'How it fits your book',
    fit: 'Pair a session with an appointment, sell session packs at checkout, and let your artists book it like any other service. We build a client pamphlet in your brand, like the one we made for a lash lounge, so your front desk has something to hand over.',
    cta: 'Worth 15 minutes to see if it fits [Business name]?',
    tiles: STANDARD_TILES,
  },
];

// ---- shared copy
const SHARED = {
  intro: 'Purebaric is a Lehi company. I rent 1.5 ATA mild hyperbaric chambers to homes across the Wasatch Front, and I place the same chambers in businesses. I deliver and install the chamber, train your staff, and service it myself. You set your prices and keep the session revenue.',
  handleTitle: 'What we handle, and what it asks of you',
  handle: [
    ['Delivery and install', 'at your location, in days.'],
    ['Staff training and a runbook', 'so your team runs sessions with confidence and can train new hires.'],
    ['Consent-form templates and a client pamphlet in your brand', 'ready for your front desk.'],
    ['Equipment service and ongoing support.', 'If something stops working, we fix it.'],
    ['What it asks of you:', 'a 5 x 8 ft spot, a wall outlet, and about 15 minutes of staff time per session to close the chamber, open it, and wipe it down.'],
  ],
  ctaBody: 'The full business prospectus is on our site: the chamber, a session, the pricing Utah businesses publish, and the assumptions behind every figure above, so you can swap in your own. When it looks like a fit, request a chamber from that page, or reply here and I will bring the numbers for your space.',
  fine: 'Purebaric provides general-wellness equipment. It is not a medical device and is not intended to diagnose, treat, cure, or prevent any disease. Revenue figures are estimates, not guarantees: session revenue at $75 a session less rental and supplies, before staff time, overhead, taxes, and the one-time setup fee. Local prices are published 2026 prices from businesses in Lehi, Orem, and Salt Lake City.',
};

const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

function tile(t, hero) {
  const bg = hero ? C.terra : C.terraBg, fg = hero ? '#ffffff' : C.ink, k = hero ? '#ffffff' : C.terraD, top = hero ? C.ink : C.terra;
  const vsize = hero ? 38 : 20, usize = hero ? 15 : 12;
  return `<table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background:${bg}; border-top:4px solid ${top}; border-radius:10px;">
  <tr><td style="padding:${hero ? '18px 22px 20px' : '12px 14px 14px'};">
    <p style="margin:0 0 3px; font-family:${SANS}; font-size:${hero ? 11 : 10.5}px; letter-spacing:${hero ? '0.14em' : '0.1em'}; text-transform:uppercase; font-weight:700; color:${k}; white-space:nowrap;">${esc(t.k)}</p>
    <p style="margin:0; font-family:Georgia,'Times New Roman',serif; font-size:${vsize}px; line-height:1.1; font-weight:700; color:${fg};">${esc(t.v)}${t.unit ? ` <span style="font-family:${SANS}; font-size:${usize}px; font-weight:700;">${esc(t.unit)}</span>` : ''}</p>
    <p style="margin:6px 0 0; font-family:${SANS}; font-size:${hero ? 14 : 12.5}px; line-height:1.45; color:${fg};">${esc(t.p)}</p>
  </td></tr>
</table>`;
}

function bullets(items) {
  return items.map(t => `<tr>
  <td width="16" valign="top" style="width:16px; padding:4px 0 0;"><span style="display:inline-block; width:9px; height:9px; border-radius:50%; background:${C.terra};"></span></td>
  <td style="padding:0 0 8px; font-family:${SANS}; font-size:15px; line-height:1.55; color:#5f544d;">${t}</td>
</tr>`).join('\n');
}

function email(cat) {
  const sm = cat.tiles.small;
  const intro = cat.intro || SHARED.intro;
  const handle = (cat.handle || SHARED.handle).map(([b, r]) => `<strong style="color:${C.ink};">${esc(b)}</strong> ${esc(r)}`);
  const replySubject = encodeURIComponent('Chamber for [Business name]');
  const bizUrl = `${SITE}/business?utm_source=email&utm_medium=outreach&utm_campaign=b2b-${cat.id}`;
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Purebaric for ${esc(cat.label.toLowerCase())}</title>
<style>
  @media only screen and (max-width:480px) {
    .pb-stack { display:block !important; width:100% !important; padding:0 0 8px !important; }
    .pb-gap { display:none !important; }
    .pb-pad { padding-left:24px !important; padding-right:24px !important; }
  }
</style>
</head>
<body style="margin:0; padding:0; background:${C.cream2}; font-family:${SANS}; color:${C.ink}; line-height:1.6;">
  <!-- Subject: ${esc(cat.subjects[0])} -->
  <div style="display:none; font-size:1px; color:${C.cream2}; line-height:1px; max-height:0; max-width:0; overflow:hidden;">${esc(cat.preheader)}</div>
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background:${C.cream2};">
    <tr>
      <td align="center" style="padding:28px 12px;">
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="560" style="max-width:560px; width:100%; background:${C.card}; border:1px solid ${C.line}; border-radius:16px; overflow:hidden;">

          <!-- Header -->
          <tr>
            <td style="background:${C.ink}; padding:22px 40px; text-align:center;">
              <a href="${SITE}/business" style="text-decoration:none;">
                <img src="${SITE}/images/logo-cream.png?v=3" alt="Purebaric" width="220" style="display:inline-block; height:auto; max-width:220px; border:0; outline:none; text-decoration:none;" />
              </a>
            </td>
          </tr>

          <!-- Hero image -->
          <tr>
            <td style="padding:0;">
              <img src="${SITE}/images/chamber-living.jpg" alt="A Purebaric 1.5 ATA hyperbaric chamber set up in a bright room" width="560" style="display:block; width:100%; max-width:560px; height:auto; border:0;" />
            </td>
          </tr>

          <!-- Eyebrow, headline, opener, who we are -->
          <tr>
            <td class="pb-pad" style="padding:30px 40px 6px;">
              <p style="margin:0 0 8px; font-size:12px; letter-spacing:0.16em; text-transform:uppercase; font-weight:700; color:${C.terraD};">${esc(cat.eyebrow)}</p>
              <h1 style="margin:0 0 18px; font-family:Georgia,'Times New Roman',serif; font-size:27px; line-height:1.22; font-weight:700; color:${C.ink};">${esc(cat.headline)}</h1>
              <p style="margin:0 0 14px; font-size:16px;">Hi [First name],</p>
              <p style="margin:0 0 14px; font-size:16px;">[Personal note] ${esc(cat.opener)}</p>
              <p style="margin:0 0 6px; font-size:16px;">${esc(intro)} <a href="${bizUrl}" style="color:${C.terraD}; text-decoration:underline;">Here is how it works for businesses.</a></p>
            </td>
          </tr>

          <!-- Tiles -->
          <tr>
            <td class="pb-pad" style="padding:14px 40px 6px;">
              ${tile(cat.tiles.hero, true)}
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin-top:10px;">
                <tr>
                  <td class="pb-stack" width="32%" valign="top" style="width:32%;">${tile(sm[0], false)}</td>
                  <td class="pb-gap" width="2%" style="width:2%; font-size:0; line-height:0;">&nbsp;</td>
                  <td class="pb-stack" width="32%" valign="top" style="width:32%;">${tile(sm[1], false)}</td>
                  <td class="pb-gap" width="2%" style="width:2%; font-size:0; line-height:0;">&nbsp;</td>
                  <td class="pb-stack" width="32%" valign="top" style="width:32%;">${tile(sm[2], false)}</td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Who books, why, how it fits -->
          <tr>
            <td class="pb-pad" style="padding:22px 40px 0;">
              <p style="margin:0 0 6px; font-size:12px; letter-spacing:0.16em; text-transform:uppercase; font-weight:700; color:${C.terraD};">Your clients</p>
              <h2 style="margin:0 0 10px; font-family:Georgia,'Times New Roman',serif; font-size:20px; line-height:1.25; font-weight:700; color:${C.ink};">${esc(cat.whoTitle)}</h2>
              <p style="margin:0 0 12px; font-size:15px; line-height:1.6; color:#5f544d;">${esc(cat.why)}</p>
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
${bullets(cat.who.map(esc))}
              </table>
              <p style="margin:10px 0 0; font-size:15px; line-height:1.6; color:#5f544d;"><strong style="color:${C.ink};">${esc(cat.fitTitle)}.</strong> ${esc(cat.fit)}</p>
            </td>
          </tr>

          <!-- What we handle -->
          <tr>
            <td class="pb-pad" style="padding:24px 40px 0;">
              <p style="margin:0 0 6px; font-size:12px; letter-spacing:0.16em; text-transform:uppercase; font-weight:700; color:${C.terraD};">What's included</p>
              <h2 style="margin:0 0 10px; font-family:Georgia,'Times New Roman',serif; font-size:20px; line-height:1.25; font-weight:700; color:${C.ink};">${esc(SHARED.handleTitle)}</h2>
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
${bullets(handle)}
              </table>
            </td>
          </tr>

          <!-- CTA block -->
          <tr>
            <td class="pb-pad" style="padding:24px 40px 8px;">
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background:${C.ink}; border-radius:14px;">
                <tr>
                  <td style="padding:22px 24px 20px;">
                    <p style="margin:0 0 6px; font-family:Georgia,'Times New Roman',serif; font-size:20px; line-height:1.25; font-weight:700; color:#ffffff;">${esc(cat.cta)}</p>
                    <p style="margin:0 0 16px; font-size:15px; line-height:1.55; color:${C.soft};">${esc(SHARED.ctaBody)}</p>
                    <table role="presentation" cellspacing="0" cellpadding="0" border="0">
                      <tr>
                        <td style="padding:0 10px 6px 0;"><a href="${bizUrl}" style="display:inline-block; padding:12px 20px; background:${C.terra}; color:#ffffff; text-decoration:none; border-radius:8px; font-weight:700; font-size:15px;">See the business prospectus</a></td>
                        <td style="padding:0 10px 6px 0;"><a href="mailto:${EMAIL}?subject=${replySubject}" style="display:inline-block; padding:11px 18px; border:1px solid rgba(255,255,255,0.4); color:#ffffff; text-decoration:none; border-radius:8px; font-weight:600; font-size:15px;">Reply: yes, let's talk</a></td>
                      </tr>
                    </table>
                    <p style="margin:8px 0 0; font-size:14px; color:${C.soft};">Or call or text <a href="tel:${TEL}" style="color:#ffffff; text-decoration:underline;">${PHONE}</a>. The prospectus is also attached.</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Signature -->
          <tr>
            <td class="pb-pad" style="padding:18px 40px 32px;">
              <p style="margin:0; font-size:16px;">Thanks,</p>
              <p style="margin:0; font-size:16px; font-weight:700;">Matthew Bailie</p>
              <p style="margin:0; font-size:14px; color:${C.muted};">Owner, Purebaric &nbsp;|&nbsp; Lehi, Utah</p>
              <p style="margin:0; font-size:14px; color:${C.muted};">${PHONE} &nbsp;|&nbsp; <a href="mailto:${EMAIL}" style="color:${C.terraD}; text-decoration:none;">${EMAIL}</a> &nbsp;|&nbsp; <a href="${SITE}/business" style="color:${C.terraD}; text-decoration:none;">purebaric.com/business</a></p>
            </td>
          </tr>
        </table>

        <!-- Fine print -->
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="560" style="max-width:560px; width:100%;">
          <tr>
            <td style="padding:16px 24px 0; text-align:center; font-size:12px; line-height:1.5; color:${C.muted};">
              ${esc(SHARED.fine)}
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;
}

function plainText(cat) {
  const sm = cat.tiles.small, h = cat.tiles.hero;
  const line = s => s.replace(/\s+/g, ' ').trim();
  return [
    `Subject: ${cat.subjects[0]}`,
    `Alt subjects: ${cat.subjects.slice(1).join(' | ')}`,
    '',
    `Hi [First name],`,
    '',
    line(`[Personal note] ${cat.opener}`),
    '',
    line(cat.intro || SHARED.intro) + ` How it works for businesses: ${SITE}/business`,
    '',
    `${h.k.toUpperCase()}: ${h.v}${h.unit ? ' ' + h.unit : ''}, ${h.p}`,
    ...sm.map(t => `${t.k.toUpperCase()}: ${t.v}${t.unit ? ' ' + t.unit : ''}, ${t.p}`),
    '',
    `${cat.whoTitle}:`,
    cat.why,
    ...cat.who.map(w => `- ${w}`),
    '',
    `${cat.fitTitle}. ${cat.fit}`,
    '',
    `${SHARED.handleTitle}:`,
    ...(cat.handle || SHARED.handle).map(([b, r]) => `- ${b} ${r}`),
    '',
    `${cat.cta} ${SHARED.ctaBody}`,
    '',
    `Business prospectus: ${SITE}/business`,
    `Or reply to this email, or call or text ${PHONE}.`,
    '',
    'Thanks,',
    'Matthew Bailie',
    'Owner, Purebaric | Lehi, Utah',
    `${PHONE} | ${EMAIL} | purebaric.com/business`,
    '',
    SHARED.fine,
    '',
  ].join('\n');
}

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
    <input id="first" placeholder="Jordan" autocomplete="off">
    <label for="biz">Business name</label>
    <input id="biz" placeholder="Summit Strength" autocomplete="off">
    <label for="note">Personal note (one sentence, optional)</label>
    <textarea id="note" placeholder="I saw you added a cold plunge room this spring and your reviews keep mentioning it."></textarea>
    <div class="hint">Something specific to them: a service they added, a team they train, a review you read, an expansion, a question they get asked. Leave blank to omit.</div>
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
  id: 'master', label: 'Master template', eyebrow: 'For [industry]', subjects: ['[Subject line: a question or a specific fact, not a revenue promise]'], preheader: '[Preheader: one line that shows after the subject in the inbox]',
  headline: '[Headline: the outcome for this kind of business, in their words]',
  opener: '[Opener: where their clients get this today, and what changes when it is on their floor. Name [Business name].]',
  whoTitle: 'Who books at a [kind of business], and why', why: '[Why their clients would want it: proof people already pay for it nearby, what the hour is like, when it fits their routine. No health claims.]',
  who: ['[Client group 1]', '[Client group 2]', '[Client group 3]'],
  fitTitle: 'How it fits your [menu / membership / practice]', fit: '[How they would sell sessions: singles, packs, membership tier, paired with an appointment.]',
  cta: 'Worth 15 minutes to see if it fits [Business name]?', tiles: STANDARD_TILES,
});
fs.writeFileSync(path.join(OUT, '00_master_template.html'), master); written.push('00_master_template.html');
for (const c of CATEGORIES) {
  fs.writeFileSync(path.join(OUT, `${c.id}.html`), email(c)); written.push(`${c.id}.html`);
  fs.writeFileSync(path.join(OUT, `${c.id}.txt`), plainText(c)); written.push(`${c.id}.txt`);
}
fs.writeFileSync(path.join(OUT, 'composer.html'), composer()); written.push('composer.html');
console.log('wrote', written.length, 'files to', OUT, '|', N);
