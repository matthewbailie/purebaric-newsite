# Purebaric homepage personalization (v1)

Owner: Grok Bot (built for Matthew's t5u request, Nov 24 2026). Readout owner: Purebaric Optimization & Personalization.
Code: `pb-personalize.js` (repo root), hook in `index.html`, tests in `test/personalize.test.js`.
Copy of this file in the repo: `_internal/personalization/README.md` (not served publicly).

## What a visitor sees

| Visitor | Homepage |
|---|---|
| First visit, no ad tags | Default homepage, unchanged |
| Showed interest in the **sitting chamber** (clicked a sitting CTA, opened `/book?chamber=sitting`, picked sitting in a chamber selector, 3s+ on the sitting section of /chambers, or came from a sitting ad) | Hero headline "A sitting hyperbaric chamber, at home" (the approved Meta ad headline), sitting copy from /chambers, sitting photo first in the carousel, primary CTA goes to `/book?chamber=sitting`, sitting card first, price box preselects sitting |
| Showed interest in the **lying chamber** | Default headline/photo (it already features the lying chamber); CTA goes to `/book?chamber=lying` |
| Showed **business** interest (clicked a `/book?type=business` CTA or opened it; a single /business page view is not enough) | Business page headline and copy, gym photo first, CTA "Book a chamber for your business" → `/book?type=business`, secondary "For businesses" |
| Read a **city page** (Salt Lake City, Park City, Ogden, Draper/Sandy, Utah County) in the last 30 days | Eyebrow "● Now delivering in Park City" (etc.) |
| Any of the above on a **later visit** (new browser session), with no request submitted in the last 30 days | Adds "Still thinking about the sitting chamber? **See delivery dates →**" (request mode: "**Reserve a chamber →**", via `data-request-text`; applyHome also checks `html.reqmode-site` in case it runs after the mode swap) under the hero buttons (carries their last rental length) |
| Ad visitor landing on the homepage with tags naming a chamber (`utm_content/utm_term/utm_campaign` containing "sitting", or `?pz=sitting`, `?chamber=sitting`) | Matching hero immediately (message match), no nudge |
| 10% **control** group | Always the default homepage; exposure still logged |
| GPC, Do Not Track, analytics turned off, or personalization turned off on /privacy | Default homepage, nothing stored (any saved profile is erased), no event, **outside the experiment population** |

All copy and photos already exist on the site. No prices, medical or FDA claims were added.

## How it works

- `pb-personalize.js` loads on every public page (`defer`). On the homepage it loads `async blocking="render"` in the head: Chrome/Edge do not paint until it has run, so there is no flicker. For browsers without `blocking="render"` (Safari, Firefox), a 1-line inline fallback hides only the hero (visibility, so no layout shift) for visitors in the personalized group, for at most 800 ms.
- An inline hook right after the hero copy (`window.__pzHero=1; PBPZ.applyHome()`) applies the variant as soon as the hero is parsed. If the script arrives later, `boot()` applies it. It is idempotent.
- Fail safe: every entry point is in try/catch. Corrupt storage, a missing script, or any error leaves the default homepage (tested).

### Storage (localStorage key `pb_pz`, no cookies, no PII)

```json
{"v":1,"g":"p","c":<created ms>,"u":<updated ms>,"n":<visits>,"ss":<this visit start ms>,
 "s":{"sitting":{"w":7,"t":<ms>},"lying":{...},"business":{...}},
 "ad":{"i":"sitting","t":<ms>},"city":{"k":"park-city","t":<ms>},"mo":4,"lead":<ms>}
```
Never stored: names, contact details, ZIP, address, free text, raw URLs, raw UTM values, use-case/health pages read. `sessionStorage.pb_pz_s` marks the current visit. `localStorage.pb_pz_off=1` = visitor opted out on /privacy.
Expiry: the profile is dropped 45 days after its last update (a new random group is then drawn).

### Signals and weights (points; each kind counts once per page view)

| Signal | Points |
|---|---|
| Arrived from an ad whose tags name the chamber (`utm`) | 5 |
| Opened `/book` with that chamber (or `type=business`) preselected | 4 |
| Picked that chamber in a selector (homepage price box, /book dropdown) | 3 |
| Clicked a link with `chamber=` / `type=business`, or a button inside a `[data-pz-interest]` card | 3 |
| Viewed /business | 1.5 |
| That chamber's section 50%+ on screen for 3 s (`[data-pz-dwell]`, /chambers) | 1.5 |

Recency: every score halves every 14 days (exponential decay, "frecency"). Decision: the top interest must score ≥ 2 and lead the runner-up by ≥ 1.5. So one CTA click holds for about a week, an ad click for about 2.5 weeks, and someone who looked at both chambers equally sees the default.

## Measurement

**Assignment:** at first profile creation, `crypto.getRandomValues` → 10% `g:"c"` (control), 90% `g:"p"`. Sticky in localStorage for the profile's life.

**Events (GA4, via `trackPurebaricEvent`, existing opt-out applies):**

| Event | When | Parameters |
|---|---|---|
| `personalization_exposure` | Every homepage view where the visitor is eligible (has a qualifying interest or city), for **both arms**, once per page view | `variant` = `personalized`\|`control`; `interest` = `sitting`\|`lying`\|`business`\|`none` (city only); `reason` = `ad`\|`behavior`\|`city`; `city` = `yes`\|`no`; `nudge` = `yes`\|`no` (would show / shown); `visit_type` = `first`\|`return` |
| user property `pz_group` | Every page view of any visitor with a profile | `personalized`\|`control` |

Opted-out visitors fire neither, so they are excluded, not counted as control.

**GA4 setup needed (one-time, admin):** register custom dimensions: event-scoped `variant`, `interest`, `reason`, `visit_type`; user-scoped `pz_group`.

**Readout (triggered analysis):** population = users with ≥1 `personalization_exposure`. Compare `personalized` vs `control` on, per exposed user within 7 days:
1. `booking_form_start` rate (primary leading metric, already tracked)
2. /book page views from the homepage (secondary)
3. Real leads: completed bookings (`booking_request_submit` server event / admin records), waitlist, genuine inquiries (KPI, too thin to call alone at 1-3 leads/week)
Lift = (personalized − control) / control, with a 90% interval. Pre-registered rule: run ≥ 4 full weeks or ≥ 100 exposed control users, whichever later; do not peek-and-stop. Scale (keep, start v2 tests) if the form-start lift interval is above 0; kill/rework a variant if its interval is below 0. Expect thin data: with a 10% holdout the control arm grows slowly; if after 6 weeks it has < 100 users, raise the holdout to 20-30% for the next cycle.

## Hypothesis backlog (v2), ICE 1-10

| # | Hypothesis | I | C | E | ICE |
|---|---|---|---|---|---|
| P-1 | **Inventory-aware hero**: if `/api/availability` shows 0 of the visitor's chamber type, show "Join the waitlist" for it instead of booking (avoids sending interest to a sold-out product) | 7 | 7 | 7 | 7.0 |
| P-2 | **Returning-lead "finish your request" hero**: after a step-1 save without step 2 (the H-4 partial leads), the homepage hero says "Finish your request" and links back to /book with their chamber and months | 8 | 6 | 6 | 6.7 |
| P-3 | **Marketplace-to-site hero**: give Marketplace listings links like `purebaric.com/?pz=sitting&utm_source=fb_marketplace` (already supported) so the homepage matches the listing; measure with `reason=ad` | 6 | 6 | 8 | 6.7 |
| P-4 | **Term-length nudge**: for return visitors who chose 1-3 months, show the existing "rent longer, save more" savings at 4 and 12 months under the hero | 6 | 5 | 8 | 6.3 |
| P-5 | **Ad message match on /book** (where all Meta ads land): mirror the ad headline on step 1 for `utm_content=sitting_chamber` | 6 | 6 | 6 | 6.0 |
| P-6 | **Sitting photo as WebP** (433 KB JPG → ~96 KB WebP) + preload the personalized hero image instead of the default one, to speed LCP for sitting visitors | 4 | 8 | 8 | 6.7 |
| P-7 | **Geo by Utah city via a Netlify Edge Function** (`context.geo.city`), server-rendered eyebrow for first-time visitors; costs an edge invocation per homepage view and moves HTML off the CDN cache, so only worth it once city-eyebrow lift is shown for city-page readers | 5 | 4 | 4 | 4.3 |
| P-8 | **Use-case interest** (athletic recovery, longevity) → matching existing photo/headline. Deliberately excluded from v1: inferring health interests is sensitive; needs a privacy and claims review first | 4 | 4 | 5 | 4.3 |

## Change log
- v1 (Nov 24 2026): shipped as described above.
