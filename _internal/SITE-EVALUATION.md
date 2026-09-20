# Purebaric.com — Customer-Experience & Conversion Evaluation

**Reviewed:** 2026-09-20 · Live site + source (`~/projects/purebaric-newsite`)
**Lens:** clarity, ease of use, communication, trust, and profitability/conversion.
**Note:** This is an internal working doc. It should NOT be published — exclude `*.md` from the Netlify deploy (see Technical hygiene).

---

## 1. Executive summary

The new warm design and the booking module are genuinely strong — the homepage pricing card (chamber + rental-length slider + live savings, carried into `/book`) is clear and professional, and it now aligns cleanly with the hero. The single-chamber, "delivered to your home in Utah" story is easy to understand.

The biggest things holding the site back from converting are **not** design polish — they're **trust and follow-through**:

1. **Half the site is still the old teal design** (About, Contact, Waitlist, Service area, Safety, Terms, Practitioners, Blog, all use-case pages). Clicking from the warm homepage into a teal page looks like landing on a different company. This quietly erodes trust at the exact moment a researcher is deciding.
2. **No social proof anywhere.** For a high-consideration wellness purchase (~$6k/yr), the absence of reviews, testimonials, before/after stories, or named customers is the single biggest conversion gap.
3. **No phone number / click-to-call on any public page.** This audience skews older and cautious; many will want to talk to a human before spending thousands. You're forcing everyone through a form.
4. **The "Research & case studies" links send warm traffic to a competitor clinic's website** (aspenmedcenter.com). You're doing the education, then handing the visitor to someone else.
5. **The reservation flow is a "request," not a booking.** No real-time availability and no instant confirmation/payment. That's a defensible choice, but the page doesn't set that expectation, and there's no momentum after submit.

Fix trust + follow-through and the existing (good) design will convert much better.

---

## 2. Top priorities (impact vs. effort)

| # | Change | Impact | Effort | Why |
|---|---|---|---|---|
| 1 | Add real social proof (reviews/testimonials) on homepage + `/book` | High | Med | Highest-leverage conversion lever; currently zero |
| 2 | Add a phone number + click-to-call in the header/footer + a "Prefer to talk? Book a call" option | High | Low | Captures high-intent buyers who won't use a form |
| 3 | Bring the teal pages into the warm design (or at least About, Contact, Waitlist, Service area) | High | Med | Consistency = trust; removes the "different company" feeling |
| 4 | Host the research/case studies on-site instead of linking to a competitor | High | Med | Keeps warm traffic on purebaric.com; owns the credibility |
| 5 | Surface the 7-day guarantee + HSA/FSA on the homepage, pricing, and `/book` | High | Low | Both are strong objection-killers currently buried |
| 6 | Set expectations on `/book` ("This is a request; we confirm availability and reach out — no charge now") + a clear "what happens next" | Med | Low | Reduces post-submit confusion/abandonment |
| 7 | Fix teal-page technical hygiene (favicon 404s, empty structured-data URLs, `concierge@` vs `hello@`) | Med | Low | SEO + polish; cheap to fix |
| 8 | Add availability signal + reinstate the brief medical screening on `/book` | Med | Med | Trust/safety + prevents dead-end bookings |

---

## 3. Site-wide findings

### 3.1 Design consistency (High)
- **Warm (new):** `/`, `/book`, `/pricing`, `/chambers`, `/how-it-works`, `/faq`.
- **Teal (old):** `/about`, `/contact`, `/waitlist`, `/service-area`, `/safety`, `/terms`, `/practitioners`, `/blog`, all `/use-cases/*`, all `/blog/*`.
- The two look like different brands (different fonts, colors, nav, footer). A visitor who reads the warm homepage then clicks "About" or "Contact" hits the old look. **Recommendation:** migrate the high-traffic/decision pages first — Contact, About, Waitlist, Service area — then the rest. At minimum, unify the header/footer so navigation feels continuous.

### 3.2 Social proof (High)
- There is **no** testimonials/reviews/case-results section anywhere. **Recommendation:** add 3–6 short customer quotes (name, city, use case) on the homepage and `/book`; a Google rating badge if you have reviews; and, where truthful and compliant, outcome stories ("post-op recovery," "athlete") kept in wellness language. This is the fastest way to raise conversion.

### 3.3 Contact & human touch (High)
- **No `tel:` link on any public page** (only the admin portal has one). The footer shows email + hours but **no phone**, even though your transactional emails list `(801) 901-0873`. **Recommendation:** put the phone number in the header (or a persistent "Call us" affordance), the footer, `/contact`, and `/book`, with click-to-call. Add a "Prefer to talk first? Book a 10-minute call" option — great for this audience.

### 3.4 Trust & credibility (High)
- The site asserts quality (99.9% O₂, delivered/serviced) but shows little about **who** Purebaric is, **safety training depth**, **insurance/liability**, sanitization specifics, or founder credibility beyond the About page. **Recommendation:** add a compact "Why trust us" strip (real team photo, years/served count, sanitization/safety process, response time, insurance) near the booking decision.

### 3.5 Offer clarity: guarantee, HSA/FSA, "included" (High, easy)
- The **7-day first-week refund guarantee** appears only on Terms and Waitlist — not on the homepage, pricing, or `/book`. **HSA/FSA (pre-tax) eligibility** appears only on the Practitioners page. Both are strong objection-removers. **Recommendation:** surface both prominently on the homepage, pricing page, and the `/book` summary card ("Delivery, install & training included · 7-day guarantee · HSA/FSA eligible").

### 3.6 The research/case-studies section (High)
- The homepage "Research & case studies" cards link to **aspenmedcenter.com** (a competitor's hosted PDFs) and a PubMed page. You educate the visitor, then send them off-site to another clinic. **Recommendation:** host the studies (or on-brand one-page summaries with citations) on purebaric.com under `/research`, clearly labeled as third-party research with your wellness disclaimer, so the visitor stays and the credibility accrues to you.

### 3.7 Booking model & momentum (High)
- `/book` posts a **request** (no availability check, no payment, no instant confirmation). The page doesn't clearly say "this is a request, not an instant booking," so some users expect a confirmation. After submit there's an inline message but no next step. **Recommendation (now):** set expectations up top and add a strong "what happens next" (we confirm availability → schedule delivery → training). **Recommendation (later):** real-time availability + optional deposit/Stripe to convert intent into committed, paid bookings (per the PRD).

### 3.8 SEO & technical hygiene (Med, easy)
- **16 teal pages reference `/images/favicon.svg`, which does not exist → 404 on every one.** (Warm pages correctly use `favicon.ico`.)
- **16 teal pages have empty JSON-LD `"url": ""`** and empty OG URLs — weakens structured data / rich results.
- **`concierge@purebaric.com`** is still in the JSON-LD on 16 pages while the visible site uses **`hello@purebaric.com`** — pick one.
- Internal docs (`RUNBOOK.md`, this file) are inside the publish directory and would be served publicly. **Recommendation:** add `*.md` to `.netlifyignore`.
- **Recommendation:** normalize canonical/OG URLs to `https://purebaric.com/...`, fix the favicon reference, unify the email, and confirm titles/descriptions are unique per page.

### 3.9 Performance (Med)
- Teal pages load **jQuery + toastr + a Laravel/Vite build bundle** that the new warm pages don't need; warm pages are lean. Migrating the teal pages (3.1) also drops this weight. **Recommendation:** as pages move to warm, drop the unused jQuery/toastr/Vite includes.

### 3.10 Accessibility (Med)
- Spot-check for: color contrast on muted terracotta/olive text, visible focus states on the slider and links, `aria` labels on the icon-only controls, and the accordion (native `<details>` on FAQ is good). **Recommendation:** run an automated pass (Lighthouse/axe) and fix contrast + focus visibility; it's both a legal and conversion concern.

### 3.11 Analytics (in place — good)
- GA4 (`G-Q1X04YRWP1`, `/pb-metrics.js`) is live and consent-gated with a privacy-safe funnel (`select_rental_plan`, `service_area_check`, `booking_form_start`, `booking_request_submit`, `contact_submit`, `waitlist_join`). **Recommendation:** once data accrues, watch drop-off at `booking_form_start → booking_request_submit`; that's where the above fixes should move the needle. Add the server-side `purchase` lifecycle when Stripe lands.

---

## 4. Page-by-page

### Homepage (`/`) — warm, strong
- **Works:** clean hero, clear value prop ("Hyperbaric rentals at home."), the pricing/slider module, the labeled delivery-county map, "Every rental includes," the savings-vs-clinic math.
- **Improve:**
  - Add **social proof** above or right after the hero.
  - Add a one-line **trust strip** (guarantee · HSA/FSA · delivered & installed · real humans).
  - The **"Research & case studies"** links leave the site (see 3.6).
  - No **FAQ teaser** on the homepage — pull 3–4 top questions inline (safety, who it's for, how fast) to kill objections without a click.
  - Consider a secondary CTA for **"Talk to us / Call"** for non-form buyers.
  - Minor: in the 1-month (no-discount) state there's a small empty slot under the price (reserved for the savings row so the slider stays fixed) — acceptable, but watch it doesn't read as a gap.

### `/book` — warm, good structure
- **Works:** carries the homepage selection (chamber, months, ZIP), live summary, clean form, ZIP out-of-area handling.
- **Improve:** state clearly this is a **request** (no charge now); add **"what happens next"** + expected response time; surface **guarantee/HSA/FSA**; reinstate a brief **medical screening + consent** (safety and the PRD call for it; the backend already supports the fields); add **trust/social proof** in the right rail; ensure a strong success state (not just a text line).

### `/pricing` — warm
- **Works:** the four tiers are clear; the clinic-cost comparison is persuasive.
- **Improve:** add the **guarantee + HSA/FSA** here explicitly; add a "most popular" marker to steer choice; link each tier's CTA to `/book` prefilled with that length; add an FAQ/objection block.

### `/chambers` — warm
- **Improve:** thin on real imagery (only two near-identical product photos). Add more real photos/video (in-home, setup, the mask/concentrator, someone using it). Add specs table + "what's in the box." Clarify the "coming soon" sitting chamber timing.

### `/how-it-works` — warm
- **Works:** the 4-step flow and requirements are clear. **Improve:** add delivery-time expectation and a photo/video of an actual install; link to the guarantee.

### `/faq` — warm, accordion
- **Works:** concise, well-organized, real answers. **Improve:** add pricing/logistics questions (How fast is delivery? Is there a deposit? What if it doesn't fit? Cancellation?) and link relevant answers to `/book` and `/contact`.

### `/contact` — TEAL
- **Improve:** bring to warm; show **phone (click-to-call), hours, service area, and expected response time** prominently, not just a form; the "Talk to us" CTA elsewhere points here, so make it reassuring.

### `/waitlist` — TEAL
- **Improve:** bring to warm; clarify how the queue/holds work and typical wait; it collects `city, state & ZIP` as free text — consider the same ZIP eligibility check used elsewhere.

### `/service-area` — TEAL
- **Improve:** bring to warm and make it match the homepage county map + list (single source of truth for where you deliver). It still lists broader tiers (Orem, Ogden, etc.) — reconcile with the homepage's 7 counties so the story is consistent.

### `/about`, `/practitioners` — TEAL
- **Improve:** bring to warm; About is a trust page — add a real founder photo/story and credibility; Practitioners is where HSA/FSA lives — surface that offer more widely.

### `/safety`, `/terms` — TEAL
- **Improve:** bring to warm for consistency; keep the wellness-only/disclaimer language. Make sure the guarantee terms match what you advertise.

### `/blog` + `/use-cases/*` — TEAL
- **Improve:** these are SEO/education assets; bring to warm, fix the favicon/structured-data issues, and interlink them to `/book` and the research section.

---

## 5. Conversion & profitability playbook (prioritized)

**This week (quick wins, low effort):**
- Add phone + click-to-call (header/footer/contact/book).
- Surface 7-day guarantee + HSA/FSA on homepage, pricing, `/book`.
- Add a "what happens next" + "this is a request, no charge now" note to `/book`.
- Fix favicon 404s, empty JSON-LD URLs, `concierge@`→`hello@`, and add `*.md` to `.netlifyignore`.
- Add an FAQ teaser + trust strip to the homepage.

**This month (medium effort, high payoff):**
- Add real testimonials/reviews (homepage + `/book`).
- Host the research/case studies on-site; stop linking to the competitor.
- Migrate Contact, About, Waitlist, Service area to the warm design.
- Reinstate the brief medical screening + consent on `/book`.
- Add more real chamber photos/video.

**Next quarter (bigger investments):**
- Real-time availability + instant/deposit booking via Stripe (per the PRD) to capture revenue at the moment of intent.
- Server-side GA4 purchase/lifecycle events once Stripe is live.
- Email nurture sequence for booking requests and waitlist.
- Lead capture for out-of-area / not-ready visitors (e.g., "notify me / free guide").

---

## 6. What's already good (keep it)
- The warm design system, the pricing/slider module, and the price↔headline alignment.
- Single-chamber clarity and the delivered-to-your-home positioning.
- The labeled delivery-county map + ZIP eligibility gating (with out-of-area admin routing).
- Consent-gated, privacy-safe analytics.
- Clean, honest disclaimers (wellness-only) — keep this line.
