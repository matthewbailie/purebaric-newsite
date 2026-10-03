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
