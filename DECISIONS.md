# Decisions Log

## 2026-09-26 Keep one rental form and move it inline for edits

**Decision:** Reuse the existing rental form and move its DOM node into a full-width table row directly beneath the selected rental while editing. Return it to its original anchor for new rentals and cancellation.
**Context:** Rental editing should match the existing chamber and machine editing experience without duplicating form markup or save logic.
**Alternatives considered:** A duplicate per-row form or a modal would create divergent validation/save paths or fail the requested inline interaction.
**Status:** Confirmed

## 2026-09-26 Treat rental months as calendar billing periods

**Decision:** A selected month count ends on the day before the corresponding calendar-month anniversary, using UTC date arithmetic and clamping month-end anniversaries to the target month's final day. Leap days are part of the rental period and do not create an extra charge or an omitted day.
**Context:** The rental editor needs predictable subscription-style terms while retaining a custom end-date option.
**Alternatives considered:** Fixed 30-day blocks drift away from monthly subscription billing; raw JavaScript `setMonth()` can overflow dates such as January 31 into March.
**Status:** Confirmed

## 2026-09-26 Resolve rental inventory only after concurrent loads settle

**Decision:** Keep the independent admin data requests concurrent, then repaint the rental grid after chambers, machines, and rentals have all settled. Show the chamber's visible ID followed by the machine's visible ID in the first rental-grid column.
**Context:** A valid rental could display “deleted chamber” when its request completed before the inventory requests, even though the stored relationships were intact.
**Alternatives considered:** Serializing all admin requests would remove the race but make the entire portal slower; changing stored rental IDs would corrupt valid data and would not address the rendering race.
**Status:** Confirmed

## 2026-09-26 Make GitHub the production deployment source

**Decision:** Connect the existing Netlify site to `matthewbailie/purebaric-newsite`, deploy production from `main`, and require `npm test` to pass before Netlify publishes. Keep service credentials in Netlify and do not enable deploy previews with production credentials.
**Context:** Manual folder deployments could publish uncommitted files and allowed production to drift from Git history.
**Alternatives considered:** Continuing manual CLI deployments preserves the current workflow but does not guarantee that production matches a commit; creating a new Netlify site would risk the existing domain, Identity, environment, and stored data.
**Status:** Confirmed

## 2026-09-26 Add passkey sign-in to /admin alongside Netlify Identity

**Decision:** Admin auth accepts either a Netlify Identity JWT or our own passkey (WebAuthn) session: a random 32-byte id in an HttpOnly `pb_admin_session` cookie, looked up in the `adminSessions` Blobs store, valid 90 days flat. Passkeys are discoverable/usernameless and platform-only (Face ID, Touch ID, Windows Hello). New devices can only be registered from an already-signed-in session. Netlify Identity stays as the bootstrap and recovery login.
**Context:** Identity's ~1h token kept signing the owner out of the admin portal.
**Alternatives considered:** Removing Identity would leave no recovery path if every passkey device is lost; sliding session expiry would add a Blobs write to every authenticated request.
**Status:** Confirmed

## 2026-09-26 Include a copy-and-paste follow-up text in reservation alerts

**Decision:** When a reservation request arrives and a chamber is available, the admin email and admin SMS include a ready-to-send follow-up message (term, monthly rate, delivery date). The email uses the customer's first name; the SMS uses a literal `[NAME]` placeholder.
**Context:** The owner texts each customer from their own phone and was retyping the same message. Admin SMS must not carry customer identity (A2P 10DLC compliance, RUNBOOK §7f).
**Alternatives considered:** Real names in the SMS would break the no-customer-details rule; email-only would miss the SMS alert the owner reads first.
**Status:** Confirmed

## 2026-09-26 Make renter details in a rental read-only, edited only via the customer record

**Decision:** The rental form shows the customer record's name, email, phone and address read-only. Changes go through Edit customer or Add customer. The rental still stores its own snapshot of those details, refreshed only when the customer is saved from inside the rental (or when a new rental first picks a customer).
**Context:** The same details could be typed in two places (the rental and the customer record) and drift apart.
**Alternatives considered:** Always mirroring the live customer record into every saved rental would silently change a past rental's delivery address when a customer moves.
**Status:** Confirmed

## 2026-09-26 Compute Home-tab revenue metrics in the browser from existing data

**Decision:** The admin Home tab derives MRR, subscribers, average price, trends and health metrics client-side from the rentals, bookings and chambers already loaded, using month-end snapshots. Charts are dependency-free SVG. Definitions live in one tested module.
**Context:** There is no billing ledger yet (Stripe isn't configured), so revenue is derived from rental terms and rates.
**Alternatives considered:** A server-side metrics endpoint would add an API and storage for data the page already has; a charting library would add a CDN dependency to the admin page.
**Status:** Confirmed

## 2026-09-26 Save the admin card order on the server; autosave notification events but never consent

**Decision:** The order of draggable admin cards is saved per section in Blobs (`settings/adminLayout`) as soon as a card is dropped. Notification event checkboxes autosave, but SMS consent is only ever recorded by the explicit Enable action.
**Context:** The owner uses the portal from both a phone and a computer, and asked for saves without clicking. Consent must stay a deliberate two-step action for A2P 10DLC compliance.
**Alternatives considered:** Storing the order in the browser would not follow the owner between devices; autosaving the consent checkbox would record consent without the second affirmative step.
**Status:** Confirmed

## 2026-09-26 Total a rental's payments from Stripe's records, not from single webhook events

**Decision:** On each payment or refund event (and on demand), the paid total, status and payment list for a rental are recomputed from Stripe's payment records for that rental, matched by rental_id tag or the renter's email.
**Context:** The first webhook overwrote the paid amount with the latest single payment and ignored payments without a rental_id (subscription and dashboard payments), so monthly payments never added up.
**Alternatives considered:** Adding each event's amount to the total would double-count replayed events and miss earlier payments; requiring a rental_id on every payment would exclude Stripe subscriptions.
**Status:** Confirmed

## Rental type on every rental and request (2026-10-02)

**Decision:** Rentals and rental requests carry a `rentalType` of `residential` (default) or `business`, plus a `businessName` for business. The owner sets it in the admin; a request made from the For Businesses page (`/book?type=business`) arrives already marked business. Pricing, filters, badges and email subjects key off it.
**Context:** Business placements (gyms, salons, clinics) run on a different rate, agreement and sales process than home rentals, and the owner wanted to tell them apart in the portal without asking home customers to self-classify.
**Alternatives considered:** A separate "business rentals" tab (duplicates every rental feature); inferring business from the rate (fragile); a customer-level flag only (a business contact can also rent for home).
**Status:** Confirmed

## 2026-10-03 Send business outreach from the admin portal, through the site's own mailer

**Decision:** Business prospects live in an `outreach` Blobs store with a per-row status, imported from `_internal/outreach/prospects.json` (bundled with the `admin-outreach` function). The admin Outreach tab previews, test-sends to the owner, sends singly or in daily-capped batches through the existing Resend setup from `hello@purebaric.com`, and syncs bounces from Resend. The email copy is one shared module (`_lib/outreach-template.js`) used by both the sender and the static template generator.
**Context:** The owner wanted every prospect emailed with the right industry template, addressed to the owner by first name, with a personal note, and a test to the owner's inbox first. Sending from a laptop mail client cannot track status, cap volume, or honor unsubscribes.
**Alternatives considered:** Copy-and-paste from the Gmail composer (no tracking, no cap, no unsubscribe link); a third-party cold-email tool (another account, another sender domain to warm, prospects leave the portal).
**Status:** Confirmed

## 2026-10-03 Outreach emails carry a postal address and an unsubscribe link, and link to the prospectus instead of attaching it

**Decision:** Every outreach email ends with the business postal address (set in Outreach settings; sending is refused while blank), a one-line reason for the email, and a token-protected unsubscribe link that also goes out as `List-Unsubscribe` headers with one-click POST support. The prospectus is a public PDF at `/purebaric-business-prospectus.pdf`, linked from the email, not attached.
**Context:** Cold commercial email to US businesses falls under CAN-SPAM (postal address, working opt-out, honest headers). Attachments from a low-volume sender hurt deliverability and the PDF is the same pitch as the public business page.
**Alternatives considered:** Reply-to-unsubscribe only (fails one-click requirements at Gmail and Yahoo); attaching the 690 KB PDF (heavier, more often filtered).
**Status:** Confirmed

## 2026-10-03 Compile inline admin JavaScript in the test suite

**Decision:** Extract every inline script from `admin.html` and run Node's syntax checker against it during `npm test`.
**Context:** An apostrophe in an Outreach empty-state message made the complete admin script fail to parse, leaving `/admin` blank even though the existing module tests passed.
**Alternatives considered:** Moving the full inline application into a separate JavaScript file would make syntax checking easier but is an unrelated, high-risk refactor for this production repair.
**Status:** Confirmed

## 2026-10-03 Exclude scheduled rentals from MRR until activation

**Decision:** MRR, active subscribers, average monthly price, utilization, and ARR exclude rentals whose status is still `scheduled`, even when their stored date range includes today. Scheduled revenue remains visible as forecast revenue under “Starting soon” and enters MRR only after the rental becomes active.
**Context:** A pending, unpaid business rental was still scheduled but had a stored start date of October 3, so its $729 rate appeared in current MRR before the actual Monday start.
**Alternatives considered:** Keying MRR to payment status would exclude valid active subscriptions that bill after delivery and would turn MRR into a cash-collected metric; relying on dates alone repeats the reported error when a planned date changes or activation has not happened.
**Status:** Confirmed

## 2026-10-03 Lazy-load non-dashboard admin data

**Decision:** The admin portal loads only the operational data required by Home at startup. Customers, pricing integrations, service-area settings, notifications and Outreach load on first tab visit, with a shared per-panel loading overlay and counters for concurrent dependencies.
**Context:** Home previously waited for every admin endpoint, including the large Outreach response and unrelated integration settings, before painting its metrics.
**Alternatives considered:** A new aggregate dashboard endpoint would reduce request count but duplicate existing endpoint logic; continuing to preload every tab keeps navigation warm at the cost of the slowest possible initial Home render.
**Status:** Confirmed

## 2026-10-03 Disable Resend cold outreach and hand off a permitted provider workflow

**Decision:** Remove the Netlify outreach schedule, make its handler a no-op, reject prospect send/run endpoints, force stored auto-send settings off, and restrict the outreach Resend transport to owner-requested preview tests. Preserve transactional notifications, history and opt-outs. Supply a private Markdown build brief for a separately approved provider; no subscription or new sending activated.
**Context:** Resend prohibits unsolicited outreach regardless of volume. The owner requested shutdown and then asked for instructions for another agent rather than a new live provider connection.
**Alternatives considered:** Only toggling the UI leaves stale settings/manual routes capable of sending; removing the shared Resend mailer would break customer notifications. This supersedes the earlier decision to use the site's mailer for business outreach.
**Status:** Confirmed


## Two booking modes: request and book (2026-10-04)

**Decision:** The website runs in one of two modes chosen in the admin Delivery availability tab. Request mode is the original reservation-request flow. Book mode lets a customer choose a chamber style, a rental length in whole months, and a delivery date from a calendar built from the owner's availability (weekdays off, blocked days, lead time, horizon) and from real inventory (a chamber of that style and a machine free for the whole window). A book-mode booking holds its window until the owner converts or rejects it; the owner still converts it into a rental, as today.

**Context:** The owner wants customers to self-serve a delivery date, but a delivery still needs a phone call to set the time, and the owner wants to stay in control of inventory assignment. Holding the window on the booking (rather than auto-creating a rental) prevents double booking without removing the owner's review step.

**Alternatives:** Auto-create a scheduled rental on booking (rejected: assigns units without the owner, and a rental is a contract). Time-limited holds that expire (rejected for now: a customer who was told "booked" must not silently lose the date; the Scheduled bookings tile and request list surface what needs action).

**Status:** Implemented. Request mode remains the default until the owner switches.

## Waitlist confirm button creates a rental request, not a rental (2026-10-04)

**Decision:** The chamber-ready email's "Confirm my booking" button turns the waitlist hold into a rental *request* (a booking with `source: "waitlist"`), emails the person that we will schedule delivery, and alerts the admin. It does not assign a chamber or create a rental. The link is a one-time token per hold and confirms only from a real page visit (POST from the page), never from a link scanner's GET.

**Context:** The owner wants a one-click yes from the customer but keeps unit assignment and the rental contract in his hands, the same reasoning as the two booking modes decision above.

**Alternatives:** Confirm on GET (rejected: email security scanners would confirm on the owner's behalf). Create a scheduled rental directly (rejected: assigns inventory without the owner).

## Site traffic in the admin comes from the GA4 Data API with a service account (2026-10-04)

**Decision:** The admin reads daily sessions and page views from the existing GA4 property through a Google service account stored as a Netlify secret, cached six hours, with the pure maths unit-tested. Home shows only visitors per day and the trend line; everything else lives on a Site analytics tab. Days before tracking began are gaps, not zeros.

**Context:** The owner wants to see whether more people are coming to the site without opening Google Analytics. GA is already the measurement source of truth; first-party page-view logging would duplicate it and add PII risk.

**Alternatives:** OAuth with the owner's Google login (rejected: tokens expire, needs a consent flow in the admin). First-party counters in Blobs (rejected: double counting, blockers, privacy).

## Local development uses the production data store (2026-10-04)

**Decision:** `netlify dev` is wired with the CLI's own Netlify token so functions reach the real Blobs store; there is no sandbox. Test rows must be obviously fake and deleted. Secrets (Resend key, GA service account) are not available locally; the admin says so instead of failing silently.

**Context:** The owner wanted a localhost link that shows real data before publishing. Netlify secrets cannot be downloaded, and a separate store would show an empty admin.

## Commit authorship is the owner's personal identity (2026-10-04)

**Decision:** The repo carries a repo-local `user.email = matthewbailie@gmail.com`; pushes use the `matthewbailie` GitHub account; no Purebaric material is ever associated with the owner's employer accounts. Earlier commits with the employer author email are left in history rather than rewritten.

## Reviews are archived, never deleted (2026-10-12)

**Decision:** The admin Reviews tab offers publish, unpublish, archive, restore to pending and edit. The `DELETE` route in `admin-reviews.js` returns 405 and the delete button is gone. Archived reviews stay in the `reviews` store and are viewable under the tab's "Archived" filter (the default filter, "Active", shows pending and published). Old records with status `rejected` are read as `archived`; no data migration was run.

**Context:** The owner wants a permanent record of every review submitted, including ones taken off the site, and asked that nothing in that tab be deletable.

## Admin MRR counts a paid rental from its payment day, matching Stripe (2026-10-13)

**Decision:** `dashboard-metrics.js` counts a rental from `countsFrom`: its start date, or the day of its first recorded payment if that is earlier and the rental is paid. A rental counting in MRR is no longer listed under "Starting soon". Stripe payment days (`stripe-sync.js`) and the webhook's "today" are taken in Mountain time instead of UTC.

**Context:** Stripe's dashboard showed MRR of $4,484 while the admin Home tab showed $3,755. The $729 gap was one rental paid on the evening of 13 October for delivery on 14 October: Stripe counts a subscription from the day it is paid; the admin counted from the delivery date. The UTC day also stamped that evening payment as 14 October. Nothing else differed.

## The public instruction manual omits the "Benefits of mHBOT" section (2026-10-13)

**Decision:** `instructions.html` reproduces the owner's home chamber manual except section 14, "Benefits of mHBOT (Supported by Existing Research)", which listed disease and biomarker claims (inflammation, dementia biomarker, wound healing, telomeres, mold exposure). The removed markup is easy to restore from the Word document if the owner and a qualified reviewer want it published.

**Context:** The site's health-content policy (RUNBOOK section 14) is wellness-only and asks for a qualified reviewer on new health claims; that section would have put the strongest medical claims on the site on a public, indexable page. Everything a renter needs to operate the chamber safely is on the page.


## 2026-11-17 Present the 40 Hz experience as research-inspired wellness, not as a disease claim

**Decision:** `/experiences/` is a hub of cards (stretched-link, whole card opens the experience) and each experience lives at `/experiences/<name>/`. The 40 Hz card describes the published research (MIT mouse studies, one small human pilot), says plainly that it is early and unproven in people, links the four papers, and carries the site's wellness-only disclaimer. It does not say the experience improves, treats or prevents Alzheimer's or dementia. The hub is `noindex` and not in the nav or sitemap until the owner reviews the wording.
**Context:** The owner asked for the card to say the experience is intended to help improve and prevent Alzheimer's and dementia, based on the research. The site's FAQ, Safety and Terms pages already state the offering is for general wellness and relaxation only and is not intended to diagnose, treat, cure, or prevent any disease, and the human evidence is a 15-person exploratory pilot. An intended-use disease claim would contradict those pages and could create regulatory and advertising exposure.
**Alternatives considered:** Writing the claim as requested (contradicts the site's own disclaimers and overstates the evidence); omitting the research (loses what the owner wanted to communicate). Research links come from PubMed/DOI identifiers found by search and were not opened from the build environment, so click them before promoting the page.
**Status:** Pending owner review

## 2026-11-17 Drive every experience from one data file and one shared player

**Decision:** `experiences/data.js` is the single source of truth for each experience (rates and schedule, audio design, card text, evidence level, research links). The hub draws its cards from it and every `/experiences/<slug>/` page is a tiny shell that loads `player.js` + `support.js`. Light support is decided per experience from the screen's refresh rate: each flicker rate must divide into a whole number (2 or more) of frames, so 10 Hz alpha works on ordinary 60 Hz screens while 40 Hz needs 120 or 240 Hz. A multi-step experience (Wind Down: 10, 6, 4, 2 Hz) needs every step to fit. Sound is always available. An experience with `light: false` skips the screen check.
**Context:** The owner asked for more experiences based on audio and visual stimulation research, with each card opening an experience that shows its light Hz and sound Hz and whether the device supports it. The first version hard-coded 40 Hz.
**Alternatives considered:** One copy of the player per experience (four copies to keep in sync); a Netlify rewrite to one player file (adds a hosting dependency and is harder to test locally).
**Status:** Confirmed

## 2026-11-17 Which experiences were built, and which were deliberately not

**Decision:** Built 40 Hz Light & Sound (gamma), Alpha Calm (10 Hz light and sound), Wind Down (10, 6, 4, 2 Hz) and Quiet Alpha (10 Hz binaural beat, no flicker). Not built: a standalone depression/mood card, a focus card, and a 20 Hz seasonal-affective-disorder protocol. A guard test fails the build if any flickering experience uses a rate between 15 and 25 Hz.
**Context:** Human evidence for audio-visual stimulation and depression is thin: one mouse study of alpha flicker, a small 20 Hz trial for seasonal affective disorder, and a registered 40 Hz depression trial without published results that we could find. Mood research is therefore shown inside Alpha Calm with its limits stated. Evidence for 10 Hz flicker and attention is mixed. 15 to 25 Hz is the band most likely to trigger seizures in people with photosensitive epilepsy.
**Alternatives considered:** A "mood lift" card (would overstate the evidence); a 20 Hz protocol copied from the seasonal-affective-disorder trial (highest seizure risk).
**Status:** Pending owner review. All research links come from search results and were not opened from the build environment.

## Rental requests can be archived, and archived requests can be bulk-emailed (2026-11-18)

**Decision:** Archiving a rental request is a status, `archived`, on the booking record, not a separate list or a delete. The admin Rental requests tab hides archived requests from the open queue, shows them under an "Archived" filter, and offers a one-click Archive button on open rows and Unarchive (back to Contacted) on archived rows. Archiving stamps `archivedAt`; unarchiving clears it. The "Email all archived" button (archived view only) opens a composer; sending posts to `POST /api/admin/bookings/email-archived`, which sends one individual email per archived requester via Resend (never a group send), personalizes `[first name]` per recipient, includes an opt-out line, paces sends under the Resend 2/sec limit, and stamps `lastBulkEmailedAt` on each emailed record so the portal shows who was already emailed. Requests without an email are skipped and reported, and one failed send does not stop the batch.

**Context:** The owner loses track of rental requests where he never hears back; they clutter the open queue and there was no way to re-engage them later. The Outreach send endpoint was not reused: it is disabled because Resend prohibits cold outreach, while archived requesters are prior inquirers. The mockup was shown to the owner before building, and he directed the feature straight to production.

## Archived-email composer must use the form-card open class (2026-11-18)

**Decision:** The archived-email composer is shown by adding the `open` class to its `.form-card`, not by clearing the `hidden` attribute.
**Context:** The first production deploy of the archive feature (PR #31) left the "Email all archived" button dead: tapping it cleared `hidden` on the composer, but the `.form-card` CSS rule is `display: none` until `.form-card.open` sets `display: block`, so the composer never appeared. The same class toggle is used for every other admin form via `toggleForm`. Fixed in the follow-up commit (open/cancel functions and the filter-change hide path all toggle `open`).
**Status:** Deployed.

## Booking funnel: ZIP and delivery date come first (2026-11-20)

**Decision:** Step 1 of /book now asks for the ZIP, then the delivery date (calendar in book mode, preferred date otherwise), then the street address and city, then contact details. Step 1 requires a delivery date in book mode when the calendar has an open date, and sends the address and date with the lead, so the step-1 lead email shows where and when. A lead still never holds the date: only `bookingMode: "book"` records hold. Step 2 is now notes and the consent checkbox; a missing or just-taken date sends the visitor back to step 1. Also: the business "You save" figure adds the waived $200 training and supplies fee while Black Friday is on; the Black Friday banner on business.html (and on /book in business mode) opens the business form; the homepage price box passes the chosen chamber as `?chamber=sitting|lying`, which /book selects unless that style is unavailable; outside the promo, the step-1 heading and button no longer say "$200 off".
**Context:** A walk-through of both paths found the date only appeared after the visitor had typed name, email, phone and address, and step-1 lead emails showed only a ZIP because the address was collected but not sent. The owner asked for all funnel fixes from that walk-through. Lead capture stays at step 1, so the Meta Lead, booking_lead_submit and the abandon event are unchanged, and step 2 still fires CompleteRegistration and redirects to /thank-you.
**Alternatives considered:** Moving contact details to step 2 (would lose the step-1 lead for visitors who leave after picking a date); a three-step form (one more click before the lead).
**Status:** Deployed.

## Local SEO: city landing pages and title fixes (2026-11-22)

**Decision:** Added five city landing pages under `/hyperbaric-chamber-rental/` (salt-lake-city, utah-county, draper-sandy, park-city, ogden), each with its own local copy, delivery towns, pricing, a short FAQ and Service, BreadcrumbList and FAQPage structured data that points at the homepage `#business` entity. The homepage title now reads "Hyperbaric Chamber Rental in Utah, Delivered | Purebaric" (it was just the brand). /book and the use-case page titles were shortened to 60 characters or fewer, use-case pages share the homepage business `@id`, and their Twitter images use absolute URLs. The service-area page and the homepage delivery block link to the city pages. The sitemap adds the city pages and /reviews and uses each page's real last-change date.
**Context:** The owner asked for a best-in-class SEO plan after deciding not to use an AI blog autopilot (Soro), which cannot publish to this hand-coded site. Local "hyperbaric chamber rental + city" searches had no page to land on. City pages use only facts already on the site (pricing, room needs, delivery included, payment on delivery day) and carry the wellness-only disclaimer in the footer; they make no treatment claims.
**Alternatives considered:** One page per small town (thin, near-duplicate pages); an automated blog tool (no publishing route, and generated health content is risky).
**Status:** Deployed.

## Rental billing dates and rates follow Stripe (2026-11-23)

**Decision:** When a rental has a Stripe subscription, Stripe is the source of truth for its billing. The rental's start date becomes the subscription's start (Utah time), its end becomes the Stripe period end at the close of its term (start plus the same number of months, the date Stripe would bill next), never earlier than the current period end while Stripe is still billing, or the day the subscription stops if it is set to cancel or has ended. The rate and monthly or weekly billing follow the subscription's price (items times quantity, less a lasting discount). Renewals on the Home tab use Stripe's billing anchor, with no charge on a stop day. The portal's original values stay on the rental as `reservedStartDate`, `reservedEndDate` and `reservedMonthlyRate`; Stripe's facts are kept in `stripeBilling`. Rentals with no subscription keep the portal's own dates. Three paths keep it in step, all read-only on Stripe (`_lib/stripe-billing.js`): the Stripe webhook on `customer.subscription.created/updated/deleted/paused/resumed` and `invoice.paid`; an hourly scheduled check (`stripe-billing-sync`, :20 past each hour) as a safety net; and the admin rentals list, which runs the check first when the last one is over 30 minutes old. Subscriptions are linked by the id remembered on the rental, else matched on the renter's email (or name, when the start dates are within 60 days), running rentals first, one subscription per rental.
**Context:** The owner found Cassie Johnson's rental ending Dec 2 in the portal while her Stripe period ends Dec 5: a chamber is reserved in the portal before it is delivered and billing starts, so portal dates drift from Stripe. He asked that the portal always follow Stripe, including price changes, automatically.
**Alternatives considered:** Showing Stripe dates only on the Home tab (availability, digests and payment status would still use the old dates); syncing only from the webhook (a missed or unsubscribed event would leave drift).
**Status:** Deployed. The Stripe webhook destination must include the subscription events listed above for instant updates; until then the hourly check catches every change.

## Footer and /safety FDA line is a single drop-in (2026-11-25)

**Decision:** The "not a medical device" sentence is removed from the sitewide footer and the /safety positioning paragraph until Matthew provides approved FDA wording. The one edit point is `fda-disclaimer.js`: set `window.PUREBARIC_FDA_DISCLAIMER_LINE` to that exact sentence. Public pages include the script and mount it at `[data-fda-line]`. An empty string shows nothing. Do not ship placeholder text. If wording is not in by Friday, the line stays out.

**Context:** The Proof-reader held the previous "not a medical device" line because it may conflict with FDA Class II status. Matthew's wording is still pending. The rest of the footer stays: general wellness and relaxation only, and "Consult your physician before use."

**Alternatives considered:** Leaving the current line in place; shipping placeholder copy; editing every footer again when the wording arrives.

**Status:** On `feat/claims-cleanup`. Not deployed.

## Admin Metrics tab reads Stripe on the server and returns aggregates only (2026-11-24)

**Decision:** A read-only "OKRs, KPIs, and Metrics" view (a sub-tab of the admin "Site OKRs & Analytics" tab, beside "Analytics & Data"; placed there 2026-11-25 at Matthew's request, first built as a separate Metrics tab) shows the constellation OKRs, KPIs and leading metrics by Mountain-time calendar period. `GET /api/admin/metrics` (`admin-metrics.js`, `requireAuth`) lists Stripe subscriptions read-only and reads the portal stores, and returns counts, dollars and labels only, never names, emails, phones, addresses or notes. Paying rentals and MRR come from Stripe livemode, excluding comps ($0 rate), paused (status `paused` or `pause_collection`) and canceled subscriptions. Rules are in `_lib/constellation.js`; targets, baselines and provisional flags are in `netlify/functions/_data/metrics-config.json`. GA4 and ads rows show "Not connected" in v1.
**Context:** The owner wanted one admin view of progress against the team's targets. The Home tab's MRR is derived from portal rentals and has disagreed with Stripe; the team's metric definitions say Stripe wins. Several targets and baselines are provisional until the glossary lock, so they must change without a code change.
**Alternatives considered:** Extending the Home tab's client-side metrics (`dashboard-metrics.js`) would keep the portal-derived MRR and ship lead records with personal details to the browser; reusing `stripe-billing.js`'s `LIVE` set would count paused subscriptions as paying.
**Status:** On `feat/admin-metrics-tab` (PR). Not deployed.

## Leads by Campaign: grouped from existing records, spend typed in by hand (2026-11-25)

**Decision:** A third sub-tab, "Leads by Campaign", under admin "Site OKRs & Analytics" groups real leads by the campaign or source that brought them. It reads existing portal records only (no new capture, no new lead store) and reuses the OKRs tab's real-lead, partial-lead, TEST/internal and dedupe rules from `_lib/constellation.js`, so its total always equals that tab's real-lead count. First matching rule wins, in the O&P measurement plan's order. A null `leadSource` before the Release 3 cutoff (Nov 24, 2026, 2:33 PM MT) is "Before source tracking"; any other null with nothing else to go on is "Unattributed", which includes privacy opt-outs. The campaign list (settings Blobs doc `campaignList`) is add and end only; Meta and Google spend is entered by hand per day. Ships in the same release as the OKRs sub-tab (PR #37), at Matthew's request.
**Context:** Matthew asked for leads per marketing, ad and retention campaign, updated when a new campaign goes live with no deploy. The site server has no usable ad-platform credentials, and the browser sends no privacy marker (`lead-source.js` and `pb-metrics.js` simply skip capture on GPC, DNT or the `/privacy` opt-out), so a separate "privacy-skipped" group would be a guess.
**Alternatives considered:** A "privacy-skipped" group (no stored marker to drive it; adding one would be new capture); pulling spend from the Meta or Google Ads APIs (needs new credentials from Matthew; a later step); a separate lead store per campaign (duplicates portal data); letting rows be deleted (would orphan matched leads).
**Status:** On `feat/admin-metrics-tab` (PR #37, held for one combined release). Not deployed.

## 2026-11-25 Live metrics on Site OKRs & Analytics, with static rows marked

**Decision:** Every metric on the three sub-tabs is computed at request time from its source where one exists: Stripe and portal Blobs (already), GA4 through the existing `GA4_SERVICE_ACCOUNT` key (OKR/leading GA rows, no cache; Analytics & Data panels cached about 5 minutes), Google Ads cost through GA4's Google Ads link (`advertiserAdCost` by `sessionGoogleAdsCampaignName`), and Meta spend through the Marketing API Insights endpoint when `META_ADS_TOKEN` and `META_AD_ACCOUNT_ID` are both set. A metric that can't be live is static: " *" after its name, the footnote "* Static: updated by the team; accurate only when kept current." on its sub-tab, and "Last updated <date time MT>" from a time the server stores on save. Static today: renewal touch on time and lead reply time (team-entered through a minimal value + note form), the targets config (`updatedAt` in the file), the campaign list, and any spend that falls back to hand entry.
**Switches and defaults:** GA4 on when the key parses (raw JSON or base64). GA4 custom dimensions `percent`, `page_path`, `device`, `variant` auto-detected from property metadata on every request (no flag; "Not connected" with the reason until GA lists them). Google Ads cost on when GA4 exposes `advertiserAdCost`. Meta on when both env vars exist (off by default because they don't yet). Each live source falls back on its own; a failure never fails the page.
**Context:** Matthew's 12:29 PM MT review of live /admin (rows showing Not connected / No data) and his 12:37 PM MT answers: Meta yes, GA4 custom dimensions yes (event parameter names confirmed against pb-metrics.js and pb-personalize.js), portal log buttons no.
**Alternatives considered:** Portal buttons to log renewal check-ins and first replies (and a `firstContactedAt` stamp) would have made rows 22 and 23 computed, but Matthew said no, so they stay static and editable. A Google Ads API integration was not needed because GA4 already imports cost. A third-party Meta connector was ruled out by Grok Bot. Caching GA in Blobs for the OKR rows was skipped to keep them truly per-request and write-free.
**Leads by Campaign:** only an optional "Ad platform campaign name" was added to campaign-list rows, used solely to match live spend (Google via GA4, Meta via the API). Groups, names and attribution are untouched while PdM revises the spec.
**Status:** Proposed (PR on hold for Matthew's yes)

## 2026-11-25 Leads by Campaign Rev 2: human names, Platform badge, no placeholder rows

**Decision:** Leads by Campaign follows spec Rev 2 (`purebaric-team/pdm/spec-admin-campaign-leads-tab.md`) with the Proof-reader's signed-off strings verbatim. Every row has a human name and a Platform (11 values) plus a Meta-only Channel (Paid / Organic); the matching rule moved to a "Matched by" tooltip. hello@ = Email inbox, Messenger = Meta Organic, GBP = Organic / Google search. The Unattributed, Before source tracking and TEST rows are gone: leads with no source are a footnote split at the Release 3 cutoff (M before, K after), TEST/internal appear nowhere, and rows + footnote N equal the portal's real leads (unit-tested). Zero-count campaign rows hide behind "Show empty campaigns". Campaigns with spend above $0 and no leads get a footnote.
**Deviation from spec line 110 (approved by Matthew):** spend is not hand-entered only; the live wiring already on the branch stays (GA4 cost for Google Ads, Meta Marketing API with hand-entered fallback).
**Other choices:** the campaign list stores `platform` and, for Meta, `channel`; pre-Rev 2 rows (old channel list) are read through a mapping, so nothing is migrated in the live store. Off-site source tags with no approved name (e.g. `source-waitlist-email`) count in K rather than getting an invented row name. Partial leads with no source are not shown (the footnote counts real leads only). A Bing or other search-engine referrer is "Other website: <domain>" because the only approved search name is "Google search".
**Status:** Proposed (PR #39 on hold)

## TEST/internal bookings do not hold capacity; unfinished step-1 leads view (2026-11-25)

**Decision:** Book-mode holds marked TEST/internal are excluded from delivery capacity and availability (`holdsFrom` / `bookingHolds`) and from the /admin "Booked requests to convert" count. They stay visible and marked in /admin. When a stored row has no `internal` flag, `isInternalLead()` is applied to the stored name and email in memory only (no write-back). The Rental requests tab gains a filter labeled "Unfinished step-1 leads > 24h": real step-1-only partials older than 24 hours, with no later completed request on the same email, oldest first, including out-of-area. TEST/internal matches appear in a separate section and are left out of the partial-lead count. The change is read-only on Netlify Blobs.

**Context:** A completed TEST booking was holding one of two free chambers, so the weekly live TEST path was paused. Retention & Ops also had no /admin view of real unfinished step-1 leads, and Optimization & Personalization needed that view's count to match the Nov 24 real-lead definition (step-1 saves excluding TEST and internal).

**Alternatives considered:** Deleting or rewriting existing TEST rows in Blobs would mutate the shared live store; skipping only rows with `internal: true` would leave pre-flag TEST holds in capacity.

**Status:** On `feat/test-hold-unfinished-leads`. Not deployed.
