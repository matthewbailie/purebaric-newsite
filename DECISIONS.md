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
