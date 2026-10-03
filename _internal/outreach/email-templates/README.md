# Business outreach emails

Cold-outreach email for placing a chamber in a business. One master structure, one version per
industry, and a composer page that fills in the business and copies the email into Gmail.

All copy lives in `../source/make_outreach_emails.js`. Edit it there and re-run:

```
node _internal/outreach/source/make_outreach_emails.js
```

The numbers ($979, 14 sessions, $6,686, $500, $1.30, $79 to $129) are computed from the same
assumptions as the prospectus and `business.html`. Change them in the script, not in the HTML.

## Files

| File | Use |
|---|---|
| `composer.html` | **Start here.** Open in a browser, pick the industry, type the first name, business name and a one-sentence personal note, click **Copy email for Gmail**, paste into a new message, pick a subject line, attach the prospectus. |
| `00_master_template.html` | The structure with every personalizable slot marked in brackets. Use it to draft a new industry. |
| `gyms-and-fitness.html` / `.txt` | Gyms, fitness centers, boutique studios, personal-training studios |
| `crossfit-and-performance.html` / `.txt` | CrossFit boxes, performance and sports-prep training (Athletic Republic, Utah Performance Institute, Elite Performance Prep) |
| `sports-teams-and-athletics.html` / `.txt` | Pro teams and college athletic departments (Jazz, RSL, Utah HC, Bees, U of U, BYU, Weber State, UVU). Different value proposition: a recovery station for athletes, not session sales. |
| `recovery-studios-and-med-spas.html` / `.txt` | Cryo, sauna, cold plunge, IV, med spas (US Cryotherapy, iCRYO, Rytual, Xage) |
| `physical-therapy-and-sports-medicine.html` / `.txt` | PT, chiropractic, sports medicine clinics (Wasatch Peak, Sports Medicine Clinic Ogden, Redstone) |
| `salons-and-beauty.html` / `.txt` | Salons, lash lounges, beauty studios |

The `.txt` files are the same email as plain text, for a LinkedIn message, a text, or a quick read of the copy.

## Structure

The email mirrors the For Businesses page, top to bottom, cut down to what fits in one scroll:

1. **Dark header** with the cream logo, linking to purebaric.com/business.
2. **Hero photo** of the chamber in a bright room (`chamber-living.jpg`, hosted on purebaric.com, same as the prospectus email).
3. **Eyebrow + headline.** Eyebrow names the industry. Headline states the outcome for that kind of business.
4. **Greeting, personal note, opener.** The personal note is one sentence specific to them. The opener names where their clients get this today (a studio across town) and what changes when it is on their floor.
5. **Who we are.** One paragraph of credibility: a Lehi company, already renting these chambers to homes across the Wasatch Front, owner-run, the owner installs and services. "You set your prices and keep the session revenue."
6. **The four tiles** from the business page: estimated net revenue (hero, with the two-a-day floor stated), your cost, break-even ("about one every other day you are open"), space needed. Sports teams get cost, capacity, session, space instead.
7. **Who books here, and why.** The proof of demand (what Lehi, Orem and Salt Lake studios charge, and that their clients are the ones paying it), what the hour is like for the client, and when it fits their routine. Then three client groups and one line on how it fits their menu, membership, book, or practice.
8. **What we handle, and what it asks of you.** Delivery and install, training and runbook, consent templates and branded pamphlet, service and support, then the honest ask: a 4 x 8 ft spot, an outlet, about 15 minutes of staff time per session.
9. **CTA block** (dark, like the page): "Worth 15 minutes to see if it fits [Business name]?" Primary button **See the business prospectus** links to purebaric.com/business (tagged `utm_source=email&utm_medium=outreach&utm_campaign=b2b-<industry>` so visits show up per industry in analytics); that page carries the Request a business rental button. Secondary button is Reply, and the phone is a text link. The same page is linked once more in the who-we-are paragraph and in the signature.
10. **Signature** and the general-wellness / estimates-not-guarantees fine print.

Design tokens match `warm.css`: ink `#2b2320`, terra `#b8654d`, terra-dark `#9a4f3a`, terra-bg `#f4e7df`, cream `#efe7db`, card `#fffdf9`. Georgia for display, system sans for body, 560px table layout with inline styles so it survives Gmail, Outlook and Apple Mail. Tiles stack on phones under 480px.

## What is personalized, and where

| Slot | Per business | Per industry |
|---|---|---|
| `[First name]` | yes | |
| `[Business name]` | yes (in the opener, the CTA heading, the reply-to subject and two of the three subject lines) | |
| `[Personal note]` | yes, one sentence. A service they added, a team they train, a review you read, an expansion. Blank is fine; the composer removes it cleanly. | |
| Subject line, preheader | | yes, three subjects per industry: a fact or question first, a no-purchase angle second, the break-even number third. None promise revenue in the subject. |
| Eyebrow, headline | | yes |
| Opener | | yes |
| Why they book, who books, how it fits | | yes |
| Tiles | | standard for five industries; swapped for sports teams |
| Who we are, what we handle | | shared, with a sports-team variant |
| CTA, signature, fine print | | shared |

## The angle for each industry

Every revenue email carries the same proof of demand: recovery studios in Lehi, Orem and Salt Lake City already charge $79 to $129 a session and sell 20-packs for $1,400 to $2,580, and the owner's own clients are the people paying it. The "why" for the end client is never a health claim. It is the hour itself (lie down, 1.5 ATA, 95 to 99.9% oxygen, nap or scroll), the moment it fits their routine, and the fact that people nearby pay for it.

- **Gyms and fitness centers.** Owner wants non-dues revenue and a reason for members to come in on rest days. Member already drives to a recovery studio; keep that spend inside the gym. Sell singles at the desk, packs, or a premium tier.
- **CrossFit and performance gyms.** Owner has no spare square footage and no appetite for another class. Athlete trains five-plus days, deloads, preps for the Open or a comp, and already pays for recovery elsewhere. Add-on to unlimited, comp-prep packs, or a members-only flat rate.
- **Sports teams and athletic programs.** Not a revenue pitch. The obstacle is procurement, not price: the alternative is a clinic across town or a six-figure hard-shell chamber. A monthly rental the department can approve, no maintenance contract, run by athletic trainers like any other station. Best fit is programs without a chamber or with a second facility (academies, minor league, mid-major colleges). Approach through the front office, sponsorship or performance staff; these facilities have no public line.
- **Recovery studios and med spas.** Strongest fit. The lead question is how often a client asks for hyperbaric and books it elsewhere. The studios charging $79 to $129 are their competitors. Standalone, bundled with plunge or IV, and in the top membership tier. No purchase, no machine to service, no guessing whether it sells.
- **Physical therapy, chiropractic, sports medicine.** Most skeptical audience. The pitch is cash-pay revenue with no claims and no codes, patients who keep coming after discharge, and a clear line between the amenity and treatment. Names the cash-pay wellness lines clinics already run (compression boots, red light, massage) and tells them to have counsel review the templates and confirm insurance coverage.
- **Salons and beauty studios.** Owner's objection is space and who runs it mid-fill; the 15-minute staff line and "nothing for your artists to perform" answer it. Client's why is the hour for themselves and, for some, the early skin research, which the email names only as something the client pamphlet summarizes with citations and limits. No skin claims in the email.

## Before you send

- Attach `purebaric_facility_prospectus.pdf`. The email refers to it.
- Send from hello@purebaric.com or your Gmail, one at a time, with a real personal note. This is a cold email; it should read as one person writing to another.
- Subject lines: lead with the question or fact, not the revenue number. A dollar figure in the subject from an unknown sender reads as spam to the owner and to the filter.
- The body runs about 450 to 500 words. If a given owner is better reached short, send the first two paragraphs and the CTA from the `.txt` version and let the prospectus carry the rest.
- Images load from purebaric.com, so the site must be up and `/images/logo-cream.png` and `/images/chamber-living.jpg` must stay in place.
- Pasting the composer output into Gmail keeps the inline styles. Gmail drops the head `<style>` block, so on a phone the three small tiles sit side by side instead of stacking; the inline widths keep them readable.
- No health claims. The chamber is a general-wellness amenity, and the fine print at the bottom stays on every send.
- Follow-up: the earlier `../email_prospectus_template.html` ("Thanks for your interest...") is the reply once someone responds or after the first call.
