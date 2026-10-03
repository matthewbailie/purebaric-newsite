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
4. **Greeting, personal note, opener.** The personal note is one sentence specific to them. The opener ties the chamber to their clients and their floor and names the business.
5. **One-paragraph pitch.** Who we are, what we do, and "you set your prices and keep the session revenue."
6. **The four tiles** from the business page: estimated net revenue (hero), your cost, break-even, space needed. Sports teams get cost, capacity, session, space instead.
7. **Who books here.** Three bullets specific to the industry, then one line on how it fits their menu, membership, book, or practice.
8. **What we handle.** Delivery and install, training and runbook, consent templates and branded pamphlet, service and support.
9. **CTA block** (dark, like the page): "See if a chamber fits [Business name]", free 15-minute call, no obligation. Buttons to call and to reply. Link to purebaric.com/business for the full numbers.
10. **Signature** and the general-wellness / estimates-not-guarantees fine print.

Design tokens match `warm.css`: ink `#2b2320`, terra `#b8654d`, terra-dark `#9a4f3a`, terra-bg `#f4e7df`, cream `#efe7db`, card `#fffdf9`. Georgia for display, system sans for body, 560px table layout with inline styles so it survives Gmail, Outlook and Apple Mail. Tiles stack on phones under 480px.

## What is personalized, and where

| Slot | Per business | Per industry |
|---|---|---|
| `[First name]` | yes | |
| `[Business name]` | yes (in the opener, the CTA heading, the reply-to subject and two of the three subject lines) | |
| `[Personal note]` | yes, one sentence. A service they added, a team they train, a review you read, an expansion. Blank is fine; the composer removes it cleanly. | |
| Subject line, preheader | | yes, three subjects per industry |
| Eyebrow, headline | | yes |
| Opener | | yes |
| Who books, how it fits | | yes |
| Tiles | | standard for five industries; swapped for sports teams |
| Pitch paragraph, what we handle | | shared, with a sports-team variant |
| CTA, signature, fine print | | shared |

## The angle for each industry

- **Gyms and fitness centers.** Members already pay to train; a chamber is a recovery amenity they will also pay for, from the same floor. Sell singles at the desk, packs, or a premium membership tier.
- **CrossFit and performance gyms.** Athletes training five-plus days a week and prepping for the Open or a comp. Add-on to unlimited memberships, comp-prep packs, or a members-only flat rate. No new coach or class needed.
- **Sports teams and athletic programs.** Not a revenue pitch. A 1.5 ATA recovery station in the training room with no capital purchase and no maintenance on staff, run by their athletic trainers like any other station. Approach through the front office, sponsorship or performance staff; these facilities have no public line (see the prospect list notes).
- **Recovery studios and med spas.** Their clients already buy cold plunge, cryo, sauna, IV. Hyperbaric is the next item on the menu, and clients who ask for it are going elsewhere. Bundle with existing services and the top membership tier.
- **Physical therapy, chiropractic, sports medicine.** A cash-pay general-wellness session booked before or after a visit, outside insurance billing, run by existing staff. The copy says plainly that it is not a medical treatment and that our consent templates and marketing language describe it that way.
- **Salons and beauty studios.** Regulars who already book every few weeks add 60 quiet minutes before or after their appointment. A new service with no new hire. Mentions the branded client pamphlet we made for a lash lounge. The email makes no skin claims; those stay in the pamphlet with their citations.

## Before you send

- Attach `purebaric_facility_prospectus.pdf`. The email refers to it.
- Send from hello@purebaric.com or your Gmail, one at a time, with a real personal note. This is a cold email; it should read as one person writing to another.
- Images load from purebaric.com, so the site must be up and `/images/logo-cream.png` and `/images/chamber-living.jpg` must stay in place.
- Pasting the composer output into Gmail keeps the inline styles. Gmail drops the head `<style>` block, so on a phone the three small tiles sit side by side instead of stacking; the inline widths keep them readable.
- No health claims. The chamber is a general-wellness amenity, and the fine print at the bottom stays on every send.
- Follow-up: the earlier `../email_prospectus_template.html` ("Thanks for your interest...") is the reply once someone responds or after the first call.
