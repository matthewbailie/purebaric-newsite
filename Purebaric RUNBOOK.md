# Purebaric.com — Maintenance & Update Runbook

A complete handoff for anyone (human or AI agent) maintaining **purebaric.com**.
Follow this to make and ship changes safely.

> ⚠️ **This file contains NO passwords, tokens, or API keys — on purpose.**
> Secrets live in a password manager and in the Netlify dashboard (see
> "Accounts & credentials"). Never paste a real secret into this file, into
> chat, into git, or into any code file.

---

## 1. What this site is (architecture)

purebaric.com is a **Netlify serverless site** — NOT WordPress and NOT the
Laravel app that exists in old zips (see "Dead ends" below).

| Layer | Technology |
|---|---|
| Public pages | Plain static **HTML/CSS/JS** (`index.html`, `pricing.html`, `blog/…`, etc.) |
| Backend / APIs | **Netlify Functions** (Node.js) in `netlify/functions/` |
| Admin auth | **Netlify Identity** (login at `/admin`) |
| Data storage | **Netlify Blobs** (no external database) |
| Transactional email | **Resend** |
| Inbound email (@purebaric.com) | **ImprovMX** forwarding |
| DNS | **Netlify DNS** (domain registered at Namecheap) |

**Do not migrate this to PHP/WordPress and do not change DNS.**

---

## 1b. 2026 redesign — what changed (read before editing pages)

The homepage and top pages were redesigned into a **warm** look (cream / terracotta / olive) replacing the old teal/navy theme.

**Design system split:**
- `index.html` — the new homepage. **Self-contained** (its own inline `<style>`/`<script>`), including the rental-length pricing slider, mobile booking sheet, photo lightbox, hamburger menu, footer, and cookie banner.
- `chambers.html`, `pricing.html`, `how-it-works.html` — restyled to the warm design. They share **`/warm.css`** (design tokens, nav, footer, cookie, common components) and **`/warm.js`** (mobile menu toggle + cookie consent).
- All **other** pages (`about`, `faq`, `contact`, `safety`, `terms`, `waitlist`, `book`, `blog/…`, `use-cases/…`, `service-area`, `practitioners`) still use the **older `styles.css`** (teal). They remain fully functional; migrate them to the warm design later.

**Chamber & pricing model (single chamber):**
- There is now **one** rentable chamber: **Soft-Shell 1.5 ATA**. The **1.5 ATA Sitting Chamber** is marked "Coming soon · Late Oct 2026."
- The old **Executive Hard-Shell 2.0 ATA** was **removed from all frontend pages** (chamber cards, booking dropdowns, and JSON-LD).
- Pricing is **length-tiered** on the one chamber:

  | Rental length | Monthly rate | Savings |
  |---|---|---|
  | 1 month | $729 | — |
  | 2–3 months | $659 | Save 10% |
  | 4–11 months | $579 | Save 21% |
  | 12 months | $529 | Save 27% |

**Where to change prices (keep these in sync):**
- Homepage slider math: the `rate(m)` function in the inline `<script>` at the bottom of `index.html` (and the mirror copy in the mockup `~/projects/purebaric-mockups/base.html`).
- Pricing page cards: the `.tiers` block in `pricing.html`.
- Chamber "from $" figures: `index.html` (Chambers section) and `chambers.html`.

**⚠️ Owner-only action — remove the 2.0 ATA from the admin inventory:**
The `/admin` portal lists **physical chamber units from Netlify Blobs**, not from code. If a unit named/modelled as "2.0 ATA" (or the old Executive Hard-Shell) still exists there, **archive it yourself**: sign in at `/admin` → **Chambers** tab → open that unit → set status to **Archived** (or Delete). Code changes and deploys cannot remove Blobs data — only the authenticated admin portal can.

---

## 2. Accounts & credentials (get these from the owner / password manager)

The owner is **Matthew Bailie**. None of these secrets are stored here.

| Account | Purpose | Where to sign in | What you need |
|---|---|---|---|
| **Netlify** | Hosting, deploys, Functions, Identity, Blobs, DNS | app.netlify.com | Owner login (email: matthewbailie@gmail.com). Team **Purebaric**. |
| **Namecheap** | Domain registrar for purebaric.com | namecheap.com | Owner login (only needed if DNS nameservers ever change — normally never) |
| **Netlify Identity user** | Logs into the `/admin` portal | the site's `/admin` page | Admin email + password (in password manager) |
| **Resend** | Sends booking/waitlist/contact emails | resend.com | Owner login; API key is stored as a Netlify env var (below) |
| **ImprovMX** | Forwards mail sent to @purebaric.com | improvmx.com | Owner login (rarely needed) |
| **GitHub (matthewbailie)** | Optional source backup | github.com | Personal account. NOTE: repo `matthewbailie/purebaric.com` is the **dead Laravel code** — ignore it. |

### Netlify site facts
- Site name: **purebaric**
- Site ID: **3e2c12f7-e737-4849-90aa-6b6134edbfab**
- Custom domain: **purebaric.com** (SSL on)
- Deploy method: **manual** via `netlify deploy` (NOT connected to git)

### Netlify environment variables (values in Netlify UI → Site config → Environment variables)
- `NETLIFY_API_TOKEN` — used by the Functions to reach Netlify Blobs. **Must be a Netlify Personal Access Token set to "No expiration."** If Blobs calls start returning 401 (see Troubleshooting), this token expired — create a new no-expiration PAT and update this var.
- `NETLIFY_SITE_ID` — the site ID above.
- `RESEND_API_KEY` — Resend sending key.

---

## 3. The source of truth

All site code lives locally at:

```
~/projects/purebaric-newsite
```

It is a git repo (local commits) linked to the Netlify site. **Edit here, then deploy.**

Other folders on this machine are **dead ends — do not use them for the live site:**
- `~/projects/purebaric.com` and `~/Downloads/purebaric.com-main*.zip` — the vendor's **Laravel** rewrite (different tech, needs PHP hosting, not what runs live).
- `~/projects/purebaric-deploy` — an abandoned Laravel deploy package.
- `~/projects/purebaric-live` — the *previous* (pre-redesign) recovered source, kept only for reference/rollback assets.
- `~/projects/purebaric-site` — an early static mirror.

---

## 4. Tools required

- **Node.js** ≥ 22.12 (this machine has it via nvm)
- **Netlify CLI**: `npm install -g netlify-cli`
- **git**
- (PHP is NOT needed for the live site.)

First-time CLI setup:
```bash
netlify login        # opens browser; owner approves
cd ~/projects/purebaric-newsite
netlify link --id 3e2c12f7-e737-4849-90aa-6b6134edbfab
```

---

## 5. How to make and ship a change (the core workflow)

```bash
cd ~/projects/purebaric-newsite

# 1. Edit files (HTML/CSS/JS in the root; functions in netlify/functions/)

# 2. Preview to a temporary URL (does NOT affect the live site)
netlify deploy
#    -> open the "Draft URL" it prints and check your change

# 3. Publish to the live site
netlify deploy --prod

# 4. Commit the change to git history
git add -A && git commit -m "describe the change"
```

Netlify serves `pricing.html` at the clean URL `/pricing` automatically — keep
using `.html` files and link with clean paths (`href="/pricing"`).

### Rollback (if a deploy looks wrong)
Netlify → site **purebaric** → **Deploys** → pick a previous deploy → **Publish deploy**.
Reference deploy IDs:
- `6aaf1792b0540a3cab3c186c` — current (new design + old hero image restored)
- `6aadc42ce77aff09529b255f` — new design, new bedroom hero
- `6aadba18b7fae686544df2da` — previous OLD design (with the admin/Blobs bug fixes)

---

## 6. Where things are (file map)

```
purebaric-newsite/
├── index.html, pricing.html, about.html, faq.html, chambers.html,
│   how-it-works.html, safety.html, practitioners.html, service-area.html,
│   terms.html, book.html, waitlist.html, contact.html
├── blog.html + blog/<post-slug>.html
├── use-cases/<slug>.html            (athletic-recovery, longevity, pediatric, …)
├── admin.html                       (the admin portal UI — Netlify Identity)
├── styles.css, script.js
├── build/assets/app-*.css|js        (compiled styles/scripts for the new design)
├── images/                          (chamber photos, logos, etc.)
├── netlify.toml                     (redirects /api/* → functions; scheduled job)
└── netlify/functions/
    ├── availability.js              (public: how many chambers free)
    ├── booking-submit.js            (public: /api/booking-submit)
    ├── waitlist-join.js             (public: /api/waitlist-join)
    ├── contact-submit.js            (public: /api/contact-submit)
    ├── admin-*.js                   (auth-gated: chambers, rentals, bookings,
    │                                 waitlist, customers, waiver)
    ├── expire-holds.js              (scheduled hourly; frees expired holds)
    └── _lib/
        ├── storage.js               (all Netlify Blobs reads/writes)
        ├── email.js                 (Resend send + templates)
        └── admin.js                 (requireAuth: needs a valid Identity login)
```

**Data (Netlify Blobs) stores:** `chambers`, `rentals`, `bookings`, `waitlist`,
`customers`, `waivers`. Manage the contents through the `/admin` portal.

---

## 7. How the forms work (important if you touch them)

The public forms submit (via jQuery AJAX, `form.serialize()`) to Netlify Functions.
The form field names come from the vendor frontend, so the functions accept BOTH
their own field names and these aliases:

| Form (page) | Posts to | Notable field aliases the function accepts |
|---|---|---|
| Booking (modal on every page + book.html) | `/api/booking-submit` | `customer_name`→first/last, `customer_email`→email, `customer_phone`→phone, `zip_code`→zip, `preferred_date`→start-date, `notes`→reason |
| Waitlist (waitlist.html) | `/api/waitlist-join` | `first_name`+`last_name`→name, `city_zip`→zip, `earliest_start`→preferred-start, `rental_length`/`urgency`→reason |
| Contact (contact.html) | `/api/contact-submit` | `name`, `email`, `phone`, `topic`, `message` |

The functions return `{ success: true, booking_number, message }` so the page's
success handler works. Booking + waitlist submissions appear in the `/admin`
portal; contact messages are emailed to the owner (not stored).

If you change a form's fields, update the matching function in `netlify/functions/`.

---

## 8. The admin portal

- URL: **/admin** → prompts a **Netlify Identity** login.
- Any valid Identity user can access it (there is **no role requirement** in
  the code — do not add role gating unless asked).
- To add/remove admin users: Netlify → site → **Identity**.
- The admin reads/writes chambers, rentals, bookings, waitlist, customers via
  the `/api/admin/*` functions (which use Netlify Blobs).
- If the admin loads but data calls fail with 401 and the console shows
  "Failed to parse tokenResponse claims," it's a stale browser token — sign out
  and back in. The startup cleanup in `admin.html` clears corrupted tokens.

---

## 9. Troubleshooting

**`/api/availability` or admin data returns 500 with "Netlify Blobs … 401"**
→ The `NETLIFY_API_TOKEN` env var expired. Fix:
1. Netlify → user avatar → **User settings → Applications → Personal access tokens → New access token**, set **No expiration**, copy it.
2. Netlify → site **purebaric** → **Site configuration → Environment variables** → edit `NETLIFY_API_TOKEN` → paste new value → save.
3. Redeploy: `netlify deploy --prod`.
(Root cause: this site is deployed manually, so Netlify's token-free "auto Blobs context" isn't available; the Functions must use the token.)

**Admin lets you in but every data call is 401** → stale Identity token; sign out/in.

**Customer confirmation emails not arriving** → Resend likely needs the sending
domain verified. Admin notifications already work. Check the Resend dashboard.

**A form submit fails** → confirm the `<form action>` points at the right
`/api/*` endpoint and the function accepts the field names (Section 7).

---

## 10. Gotchas / rules

- **Deploy is manual** (not git-connected). Nothing goes live until `netlify deploy --prod`.
- **Never commit or print secrets.** Tokens/keys live only in the Netlify env vars + password manager.
- **Do not change DNS.** The domain (Namecheap) delegates to Netlify DNS and works.
- **Netlify Blobs is one shared store across all deploys** — so a *preview* deploy that writes data (e.g. a test booking) writes to the **live** data. Use obviously-fake test data and delete it via `/admin` afterward.
- **zsh scripting:** never use `path` as a loop variable — it's tied to `$PATH` and will break your shell. Use `p`/`pth`.
- The Laravel zips are NOT the live site. Ignore them.

---

## 11. Known open follow-ups (as of 2026-09-19)

- Delete 2 test records created while verifying forms: booking **"TEST Delete Me" (#ED8DE83A)** and waitlist **"TEST DeleteMe"** — via `/admin`.
- Verify **Resend** domain so customer-facing confirmation emails send (admin notifications already work).
- Optional: hide the **"Sign In"** link in the public nav (it points to `/admin`).
- Optional: push `~/projects/purebaric-newsite` to a new GitHub repo for durable version history (the name `matthewbailie/purebaric.com` is taken by the dead Laravel code — use a different name).

---

## 12. History (what was done, for context)

1. Discovered the live site is a Netlify serverless app (not the Laravel zip).
2. Recovered the deployed source, fixed two production bugs: the Blobs 401
   (expired `NETLIFY_API_TOKEN`) and the admin Identity stale-token 401.
3. Found the vendor's newer frontend (in the zip) had more content + a blog,
   rebuilt it as static pages, wired its forms to the Netlify backend, and
   deployed it live.
4. Restored the previous homepage hero image at the owner's request (the new
   bedroom shot is kept as `images/chamber-side.newdesign.jpg`).
