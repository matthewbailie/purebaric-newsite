# Purebaric.com — Operations & Maintenance Runbook

A complete handoff for anyone (human or AI agent) running and maintaining **purebaric.com**: where it's hosted, how it's built, the services involved, the email/SMS automation, logins, and how to ship changes safely.

_Last updated: 2026-09-26._

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

- **Hosting:** Netlify (static site + serverless Functions + Blobs + Identity).
- **Domain:** purebaric.com, registered at **Namecheap**, DNS on **Netlify DNS**.
- **Email:** outbound via **Resend**; inbound `@purebaric.com` forwarded via **ImprovMX**.
- **SMS lead alerts:** admin-managed, per-number, consent-gated (see §7c — this changed substantially on 2026-09-26; read it before touching Notifications).
- **Analytics/SEO:** GA4, consent-gated (analytics + Google Ads **measurement** on after consent; personalized ads/remarketing off). `robots.txt` + `sitemap.xml` + JSON-LD structured data present.
- **Source:** `~/projects/purebaric-newsite` (local git). **As of 2026-09-26 this also has a GitHub remote**, `github.com/matthewbailie/purebaric-newsite` (private) — see §5a before you assume pushing there deploys anything, **it currently does not**.
- **Ship a change (current, real, working method):** edit → `netlify deploy` (preview) → `netlify deploy --prod --dir .` → `git commit` → `git push` (see §5a for the GitHub-account gotcha). **Do not stop doing this** because a repo now exists — read §5a first.
- **⚠️ Known broken/pending as of this writing (2026-09-26), check before assuming otherwise:** Stripe is **not configured** in production (secret key + webhook secret still need to be entered — see §7e); Netlify is **not yet Git-linked** to the new GitHub repo (§5a); Twilio SMS has **not been activated** by the owner (§7c).

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
| Admin auth | **Netlify Identity** or **passkey** session (login at `/admin`, see §11) |
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
| **Twilio** (optional, wired up but **not activated by the owner yet**) | Reliable SMS if the free gateway is dropped | twilio.com | Code + admin UI are ready (see §7c); owner still needs to create the account, buy a number, and enter the keys. |
| **GitHub** (added 2026-09-26) | Git history / future CI source | github.com | Repo **`matthewbailie/purebaric-newsite`** (private), owner's personal account, matches the Netlify login email. Not yet wired to deploys — see §5a. |

### Netlify site facts
- Site name: **purebaric**
- Site ID: **3e2c12f7-e737-4849-90aa-6b6134edbfab**
- Custom domain: **purebaric.com** (SSL on)
- Deploy method: **still manual** via `netlify deploy --prod --dir .`. A decision to switch to Git-based CI is recorded (`DECISIONS.md`, 2026-09-26) and `netlify.toml` already has `command = "npm test"` under `[build]` in anticipation — **but Netlify's site is not actually linked to the GitHub repo yet** (confirmed via `netlify api getSite` → `build_settings: {}`). Until someone completes that link in the Netlify dashboard (Site configuration → Build & deploy → Link repository), **manual `netlify deploy` remains the only thing that publishes changes** — see §5a.

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
| `ADMIN_SMS_GATEWAY` | Optional (legacy) | Legacy single-number SMS fallback. SMS is now managed in the admin **Notifications** tab (§7c) — you normally leave this unset. If set, this address is also texted on reservation alerts. Value = `<10-digit-cell>@<carrier-gateway>`. |
| `TWILIO_ACCOUNT_SID` / `TWILIO_AUTH_TOKEN` / `TWILIO_FROM` | Optional (recommended for reliable SMS) | Send texts via **Twilio** instead of free carrier email-to-text. **These can now be set in the admin → Notifications tab** (stored in `settings/twilio`, which takes precedence over these env vars); env vars are the more-secure alternative. `TWILIO_FROM` = your Twilio number in E.164 (e.g. `+18015550123`). When configured, every SMS (reservations + reviews + "Send test") goes through Twilio. Unset = free carrier email-to-text (unreliable). |
| `GA4_API_SECRET` | Optional | Turns on server-side GA4 conversions (`booking_request_submit`, `rental_confirmed`). Measurement Protocol secret from GA4 → Admin → Data Streams → the web stream → Measurement Protocol API secrets. If unset, those conversions are not sent — the site is otherwise unaffected. |
| `STRIPE_SECRET_KEY` | Optional | Turns on Stripe payment links. **Can now be set in admin → Pricing & Payments** (stored in `settings/stripe`, takes precedence over env); env is the more-secure alternative. Stripe → Developers → API keys → Secret key (`sk_test_…`/`sk_live_…`). |
| `STRIPE_WEBHOOK_SECRET` | Optional | Verifies the payment webhook so paid rentals auto-reconcile. Also settable in admin → Pricing & Payments. Stripe → Developers → Webhooks → endpoint `https://purebaric.com/api/stripe-webhook` (events `payment_intent.succeeded`, `checkout.session.completed`) → Signing secret (`whsec_…`). |

---

## 5. Source of truth, deploy workflow, rollback

All code lives locally at **`~/projects/purebaric-newsite`**. Edit here, then deploy.

```bash
cd ~/projects/purebaric-newsite

# 1. Edit files (HTML/CSS/JS in the root; functions in netlify/functions/)

# 2. Preview to a temporary URL (does NOT affect the live site)
netlify deploy

# 3. Publish to the live site — THIS is what actually goes live (see §5a)
netlify deploy --prod --dir .
#    If you changed anything in netlify/functions/, add --skip-functions-cache
#    so the updated function code is bundled:
#    netlify deploy --prod --dir . --skip-functions-cache
#    Note: netlify.toml's [build] command is now "npm test" (added 2026-09-26),
#    so this also runs the test suite (test/*.test.js) as part of every deploy,
#    including this manual CLI one. A failing test blocks the deploy.

# 4. Record it in git history, then push to GitHub (see §5a for the account gotcha)
git add <specific files>   # NOT `git add -A` — see the design-previews/ warning below
git commit -m "describe the change"
git push
```

First-time CLI setup: `npm i -g netlify-cli` → `netlify login` → `netlify link --id 3e2c12f7-e737-4849-90aa-6b6134edbfab`. Requires Node ≥ 22.

**⚠️ Never `git add -A` / `git add .` on this repo.** `design-previews/*` holds files an external design tool edits live on disk outside of git's knowledge; a blanket add sweeps in whatever that tool last wrote and commits it as if it were an intentional change. Always `git add` an explicit file list for what you actually touched, then `git status --short` before committing to confirm nothing unexpected (especially `design-previews/*`) got staged.

**Rollback:** Netlify → site **purebaric** → **Deploys** → pick a known-good deploy → **Publish deploy**. (Deploy IDs change every push; find the one you want in that list rather than hardcoding it.)

**Dead-end folders/repos on this machine — do NOT use for the live site:** `~/projects/purebaric.com` and any `purebaric.com-main*.zip` (a Laravel rewrite, wrong tech), `~/projects/purebaric-deploy`, `~/projects/purebaric-live` (pre-redesign reference), `~/projects/purebaric-site`, `~/projects/purebaric-mockups` (design mockups only). **Two different GitHub repos named similarly, do not confuse them:** `matthewbailie/purebaric.com` is dead Laravel code, ignore it; `matthewbailie/purebaric-newsite` (added 2026-09-26, see §5a) is the real one, matching this directory.

---

## 5a. GitHub repo + the (unfinished) move to Git-based CI — read this before touching deploys

**What exists:** a private GitHub repo, **`github.com/matthewbailie/purebaric-newsite`**, created 2026-09-26, containing this project's full local git history pushed to `main`. `netlify.toml` already has `[build] command = "npm test"` (also added 2026-09-26) so that both a manual `netlify deploy` *and* a future Git-triggered build would run the test suite first.

**What does NOT exist yet:** an actual connection between the Netlify site and that repo. Confirmed via `netlify api getSite --data '{"site_id":"3e2c12f7-e737-4849-90aa-6b6134edbfab"}'` → `"build_settings": {}` (empty — no linked repo). **This means pushing to GitHub `main` does not deploy anything.** The only thing that publishes to production right now is manual `netlify deploy --prod --dir .` from this machine, exactly as it always has. `DECISIONS.md` records the *intent* to switch to Git-based deploys, gated on `npm test` — the intent is confirmed, the implementation is not finished.

**If you're an AI agent picking this up:** do not assume a `git push` deployed anything. Verify with `netlify api getSite --data '{"site_id":"3e2c12f7-e737-4849-90aa-6b6134edbfab"}' | grep -A5 build_settings` — a populated `repo` object means it's since been connected (great, switch to Git-based deploys and stop using manual CLI); an empty `{}` means it's still not connected and you must keep using `netlify deploy --prod --dir .` after every change, same as before. **Connecting it requires a GitHub OAuth/App-authorization step** (Netlify's own "Link to Git provider" flow) that only the owner can complete via the Netlify dashboard — a coding agent should not attempt to drive that flow blind (it was explicitly declined for an agent to complete unattended on 2026-09-26; the owner does it via **Site configuration → Build & deploy → Link repository → GitHub → `matthewbailie/purebaric-newsite` → branch `main`**).

**The dual-GitHub-account gotcha (important, easy to get wrong):** the `gh` CLI on this machine is logged into **two** GitHub accounts — `bailie_adobe` (an Adobe work identity, the default/active one) and `matthewbailie` (the owner's personal account, matching `matthewbailie@gmail.com` — the same identity the Netlify login uses). The `purebaric-newsite` repo lives under `matthewbailie`, not `bailie_adobe`. A `git push`/`git pull` against `origin` uses whichever account is currently active in `gh`'s credential helper — if that's `bailie_adobe`, you'll get `remote: Repository not found` (GitHub 404s a private repo you can't see, rather than 403). **Before pushing or pulling:** `gh auth switch --user matthewbailie`, do the git operation, then `gh auth switch --user bailie_adobe` to restore the default (so you don't leave other work on this machine authenticated as the wrong account). Check current state anytime with `gh auth status`.

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
├── sms-consent.html            (public, no auth — SMS A2P 10DLC consent evidence page, added 2026-09-26; see §7f)
├── admin.html                 (admin portal UI — Netlify Identity; the vast majority of this
│                               project's logic/complexity lives in this one file's inline <script>)
├── warm.css, warm.js          (shared warm shell)
├── admin-utils.js             (admin search matching + card ordering helpers — see §11)
├── dashboard-metrics.js, dashboard-charts.js   (admin Home tab: pure metric definitions + SVG line chart — see §11)
├── styles.css, script.js      (legacy teal shell)
├── pb-metrics.js              (consent-gated GA4 loader — see §9)
├── build/assets/app-*.css|js  (legacy Tailwind/Vite bundle used only by teal pages)
├── images/                    (chamber photos, logos, hero carousel images, favicon,
│                               sms-consent-*.png — redacted admin-portal screenshots for §7f)
├── robots.txt                 (allows all; disallows /admin + /_internal; points to sitemap)
├── sitemap.xml                (all public pages — UPDATE when you add/remove a page, then resubmit in Search Console)
├── netlify.toml               (/api/* → functions, /_internal/* → 404, hourly cron, /images/* cache header,
│                               [build] command = "npm test" — see §5a)
├── package.json                (scripts.test = "node --test"; deps: @netlify/blobs, resend, stripe)
├── DECISIONS.md                (running architectural-decision log, git-tracked, keep appending to it —
│                               don't just describe decisions in a chat session and let them evaporate)
├── _internal/                 (RUNBOOK.md, SITE-EVALUATION.md — NOT served publicly)
├── test/                      (node --test unit tests, run via `npm test`; pure-logic libs only —
│                               inventory.test.js, notifications.test.js, servicearea.test.js,
│                               analytics.test.js, rental-dates.test.js, admin-rental-inline-edit.test.js.
│                               storage.js itself is NOT unit tested — it's a thin Netlify Blobs
│                               wrapper, hard to test without a Blobs emulator; verify changes to it by
│                               hand or with a throwaway in-memory `@netlify/blobs` shim, see git log
│                               2026-09-26 for a worked example of that shim technique)
└── netlify/functions/
    ├── availability.js         (public: how many chambers free today)
    ├── booking-submit.js       (public: /api/booking-submit — the reservation flow)
    ├── waitlist-join.js        (public: /api/waitlist-join)
    ├── contact-submit.js       (public: /api/contact-submit)
    ├── reviews-submit.js       (public: /api/reviews-submit)
    ├── stripe-webhook.js        (public, no auth — Stripe calls this directly; verifies its own
    │                            signature. Currently returns 503 in production — Stripe isn't
    │                            configured yet, see §7f)
    ├── admin-*.js              (auth-gated: chambers, machines, rentals, bookings, waitlist,
    │                            customers, reviews, notifications, notifications-test, pricing,
    │                            service-area, twilio, stripe-config, stripe-link, waiver)
    ├── expire-holds.js         (scheduled hourly; frees expired holds / transitions rentals)
    └── _lib/
        ├── storage.js          (all Netlify Blobs reads/writes)
        ├── email.js            (Resend send + email templates + SMS helper)
        ├── admin.js            (async requireAuth: needs a valid Identity login OR passkey session cookie; adminEmail: the signed-in
        │                        admin's email, for audit trails like SMS consent)
        ├── passkeys.js         (WebAuthn options/verify wrappers, single-owner) + session.js (pb_admin_session cookie + record helpers) — see §11
        ├── notifications.js    (pure: carrier gateways, event routing, SMS consent model — see §7c/§7f)
        ├── inventory.js        (pure: chamber/machine derived state + availability math — see §10a)
        ├── servicearea.js      (pure: delivery-ZIP matching — see §10)
        ├── sms.js              (Twilio REST send)
        ├── followup.js         (pure: the copy-and-paste follow-up text for reservation alerts — see §7c)
        └── stripe.js           (Stripe client construction from config)
```

**Data (Netlify Blobs) stores:** `chambers`, `machines`, `rentals`, `bookings`, `waitlist`, `customers`, `reviews`, `waivers`, `settings`, `passkeyCredentials`, `adminSessions`, `authChallenges` (keys: `notifications`, `pricing`, `serviceArea`, `twilio`, `stripe`). Manage contents through `/admin`. **Chambers/machines are physical inventory rows in Blobs, not code** — to add/retire a unit you edit it in `/admin`, not in the repo. Blobs is **one shared store across all deploys**, so a *preview* deploy that writes data writes to **live** data — use obviously-fake test data and delete it in `/admin` afterward.

---

## 7. Automations — email & SMS

All outbound messaging runs through **Resend** from `netlify/functions/_lib/email.js`.
- **From:** `Purebaric <noreply@purebaric.com>` · **Reply-to:** `hello@purebaric.com` · **Admin alerts to:** `matthewbailie@gmail.com`.
- Templates use the warm brand palette and a readable dark logo band.

### 7a. Reservation lead (the main flow) — `booking-submit.js`
When someone submits `/book` (or `/api/booking-submit`):
1. The lead is saved to Blobs (`bookings`).
2. **ZIP gate** (see §10): if the delivery ZIP is **outside** the service area → mark `outOfArea:true`, **do NOT email the customer**, **do NOT** add to waitlist; email the admin an "Out-of-area request" and text any recipient subscribed to the `reservation_out` event (see §7c). It shows in `/admin` with an "Out of area · no auto-email sent" badge.
3. If **in area**: auto-route — if a chamber is available today, email the customer a confirmation; otherwise add them to the waitlist and email the waitlist confirmation.
4. **Always** email the admin a "Booking request" summary, and text any recipient subscribed to `reservation_in` (see §7c). When a chamber is **available** (routing `available`), both the admin email and the SMS also carry a **copy-and-paste follow-up text** for the owner to send from their own phone (built by `_lib/followup.js`; see §7c).
5. Failures in email/SMS/routing are caught and logged — they never block the submission.

### 7b. Other flows
- **Waitlist** (`waitlist-join.js`): saves to Blobs, emails the admin, emails the customer a confirmation. Fires the `waitlist_join` analytics event.
- **Contact** (`contact-submit.js`): emails the admin (subject includes the topic). Contact messages are **emailed, not stored** in Blobs.
- **Scheduled** (`expire-holds.js`): runs hourly (`netlify.toml` cron `0 * * * *`) to release expired holds / advance rental states by date.

### 7c. Notifications — email + SMS recipients, admin-managed, consent-gated (rebuilt 2026-09-26)

All owner-facing alerts are configured in the admin **Notifications** tab. You can register **one or more email addresses** and **one or more phone numbers**, and choose, per recipient, which **events** it receives. Everything about who-gets-what lives on this one tab — **no env var required**.

- **Email** is sent via Resend. If no email recipient is configured for an event, it falls back to the default admin address `matthewbailie@gmail.com` (`ADMIN_NOTIFY` in `email.js`) so alerts never silently stop.
- **SMS** is sent free by emailing the recipient's carrier SMS gateway through Resend (`<10-digit-number>@<carrier-gateway>`), or via Twilio if configured (see below). **As of 2026-09-26, SMS is also consent-gated per number** — see §7f for the full A2P 10DLC compliance system (this is not optional decoration, it's what a real text message can legally/contractually be sent to). Read §7f before changing anything about SMS delivery.

**How it's configured:** Notifications tab → **Email notifications** (label + email + events) and **Text (SMS) notifications** (label + mobile number + carrier + events + **consent checkbox, unchecked by default**) sections, each with add/remove. Multiple recipients of either kind are supported, and different recipients can get different events (e.g. reviews to one address, reservations to another). A phone number's events can be fully configured but **will not receive anything until its own consent checkbox is checked and saved** — see §7f.

**Events a recipient can subscribe to:**
| Event key | Fires when | Sent from |
|---|---|---|
| `reservation_in` | A reservation request from **inside** the service area | `booking-submit.js` |
| `reservation_out` | A reservation request from **outside** the service area | `booking-submit.js` |
| `review` | A visitor submits a **review** | `reviews-submit.js` |

**Where it lives (for a future maintainer):**
- **Config store:** `settings` Blobs store, key `notifications` = `{ emails: [{ id, label, email, events }], sms: [{ id, label, number, carrier, events, consent: { given, at, by, version, status } }] }`. Empty by default. (The legacy shape `{ recipients: [...] }` is still read as `sms`.) The `consent` object is **stamped server-side only** — see §7f, do not trust or accept a client-supplied `consent` object.
- **Pure routing + carrier map + consent:** `netlify/functions/_lib/notifications.js` (`CARRIER_GATEWAYS`, `EVENTS`, `CONSENT_VERSION`, `normalizeNumber`, `normalizeEmail`, `gatewayAddress`, `emailsForEvent`, `smsForEvent`, `smsNumbersForEvent`, `hasActiveConsent`, `stampSmsConsent`; `recipientsForEvent` is a back-compat alias of `smsForEvent`). Unit tests in `test/notifications.test.js`. **`smsForEvent`/`smsNumbersForEvent` silently exclude any number without active consent** (`consent.given === true && consent.status === 'enabled'`) — this is the enforcement point; nothing further up the call chain re-checks it.
- **Storage helpers:** `getNotifications` / `setNotifications` in `_lib/storage.js` (normalize + persist).
- **Admin API:** `GET/PUT /api/admin/notifications` (`admin-notifications.js`, auth). GET also returns the carrier + event lists + `consentVersion` for the UI. PUT body: `{ emails, sms }` where each `sms` row carries `consentChecked` (bool, whether the box is checked *right now*) instead of a `consent` object — the handler calls `stampSmsConsent(body.sms, existing.sms, adminEmail(context))` to turn that into a real, timestamped consent record. See §7f for the full state machine.
- **Email send:** `notifyAdminBooking(b, routing, to)` / `notifyAdminOutOfArea(b, to)` / `notifyAdminReview(review, to)` in `_lib/email.js`. Callers pass `emailsForEvent(config, eventKey)`; each falls back to `ADMIN_NOTIFY` when the list is empty (`adminTo()` helper).
- **SMS send:** `notifyAdminSms(booking, { outOfArea, gateways, numbers, twilio })` and `notifyAdminReviewSms(review, { gateways, numbers, twilio })` in `_lib/email.js` → `deliverAdminSms()`. Callers pass `smsForEvent(config, eventKey)` / `smsNumbersForEvent(config, eventKey)` (both already consent-filtered). **Message text is deliberately generic and contains no customer PII** (no name/phone/address/ZIP) — see §7f for why and the exact wording. All sends are wrapped in try/catch — a notification failure never blocks the submission.
- **Legacy fallback:** if the old `ADMIN_SMS_GATEWAY` env var is set, that address is **also** texted on reservation alerts (belt-and-suspenders; not needed once portal recipients exist). This fallback is **not** consent-gated since it's an env var the owner controls directly, not a portal-entered number.

**Carrier gateways** (the dropdown maps a carrier to the domain appended to the number):

| Carrier | Gateway |
|---|---|
| Verizon | `@vtext.com` |
| T-Mobile / Metro | `@tmomail.net` |
| AT&T / Cricket | `@txt.att.net` |
| Sprint | `@messaging.sprintpcs.com` |
| Google Fi | `@msg.fi.google.com` |
| US Cellular | `@email.uscc.net` |
| Boost | `@sms.myboostmobile.com` |
| Virgin | `@vmobl.com` |
| Xfinity Mobile | `@vtext.com` |

Example resolved address: `8015551234@vtext.com`. **Current message text (privacy-conscious, no PII — changed 2026-09-26):** _"Purebaric: A new reservation request was received. Sign in to the Purebaric admin portal to review it. Reply STOP to opt out or HELP for help."_ (out-of-area and review variants swap only the one clause naming the event.) Do not reintroduce customer name/phone/ZIP into these — see §7f for why. **Added 2026-09-26:** for a reservation with a chamber available, the SMS (and the admin email) also include a **follow-up text to copy** — "Hi [NAME], this is Matthew with Purebaric… I received your request for a 4-month chamber rental at $579/month. I have a chamber ready for delivery Sat, Oct 3… anytime between [TIMES]… Payment is collected after I set up the chamber…" — built by `buildFollowUpText()` in `_lib/followup.js` (unit-tested). The **email** uses the customer's real first name; the **SMS uses the literal `[NAME]` placeholder** so no customer identity goes out by text. `[TIMES]` is always a placeholder for the owner to fill in; a missing start date becomes `[DELIVERY DATE]`; the monthly rate comes from the admin Pricing table for the requested length (`getPricing()` in `booking-submit.js`). Only sent for `available` routing (the text says "I have a chamber ready"); pending/waitlist/out-of-area alerts are unchanged. Note the SMS is now ~4–5 segments long.

**Reliability — Twilio (built-in, wired up, owner has NOT activated it yet as of 2026-09-26):** free carrier email-to-text is increasingly spam-filtered/retired, so a text can be silently dropped by the carrier even though our server sent it successfully (confirmed on this site). **Twilio is wired in and takes over automatically when `TWILIO_ACCOUNT_SID` + `TWILIO_AUTH_TOKEN` + `TWILIO_FROM` are set** (see §4, and/or admin → Notifications → Text delivery) — `_lib/sms.js` sends via Twilio's REST API to each recipient's raw number; `email.js` `deliverAdminSms()` picks Twilio when configured, else the carrier gateways. ~$1.15/mo for a number + ~$0.008/text. The admin **Notifications → Send test** button reports which method was used and per-recipient success (and, since 2026-09-26, correctly refuses to test-send to a number without active consent — reports `SMS consent not enabled for this number` instead). Email always sends regardless. **Owner task, not done:** create the Twilio account, buy a number, enter the three values.

### 7d. Email deliverability
If customer confirmation emails don't arrive, check Resend: the sending domain `purebaric.com` must be verified (SPF/DKIM). Admin alerts generally work first because they go to a Gmail address.

### 7e. Stripe payments — wired up, **NOT configured in production** as of 2026-09-26

The code is complete and correct; nobody has entered Stripe credentials yet. **Verified by probing the live webhook endpoint** (safe, no auth needed — Stripe calls it directly): `curl -X POST https://purebaric.com/api/stripe-webhook` → `503 stripe not configured`. If you're troubleshooting "a customer paid but their rental still shows unpaid," check this first before assuming a code bug — it almost certainly is not one; it's that Stripe was never finished being set up (this exact investigation happened twice this week, both times the root cause was the same: unconfigured).

**How it's supposed to work:**
- Admin → **Pricing & Payments** tab has fields for the Stripe **secret key** and **webhook signing secret**, stored in `settings/stripe` (masked on GET, same admin-editable pattern as Twilio in §7c). `_lib/stripe.js` builds a client from that config (or `STRIPE_SECRET_KEY` env as a fallback — see §4).
- Editing a rental → **"Create / refresh link"** (`admin-stripe-link.js` → `POST /api/admin/stripe-link`) creates a Stripe Payment Link tagged with `metadata.rental_id`, using the rental's own Monthly rate as the amount.
- **Reconciliation (reworked 2026-09-26):** when Stripe sends `payment_intent.succeeded`, `charge.refunded`, `checkout.session.completed`/`async_payment_succeeded` or `invoice.paid` to `POST /api/stripe-webhook`, the function verifies the signature, finds the rental (the `rental_id` tag on payment links, else the renter's **email** → the rental running today, else the next upcoming one; `pickRental` in `_lib/stripe-sync.js`), and **re-totals that rental's payments from Stripe itself** (`syncRentalPayments`: succeeded payment intents tagged with the rental, plus those from Stripe customers with the renter's email made from 14 days before the rental to 14 days after it, refunds netted off). It saves `paidAmount` (the Stripe total), `paymentStatus`, `paymentDate`, `paymentMethod: stripe` and the payment list (`stripePayments`). Status: **unpaid** = nothing received, **paid** = at least what is due so far (one monthly rate at the start date plus one on each monthly anniversary; weekly rentals every 7 days), **partial** = less than that. Because the total is recomputed from Stripe every time, replaying or redelivering an event is safe (Stripe dashboard → Developers → Webhooks → the event → Resend). The rental form's **Sync payments from Stripe** button (`/api/admin/stripe-sync`) does the same on demand. Payments whose email matches no rental are logged (`stripe webhook: no rental matched`) and skipped. Payments made outside Stripe (cash, check) are **not** in the Stripe total: a sync overwrites the paid amount with the Stripe figure.
- (Older description:) when the customer pays, Stripe calls `POST /api/stripe-webhook` (`stripe-webhook.js`), which verifies the signature with the webhook secret, reads `metadata.rental_id` off the resulting `payment_intent.succeeded` / `checkout.session.completed` event, and auto-marks that rental `paymentStatus: 'paid'` with the amount — no manual reconciliation needed, **once configured**.
- **To finish setup (owner task):** Stripe dashboard → Developers → API keys → copy the secret key into admin → Pricing & Payments. Then Developers → Webhooks → add endpoint `https://purebaric.com/api/stripe-webhook`, events `payment_intent.succeeded` + `checkout.session.completed` (+ `checkout.session.async_payment_succeeded` if using Checkout), copy the signing secret into the same admin tab.
- **In the meantime:** mark a rental paid by hand — Rentals → Edit → Payment status/Upfront amount paid/Payment date/Payment method fields — this is a completely normal, supported path, not a workaround; Stripe just automates what this does manually.
- **Frontend error surfacing (fixed 2026-09-26):** `admin.html`'s generic `api()` fetch wrapper now prefers the backend JSON's `message` field over its bare `error` code when constructing the thrown Error, so any endpoint that sends both (like `admin-stripe-link.js`) gets its accurate message shown in the toast automatically, without per-error-code special-casing in the frontend. If you add a new endpoint and want a good error toast, just include a `message` string alongside `error` in the JSON response — no frontend change needed.

### 7f. SMS A2P 10DLC / TCPA compliance — admin opt-in consent (built 2026-09-26)

**Why this exists:** the admin SMS alerts in §7c are transactional texts sent to the site *owner/administrator* (never to customers). To register this as a legitimate A2P 10DLC campaign with a carrier/Twilio, you need to demonstrably show: an unchecked-by-default consent checkbox with specific disclosure language, a record of who consented and when, a working opt-out, and message content that never carries customer PII. All of that is now built. A prior Twilio campaign submission was rejected for lacking this; this system was built specifically to pass resubmission.

**The consent model — per phone number, not portal-wide:**
- Each SMS recipient row in the Notifications tab carries its own `consent: { given, at, by, version, status }`. **Consent is stamped server-side only** (`stampSmsConsent` in `_lib/notifications.js`, called from `admin-notifications.js`'s PUT handler) — the client (`admin.html`) never sends a `consent` object, only a `consentChecked` boolean reflecting whatever the checkbox currently shows. This matters: it means the *server* controls the timestamp and the admin's identity (`adminEmail(context)` in `_lib/admin.js`, from the Netlify Identity JWT), so the consent record can't be spoofed or backdated by editing the request body.
- **State machine (see `stampSmsConsent`'s own comments for the authoritative version):**
  - Box checked + no active consent yet (or the phone number changed) → a **brand-new** consent event: `given: true, at: now, by: <admin email>, version: CONSENT_VERSION, status: 'enabled'`.
  - Box checked + already actively consented for this *same* number → left alone (editing an unrelated field like the label doesn't fabricate a new timestamp).
  - Box unchecked → `status: 'disabled'`, `given: false`, **immediately** — delivery stops on that save (see `hasActiveConsent` gating in §7c). The prior `at`/`by`/`version` are kept for audit history, not wiped.
  - Re-checking after a disable → stamps a **fresh** consent event (new timestamp) — consent is never silently carried forward across a disable/enable cycle.
- `CONSENT_VERSION` constant = `"purebaric-sms-consent-v1"` — bump this (and the disclosure text alongside it) if the consent language ever changes materially, so old records are distinguishable from new ones.
- **UI (admin → Notifications → Text (SMS) notifications), per number:** the exact required disclosure text, an **unchecked-by-default** checkbox next to it, and a disabled **"Enable SMS notifications"** button that only becomes clickable once the box is checked (two distinct affirmative actions, not one). Once active: a green confirmation showing the consent timestamp + a redacted-in-screenshots admin identity, and a **"Disable SMS notifications"** button that stops delivery immediately. This is all in `renderNotifySms()` / `enableSmsConsent()` / `disableSmsConsent()` in `admin.html`.
- **Enforcement point:** `hasActiveConsent(r)` in `_lib/notifications.js`, consulted inside `smsForEvent`/`smsNumbersForEvent` — a number without `given && status==='enabled'` is silently excluded from every SMS send path, **including the Notifications → Send test button** (which reports "SMS consent not enabled for this number" instead of sending).
- **Known gap, not built:** there's no Twilio *inbound* webhook, so a customer/admin replying STOP to a Twilio-delivered text does not automatically flip that number's `status` to `'opted_out'` in our own data — Twilio itself still honors STOP at the carrier/API level (it maintains its own suppression list and will refuse to send to a STOPped number regardless of what our `settings/notifications` blob says), so this is a data-hygiene gap, not a compliance hole. If asked to close it: add a Twilio inbound-SMS webhook function, and have the owner point that Twilio number's messaging webhook at it in the Twilio console.

**Public evidence page — `/sms-consent`, no auth, publicly indexable:**
- Exists so a Twilio/carrier reviewer (or anyone) can verify the opt-in flow without needing admin credentials. Explains the SMS categories (reservation request / out-of-area reservation request / new review), walks through the 6-step opt-in process in the exact wording Twilio's reviewers expect, and embeds **three real screenshots** of the live admin UI (`images/sms-consent-optin.png`, `-detail.png`, `-enabled.png`) with the phone number and admin email **redacted** — no Twilio credentials, tokens, or real personal data anywhere on this page or in the images' metadata.
- **If the admin UI changes** (the Notifications tab layout, the disclosure wording, the Enable/Disable buttons), **these screenshots go stale** and should be regenerated. How they were made (no browser extension or paid tool needed): open `/admin` in the Claude Browser preview tool, force the login gate open and mock the `/api/admin/notifications` fetch calls with fake-but-realistic data (see any of this session's git history around 2026-09-26 for the exact snippet), reach the desired state (unchecked / enabled), then in-page bake live DOM `.value`/`.checked` properties into real HTML attributes (`el.setAttribute('value', el.value)` etc. — outerHTML only serializes attributes, not live properties), grab `document.documentElement.outerHTML`, strip the `<script>` tags (so the static snapshot doesn't re-run the auth-gate JS and reset itself), inject a `<base href="http://localhost:5056/">` tag so relative asset URLs resolve, save that as a standalone `.html` file, and screenshot it with headless Chrome (`/Applications/Google Chrome.app/Contents/MacOS/Google Chrome --headless=new --screenshot=out.png --window-size=W,H file://…`). Crop/redact with Python's `PIL`/`Pillow` (available on this machine).
- Also linked from the footer ("SMS Consent") on **every** public page, and from `/terms#sms-terms` and `/privacy` (both have matching SMS sections — keep the three in sync if the program changes: `terms.html` §13, `privacy.html`'s "SMS privacy" section, and this page).
- **2026-09-29 rejection (error 30896, "unable to validate that the opt-in is forced or not"):** `/sms-consent` now has an explicit "Consent is optional, never forced, and never pre-selected" section, the exact sample messages from the code, and fresh redacted screenshots (taken in Chrome from the live admin: `images/sms-consent-*.png?v=2`, the sample number 801 555 0134 is fake). Also fixed: `syncNotifyState` in `admin.html` dropped each row's `consent` record on re-render, so pressing "+ Add phone number" and then any autosaving change (an event checkbox) saved the enrolled number with the box unchecked and switched its texts off. Re-enable in the portal if that ever happens again.
- **Resubmitted 2026-09-29** (campaign CM093e81c63f4c7ec02f46b8f682cd6a2e, use case Sole Proprietor) with the four exact sample messages from the code, "Phone numbers" unchecked, a help message naming hello@purebaric.com and (801) 901-0873, and a Message Flow that leads with the public URLs (/sms-consent, /privacy, /terms) and states the checkbox is unchecked by default, consent is optional, and enrollment is two actions. Twilio's automated pre-check passed after the URLs were put first (its first pass could not read the flow and warned about all three). Carrier review is pending; status shows in Console > Trust Hub > Registrations > A2P 10DLC Campaigns.
- **Twilio resubmission:** once satisfied this is correct, resubmit/update the *existing* rejected Twilio campaign (do not create a new one) with a Message Flow description pointing to `https://purebaric.com/sms-consent`. The exact Message Flow wording used is in this session's chat history if it needs to be reused verbatim.

**Message content policy (do not regress this):** admin SMS alerts must **never** include the customer's name, phone, address, email, ZIP, or free-text notes — only a generic "a new X was received, sign in to review it" plus the required STOP/HELP footer. This was a deliberate change from earlier, more detailed alert text (which did leak the lead's name/phone/ZIP into the SMS body) — see §7c for the exact current wording. **One deliberate exception (2026-09-26):** the copy-and-paste follow-up template appended to the reservation alert contains the rental length, monthly price and delivery date (none identifying) and a literal `[NAME]` placeholder — never the real name. If the Twilio campaign is (re)submitted, make sure its sample message / message-flow description covers this longer alert, since it is much longer than the generic wording registered originally.

---

### 7f2. Rental type: residential or business (added 2026-10-02)

- Every rental and booking carries `rentalType` (`residential` | `business`, default residential; records older than this date have no field and read as residential) and, for business, `businessName`. Cleaners live in `_lib/rental-type.js` (tested in `test/rental-type.test.js`); `admin-rentals.js` and `admin-bookings.js` store them, `booking-submit.js` reads `rental_type` / `business_name` from the public form.
- **Public side:** `/business` sends people to `/book?type=business`. In that mode `book.html` adds `body.biz`, shows the business banner and a required Business name field, hides the length slider and discount rows, shows the $979/mo + $500 setup summary, and submits `rental_type=business`, `business_name`, `rental-length=month to month`. Plain `/book` is unchanged.
- **Admin side:** Rentals form has a Rental type select (business reveals Business name and defaults a new rental's rate to 979); a second filter row (All types / Residential / Business); rows and details show a Business pill and name; Edit and "→ Rental" from a request carry the type across. Rental requests show a Business badge and a "Rental type" details row. Customers get a Business pill on the card. Home's "Active subscribers" sub-line adds "· N business".
- **Email/SMS:** admin booking email gets a business block and subject "Business rental request: <business> (business)"; out-of-area and ending-soon emails tag business rentals; the SMS lead says "business rental request" (no business name, per §7f).
- Not done: separate business pricing in `/api/pricing`, a business-specific waiver upload slot (attach the business agreement in the same Waiver column), and dashboard revenue split by type.

### 7g. Weekly "rentals ending soon" digest + Stripe cancel (added 2026-09-26, reworked same day)

- **Trigger:** `netlify/functions/rental-ending-notify.js`, a Netlify scheduled function (runs on Netlify, no one's computer needed): Mondays `0 15 * * 1` UTC (≈ 9 AM Utah in summer). It looks ahead **10 days** (`LOOKAHEAD_DAYS` in `_lib/rental-ending.js`, "a week and a half"; must stay > 7 so no rental slips between weekly runs) and sends **one digest email** plus **one text** listing every `active`/`scheduled` rental whose end date falls in that window. Nothing is sent when none end. It is a digest, not a once-per-rental alert: a rental can appear in two consecutive weeks (a natural reminder); no per-rental "sent" stamp. Rule + SMS wording are pure and tested in `test/rental-ending.test.js` (server `rentalsEndingSoon` and the client mirror `endingSoon` in `dashboard-metrics.js` are asserted equal).
- **Email** (`notifyAdminEndingSoon`, to the `rental_ending` email recipients, else the default admin address): per rental, name/email/phone/address, end date, rate, chamber/machine, and a **Cancel Stripe subscription** button (or "cancellation already requested").
- **Text** (`notifyAdminEndingSoonSms`): follows §7f, so **no customer details**: only a count, the earliest end date and the link `https://purebaric.com/admin?endingSoon=1`, plus the STOP/HELP footer. Recipients subscribe a number to the **"Weekly digest: rentals ending in the next 10 days"** event in admin → Notifications.
- **Consent (done 2026-09-26):** the wording (`SMS_CONSENT_TEXT`, `/sms-consent`, terms §13) covers rental-ending reminders and `CONSENT_VERSION` is `purebaric-sms-consent-v2`. A number that consented under v1 keeps getting reservation/review texts but gets **no** `rental_ending` texts until the admin re-checks the box under the new wording (`hasActiveConsent(r, eventKey)` + `EVENTS_NEEDING_CURRENT_CONSENT`); until then its box shows unchecked and other saves preserve the old consent via `keepEarlierConsent` (can only preserve, never grant). **Still owner tasks:** update the Twilio campaign (sample below) and regenerate the three `images/sms-consent-*.png` screenshots (they show the old wording and 3 categories). Sample message: "Purebaric: 2 rentals end within the next 10 days (first: Oct 3). Review them or cancel Stripe subscriptions: https://purebaric.com/admin?endingSoon=1 Reply STOP to opt out or HELP for help."
- **Links:** `/admin?endingSoon=1` opens the Rentals tab and a list of rentals ending within 10 days, each with a cancel button; `/admin?cancelRental=<id>` (from the email buttons) opens that rental's cancel modal (`openStripeCancel` in `admin.html`). Both need normal admin sign-in and never cancel by themselves. The modal calls `POST /api/admin/stripe-cancel` (`admin-stripe-cancel.js`), which lists the renter's live Stripe subscriptions (matched by email and by name; rentals aren't linked to subscriptions in our data), and only after the admin picks one and confirms does it set `cancel_at_period_end: true` (no more charges, paid time kept) and remember `stripeSubscriptionId` + `stripeCancelRequestedAt` on the rental. Also reachable from a rental's details → "Cancel Stripe subscription".
- **Needs Stripe configured (§7e):** without the secret key the modal says so. The key needs read access to customers/subscriptions and write access to subscriptions (a restricted key is ideal).

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
- **Public submit:** `/reviews` page → `POST /api/reviews-submit` (`reviews-submit.js`). Fields: `firstName`, `lastInitial` (1 char), `city` (optional), `text`. Honeypot `bot-field`, length caps, emails the owner via `notifyAdminReview` **and texts any recipient subscribed to the `review` event** via `notifyAdminReviewSms` (see §7c). Every submission is saved **pending** — nothing is public until the owner publishes.
- **`/reviews` on phones (2026-09-28):** at 820px and below the "Write a review" form comes first (CSS `order:-1` on `.formwrap`), with a "Read N reviews" jump link in the hero to `#reviews`. Desktop keeps reviews left, form right. `/reviews#write` links straight to the form, for review-request texts and emails.
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
- **Cookie banner removed 2026-09-28** (owner decision: US-only business). The opt-out control is now the "Turn off analytics on this device" button on `/privacy` ("Analytics and cookies"), which calls `declinePurebaricAnalytics`. Visitors who declined on the old banner stay opted out. Keep privacy + this file in sync.

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
- **Business rentals page (added 2026-09-28):** `/business` (`business.html`) is the public version of the B2B prospectus in `_internal/outreach/`: contact CTA at the top (call, email, `/contact?topic=business`, which preselects the new "Business rental" topic), the $979/month business rate, revenue estimates, and owner FAQs. It is linked from every page's footer ("For businesses"); on the 15 warm pages also from a text link beside the header's Reserve button (`.nav-biz`, hidden below 1080px so the bar does not crowd) and the mobile menu; and from a dark band low on the homepage (`.biz-band`). The main menu itself is unchanged. The numbers are hard-coded; if the prospectus figures change, update this page too.
- **`robots.txt`** (root) allows all, disallows `/admin` + `/_internal/`, and points to the sitemap. **`sitemap.xml`** (root) lists every public page — **update it whenever you add or remove a public page**, then re-submit it in Google Search Console.
- **Structured data (JSON-LD):** homepage carries an enriched `LocalBusiness` (`@id` `https://purebaric.com/#business`) with telephone, opening hours, contactPoint, geo, and areaServed. **NAP is standardized to Lehi, UT** (changed 2026-10-02 from Salt Lake City, and before that Park City — keep it Lehi everywhere: footer, schema, geo metas, outreach emails, the waiver, and any Google Business Profile). `/faq` has `FAQPage`; `/pricing` has `Service` + `OfferCatalog` (the 4 rental tiers, `provider` `@id` the business); both blog posts have `Article`. All `canonical` + `og:url` are absolute `https://purebaric.com/...`. Validate any new JSON-LD in Google's Rich Results Test before deploying, and keep prices in the OfferCatalog in sync with §10.
- Page titles ≤ ~60 chars, meta descriptions ≤ ~160. `/images/*` is cached one week via a `netlify.toml` `[[headers]]` block; so when you REPLACE an image under the same file name, bump the `?v=N` on its URLs (chamber photos are at `?v=2` since 2026-09-28) or returning visitors keep the old one for up to a week; the first hero slide is preloaded (`fetchpriority=high`) and the other images are `loading="lazy"` with explicit width/height.

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

## 10a. Chambers, machines & availability (inventory model, reworked 2026-09-24)

Individual units, both managed on the admin **Chambers** tab. No "types" or pools.

- **Chamber** — a named unit (PB-001…): `{ id, name, style: "lying"|"sitting", status: "active"|"maintenance"|"archived", notes }`. Store `chambers`.
- **Machine** — a named unit (M-001…): `{ id, name, status: "active"|"maintenance"|"archived", notes }`. Store `machines`. A machine = oxygen enricher + pressurizer + AC. Any machine can run any chamber.
- **Rental** — reserves **one chamber and one machine**: `chamberId` + `machineId`. The owner picks each by number on the rental form.

**Live state is derived, not stored.** For a chamber or machine, `unitState()` returns: `archived`/`maintenance` (manual status wins), else `inuse` (a scheduled/active rental covers today), `scheduled` (an upcoming rental), or `available`. Both the Chambers list and Machines list show this, so a rental going scheduled→active flips both its chamber and machine on the tab. **Bookable today** = min(free active chambers, free active machines) — a rental needs both.

- **Owner setup (admin → Chambers tab):** **+ Add chamber** (name + style) and **+ Add machine** (name). Each unit has row actions: Edit, To maintenance / Return to service, Archive. "Availability right now" shows per style: bookable now, chambers free, machines free (machines are shared across styles).
- **Reservations:** the rental form has a **Chamber** dropdown and a **Machine** dropdown (both by number). Rentals store `chamberId` + `machineId`. Create/edit is blocked with `rental_conflict` (chamber double-book) or `machine_conflict` (machine double-book), both override-able.
- **Where it lives:** pure math in `netlify/functions/_lib/inventory.js` (`unitState`, `computeAvailabilityByStyle`, `computeAvailableCount`, `unitPoolFull`; tests in `test/inventory.test.js`). Storage: chamber + machine CRUD in `_lib/storage.js`; `findRentalConflict({chamberId|machineId,...})` guards both. Endpoints: `/api/admin/chambers`, `/api/admin/machines`, `/api/admin/rentals` (with `machineId`). `GET /api/availability` returns `{ available, total, byType }` where `byType[]` is per style `{ style, label, totalChambers, freeChambers, totalMachines, freeMachines, available }`.
- **Booking page:** `book.html` populates the chamber dropdown from `/api/availability` `byType` (by style `label` + `available`), flagging styles that can't be fulfilled now (still selectable — they route to the waitlist). The chosen style is saved on the booking (`requestedType`).
- **Archived units stay resolvable everywhere except their own list (fixed 2026-09-26):** `admin.html`'s `_chambers`/`_machines` client-side arrays are always fetched with `includeArchived=true` — they're the shared lookup used by the Rentals tab, Customers tab, the calendar, and the rental chamber/machine dropdowns to resolve a rental's unit by id. Archiving a chamber/machine doesn't erase its rental history; a past rental pointing at a since-archived unit must still show its real name, not "(chamber unavailable)"/"(no machine assigned)". The Chambers/Machines tabs' own **"Show archived"** checkbox is now a pure client-side display filter (`renderChambers()`/`renderMachines()` filter on it) — it no longer controls what's fetched at all, so toggling it is instant, no re-fetch.
- **Rental chamber/machine dropdowns only offer genuinely free inventory (fixed 2026-09-26):** `populateChamberSelect(keepChamberId, keepMachineId)` / `populateRentalMachineSelect(keepMachineId)` filter out any unit that's currently `inuse`/`scheduled` per `unitState()`, so you can't accidentally double-book a unit from the dropdown. The optional `keep*Id` params exist so editing an *existing* rental still shows (and keeps selected) that rental's own already-assigned unit, which would otherwise look "taken" by itself. Every entry point that opens the rental form (`editRental`, `openNewRental`, `convertBookingToRental`, `convertWaitlistToRental`) must call `populateChamberSelect(...)` with the right arguments — if you add a new entry point, do the same or the dropdown will silently show stale/wrong options.

---

## 11. Admin portal

- URL **`/admin`** → **Netlify Identity** login. Any valid Identity user gets in (no role requirement — don't add role gating unless asked). Manage users in Netlify → site → **Identity**.
- **Passkey sign-in (added 2026-09-26):** the `/admin` login gate also offers **"Sign in with passkey"** (Face ID / Touch ID / Windows Hello). `requireAuth` (`_lib/admin.js`, now `async` — every caller must `await` it) accepts a valid Identity JWT **or** a passkey session cookie (`pb_admin_session`, HttpOnly, 90 days flat, record in the `adminSessions` Blobs store; code in `_lib/session.js`, `auth-login-options|verify|logout.js`, routes `/api/auth/*` in `netlify.toml`). Passkeys are stored in `passkeyCredentials`; login challenges in `authChallenges` (5 min, one-time). **Registering a device:** sign in (first time: with email + password), click **Passkeys** in the sidebar footer → name the device → **Add this device**; repeat on each device. **Remove** a lost device from the same dialog (existing sessions from that device stay valid until expiry or Sign out). Netlify Identity is deliberately kept as the recovery path — don't remove it. Browser library is vendored at `vendor/simplewebauthn-browser.js` (`@simplewebauthn/server` handles the server side). WebAuthn RP ID is derived from the request host, so passkeys registered on `purebaric.com` don't work on a preview URL or localhost. Audit trails (e.g. SMS consent) record `passkey:<device name>` instead of an email for passkey sessions. Decision recorded in `DECISIONS.md`.
- Reads/writes chambers, machines, rentals, bookings, waitlist, customers, reviews, waivers, and settings (pricing/service area/notifications/Twilio/Stripe) via the `/api/admin/*` functions (Blobs). Out-of-area leads appear here flagged.
- **Almost the entire admin app is one file, `admin.html`** — static markup + a couple of inline `<script>` blocks, no build step, no framework. There is no bundler; edit it directly and reload. This is deliberate (matches the rest of the site) but means the file is large; use targeted `grep`/read-with-offset rather than reading it in one pass.
- **Home-screen icon (2026-09-26):** `admin.html` links `/admin.webmanifest` (name "Purebaric Admin", opens `/admin.html` standalone) and an `apple-touch-icon`; the icons are square PNGs of the brand mark on dark ink in `images/icon-{180,192,512}.png` and `icon-maskable-512.png`. Android reads the manifest, iOS reads the apple-touch-icon — neither uses the SVG favicon. A shortcut saved earlier keeps its old icon: delete it and add it again. The public pages still use the older `apple-touch-icon` (the wide logo).
- **Tabs (left sidebar, in this order since 2026-09-26; on phones the top bar shows the logo, a divider and the current tab name):** Home (revenue dashboard + stat tiles), Rental requests (raw booking submissions from `/book`), Rentals, Chambers (chamber + machine inventory, availability, the 12-month rental calendar), Customers (derived view, see below), Waitlist, Reviews (moderation queue for `/reviews`), Pricing & Payments (per-month rate table + Stripe keys, §7e), Service Area (ZIP gate), Notifications (§7c/§7f).
- **The "inline edit in place" pattern, used throughout (built up over several 2026-09-24…26 sessions) — know this before touching any admin form:** a form (`#chamberForm`, `#machineForm`, `#rentalForm`, `#customerForm`) is a single, static DOM node that gets **moved** (`insertAdjacentElement`), not cloned, to sit directly below the row/section being edited, via a shared pair of helpers:
  - `placeInlineForm(formId, rowSelector, colspan)` — wraps the form in a `<tr><td colspan></td></tr>` and inserts it right after a table row (used for chamber/machine/rental rows, which live in `<table>`s).
  - `resetFormPosition(formId, anchorId)` — moves the form to sit right after a plain anchor `<div id="...FormAnchor">` (used to return a form to its "home" position — e.g. `chamberFormAnchor` at the top of the Chambers tab — for "+ Add" and Cancel, and also used for the *non-table* customer-in-rental case below).
  - **Why `loadAll()` must reposition forms *before* re-rendering lists:** `renderChambers()`/`renderMachines()`/`renderRentals()` all fully replace their list container's `innerHTML` on every reload. If a form is currently living inside that container (mid-edit) when that happens, the form node is destroyed along with the old rows — every future click on it does nothing, silently, because `document.getElementById(formId)` now returns null. `loadAll()` calls `resetFormPosition` for `chamberForm`/`machineForm`/`rentalForm` **first**, before the `Promise.allSettled([...])` batch that triggers those re-renders. If you add a new inline-edited form, you must do the same or you will reintroduce this exact bug (it happened at least twice this week to different people working on this file — see git history "fix rental inventory labels").
  - **Nested forms and `toggleForm`'s ancestor rule (added 2026-09-26):** `#customerForm` can be embedded *inside* `#rentalForm` (see below), so `toggleForm()` was changed to close every other open `.form-card` **except a true ancestor of the one being toggled** (`c !== card && c.contains(card)`). If you add another nested-form case, this rule already covers it, but be careful with call ordering — closing/toggling a form must happen *before* `resetFormPosition` relocates it out of its parent, or the ancestor check has nothing left to protect (see `cancelCustomerForm`/`submitCustomer`'s comments for a worked example of getting this wrong and fixing it).
- **Home tab: revenue dashboard (added 2026-09-26).** Below the Operations tiles: MRR (hero figure, with change since last month-end and vs the same month last year), active subscribers, average monthly price per chamber, annual run rate; three line charts (MRR, subscribers, average price) of the **current year vs the previous year**; a "monthly numbers as a table" view; and a **Business health** row (chamber utilization, contracted revenue remaining, renewals due in 30 days, rentals starting in 30 days, 90-day request-to-rental rate, average rental length, lifetime revenue est.). **All computed in the browser** from the rentals/bookings/chambers the portal already loads (no new API or storage). Definitions live in one place, `dashboard-metrics.js` (pure, tested in `test/dashboard-metrics.test.js`): a rental counts on a day if it is not cancelled and start ≤ day ≤ end; MRR sums each counting rental's monthly-equivalent rate (weekly rentals × 52/12); monthly points are **month-end snapshots** (today for the current month), so a rental that starts and ends inside one month never shows in a month-end MRR; subscribers = distinct renter emails; average price = MRR ÷ counting rentals; months before a year's first rental are gaps, not zeros; "renewals due" skips customers who already have a later rental. `dashboard-charts.js` draws the SVG charts (hover/keyboard tooltip, current year emphasised, prior year dashed grey); colours are the `--viz-*` variables in `admin.html`. `renderDashboard()` in `admin.html` wires it up and runs from `paintStats()`. Lifetime revenue uses the same estimate as the Customers tab's "Lifetime paid" (`lifetimePaid` in `dashboard-metrics.js` mirrors it — change both together). Not included on purpose: unpaid/outstanding balances (payment status isn't logged consistently until Stripe is configured, §7e).
- **Admin portal batch (2026-09-26): search, filters, reordering.** (1) **New rental → Customer record:** a live search box (name, email or phone; digits match regardless of formatting) lists matching customers as you type — tap one to fill the rental (`searchRentalCustomers`, `chooseRentalCustomer`); the old exact-email lookup is gone. (2) **Rental length** now starts on "Choose…" and is **required**; the Billing option reads "Weekly (custom)". (3) **Rentals tab:** Active (active + scheduled) / Completed / Cancelled / All buttons plus a live search by renter name, email or phone; `_rentals` is always the full list (calendar, dashboard and customers read it), only the table is filtered. (4) **Waitlist and Reviews** have the same live search (reviews: name, city, review text — they have no email/phone). (5) **Chambers tab:** the calendar is first; then three cards — Bookable now (limited by free machines), Lying chambers available, Sitting chambers available; then the Chambers heading with Show archived + Add chamber. (6) **Drag to reorder cards:** press and hold (mouse ~0.25s, finger ~0.4s) a card in Home (operations, revenue, revenue-per-rental, business health) or the Chambers availability cards, drag it, drop it; the order saves automatically via `GET/PUT /api/admin/layout` (`settings/adminLayout` in Blobs, validated by `_lib/layout.js`) so it follows you between phone and computer. A container opts in with `data-sortable="<id>"` and its cards with `data-card-key`; containers that re-render call `applyLayoutTo()` afterwards. Not draggable: record lists (rentals, customers, reviews) and the charts. (7) **Notifications:** ticking/unticking an event saves after half a second (Save button kept). Autosave never records SMS consent: it sends consent as on only for a number that is already enabled, and it won't save a recipient with no valid address/number or no event (it toasts instead) because the server would drop them. (8) **Refresh keeps the tab** (the address bar holds e.g. `#chambers`). Shared pure helpers: `admin-utils.js` (`matchesSearch`, `orderByKeys`).
- **Rentals tab:** first column shows chamber name **and** machine name stacked (header "Chamber / machine"). The **rental calendar** (top of the Chambers tab, `renderCalendar()`) is **one row per machine** (changed 2026-09-26, was per chamber): a machine limits when a rental can happen, so each bar is a scheduled or active rental on that machine labelled with the renter and the chamber it's paired with (e.g. M-003 on LC-003 now, SC-001 three months out); gaps are the machine's free time. Overlapping bars stack in lanes, and rentals with no (or a deleted) machine appear in a "No machine" row. Window: this month + 12 months. Only `scheduled` (confirmed, upcoming) and `active` rentals are drawn — a request stays in Rental requests until it's converted to a rental. Clicking a row (not a button in it) opens a read-only "full details" modal (`viewRentalDetails`).
- **Rental ↔ Customer link (built 2026-09-26, reworked the same day so renter details are read-only):** the rental edit form has **no editable renter name/email/phone/address fields**. Its **"Customer record"** section shows the customer (name, email, phone, address — customer's own address, else the address on their most recent rental, same fallback as `editCustomer()`) read-only, with an **"Edit customer"** button that moves `#customerForm` in place (`resetFormPosition('customerForm', 'rentalCustomerFormAnchor')`) — saving it **PATCHes/POSTs the real customer record** (`/api/admin/customers`). The rental's `renter.*` are still saved with each rental as a **deliberately separate point-in-time snapshot**, carried in hidden `renter-*` inputs (`type="text" hidden`, **not** `type="hidden"`: `form.reset()` doesn't clear hidden-type inputs and the previous rental's renter would leak into the next new rental). They are copied from the customer record only (a) when a **new** rental resolves a customer, or (b) when the customer is saved from inside the rental (`submitCustomer` → `setRentalRenter`); opening/saving an existing rental never rewrites its snapshot. A new rental with no customer shows a **lookup-by-email** box and an **"Add new customer"** button (`addCustomerInline()`); Save is blocked until a customer is set. Booking/waitlist → rental conversions prefill the email and resolve the derived customer automatically. Code: `refreshRentalCustomerSummary`, `pickRentalCustomer`, `setRentalRenter`/`getRentalRenter`, `customerAddress` in `admin.html`.
  - **Bugfix that came out of building this:** `createManualCustomer` (`_lib/storage.js`) used to unconditionally create a brand-new manual customer record every time, with no dedup — meaning every save of a *derived* customer (one with no manual record yet, `manualId: null`) created another duplicate record for the same email. It now upserts by normalized email (finds an existing manual record first, updates it if found) — verified with an in-memory `@netlify/blobs` shim (see git history 2026-09-26 for the technique, useful for any future storage.js change since there's no other way to unit-test it, per §6).
- **Customers tab (derived view, `listCustomers()` aggregates rentals + bookings + waitlist + any manual record by normalized email):**
  - **"Lifetime paid" (reworked 2026-09-26 — it used to just sum `paidAmount`, which read $0 for any rental nobody had manually marked paid yet, e.g. before Stripe is configured, §7e):** per rental, a recorded `paidAmount` (even partial) always wins; absent that, a non-cancelled rental is assumed paid in full at its own agreed `monthlyRate` × its length in months, since most rentals here run on recurring billing that isn't logged charge-by-charge; a cancelled rental with nothing recorded contributes $0, no guess. The card marks the total **"(est.)"** whenever any part came from that fallback rather than a real recorded payment (hover for a tooltip explaining why).
  - **"Current rate":** the `monthlyRate` of whichever rental is actually running today, if any.
  - **Total months + "max discount unlocked":** sums each non-cancelled monthly-billed rental's length in months (rounded, ~30.44 days/month) across the customer's whole history, plus **weekly-billed rentals pooled by weeks** (all their weeks added together, then ÷ 52/12 and rounded down to whole months, so several short weekly stints add up) — a 2-month rental plus a later 6-month rental reads "8 months total" — then looks up the **current** rate for that many months from the Pricing & Payments tab (`rateForMonths()`, clamped to the 1–12 table) and calls that out as the discount tier they've earned. Cancelled rentals don't count toward this either.
  - All three of the above are computed **client-side in `renderCustomers()`** from the `rentals[]` array `listCustomers()` already returns — no backend change was needed for any of them.

---

## 12. Troubleshooting

- **`/api/availability` or admin data returns 500 with "Netlify Blobs … 401"** → the `NETLIFY_API_TOKEN` env var expired. Create a new Netlify Personal Access Token with **No expiration** (Netlify → user → User settings → Applications → Personal access tokens), update the env var, then `netlify deploy --prod`. (Manual-deploy sites don't get Netlify's token-free auto-Blobs context, so the token must be valid.)
- **Admin shows blank stat cards + empty tabs (but you're signed in)** → the signed-in Identity JWT went stale, so every `/api/admin/*` call returns 401. **The data is NOT lost** — confirm with `curl https://purebaric.com/api/availability` (public, reads the same Blobs; a non-zero `total` proves chambers persist). As of 2026-09-21 `admin.html` auto-heals this: on any 401 it force-refreshes the token and retries once, and `loadAll()` uses `Promise.allSettled` so one failing section no longer blanks the rest. If the refresh token is also dead it shows a "session expired — sign back in" banner (no more silent blank). Fix: hard-refresh (Cmd+Shift+R) to load latest `admin.html`, then sign out and back in if the banner appears. Server auth is `requireAuth` → `context.clientContext.user` (populated by Netlify from the Bearer JWT); if it 401s even with a fresh login, check Identity is still enabled at `https://purebaric.com/.netlify/identity/settings` (should return 200 JSON).
- **Customer confirmation emails not arriving** → verify the sending domain in Resend (SPF/DKIM).
- **SMS not arriving** → first check §7f: is that specific number's consent actually **enabled** (not just events checked)? A number without active consent is *silently* excluded from every send path, including "Send test" (which will now say so explicitly). If consent is fine, confirm the carrier gateway is right and isn't spam-filtering (try Twilio, §7c, if persistent — owner hasn't activated it yet).
- **A rental shows unpaid/Lifetime paid looks wrong even though the customer paid** → check §7e first: `curl -X POST https://purebaric.com/api/stripe-webhook` — a `503` means Stripe genuinely isn't configured in production, so nothing could have auto-reconciled. This is not a code bug; it's an unfinished owner setup step. Mark the rental paid by hand in the meantime.
- **A form submit fails** → confirm the `fetch`/`<form action>` points at the right `/api/*` endpoint and the function accepts the field names (§8).
- **A function change didn't take effect** → redeploy with `--skip-functions-cache`.
- **`netlify deploy` returns "403 Forbidden," or `netlify login` returns "504 Gateway Time-out"** → this is almost always a Netlify platform incident, not your credentials (reads like `netlify status` can still work while deploy-create 403s). Check https://www.netlifystatus.com/, wait, and retry. If the CLI got logged out, re-run `netlify login` and complete the browser Authorize, confirm with `netlify status`, then deploy. To skip the browser flow entirely, deploy with a token: `NETLIFY_AUTH_TOKEN=<personal-access-token> netlify deploy --prod --dir .` (owner-run; never put the token in the repo). Last resort: drag-and-drop the folder in the Netlify dashboard → Deploys. This happened on 2026-09-21 and cleared on its own after re-auth.
- **`git push`/`git pull` says "Repository not found"** → wrong active `gh` account. See §5a — `gh auth switch --user matthewbailie`, do the git operation, `gh auth switch --user bailie_adobe` to restore the default.
- **`netlify deploy` seems to hang or behaves oddly after 2026-09-26** → `netlify.toml`'s `[build] command` is now `npm test` (§5a), so every deploy — including manual CLI ones — runs the test suite first. A hanging test or a failing one will block the deploy; run `npm test` directly to see the real output before assuming the deploy tool itself is broken.
- **`netlify init`** → do not run this to try to connect Git-based CI unless the owner is present and has explicitly agreed to it (see §5a) — it's an interactive, multi-step wizard that touches the live site's configuration, and the account-authorization step should not be driven blind by an agent.

---

## 13. Rules / gotchas

- **Deploy is still manual, despite a GitHub remote now existing.** Nothing goes live until `netlify deploy --prod --dir .`. See §5a — do not assume `git push` deploys anything until you've confirmed otherwise.
- **Never `git add -A`.** `design-previews/*` is edited live by an external tool outside git; a blanket add sweeps it in. Always add an explicit file list. See §5.
- **Never commit or print secrets.** Keys/tokens live only in Netlify env vars, the admin portal's own masked settings (Twilio/Stripe), and the password manager.
- **Do not change DNS.** Namecheap delegates to Netlify DNS.
- **Blobs is one shared store across deploys** — preview writes hit live data; clean up test rows in `/admin`.
- **`_internal/*.md` is git-tracked but not publicly served** (forced 404 in `netlify.toml`). Keep internal docs here. `DECISIONS.md` (repo root, git-tracked, IS a separate file from this one) is the running architectural-decision log — check it too, and keep adding to it.
- **`admin.html` has no unit tests of its own** (it's markup + inline script, not a module `require()` can load) — `test/admin-rental-inline-edit.test.js` and similar test the *pattern*/logic in isolation, not the live file. Verify admin.html changes by loading it in a browser (force the Identity gate open, mock `fetch` for the endpoints you need) — this whole project's sessions have done this extensively; look at recent git history for the harness technique before reinventing it.
- **zsh:** unquoted `$VAR` does NOT word-split (use an explicit list or `${=VAR}`); never use `path` as a loop variable (it's tied to `$PATH`).
- The Laravel zips / other project folders are NOT the live site. Two GitHub repos are similarly named — see §5.

---

## 14. Health-content policy (important for the blog/marketing)

This is a wellness rental business, **not a medical provider** ("not a medical device; general wellness only" disclaimer sitewide; schema is `LocalBusiness`). Keep marketing claims precise: distinguish mild home hyperbaric (1.3–1.5 ATA) from clinical HBOT, don't present research or testimonials as guaranteed outcomes, and keep the "consult your physician" framing. A qualified medical/regulatory reviewer should approve any new health claims.

---

## 15. Known open follow-ups / owner tasks

**Freshest / most likely to matter first (all added or re-confirmed 2026-09-26):**
- **Finish connecting Netlify to GitHub for CI** (§5a) — owner action, Netlify dashboard → Site configuration → Build & deploy → Link repository → GitHub → `matthewbailie/purebaric-newsite` → `main`. Until then, keep using manual `netlify deploy --prod --dir .`.
- **Configure Stripe** (§7e) — owner action, needs a real Stripe account: secret key + webhook signing secret into admin → Pricing & Payments, plus registering the webhook endpoint in the Stripe dashboard. Confirmed still not done via a live `503` from the webhook endpoint.
- **Activate Twilio SMS** (§7c) — owner action, needs a real Twilio account: create it, buy a number (~$1.15/mo), enter Account SID + Auth Token + From number in admin → Notifications. Free carrier email-to-text still works as a fallback but is unreliable (confirmed dropped on Verizon on this site).
- **(Optional) Twilio inbound STOP webhook** (§7f) — not built; Twilio already honors STOP at the network level regardless, so this is a data-hygiene nicety (keeping our own `consent.status` in sync), not a compliance gap. Only build if asked.
- **Once Stripe/Twilio are live, watch for regressions in the "Lifetime paid (est.)" logic** (§11) — it's designed to gracefully stop estimating once real `paidAmount`s start flowing in from Stripe reconciliation, but it's worth eyeballing a few customer cards after the first real Stripe payment lands to confirm the estimate correctly yields to the real figure.
- **Resubmit the Twilio A2P 10DLC campaign** (§7f) using `/sms-consent` as the public evidence link, once Twilio is actually active — the resubmission Message Flow text is in this session's chat history / the original build request.

**Older, still open:**
- **Validate the staged Ads conversion setup:** keep `booking_request_submit` Primary and `close_convert_lead` Secondary while completed-rental volume is low. Run one labeled end-to-end test through the public reservation form and admin conversion flow. After 2–3 conversion cycles and approximately 10–15 confirmed rentals in a recent 30-day period, make `close_convert_lead` Primary and move `booking_request_submit` to Secondary.
- **Submit `sitemap.xml` in Google Search Console:** verify the domain (DNS TXT) and submit `https://purebaric.com/sitemap.xml`. Re-submit whenever pages are added/removed. Not yet done.
- **Claim a Google Business Profile** (and Bing Places / Apple Business Connect) as a **service-area** business — NAP must match the site exactly: Lehi, UT · (801) 901-0873 · Mon–Sat 8:00 AM–6:00 PM MT. Not yet done.
- **Blog authority (owner-supplied):** a named human author + qualified reviewer, per-claim citations/DOIs.
- **Concrete product proof (owner-supplied):** real chamber specs (manufacturer/model/dimensions/weight/noise/power/concentrator), delivery/setup photos, the founder's real origin story, authentic customer reviews.
- **Real social profile URLs** (Instagram/Facebook links were removed rather than left pointing at the platforms).
- **Deposit amount/%**: the site says "a deposit after we confirm" but names no figure (terms require a deposit without stating one).
- **Sitting-chamber image:** the "coming soon" card reuses the current chamber photo, heavily blurred; replace with a real rendering/photo when available.
- **Finish the design migration:** Safety, Terms, Practitioners, Blog + posts, and Use-case pages still use the legacy teal template (+ jQuery/Toastr/Vite). Migrating them to warm would also drop that legacy JS/CSS weight.
- **Stripe / instant paid booking / real-time availability** — the reservation is request-only today.
