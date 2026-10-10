# Plan: a "Use cases" page for purebaric.com, including wound healing (10 Oct 2026)

Status: plan only, nothing built. Owner decisions needed are listed at the end.

## 1. The constraint that shapes everything
"Wound healing" is a medical indication, not a wellness benefit. Hyperbaric oxygen is FDA-approved and Medicare-covered for chronic diabetic foot ulcers, radiation injury, compromised grafts and similar, delivered in hard-shell medical chambers at 2.0 to 2.5 ATA with 100% oxygen under physician supervision. Mild soft-shell chambers like Purebaric's are FDA-cleared only for acute mountain sickness, and the site states sitewide that the chamber is "not a medical device" and is "for general wellness only". Listing "wound healing" as a use case, or writing "helps wounds heal", would be a disease-treatment claim. That exposes the business under FDA device rules, FTC advertising rules and the Tennessee and Utah consumer-protection statutes, breaks the health-content policy in RUNBOOK §14, and would get the page rejected or the account flagged by Google Ads (which already rejected a "physical therapy clinic" keyword this month). It also contradicts the business rental agreement's wellness positioning.

So the page cannot say Purebaric chambers heal wounds. It can do something more useful: explain honestly what the research on hyperbaric oxygen and wounds shows, where it was done, and how that differs from a mild home chamber, inside a page that covers every reason people actually rent. That keeps the wound topic (which people search for) while staying on the right side of the line, in the same way the existing post-surgical blog post and the homepage research section already do.

## 2. Recommended shape: one "Why people rent" page with six use cases
New page `use-cases.html` at `/use-cases` (title "Why people rent a hyperbaric chamber"), built on `warm.css` with the standard header, footer, disclaimer and `pb-metrics.js`. Six sections, each with the same four parts: who this is, how renters typically use the chamber (cadence, session length, home or business), what independent research says and its limits (2 to 3 studies, labelled by type and pressure exactly like the homepage research cards), and what we do not claim.

1. **Athletic recovery and training load** (the largest renter group; ties to the schools channel). Research: the 2024 randomized trial in young soccer players (single session, modest fatigue-score change, no change in other markers) presented honestly.
2. **Recovery after surgery or injury: including what research says about wounds.** This is where wound healing lives. Content: why clinicians use hyperbaric oxygen for hard-to-heal wounds (tissue oxygenation), the approved indications list (UHMS / Medicare), the Cochrane review on HBOT for chronic wounds, then the plain statement that those results come from medical chambers at 2.0 to 2.5 ATA with 100% oxygen under supervision, that a mild home chamber is a different device at a different pressure, and that anyone recovering from surgery or an open wound must follow their surgeon's instructions and get clearance first. Link the existing post-surgical blog post. Heading language that is safe: "Recovery after surgery or injury". Heading language that is not: "Wound healing", "Heal faster", "Speeds healing".
3. **Altitude and acclimation** (Utah-specific, and the one indication mild chambers are actually cleared for: acute mountain sickness). Link the existing altitude blog post. This section can be more confident than the others because the clearance exists.
4. **Everyday wellness, sleep and relaxation** (the renter stories from the reviews page).
5. **Older adults and longevity routines** (links to the oxidative-stress and stem-cell studies already on the homepage, with their limits).
6. **Businesses: a recovery amenity for members and clients** (links to /business; session pricing context from the business page).

Supporting pieces on the page: a short "How to read the research" box (reuse the homepage `studyNote` wording), a six-question FAQ (is this medical treatment; can I use it after surgery; what pressure; who should not use it; do I need a prescription; how often do people use it), the sitewide disclaimer, and one CTA per section to /book or /business.

## 3. Writing rules for the page (hand these to whoever drafts it)
- Describe what renters do and what researchers reported; never promise an outcome. "Renters tell us they use it after long runs" is fine; "reduces inflammation" is not.
- Every study gets: journal and year, pressure, oxygen source, sample size, control or not, and a one-line limit, matching the homepage cards.
- Any sentence about wounds, surgery, concussion or a named condition carries the "talk to your physician" framing and distinguishes clinical HBOT from a mild chamber.
- No before-and-after photos of wounds, no testimonials about medical outcomes, no "FDA-approved" wording (the clearance is for mountain sickness only; say "FDA-cleared for acute mountain sickness" if the point is made at all).
- Keep the reviews page as the only place renter quotes appear; the use-case page summarises themes, not quotes.

## 4. Sources to cite (verify each when drafting)
Undersea and Hyperbaric Medical Society indications list; CMS national coverage determination for HBOT (the covered-conditions list); Cochrane review, hyperbaric oxygen therapy for chronic wounds (Kranke et al., most recent update); FDA 510(k) clearances for mild chambers (K072757 at 1.3 ATA, K220290 up to 1.5 ATA, acute mountain sickness); the 2024 soccer-recovery randomized trial already cited in the schools proposal; the studies already linked on the homepage. The schools proposal's source appendix (`_internal/research/channel-schools-athletic-recovery/`) has several of these URLs.

## 5. Build steps (when approved; no code is changed by this plan)
1. Draft copy in a doc first and run it through the health-content review (RUNBOOK §14 requires a qualified medical or regulatory reviewer for new health claims). Insurer check in the same pass: confirm the policy wording does not exclude pages that discuss wounds or surgery.
2. Build `use-cases.html` from the `how-it-works.html` skeleton; add a `WebPage` schema block (not `MedicalWebPage`); keep the LocalBusiness schema as is.
3. Navigation: add "Use cases" to the desktop and mobile nav on all 27 pages (the header is duplicated per page; there is a sed-style pass for this in the git history from the footer-year change), and to the footer "Service" column.
4. Cross-links: homepage research section intro links to the page; both blog posts link to their matching section; the business page links to section 6; the FAQ page links to section 2 from its post-surgery answer.
5. `sitemap.xml` entry and a `canonical`; meta description written to the wellness framing; `robots` index.
6. Tests: `npm test` (nav and footer tests will catch a broken header copy); headless-Chrome renders at desktop and 390px; check the page carries the sitewide disclaimer.
7. Single deploy with any other queued changes (deploy batching rule), then commit and push.
8. Do not point Google Ads at this page with wound or medical keywords; it is an organic and trust page. Add it to the Site analytics page list in `_lib/ga-traffic.js` (`PAGE_LABELS`) so visits show in the admin.

Effort: about half a day for copy, reviewer time unknown, two to three hours to build and wire the nav, plus the normal deploy.

## 6. Decisions for the owner
1. Accept the framing: the page explains the research on wounds but never claims the chamber heals wounds. If the intent is to advertise wound healing as a benefit, that is a medical-device marketing question for a lawyer, not a web page.
2. Page name and URL: "Why people rent" at `/use-cases` is the recommendation; "Use cases" in the nav.
3. Who is the medical or regulatory reviewer? RUNBOOK §14 requires one and none is on file.
4. Whether to lead with altitude acclimation, the only cleared use, as the first section for Utah visitors, with athletic recovery second.
