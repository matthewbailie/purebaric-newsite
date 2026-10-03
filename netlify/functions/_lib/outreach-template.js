// Outreach email templates for placing chambers in businesses: one structure, one content block per
// industry. Used by the admin Outreach tab (netlify/functions/admin-outreach.js) to send, and by
// _internal/outreach/source/make_outreach_emails.js to write the static templates and the Gmail composer.
// Pure: no fs, no network.
'use strict';

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
// CAN-SPAM: every commercial email carries a valid physical postal address. Set the real one in the admin
// Outreach settings (it overrides this default at send time).
const POSTAL_ADDRESS = 'Lehi, Utah 84043';
const PROSPECTUS_URL = `${SITE}/purebaric-business-prospectus.pdf`;

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

function email(cat, opts = {}) {
  const postal = opts.postalAddress || POSTAL_ADDRESS;
  const prospectusUrl = opts.prospectusUrl || PROSPECTUS_URL;
  const unsub = opts.unsubscribeUrl
    ? `If you would rather not hear from me again, <a href="${esc(opts.unsubscribeUrl)}" style="color:${C.muted}; text-decoration:underline;">unsubscribe here</a> or reply with "no thanks".`
    : 'If you would rather not hear from me again, reply with "no thanks" and I will not email again.';
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
                        <td style="padding:0 10px 6px 0;"><a href="${bizUrl}" style="display:inline-block; padding:12px 16px; background:${C.terra}; color:#ffffff; text-decoration:none; border-radius:8px; font-weight:700; font-size:14px; white-space:nowrap;">See the business prospectus</a></td>
                        <td style="padding:0 10px 6px 0;"><a href="mailto:${EMAIL}?subject=${replySubject}" style="display:inline-block; padding:11px 14px; border:1px solid rgba(255,255,255,0.4); color:#ffffff; text-decoration:none; border-radius:8px; font-weight:600; font-size:14px; white-space:nowrap;">Reply: yes, let's talk</a></td>
                      </tr>
                    </table>
                    <p style="margin:8px 0 0; font-size:14px; color:${C.soft};">Or call or text <a href="tel:${TEL}" style="color:#ffffff; text-decoration:underline;">${PHONE}</a>. <a href="${esc(prospectusUrl)}" style="color:#ffffff; text-decoration:underline;">Download the prospectus (PDF)</a>.</p>
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
              <br><br>You are receiving this one-time note because ${esc(cat.whyYou || 'your business serves the clients who book these sessions')}. ${unsub}
              <br>Purebaric &nbsp;|&nbsp; ${esc(postal)}
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

function plainText(cat, opts = {}) {
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
    `Download the prospectus (PDF): ${opts.prospectusUrl || PROSPECTUS_URL}`,
    `Or reply to this email, or call or text ${PHONE}.`,
    '',
    'Thanks,',
    'Matthew Bailie',
    'Owner, Purebaric | Lehi, Utah',
    `${PHONE} | ${EMAIL} | purebaric.com/business`,
    '',
    SHARED.fine,
    '',
    `You are receiving this one-time note because ${cat.whyYou || 'your business serves the clients who book these sessions'}. ` +
      (opts.unsubscribeUrl ? `Unsubscribe: ${opts.unsubscribeUrl}` : 'Reply "no thanks" and I will not email again.'),
    `Purebaric | ${opts.postalAddress || POSTAL_ADDRESS}`,
    '',
  ].join('\n');
}

// ---- personalization -------------------------------------------------------------------------
// Tokens in the templates: [First name], [Business name], [Personal note].

// Turn an "owner" string from research into a greeting name. Returns "" when there is no usable
// first name, and the greeting then falls back to "Hi <Business> team,".
function greetingName(owner) {
  let s = String(owner || '').trim();
  if (!s) return '';
  s = s.split(/[;,]|\s+-\s+|\bco-?owner\b|\bwith\b/i)[0];               // "Sam Butler; co-owner Kaitlyn" -> "Sam Butler"
  s = s.replace(/\(([^)]*)\)/g, ' ');                                      // "Sam (Samantha) Butler" -> "Sam Butler"
  s = s.replace(/^(owners?|founders?|gm|general manager|manager|coach|dr\.?|doctor|mr\.?|mrs\.?|ms\.?)\s+/i, '');
  s = s.replace(/\b(dpt|pt|dc|md|do|cscs|ccft|llc)\b\.?/gi, ' ').replace(/\s+/g, ' ').trim();
  if (!s) return '';
  const people = s.split(/\s*(?:&|\band\b|\/|\+)\s*/i).map(p => p.trim()).filter(Boolean);
  const firsts = people.map(p => p.split(' ')[0]).filter(f => /^[A-Za-z][A-Za-z.'-]*$/.test(f));
  if (!firsts.length) return '';
  const cap = f => f[0].toUpperCase() + f.slice(1);
  if (firsts.length === 1) return cap(firsts[0]);
  return firsts.slice(0, 2).map(cap).join(' and ');
}

function personalize(str, { firstName = '', businessName = '', personalNote = '' } = {}, { html = true } = {}) {
  const e = html ? esc : (x => String(x));
  const biz = businessName ? e(businessName) : '[Business name]';
  let note = String(personalNote || '').trim();
  if (note && !/[.!?]$/.test(note)) note += '.';
  let s = String(str);
  s = s.replace('Hi [First name],', firstName ? `Hi ${e(firstName)},` : (businessName ? `Hi ${biz} team,` : 'Hi there,'));
  s = s.split('[Personal note] ').join(note ? e(note) + ' ' : '');
  s = s.split('[Personal note]').join(note ? e(note) : '');
  s = s.split(encodeURIComponent('[Business name]')).join(encodeURIComponent(businessName || '[Business name]'));
  s = s.split('[First name]').join(firstName ? e(firstName) : '[First name]');
  s = s.split('[Business name]').join(biz);
  return s;
}

function categoryById(id) {
  return CATEGORIES.find(c => c.id === id) || null;
}

// Render one send-ready email. subjectIndex picks one of the category's subject lines (default 0).
function render({ categoryId, firstName = '', businessName = '', personalNote = '', subjectIndex = 0, unsubscribeUrl = '', postalAddress = '', prospectusUrl = '' }) {
  const cat = categoryById(categoryId);
  if (!cat) throw new Error(`unknown outreach category: ${categoryId}`);
  const opts = { unsubscribeUrl, postalAddress, prospectusUrl };
  const vars = { firstName, businessName, personalNote };
  const subject = personalize(cat.subjects[Math.min(subjectIndex, cat.subjects.length - 1)] || cat.subjects[0], vars, { html: false });
  const html = personalize(email(cat, opts), vars, { html: true });
  const text = personalize(plainText(cat, opts).replace(/^Subject:.*\n(Alt subjects:.*\n)?\n?/, ''), vars, { html: false });
  return { subject, html, text, preheader: personalize(cat.preheader, vars, { html: false }) };
}

module.exports = { CATEGORIES, SHARED, STANDARD_TILES, N, C, SANS, SITE, PHONE, TEL, EMAIL, POSTAL_ADDRESS, PROSPECTUS_URL,
  esc, email, plainText, greetingName, personalize, categoryById, render };
