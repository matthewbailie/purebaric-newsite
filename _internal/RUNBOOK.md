# Purebaric.com — Operations & Maintenance Runbook

A complete handoff for anyone (human or AI agent) running and maintaining **purebaric.com**: where it's hosted, how it's built, the services involved, the email/SMS automation, logins, and how to ship changes safely.

_Last updated: 2026-09-21._

> ⚠️ **This file contains NO passwords, tokens, or API keys — on purpose.**
> Secrets live in the owner's password manager and in the Netlify dashboard
> (Site configuration → Environment variables). Never paste a real secret into
> this file, into chat, into git, or into any code file.
>
> This doc lives in `_internal/` and is intentionally **not served publicly**
> (a forced 404 redirect in `netlify.toml` blocks `/_internal/*`). It is tracked
> in git for the team.

---

## 1. TL;DR

- **Hosting:** Netlify (static site + serverless Functions + Blobs + Identity). Manual deploys.
- **Domain:** purebaric.com, registered at **Namecheap**, DNS on **Netlify DNS**.
- **Email:** outbound via **Resend**; inbound `@purebaric.com` forwarded via **ImprovMX**.
- **SMS lead alerts:** optional, via the phone carrier's free email-to-text gateway (set one env var to turn on).
- **Analytics/SEO:** GA4, consent-gated (analytics + Google Ads **measurement** on after consent; personalized ads/remarketing off). `robots.txt` + `sitemap.xml` + JSON-LD structured data present.
- **Source:** `~/projects/purebaric-newsite` (local git; **no remote** — commits + Netlify deploys are the record).
- **Ship a change:** edit → `netlify deploy` (preview) → `netlify deploy --prod` → `git commit`.

---

## 2. Architecture (schematic)

```
                         purebaric.com  (registrar: Namecheap → Netlify DNS, SSL on)
                                   │
   Visitor ── HTTPS ─────────────▶ Netlify CDN
                                   │   serves static HTML / CSS / JS
                                   │   (index.html, book.html, pricing.html, blog/…, images/…)
                                   │
   Public forms (booking,          │  POST /api/*   (netlify.toml rewrites to functions)
   contact, waitlist) ────────────▶ Netlify Functions  (Node.js, netlify/functions/*.js)
                                        │            │              │
                                        ▼            ▼              ▼
                               Netlify Blobs      Resend       Carrier email-to-SMS
                               (JSON data store)  (email)      gateway (text alert)
                                        ▲
   Admin ── login (Netlify Identity) ──▶ /admin.html ──▶ admin-*.js functions ──▶ Blobs

   Inbound mail to @purebaric.com ──▶ ImprovMX ──▶ owner inbox
   Analytics ──▶ GA4 (browser, consent-gated via /pb-metrics.js)
   Scheduled ──▶ expire-holds.js runs hourly (Netlify cron) to free expired holds
```

| Layer | Technology |
|---|---|
| Public pages | Static **HTML/CSS/JS** |
| Backend / APIs | **Netlify Functions** (Node.js) in `netlify/functions/` |
| Admin auth | **Netlify Identity** (login at `/admin`) |
| Data storage | **Netlify Blobs** (no external database) |
| Outbound email | **Resend** |
| Outbound SMS (optional) | Phone **carrier email-to-text gateway** (via Resend) |
| Inbound email (@purebaric.com) | **ImprovMX** forwarding |
| DNS | **Netlify DNS** (domain at Namecheap) |
| Analytics | **Google Analytics 4** (consent-gated) |

**Do not migrate this to PHP/WordPress and do not change DNS.**

---

## 3. Accounts & logins

Owner: **Matthew Bailie**. No secrets are stored here — get credentials from the owner's password manager.

| Account | Purpose | Sign in at | Notes |
|---|---|---|---|
| **Netlify** | Hosting, deploys, Functions, Identity, Blobs, DNS, env vars | app.netlify.com | Owner login `matthewbailie@gmail.com`. Team **Purebaric**. This is the main control panel. |
| **Netlify Identity user** | Logs into the `/admin` portal | `https://purebaric.com/admin` | Admin email + password (password manager). Any valid Identity user can access; no role required. |
| **Namecheap** | Domain registrar for purebaric.com | namecheap.com | Only needed if nameservers change (normally never — DNS is delegated to Netlify). |
| **Resend** | Sends all transactional email | resend.com | API key stored as a Netlify env var (`RESEND_API_KEY`). Sending domain `purebaric.com` must stay verified (SPF/DKIM). |
| **ImprovMX** | Forwards inbound `@purebaric.com` mail | improvmx.com | Rarely touched. |
| **Google Analytics** | GA4 web analytics | analytics.google.com | Property "Purebaric Website" (see §9). |
| **Twilio** (optional, not set up) | Reliable SMS if the free gateway is dropped | twilio.com | Only if you upgrade SMS (see §7). |

### Netlify site facts
- Site name: **purebaric**
- Site ID: **3e2c12f7-e737-4849-90aa-6b6134edbfab**
- Custom domain: **purebaric.com** (SSL on)
- Deploy method: **manual** via `netlify deploy` (NOT git-connected)

### Public contact details (shown on the site)
- Email: **hello@purebaric.com** (forwarded by ImprovMX)
- Phone / text: **(801) 901-0873** — shown on every page **except the homepage** (owner's choice) and in transactional emails.
- Hours shown: Mon–Sat, 8:00 AM – 6:00 PM MT.
- Admin notifications go to **matthewbailie@gmail.com**.

---

## 4. Environment variables (Netlify → Site configuration → Environment variables)

Values live only in Netlify. Env-var changes require a redeploy to take effect for Functions.

| Variable | Required? | Purpose |
|---|---|---|
| `RESEND_API_KEY` | **Yes** | Resend sending key. Without it, no email (or SMS) sends. |
| `NETLIFY_API_TOKEN` | **Yes** | Lets the Functions reach Netlify Blobs. Must be a Netlify **Personal Access Token set to "No expiration."** An expired token is what causes Blobs 401 errors (see §11). (`NETLIFY_AUTH_TOKEN` is accepted as a fallback name.) |
| `NETLIFY_SITE_ID` | **Yes** | The site ID above, used for Blobs. (`SITE_ID` accepted as a fallback name.) |
| `ADMIN_SMS_GATEWAY` | Optional | Turns on the SMS lead alert. Value = `<10-digit-cell>@<carrier-gateway>` (see §7). If unset, no texts send — everything else is unaffected. |
| `GA4_API_SECRET` | Optional | Turns on server-side GA4 conversions (`booking_request_submit`, `rental_confirmed`). Measurement Protocol secret from GA4 → Admin → Data Streams → the web stream → Measurement Protocol API secrets. If unset, those conversions are not sent — the site is otherwise unaffected. |
| `STRIPE_SECRET_KEY` | Optional | Turns on Stripe payment links. Stripe → Developers → API keys → Secret key (`sk_test_…` to trial, `sk_live_…` for real charges). If unset, the "Create link" button reports Stripe isn't configured. |
| `STRIPE_WEBHOOK_SECRET` | Optional | Verifies the payment webhook so paid rentals auto-reconcile. Stripe → Developers → Webhooks → add endpoint `https://purebaric.com/api/stripe-webhook` (events: `payment_intent.succeeded`, `checkout.session.completed`) → copy the Signing secret (`whsec_…`). Required for auto-reconciliation. |

---

## 5. Source of truth, deploy workflow, rollback

All code lives locally at **`~/projects/purebaric-newsite`** (local git; no remote). Edit here, then deploy.

```bash
cd ~/projects/purebaric-newsite

# 1. Edit files (HTML/CSS/JS in the root; functions in netlify/functions/)

# 2. Preview to a temporary URL (does NOT affect the live site)
netlify deploy

# 3. Publish to the live site
netlify deploy --prod --dir .
#    If you changed anything in netlify/functions/, add --skip-functions-cache
#    so the updated function code is bundled:
#    netlify deploy --prod --dir . --skip-functions-cache

# 4. Record it in git history
git add -A && git commit -m "describe the change"
```

First-time CLI setup: `npm i -g netlify-cli` → `netlify login` → `netlify link --id 3e2c12f7-e737-4849-90aa-6b6134edbfab`. Requires Node ≥ 22.

**Rollback:** Netlify → site **purebaric** → **Deploys** → pick a known-good deploy → **Publish deploy**. (Deploy IDs change every push; find the one you want in that list rather than hardcoding it.)

**Dead-end folders on this machine — do NOT use for the live site:** `~/projects/purebaric.com` and any `purebaric.com-main*.zip` (a Laravel rewrite, wrong tech), `~/projects/purebaric-deploy`, `~/projects/purebaric-live` (pre-redesign reference), `~/projects/purebaric-site`, `~/projects/purebaric-mockups` (design mockups only). The GitHub repo `matthewbailie/purebaric.com` is the dead Laravel code — ignore it.

---

## 6. File map & data

```
purebaric-newsite/
├── index.html                 (homepage — self-contained: inline CSS/JS, hero carousel,
│                               pricing slider, mobile sheet, lightbox, counties map)
├── book.html                  (reservation request form)
├── pricing.html, chambers.html, how-it-works.html, faq.html,
│   contact.html, about.html, waitlist.html, service-area.html, privacy.html, 404.html
│                               ↑ these share /warm.css + /warm.js  (the "warm" design system)
├── safety.html, terms.html, practitioners.html,
│   blog.html, blog/<slug>.html, use-cases/<slug>.html
│                               ↑ still the older "teal" design (styles.css + build/assets/*)
├── admin.html                 (admin portal UI — Netlify Identity)
├── warm.css, warm.js          (shared warm shell)
├── styles.css, script.js      (legacy teal shell)
├── pb-metrics.js              (consent-gated GA4 loader — see §9)
├── build/assets/app-*.css|js  (legacy Tailwind/Vite bundle used only by teal pages)
├── images/                    (chamber photos, logos, hero carousel images, favicon)
├── robots.txt                 (allows all; disallows /admin + /_internal; points to sitemap)
├── sitemap.xml                (all public pages — UPDATE when you add/remove a page, then resubmit in Search Console)
├── pb-metrics.js              (consent-gated GA4 + Google Ads consent — see §9)
├── netlify.toml               (/api/* → functions, /_internal/* → 404, hourly cron, /images/* cache header)
├── _internal/                 (RUNBOOK.md, SITE-EVALUATION.md — NOT served publicly)
└── netlify/functions/
    ├── availability.js         (public: how many chambers free today)
    ├── booking-submit.js       (public: /api/booking-submit — the reservation flow)
    ├── waitlist-join.js        (public: /api/waitlist-join)
    ├── contact-submit.js       (public: /api/contact-submit)
    ├── admin-*.js              (auth-gated: chambers, rentals, bookings, waitlist, customers, waiver)
    ├── expire-holds.js         (scheduled hourly; frees expired holds / transitions rentals)
    └── _lib/
        ├── storage.js          (all Netlify Blobs reads/writes)
        ├── email.js            (Resend send + email templates + SMS helper)
        └── admin.js            (requireAuth: needs a valid Identity login)
```

**Data (Netlify Blobs) stores:** `chambers`, `rentals`, `bookings`, `waitlist`, `customers`, `waivers`. Manage contents through `/admin`. **Chambers are physical inventory rows in Blobs, not code** — to add/retire a unit you edit it in `/admin`, not in the repo. Blobs is **one shared store across all deploys**, so a *preview* deploy that writes data writes to **live** data — use obviously-fake test data and delete it in `/admin` afterward.

---

## 7. Automations — email & SMS

All outbound messaging runs through **Resend** from `netlify/functions/_lib/email.js`.
- **From:** `Purebaric <noreply@purebaric.com>` · **Reply-to:** `hello@purebaric.com` · **Admin alerts to:** `matthewbailie@gmail.com`.
- Templates use the warm brand palette and a readable dark logo band.

### 7a. Reservation lead (the main flow) — `booking-submit.js`
When someone submits `/book` (or `/api/booking-submit`):
1. The lead is saved to Blobs (`bookings`).
2. **ZIP gate** (see §10): if the delivery ZIP is **outside** the service area → mark `outOfArea:true`, **do NOT email the customer**, **do NOT** add to waitlist; email the admin an "Out-of-area request" and (if enabled) text the admin. It shows in `/admin` with an "Out of area · no auto-email sent" badge.
3. If **in area**: auto-route — if a chamber is available today, email the customer a confirmation; otherwise add them to the waitlist and email the waitlist confirmation.
4. **Always** email the admin a "Booking request" summary, and (if enabled) **text the admin**.
5. Failures in email/SMS/routing are caught and logged — they never block the submission.

### 7b. Other flows
- **Waitlist** (`waitlist-join.js`): saves to Blobs, emails the admin, emails the customer a confirmation. Fires the `waitlist_join` analytics event.
- **Contact** (`contact-submit.js`): emails the admin (subject includes the topic). Contact messages are **emailed, not stored** in Blobs.
- **Scheduled** (`expire-holds.js`): runs hourly (`netlify.toml` cron `0 * * * *`) to release expired holds / advance rental states by date.

### 7c. SMS lead alerts (carrier email-to-text) — how to turn on
The admin gets a **text** on every reservation lead (normal + out-of-area) **in addition to** the email. It reuses Resend by emailing the phone carrier's SMS gateway, so it's free. The code (`notifyAdminSms` in `_lib/email.js`, called from `booking-submit.js`) is a **no-op until `ADMIN_SMS_GATEWAY` is set**.

To activate: set the Netlify env var `ADMIN_SMS_GATEWAY` to `<10-digit-cell>@<carrier gateway>`, then redeploy. Common gateways:

| Carrier | Gateway (append to the 10-digit number) |
|---|---|
| Verizon | `@vtext.com` |
| T-Mobile / Metro / Mint | `@tmomail.net` |
| AT&T / Cricket | `@txt.att.net` |
| Google Fi | `@msg.fi.google.com` |
| US Cellular | `@email.uscc.net` |

Example: `8015551234@vtext.com`. Example text: _"New Purebaric lead: Jane Smith, (801) 555-1234, ZIP 84043, 6 months. Check email or the admin portal to follow up."_

**Caveat / upgrade path:** carrier gateways are increasingly spam-filtered and some carriers are retiring them, so a text may occasionally be delayed or missed (the email always still sends). If it gets flaky, upgrade to **Twilio**: add `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_FROM`, `ADMIN_SMS_TO` env vars and switch `notifyAdminSms` to Twilio's REST API (~$1.15/mo for a number + fractions of a cent per text).

### 7d. Email deliverability
If customer confirmation emails don't arrive, check Resend: the sending domain `purebaric.com` must be verified (SPF/DKIM). Admin alerts generally work first because they go to a Gmail address.

---

## 8. Public forms

| Form (page) | Posts to | Mechanism |
|---|---|---|
| Booking (`book.html`) | `/api/booking-submit` | Warm page, vanilla `fetch` (urlencoded). Carries `?months=` and `?zip=` from the homepage/pricing to prefill. Appends the chosen plan + acknowledgment to the notes. |
| Contact (`contact.html`) | `/api/contact-submit` | Warm page, vanilla `fetch`. Fields: `name`, `email`, `phone`, `topic`, `message`. |
| Waitlist (`waitlist.html`) | `/api/waitlist-join` | Warm page, vanilla `fetch`. Also handles `?reason=out-of-area`. Fields: `first_name`, `last_name`, `email`, `phone`, `city_zip`, `rental_length`, `urgency`, `earliest_start`, `notes`, consent. |

The functions accept the frontend field names plus aliases (`customer_name`, `zip_code`, `city_zip`, etc.). The old jQuery "booking modal" that used to live on the legacy pages has been **removed** — every "Reserve" link now goes to `/book`. If you change a form's fields, update the matching function.

### Reviews / testimonials (added 2026-09-21)

Customer testimonials with a moderation gate. **No star ratings** by design — testimonials read stronger than a sparse star average for a new, low-volume, trust-based service (revisit only if the owner asks; the store has no rating field).

- **Store:** `reviews` Blobs store. Shape `{ id, firstName, lastInitial, city, text, status: "pending"|"published"|"rejected", createdAt, publishedAt }`. Helpers in `storage.js`: `listReviews`, `listPublishedReviews`, `createReview` (always `pending`), `updateReview`.
- **Public submit:** `/reviews` page → `POST /api/reviews-submit` (`reviews-submit.js`). Fields: `firstName`, `lastInitial` (1 char), `city` (optional), `text`. Honeypot `bot-field`, length caps, emails the owner via `notifyAdminReview`. Every submission is saved **pending** — nothing is public until the owner publishes.
- **Public read:** `GET /api/reviews` (`reviews-public.js`) returns **published only**, safe fields, 60s cache. The homepage "What renters say" band (`#reviewsBand` in `index.html`) fetches this and **stays hidden unless ≥1 published review**; `/reviews` lists them all.
- **Moderate:** admin **Reviews** tab → `/api/admin/reviews` (`admin-reviews.js`, auth). Publish/unpublish/reject/edit/delete. Publishing stamps `publishedAt`; unpublish/reject clears it.
- **Flow:** submit → `pending` (+owner email) → admin **Publish** → shows on `/reviews` + homepage. Reject or Delete for spam.
- Footer "Reviews" link is on the 12 standard-footer warm pages (the legacy teal pages — safety/terms/practitioners/blog — don't have it yet). Top nav intentionally left at 6 items.

---

## 9. Analytics & advertising measurement (GA4 + Google Ads)

- Property **"Purebaric Website"**: account `408850169`, property `555169638`, stream `15813569788`, **Measurement ID `G-Q1X04YRWP1`**. Do **not** reuse the old Nerd United ID `G-9FK4XB9FDX`.
- Loaded + consent-gated by **`/pb-metrics.js`** (in the `<head>` of every public page; `/admin` excluded). It is deliberately **not** named `analytics.js` (ad/privacy blockers block that filename). The Measurement ID lives once, as `GA_ID` in `pb-metrics.js`. All tracking calls are optional (`window.trackPurebaricEvent?.(...)`) so a blocked/late script never breaks a form.

**Consent mode v2 — OPT-OUT (US-only), set in `pb-metrics.js`. Updated 2026-09-22:**
- Purebaric operates/advertises only in Utah (US), not the EEA, so this is **opt-out**, not opt-in.
- **Default** (top of the script): `analytics_storage`, `ad_storage`, `ad_user_data` = **granted**; `ad_personalization` = **denied**. GA4 **loads on page load** (so `page_view` + `gclid` are captured and conversions attribute). This is the fix for the earlier "0% ads-consent / conversion tracking incomplete" problem (the old code denied by default and only loaded after Accept, so most visitors were never measured).
- **Returning decliner:** if `localStorage.pb_cookie === 'decline'` (or teal `purebaric_cookie_consent === 'declined'`), the default is denied and GA does **not** load.
- **Accept** (`loadPurebaricAnalytics`): re-grants the three measurement signals (personalization stays denied) and ensures the tag is loaded.
- **Decline** (`declinePurebaricAnalytics`): denies all four and remembers it (`pb_cookie='decline'`).
- If Purebaric ever advertises **outside Utah/into the EEA**, switch to region-aware consent (deny-by-default there) before expanding. `ad_personalization` stays denied unless the owner enables remarketing.
- The cookie banner remains as an opt-out + transparency control; `/privacy` "Analytics and cookies" describes the opt-out model. Keep banner text + privacy + this file in sync.

**Events (NEVER pass PII — only allowlisted scalar values, never a form/FormData/API response/ZIP/free text):** `select_rental_plan`, `service_area_check` (result only, never the ZIP), `booking_form_start`, `booking_request_submit` (accepted reservation request), `close_convert_lead` (admin created/linked the scheduled rental), `booking_request_error`, `contact_submit`, `waitlist_join`.

**Google Ads conversion stages:**
- `booking_request_submit` is the accepted lead. It is sent once by `booking-submit.js` after the backend accepts an in-area request. Keep it **Primary** in Google Ads while confirmed-rental volume is still low so bidding has enough feedback.
- `close_convert_lead` is the completed-rental outcome. It is Google's recommended event for a qualified lead that becomes a customer and includes the confirmed rental value. It is sent once when the admin links the request to the exact scheduled rental and marks it converted. Keep it **Secondary** for observation until it has accumulated at least 2–3 conversion cycles and approximately 10–15 confirmed rentals in a recent 30-day period. Then switch it to Primary and move `booking_request_submit` to Secondary.
- `/pb-metrics.js` captures anonymous GA `client_id` + `session_id` at form submission and stores them on the private booking record. The later server-side event reuses those identifiers so GA4 can connect the offline confirmation to the original web/ad journey. No name/email/phone/address/ZIP/notes are sent to GA.
- Both conversion events are sent from the backend through GA4 Measurement Protocol. Set `GA4_API_SECRET` in Netlify (server-only); `GA4_MEASUREMENT_ID` is optional because the code defaults to `G-Q1X04YRWP1`.
- The admin flow carries `sourceBookingId` into the rental form, links the exact returned rental ID, and records an analytics status on the booking for idempotency. A visitor opt-out is honored; missing attribution on older records is reported without fabricating a conversion.
- `booking_submit` remains removed. Do not import it, and do not count both the request and confirmed rental as Primary.
- GA4 must stay **linked to Google Ads** (Admin → Product links). The link is active: the GA4 tag auto-loads the linked Ads tag `AW-18178623665` (seen in the network as `google.com/ccm/collect`), which is Google's doing, not our code.

**Deferred (needs Stripe):** `begin_checkout`, `purchase`, `refund` — not built (no checkout yet). Keep the Measurement Protocol secret server-side only.

### SEO & structured data
- **`robots.txt`** (root) allows all, disallows `/admin` + `/_internal/`, and points to the sitemap. **`sitemap.xml`** (root) lists every public page — **update it whenever you add or remove a public page**, then re-submit it in Google Search Console.
- **Structured data (JSON-LD):** homepage carries an enriched `LocalBusiness` (`@id` `https://purebaric.com/#business`) with telephone, opening hours, contactPoint, geo, and areaServed. **NAP is standardized to Salt Lake City, UT** (it used to say Park City — keep it Salt Lake City everywhere: footer, schema, and any Google Business Profile). `/faq` has `FAQPage`; `/pricing` has `Service` + `OfferCatalog` (the 4 rental tiers, `provider` `@id` the business); both blog posts have `Article`. All `canonical` + `og:url` are absolute `https://purebaric.com/...`. Validate any new JSON-LD in Google's Rich Results Test before deploying, and keep prices in the OfferCatalog in sync with §10.
- Page titles ≤ ~60 chars, meta descriptions ≤ ~160. `/images/*` is cached one week via a `netlify.toml` `[[headers]]` block; the first hero slide is preloaded (`fetchpriority=high`) and the other images are `loading="lazy"` with explicit width/height.

---

## 10. Pricing & delivery area (where to edit)

**One chamber, length-tiered pricing** (Soft-Shell 1.5 ATA; the "1.5 ATA Sitting Chamber" is Coming soon · Late Oct 2026). On the homepage the current unit's card is titled "1.5 ATA Lying Chamber"; the section headline is "Soft-Shell 1.5 ATA mild hyperbaric chambers."

| Rental length | Monthly rate | Savings |
|---|---|---|
| 1 month | $729 | — |
| 2–3 months | $659 | Save 10% |
| 4–11 months | $579 | Save 21% |
| 12 months | $529 | Save 27% |

**Prices are admin-managed (2026-09-23).** Rates are now **per rental length (1–12 months)**, edited in the **admin → Pricing tab**, stored in the `settings` Blobs store (key `pricing`), and served at **`GET /api/pricing`** (`{months:{1..12}}`; admin CRUD at `/api/admin/pricing`). Defaults match the table above. The table above expands per-length as 1:729, 2-3:659, 4-11:579, 12:529.

- **Website reads it live:** `index.html` + `book.html` calculators call `/api/pricing` and use `rate(m)=table[m]` (baked-in fallback if the fetch fails); `pricing.html` tier cards/savings/annual and the `from $X` figures on `index.html`/`chambers.html` update via the same fetch. The `PB_PF` fallback objects and the pricing-page inline `PF` mirror the defaults — keep them in sync if defaults change.
- **Admin rentals:** the rental form's Monthly rate **auto-fills** from the rental length × the pricing table (`updateRentalRate` on date change and on edit-open; booking→rental conversion uses `rateForMonths`). This replaced the old hardcoded `729`.
- **Not auto-updated (static, edit by hand if defaults change a lot):** page `<title>`/meta descriptions, the pricing-page **JSON-LD** offers, and the clinic-comparison numbers ($80–$150, 40-session protocol).

**Delivery area / email routing:** a new in-area reservation routes by *effective* availability = available chambers minus untriaged (`new`) requests: enough capacity → "chamber available" email; chambers exist but spoken for by earlier untriaged requests → "pending availability" email (`notifyCustomerPendingAvailability`, admin badge "pending availability (triage)"); zero chambers → waitlist email. See `booking-submit.js`.

**Delivery ZIP gate** — **admin-managed (2026-09-23).** The rule is a config in the `settings` Blobs store (key `serviceArea` = `{prefixes:[...], zips:[...]}`), edited in the **admin → Service Area tab**, served at **`GET /api/service-area`** (admin CRUD at `/api/admin/service-area`). A ZIP is served if it starts with a 3-digit **prefix** (e.g. `840`→840xx) or is in the explicit 5-digit **zips** list. Defaults mirror the historic gate (`840`/`841`/`844` + Provo/Weber ZIPs); pure rule + tests in `netlify/functions/_lib/servicearea.js`. `booking-submit.js` reads it server-side (authoritative); `book.html`, `index.html`, and `service-area.html` fetch `/api/service-area` and fall back to baked-in defaults if the fetch fails. Counties currently: Salt Lake, Utah, Davis, Weber, Summit, Wasatch, Tooele. **Editorial, still manual:** the homepage "Where we deliver" SVG map + city lists and the `service-area.html` cards are not ZIP-derived — update them by hand if the area changes materially.

---

## 10a. Chamber types & machine sets (inventory model, added 2026-09-23)

A rentable **chamber type** is the pair (**ATA rating**, **posture** lying/sitting). Physical chambers stay individual records (each shows on the rental calendar); each now carries `ata` + `posture` (legacy records are backfilled from the `model` string on read). A **machine set** (oxygen enricher + pressurizer + AC) is required to run a chamber; sets are a **fungible pool counted per ATA** (the owner has fewer sets than chambers). A style is **offerable** for a window only when both a chamber of that type **and** a compatible machine set (exact ATA match) are free.

- **Owner setup (admin → Chambers tab):**
  1. Edit each chamber and set its **ATA rating** + **Posture**.
  2. In **"Machine sets & availability"**, enter how many sets you own per ATA (e.g. `1.5 ATA → 6`, `2.0 ATA → 2`) and **Save**. The chips above show, per type, offerable now / chambers free / sets free.
- **Opt-in / safe default:** an ATA with **no configured count is unconstrained** — until counts are entered, availability equals chamber availability and the booking flow is unchanged.
- **Where it lives:** pure math in `netlify/functions/_lib/inventory.js` (unit tests in `test/inventory.test.js`); pool stored in the `settings` Blobs store key `machineSets` (`{sets:[{ata,count}]}`); admin CRUD at `/api/admin/machinesets`; per-type availability at `GET /api/availability` (`byType[]`). Rentals reserve a `machineSetAta` (defaults to the chamber's ATA); admin rental create/edit is blocked with a `machineset_conflict` (override-able) when the pool for that ATA is full in the window.
- **Booking page:** `book.html` populates the chamber-style dropdown from `/api/availability`, flagging styles that can't be fulfilled now (still selectable — they route to the waitlist). The chosen style is saved on the booking (`requestedType`) and shown in the admin bookings list.

---

## 11. Admin portal

- URL **`/admin`** → **Netlify Identity** login. Any valid Identity user gets in (no role requirement — don't add role gating unless asked). Manage users in Netlify → site → **Identity**.
- Reads/writes chambers, rentals, bookings, waitlist, customers, waivers via the `/api/admin/*` functions (Blobs).
- Out-of-area leads appear here flagged.

---

## 12. Troubleshooting

- **`/api/availability` or admin data returns 500 with "Netlify Blobs … 401"** → the `NETLIFY_API_TOKEN` env var expired. Create a new Netlify Personal Access Token with **No expiration** (Netlify → user → User settings → Applications → Personal access tokens), update the env var, then `netlify deploy --prod`. (Manual-deploy sites don't get Netlify's token-free auto-Blobs context, so the token must be valid.)
- **Admin shows blank stat cards + empty tabs (but you're signed in)** → the signed-in Identity JWT went stale, so every `/api/admin/*` call returns 401. **The data is NOT lost** — confirm with `curl https://purebaric.com/api/availability` (public, reads the same Blobs; a non-zero `total` proves chambers persist). As of 2026-09-21 `admin.html` auto-heals this: on any 401 it force-refreshes the token and retries once, and `loadAll()` uses `Promise.allSettled` so one failing section no longer blanks the rest. If the refresh token is also dead it shows a "session expired — sign back in" banner (no more silent blank). Fix: hard-refresh (Cmd+Shift+R) to load latest `admin.html`, then sign out and back in if the banner appears. Server auth is `requireAuth` → `context.clientContext.user` (populated by Netlify from the Bearer JWT); if it 401s even with a fresh login, check Identity is still enabled at `https://purebaric.com/.netlify/identity/settings` (should return 200 JSON).
- **Customer confirmation emails not arriving** → verify the sending domain in Resend (SPF/DKIM).
- **SMS not arriving** → confirm `ADMIN_SMS_GATEWAY` is set to the right `number@gateway`, that you redeployed after setting it, and check the carrier isn't spam-filtering (try Twilio if persistent).
- **A form submit fails** → confirm the `fetch`/`<form action>` points at the right `/api/*` endpoint and the function accepts the field names (§8).
- **A function change didn't take effect** → redeploy with `--skip-functions-cache`.
- **`netlify deploy` returns "403 Forbidden," or `netlify login` returns "504 Gateway Time-out"** → this is almost always a Netlify platform incident, not your credentials (reads like `netlify status` can still work while deploy-create 403s). Check https://www.netlifystatus.com/, wait, and retry. If the CLI got logged out, re-run `netlify login` and complete the browser Authorize, confirm with `netlify status`, then deploy. To skip the browser flow entirely, deploy with a token: `NETLIFY_AUTH_TOKEN=<personal-access-token> netlify deploy --prod --dir .` (owner-run; never put the token in the repo). Last resort: drag-and-drop the folder in the Netlify dashboard → Deploys. This happened on 2026-09-21 and cleared on its own after re-auth.

---

## 13. Rules / gotchas

- **Deploy is manual.** Nothing goes live until `netlify deploy --prod`.
- **Never commit or print secrets.** Keys/tokens live only in Netlify env vars + the password manager.
- **Do not change DNS.** Namecheap delegates to Netlify DNS.
- **Blobs is one shared store across deploys** — preview writes hit live data; clean up test rows in `/admin`.
- **`_internal/*.md` is git-tracked but not publicly served** (forced 404 in `netlify.toml`). Keep internal docs here.
- **zsh:** unquoted `$VAR` does NOT word-split (use an explicit list or `${=VAR}`); never use `path` as a loop variable (it's tied to `$PATH`).
- The Laravel zips / other project folders are NOT the live site.

---

## 14. Health-content policy (important for the blog/marketing)

This is a wellness rental business, **not a medical provider** ("not a medical device; general wellness only" disclaimer sitewide; schema is `LocalBusiness`). Keep marketing claims precise: distinguish mild home hyperbaric (1.3–1.5 ATA) from clinical HBOT, don't present research or testimonials as guaranteed outcomes, and keep the "consult your physician" framing. A qualified medical/regulatory reviewer should approve any new health claims.

---

## 15. Known open follow-ups / owner tasks

- **Validate the staged Ads conversion setup:** keep `booking_request_submit` Primary and `close_convert_lead` Secondary while completed-rental volume is low. Run one labeled end-to-end test through the public reservation form and admin conversion flow. After 2–3 conversion cycles and approximately 10–15 confirmed rentals in a recent 30-day period, make `close_convert_lead` Primary and move `booking_request_submit` to Secondary.
- **Submit `sitemap.xml` in Google Search Console:** verify the domain (DNS TXT) and submit `https://purebaric.com/sitemap.xml`. Re-submit whenever pages are added/removed. Not yet done.
- **Claim a Google Business Profile** (and Bing Places / Apple Business Connect) as a **service-area** business — NAP must match the site exactly: Salt Lake City, UT · (801) 901-0873 · Mon–Sat 8:00 AM–6:00 PM MT. Not yet done.
- **Activate SMS:** set `ADMIN_SMS_GATEWAY` (see §7c) and redeploy.
- **Blog authority (owner-supplied):** a named human author + qualified reviewer, per-claim citations/DOIs.
- **Concrete product proof (owner-supplied):** real chamber specs (manufacturer/model/dimensions/weight/noise/power/concentrator), delivery/setup photos, the founder's real origin story, authentic customer reviews.
- **Real social profile URLs** (Instagram/Facebook links were removed rather than left pointing at the platforms).
- **Deposit amount/%**: the site says "a deposit after we confirm" but names no figure (terms require a deposit without stating one).
- **Sitting-chamber image:** the "coming soon" card reuses the current chamber photo, heavily blurred; replace with a real rendering/photo when available.
- **Finish the design migration:** Safety, Terms, Practitioners, Blog + posts, and Use-case pages still use the legacy teal template (+ jQuery/Toastr/Vite). Migrating them to warm would also drop that legacy JS/CSS weight.
- **Stripe / instant paid booking / real-time availability** — the reservation is request-only today.
