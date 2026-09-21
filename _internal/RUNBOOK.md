# Purebaric.com — Operations & Maintenance Runbook

A complete handoff for anyone (human or AI agent) running and maintaining **purebaric.com**: where it's hosted, how it's built, the services involved, the email/SMS automation, logins, and how to ship changes safely.

_Last updated: 2026-09-20._

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
- **Analytics:** GA4, consent-gated.
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
├── netlify.toml               (/api/* → functions, /_internal/* → 404, hourly cron)
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

---

## 9. Analytics (GA4)

- Property **"Purebaric Website"**: account `408850169`, property `555169638`, stream `15813569788`, **Measurement ID `G-Q1X04YRWP1`**. Do **not** reuse the old Nerd United ID `G-9FK4XB9FDX`.
- Loaded + consent-gated by **`/pb-metrics.js`** (in the `<head>` of every public page; `/admin` excluded). It is deliberately **not** named `analytics.js` (ad/privacy blockers block that filename). The Measurement ID lives once, as `GA_ID` in `pb-metrics.js`.
- **Consent:** analytics only load after the visitor clicks Accept on the cookie banner (warm banner writes `pb_cookie`; the few legacy pages write `purebaric_cookie_consent`). Default is denied. All tracking calls are optional (`window.trackPurebaricEvent?.(...)`) so a blocked script never breaks a form.
- **Events (no PII):** `select_rental_plan`, `service_area_check` (result only, never the ZIP), `booking_form_start`, `booking_request_submit` (primary conversion), `booking_request_error`, `contact_submit`, `waitlist_join`.
- **Deferred (needs Stripe):** `qualify_lead`, `begin_checkout`, `purchase`, `refund` via the GA4 Measurement Protocol from server code — not built (no checkout yet). Keep any MP secret server-side only.

---

## 10. Pricing & delivery area (where to edit)

**One chamber, length-tiered pricing** (Soft-Shell 1.5 ATA; the "1.5 ATA Sitting Chamber" is Coming soon · Late Oct 2026). On the homepage the current unit's card is titled "1.5 ATA Lying Chamber"; the section headline is "Soft-Shell 1.5 ATA mild hyperbaric chambers."

| Rental length | Monthly rate | Savings |
|---|---|---|
| 1 month | $729 | — |
| 2–3 months | $659 | Save 10% |
| 4–11 months | $579 | Save 21% |
| 12 months | $529 | Save 27% |

**Change prices in all of:** the `rate(m)` function in the inline script of **`index.html`** and **`book.html`** (must match); the `.tiers` cards in **`pricing.html`**; and the "from $529 · 12-month rate" figures in `index.html` and `chambers.html`. Always show the 12-month qualifier next to any "from $529/mo".

**Delivery ZIP gate** — `servedZip()` rule (served if ZIP matches `840xx`/`841xx`/`844xx`, or is in the explicit `SERVED_ZIP_EXTRA` Provo/Weber set). Counties: Salt Lake, Utah, Davis, Weber, Summit, Wasatch, Tooele. **Mirrored in 4 places that must stay in sync:** `netlify/functions/booking-submit.js` (authoritative), `book.html`, `index.html`, and `service-area.html`. If the counties change, also update the homepage "Where we deliver" SVG map + city lists and the `service-area.html` cards.

---

## 11. Admin portal

- URL **`/admin`** → **Netlify Identity** login. Any valid Identity user gets in (no role requirement — don't add role gating unless asked). Manage users in Netlify → site → **Identity**.
- Reads/writes chambers, rentals, bookings, waitlist, customers, waivers via the `/api/admin/*` functions (Blobs).
- Out-of-area leads appear here flagged.

---

## 12. Troubleshooting

- **`/api/availability` or admin data returns 500 with "Netlify Blobs … 401"** → the `NETLIFY_API_TOKEN` env var expired. Create a new Netlify Personal Access Token with **No expiration** (Netlify → user → User settings → Applications → Personal access tokens), update the env var, then `netlify deploy --prod`. (Manual-deploy sites don't get Netlify's token-free auto-Blobs context, so the token must be valid.)
- **Admin lets you in but every data call is 401** → stale Identity token; sign out and back in (the startup cleanup in `admin.html` clears corrupted tokens).
- **Customer confirmation emails not arriving** → verify the sending domain in Resend (SPF/DKIM).
- **SMS not arriving** → confirm `ADMIN_SMS_GATEWAY` is set to the right `number@gateway`, that you redeployed after setting it, and check the carrier isn't spam-filtering (try Twilio if persistent).
- **A form submit fails** → confirm the `fetch`/`<form action>` points at the right `/api/*` endpoint and the function accepts the field names (§8).
- **A function change didn't take effect** → redeploy with `--skip-functions-cache`.

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

- **Activate SMS:** set `ADMIN_SMS_GATEWAY` (see §7c) and redeploy.
- **Blog authority (owner-supplied):** a named human author + qualified reviewer, per-claim citations/DOIs.
- **Concrete product proof (owner-supplied):** real chamber specs (manufacturer/model/dimensions/weight/noise/power/concentrator), delivery/setup photos, the founder's real origin story, authentic customer reviews.
- **Real social profile URLs** (Instagram/Facebook links were removed rather than left pointing at the platforms).
- **Deposit amount/%**: the site says "a deposit after we confirm" but names no figure (terms require a deposit without stating one).
- **Sitting-chamber image:** the "coming soon" card reuses the current chamber photo, heavily blurred; replace with a real rendering/photo when available.
- **Finish the design migration:** Safety, Terms, Practitioners, Blog + posts, and Use-case pages still use the legacy teal template (+ jQuery/Toastr/Vite). Migrating them to warm would also drop that legacy JS/CSS weight.
- **Stripe / instant paid booking / real-time availability** — the reservation is request-only today.
