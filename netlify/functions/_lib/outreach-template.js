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

// Standard money tiles (hero + three). Teams get their own set.
const STANDARD_TILES = {
  hero: { k: 'Estimated net revenue', v: N.net, unit: 'per month', p: ['4 sessions a day at the recommended rate', `2 sessions a day nets an estimated ${N.netLight}`], note: 'Estimates, not guarantees.' },
  small: [
    { k: 'Your cost', v: N.rent, unit: 'per month', p: '12-month rental, service included' },
    { k: 'Break-even', v: `${N.breakeven} sessions`, unit: '', p: 'a month covers the rental' },
    { k: 'Space needed', v: '4 x 8 ft', unit: '', p: 'and a standard wall outlet' },
  ],
};

// ---- the industries. Tokens: [First name], [Business name]. No personal notes: nothing in an email
// may assert a fact about the recipient's business beyond its name.
// Each email is short: the profit in the first line, a button to reserve, the four tiles, three
// bullets on what is included, a second button. Per industry only the subject, headline, the one
// opening paragraph, and the "why they book" line change.
const CATEGORIES = [
  {
    id: 'gyms-and-fitness',
    label: 'Gyms and fitness centers',
    eyebrow: 'A new profit line for your gym',
    subjects: [
      'A new revenue line for [Business name] that fits in a 4 x 8 ft corner',
      'Keep the recovery spend your members take across town',
      'Hyperbaric on your gym floor, no chamber to buy',
    ],
    preheader: 'Members already pay recovery studios $79 to $129 a session for hyperbaric. Put it on your floor and keep that revenue.',
    headline: 'Turn a 4 x 8 ft corner of your business into a new profit line',
    opener: 'Your members are already paying recovery studios $79 to $129 an hour for hyperbaric sessions. One chamber in a 4 x 8 ft corner makes that revenue yours.',
    tiles: STANDARD_TILES,
  },
  {
    id: 'crossfit-and-performance',
    label: 'CrossFit and performance gyms',
    eyebrow: 'A new profit line for your gym',
    subjects: [
      'A new revenue line for [Business name] that fits in a 4 x 8 ft corner',
      'Revenue for [Business name] that is not memberships',
      'Keep the recovery spend your athletes take across town',
    ],
    preheader: 'Your five-day-a-week athletes already pay $79 to $129 a session for hyperbaric elsewhere. Keep it in the box.',
    headline: 'Turn a 4 x 8 ft corner of your business into a new profit line',
    opener: 'Your athletes train five or more days a week and already pay recovery studios $79 to $129 an hour for hyperbaric sessions. One chamber in a 4 x 8 ft corner of the box makes that revenue yours.',
    tiles: STANDARD_TILES,
  },
  {
    id: 'sports-teams-and-athletics',
    label: 'Sports teams and athletic programs',
    eyebrow: 'For your athletic program',
    subjects: [
      'A hyperbaric chamber in the [Business name] training room for $979 a month',
      'Stop sending athletes across town for hyperbaric sessions',
      'Recovery station for [Business name]: 4 x 8 ft, no capital purchase',
    ],
    preheader: 'A 1.5 ATA chamber in your training room, installed, staff trained, and serviced, for $979 a month. No procurement cycle, no maintenance contract.',
    headline: 'A hyperbaric chamber in your training room for $979 a month, no capital purchase',
    opener: 'Your athletes ask for hyperbaric, and today the answer is a clinic across town or a six-figure chamber that has to clear procurement. A monthly rental puts one in your training room this month, with no capital request.',
    tiles: {
      hero: { k: 'Your cost', v: N.rent, unit: 'per month', p: `12-month rental of the chamber and oxygen machine, service included. One-time ${N.fee} for delivery, installation, training, and starting supplies.` },
      small: [
        { k: 'Capacity', v: 'Up to 8', unit: 'sessions', p: 'a day, one athlete at a time' },
        { k: 'Session', v: '60 min', unit: '', p: 'at 1.5 ATA, breathing 95 to 99.9% oxygen' },
        { k: 'Space needed', v: '4 x 8 ft', unit: '', p: 'and a standard wall outlet' },
      ],
    },
  },
  {
    id: 'recovery-studios-and-med-spas',
    label: 'Recovery studios and med spas',
    eyebrow: 'A new profit line for your studio',
    subjects: [
      'Hyperbaric on the [Business name] menu without buying a chamber',
      'A new revenue line for [Business name] that fits in a 4 x 8 ft corner',
      'The service your clients book somewhere else',
    ],
    preheader: 'Studios across the Wasatch Front charge $79 to $129 a session for hyperbaric. Add it to your menu without buying a chamber.',
    headline: 'Turn a 4 x 8 ft corner of your business into a new profit line',
    opener: 'Your clients already book cold plunge, sauna, cryo, or IV, and studios across the Wasatch Front charge $79 to $129 for an hour of hyperbaric. One chamber in a 4 x 8 ft corner puts that hour on your menu, with nothing to buy and nothing to service.',
    tiles: STANDARD_TILES,
  },
  {
    id: 'physical-therapy-and-sports-medicine',
    label: 'Physical therapy, chiropractic, and sports medicine',
    eyebrow: 'A cash-pay profit line for your clinic',
    subjects: [
      'A cash-pay wellness line for [Business name] in a 4 x 8 ft room',
      'A new revenue line for [Business name], no billing codes',
      'What your discharged patients could keep coming in for',
    ],
    preheader: 'A self-pay wellness session patients book around their visits. No claims, no codes, run by the staff you have.',
    headline: 'Turn a 4 x 8 ft corner of your business into a new profit line',
    opener: 'Your active patients are already paying recovery studios $79 to $129 an hour for hyperbaric on top of what they pay you. One chamber in a 4 x 8 ft room makes that a cash-pay line of your own, with no claims and no codes.',
    tiles: STANDARD_TILES,
  },
  {
    id: 'salons-and-beauty',
    label: 'Salons and beauty studios',
    eyebrow: 'A new profit line for your salon',
    subjects: [
      'A new revenue line for [Business name] that fits in a 4 x 8 ft corner',
      'Sixty quiet minutes your regulars would add to their appointment',
      'A new service for [Business name], no new hire',
    ],
    preheader: 'Regulars add a 60-minute session before or after their appointment. No new hire, no treatment room.',
    headline: 'Turn a 4 x 8 ft corner of your business into a new profit line',
    opener: 'Your clients already come in every few weeks and treat the appointment as time for themselves. Studios across the Wasatch Front charge $79 to $129 for a 60-minute hyperbaric session. One chamber in a 4 x 8 ft corner adds that hour to every appointment, with nothing for your artists to perform.',
    tiles: STANDARD_TILES,
  },
];

// ---- shared copy
const SHARED = {
  intro: 'Purebaric is a Lehi company. We deliver and install mild hyperbaric chambers, train your staff, and provide ongoing service and support. With minimal upfront cost, the chamber becomes a lucrative revenue stream for your business.',
  includedTitle: 'Included in the rental',
  included: [
    ['Delivery, installation, and staff training.', 'We deliver the chamber, set it up in your space, and train your team hands-on so they can run sessions with confidence from day one.'],
    ['Ready-to-use consent forms and a branded pamphlet', 'for your front desk, so you can start booking sessions immediately.'],
    ['24/7 service and support.', 'If anything comes up with the chamber, we service it promptly.'],
  ],
  ctaTitle: 'Ready to add it to [Business name]?',
  ctaBody: 'Reserve a chamber and we will confirm a delivery date and walk your team through setup. There is no charge until we confirm your booking. Prefer to talk through your space first? Call or text.',
  fine: 'Purebaric provides general-wellness equipment. Our chambers are not medical devices and are not intended to diagnose, treat, cure, or prevent any disease. Revenue figures are estimates, not guarantees. They assume $75 a session, subtract rental and supplies, and do not include staff time, overhead, taxes, or the one-time setup fee. Local prices are published 2026 prices from businesses in Lehi, Orem, and Salt Lake City.',
};

const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

function tile(t, hero) {
  const bg = hero ? C.terra : C.terraBg, fg = hero ? '#ffffff' : C.ink, k = hero ? '#ffffff' : C.terraD, top = hero ? C.ink : C.terra;
  const vsize = hero ? 38 : 20, usize = hero ? 15 : 12;
  return `<table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background:${bg}; border-top:4px solid ${top}; border-radius:10px;">
  <tr><td style="padding:${hero ? '18px 22px 20px' : '12px 14px 14px'};">
    <p style="margin:0 0 3px; font-family:${SANS}; font-size:${hero ? 11 : 10.5}px; letter-spacing:${hero ? '0.14em' : '0.1em'}; text-transform:uppercase; font-weight:700; color:${k}; white-space:nowrap;">${esc(t.k)}</p>
    <p style="margin:0; font-family:Georgia,'Times New Roman',serif; font-size:${vsize}px; line-height:1.1; font-weight:700; color:${fg};">${esc(t.v)}${t.unit ? ` <span style="font-family:${SANS}; font-size:${usize}px; font-weight:700;">${esc(t.unit)}</span>` : ''}</p>
    ${Array.isArray(t.p)
      ? `<table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin-top:8px;">${t.p.map(l => `<tr><td width="14" valign="top" style="width:14px; padding:0 0 3px; font-family:${SANS}; font-size:14px; line-height:1.45; color:${fg};">&bull;</td><td style="padding:0 0 3px; font-family:${SANS}; font-size:14px; line-height:1.45; color:${fg};">${esc(l)}</td></tr>`).join('')}</table>`
      : `<p style="margin:6px 0 0; font-family:${SANS}; font-size:${hero ? 14 : 12.5}px; line-height:1.45; color:${fg};">${esc(t.p)}</p>`}
    ${t.note ? `<p style="margin:10px 0 0; font-family:${SANS}; font-size:12px; line-height:1.4; color:${fg}; opacity:0.85;">${esc(t.note)}</p>` : ''}
  </td></tr>
</table>`;
}

function bullets(items) {
  return items.map(t => `<tr>
  <td width="16" valign="top" style="width:16px; padding:4px 0 0;"><span style="display:inline-block; width:9px; height:9px; border-radius:50%; background:${C.terra};"></span></td>
  <td style="padding:0 0 8px; font-family:${SANS}; font-size:15px; line-height:1.55; color:#5f544d;">${t}</td>
</tr>`).join('\n');
}

function button(href, label, opts = {}) {
  const bg = opts.onDark ? C.terra : C.terra;
  return `<a href="${href}" style="display:inline-block; padding:14px 22px; background:${bg}; color:#ffffff; text-decoration:none; border-radius:8px; font-weight:700; font-size:16px; white-space:nowrap;">${esc(label)}</a>`;
}

function links(cat) {
  const utm = `utm_source=email&utm_medium=outreach&utm_campaign=b2b-${cat.id}`;
  return { reserve: `${SITE}/book?type=business&${utm}`, biz: `${SITE}/business?${utm}` };
}

function email(cat, opts = {}) {
  const postal = opts.postalAddress || POSTAL_ADDRESS;
  const prospectusUrl = opts.prospectusUrl || PROSPECTUS_URL;
  const unsub = opts.unsubscribeUrl
    ? `<a href="${esc(opts.unsubscribeUrl)}" style="color:${C.muted}; text-decoration:underline;">Unsubscribe</a>`
    : `<a href="mailto:${EMAIL}?subject=Unsubscribe" style="color:${C.muted}; text-decoration:underline;">Unsubscribe</a>`;
  const sm = cat.tiles.small;
  const { reserve, biz } = links(cat);
  const included = SHARED.included.map(([b, r]) => `<strong style="color:${C.ink};">${esc(b)}</strong> ${esc(r)}`);
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
            <td align="center" style="background:${C.ink}; padding:22px 40px; text-align:center;">
              <a href="${biz}" style="text-decoration:none;">
                <img src="${SITE}/images/logo-cream.png?v=3" alt="Purebaric" width="220" style="display:block; margin:0 auto; height:auto; max-width:220px; border:0; outline:none; text-decoration:none;" />
              </a>
            </td>
          </tr>

          <!-- Hero image, full card width -->
          <tr>
            <td align="center" style="padding:0; line-height:0; font-size:0;">
              <img src="${SITE}/images/chamber-living.jpg" alt="A Purebaric 1.5 ATA hyperbaric chamber" width="560" style="display:block; width:100%; max-width:560px; height:auto; border:0;" />
            </td>
          </tr>

          <!-- Headline, opener, first CTA -->
          <tr>
            <td class="pb-pad" style="padding:30px 40px 6px;">
              <p style="margin:0 0 8px; font-size:12px; letter-spacing:0.16em; text-transform:uppercase; font-weight:700; color:${C.terraD};">${esc(cat.eyebrow)}</p>
              <h1 style="margin:0 0 18px; font-family:Georgia,'Times New Roman',serif; font-size:27px; line-height:1.22; font-weight:700; color:${C.ink};">${esc(cat.headline)}</h1>
              <p style="margin:0 0 14px; font-size:16px;">Hi [First name],</p>
              <p style="margin:0 0 14px; font-size:16px;">${esc(cat.opener)}</p>
              <p style="margin:0 0 20px; font-size:16px;">${esc(SHARED.intro)} <a href="${biz}" style="color:${C.terraD}; text-decoration:underline;">See the numbers for businesses.</a></p>
              <p style="margin:0 0 6px;">${button(reserve, 'Reserve a chamber')}</p>
              <p style="margin:0 0 10px; font-size:13px; color:${C.muted};">No charge until we confirm a delivery date.</p>
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
              ${cat.whyLine ? `<p style="margin:12px 0 0; font-size:14px; line-height:1.55; color:#5f544d;">${esc(cat.whyLine)}</p>` : ''}
            </td>
          </tr>

          <!-- Included -->
          <tr>
            <td class="pb-pad" style="padding:22px 40px 0;">
              <p style="margin:0 0 8px; font-size:12px; letter-spacing:0.16em; text-transform:uppercase; font-weight:700; color:${C.terraD};">${esc(SHARED.includedTitle)}</p>
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
${bullets(included)}
              </table>
            </td>
          </tr>

          <!-- Bottom CTA -->
          <tr>
            <td class="pb-pad" style="padding:22px 40px 8px;">
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background:${C.ink}; border-radius:14px;">
                <tr>
                  <td style="padding:22px 24px 20px;">
                    <p style="margin:0 0 6px; font-family:Georgia,'Times New Roman',serif; font-size:20px; line-height:1.25; font-weight:700; color:#ffffff;">${esc(SHARED.ctaTitle)}</p>
                    <p style="margin:0 0 16px; font-size:15px; line-height:1.55; color:${C.soft};">${esc(SHARED.ctaBody)}</p>
                    <p style="margin:0 0 12px;">${button(reserve, 'Reserve a chamber')}</p>
                    <p style="margin:0; font-size:14px; color:${C.soft};">Call or text <a href="tel:${TEL}" style="color:#ffffff; text-decoration:underline;">${PHONE}</a> &nbsp;·&nbsp; <a href="${esc(prospectusUrl)}" style="color:#ffffff; text-decoration:underline;">Business prospectus (PDF)</a></p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Signature -->
          <tr>
            <td class="pb-pad" style="padding:18px 40px 30px;">
              <table role="presentation" cellspacing="0" cellpadding="0" border="0">
                <tr>
                  <td width="72" valign="top" style="width:72px; padding:0 16px 0 0;">
                    <img src="${SITE}/images/founder-matthew-240.jpg" alt="Matthew Bailie" width="72" height="72" style="display:block; width:72px; height:72px; border-radius:50%; border:0;" />
                  </td>
                  <td valign="middle" style="font-family:${SANS};">
                    <p style="margin:0; font-size:16px; font-weight:700; color:${C.ink};">Matthew Bailie</p>
                    <p style="margin:0; font-size:14px; color:${C.muted};">Owner, Purebaric &nbsp;|&nbsp; Lehi, Utah</p>
                    <p style="margin:0; font-size:14px; color:${C.muted};">${PHONE} &nbsp;|&nbsp; <a href="mailto:${EMAIL}" style="color:${C.terraD}; text-decoration:none;">${EMAIL}</a></p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>

        <!-- Fine print -->
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="560" style="max-width:560px; width:100%;">
          <tr>
            <td style="padding:16px 24px 0; text-align:center; font-size:12px; line-height:1.5; color:${C.muted};">
              ${esc(SHARED.fine)}
              <br><br>${unsub}
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
  const { reserve, biz } = links(cat);
  const line = s => s.replace(/\s+/g, ' ').trim();
  return [
    `Subject: ${cat.subjects[0]}`,
    `Alt subjects: ${cat.subjects.slice(1).join(' | ')}`,
    '',
    line(cat.headline),
    '',
    `Hi [First name],`,
    '',
    line(cat.opener),
    '',
    `${SHARED.intro} The numbers for businesses: ${biz}`,
    '',
    `Reserve a chamber for [Business name]: ${reserve}`,
    'No charge until we confirm a delivery date.',
    '',
    `${h.k.toUpperCase()}: ${h.v}${h.unit ? ' ' + h.unit : ''}` + (Array.isArray(h.p) ? h.p.map(l => `\n  - ${l}`).join('') : `, ${h.p}`) + (h.note ? `\n  ${h.note}` : ''),
    ...sm.map(t => `${t.k.toUpperCase()}: ${t.v}${t.unit ? ' ' + t.unit : ''}, ${t.p}`),
    ...(cat.whyLine ? [cat.whyLine] : []),
    '',
    `${SHARED.includedTitle}:`,
    ...SHARED.included.map(([b, r]) => `- ${b} ${r}`),
    '',
    `${SHARED.ctaTitle} ${SHARED.ctaBody}`,
    `Reserve a chamber: ${reserve}`,
    `Call or text ${PHONE}. Business prospectus (PDF): ${opts.prospectusUrl || PROSPECTUS_URL}`,
    '',
    'Matthew Bailie',
    `Owner, Purebaric | Lehi, Utah | ${PHONE} | ${EMAIL}`,
    '',
    SHARED.fine,
    '',
    opts.unsubscribeUrl ? `Unsubscribe: ${opts.unsubscribeUrl}` : `Unsubscribe: email ${EMAIL} with the subject "Unsubscribe"`,
    `Purebaric | ${opts.postalAddress || POSTAL_ADDRESS}`,
    '',
  ].join('\n');
}

// ---- personalization -------------------------------------------------------------------------
// Tokens in the templates: [First name], [Business name].

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

function personalize(str, { firstName = '', businessName = '' } = {}, { html = true } = {}) {
  const e = html ? esc : (x => String(x));
  const biz = businessName ? e(businessName) : '[Business name]';
  let s = String(str);
  s = s.replace('Hi [First name],', firstName ? `Hi ${e(firstName)},` : (businessName ? `Hi ${biz} team,` : 'Hi there,'));
  s = s.split(encodeURIComponent('[Business name]')).join(encodeURIComponent(businessName || '[Business name]'));
  s = s.split('[First name]').join(firstName ? e(firstName) : '[First name]');
  s = s.split('[Business name]').join(biz);
  return s;
}

function categoryById(id) {
  return CATEGORIES.find(c => c.id === id) || null;
}

// Render one send-ready email. subjectIndex picks one of the category's subject lines (default 0).
function render({ categoryId, firstName = '', businessName = '', subjectIndex = 0, unsubscribeUrl = '', postalAddress = '', prospectusUrl = '' }) {
  const cat = categoryById(categoryId);
  if (!cat) throw new Error(`unknown outreach category: ${categoryId}`);
  const opts = { unsubscribeUrl, postalAddress, prospectusUrl };
  const vars = { firstName, businessName };
  const subject = personalize(cat.subjects[Math.min(subjectIndex, cat.subjects.length - 1)] || cat.subjects[0], vars, { html: false });
  const html = personalize(email(cat, opts), vars, { html: true });
  const text = personalize(plainText(cat, opts).replace(/^Subject:.*\n(Alt subjects:.*\n)?\n?/, ''), vars, { html: false });
  return { subject, html, text, preheader: personalize(cat.preheader, vars, { html: false }) };
}

module.exports = { CATEGORIES, SHARED, STANDARD_TILES, N, C, SANS, SITE, PHONE, TEL, EMAIL, POSTAL_ADDRESS, PROSPECTUS_URL,
  esc, email, plainText, greetingName, personalize, categoryById, render };
