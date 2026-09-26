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
