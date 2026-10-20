# Google Ads: why "PB | Search | Utah | Rental Intent 2026" is not converting, and the fix (20 Oct 2026)

Account 364-054-5515. Figures from the account on 20 Oct 2026 (last 30 days unless noted).

## What the numbers say
- 1,258 impressions, 86 clicks, CTR 10.4%, average CPC $3.08, cost $264.52, **1 conversion** (from the search "hyperbaric chamber rental near me"). Cost per conversion $264.
- Impression share 28% and falling; "Eligible (Limited)"; ad strength Average/Poor.
- 86% of spend is mobile.

## The five causes, in order of damage
1. **Auto-apply recommendations were on for 20 of 21 types** (turned on from the mobile app on 17 Oct). Google was adding keywords, adding broad-match versions, removing negatives, switching bid strategies and rewriting ads on its own. Every manual fix was being undone. **Fixed: all auto-apply types are now off.**
2. **Smart Bidding with nothing to learn from.** The campaign is on Maximize conversions, optimising to the account-default "Contact" goal, which has recorded nothing. With zero conversions the algorithm bids blind. The booking conversion (`booking_request_submit`, imported from GA4) is not the campaign's goal.
3. **Keywords that attract the wrong people.** [hyperbaric chamber] (exact) is the biggest spender ($59 in 30 days, 0 conversions): it is what clinic seekers, buyers and the curious type. Broad match "hyperbaric chamber rental cost" and "hyperbaric oxygen chamber for rent" matched to "chamber for healing", "what does a bariatric chamber do", "hyperbaric oxygen therapy" and condition searches (MS, wound healing, sleep apnea, COPD). Spanish searches and competitor brands (oxyprime, summit to sea, redox, elovate) also slipped through.
4. **Search partners are on**, so part of the spend is on non-Google sites with lower intent.
5. **The ad is out of date and lands on the home page.** It still says "Free cancellation 7+ days before delivery" and "Plans from $529/mo on 12-month terms". The one search that converted was the one whose intent matched the ad exactly.

Also: **the campaign has an end date of 12 Nov 2026**. It will stop on its own that day.

## Changes to apply (bulk sheet: `2026-10-20-rental-intent-bulk-upload.csv`)
Upload it in Google Ads: Tools → Bulk actions → Uploads → Upload, then preview and apply. It contains:
- Pauses for the seven keywords that bring clinic, buyer and research traffic (the exact [hyperbaric chamber] among them).
- 62 rental-intent keywords in phrase and exact match only, with a $2.50 max CPC ($3.00 for the business group).
- 76 campaign-level negative phrases: conditions, clinics and treatment, buying, Spanish, competitor brands, jobs and training, pets.
- One rewritten responsive search ad per ad group (15 headlines, 4 descriptions, the first three rental headlines pinned to position 1). Current wording: no charge until delivery, cancel free before delivery, from $529 a month, rent 1 to 12 months, delivered and set up, training included. The business ad carries the one-year price and the 11-session break-even. After the new ads are live, pause the old ones.

## Settings to change by hand (campaign settings, five minutes)
1. **Bidding:** Maximize clicks with a maximum CPC bid limit of $2.50. Switch back to Maximize conversions only after 20 or more booking conversions in 30 days.
2. **Conversion goals:** use campaign-specific goals; make `booking_request_submit` the only primary goal. Leave "Contact" secondary.
3. **Networks:** untick "Include Google search partners".
4. **End date:** remove 12 Nov 2026.
5. **Locations, advanced:** "Presence: people in or regularly in your targeted locations" (not "or interest").
6. **Assets:** add a call asset with (801) 901-0873 (calls are real leads here), four sitelinks (Pricing, How it works, Reviews, Book a chamber), callouts (Delivered & set up, Training included, No charge until delivery, Rent 1 to 12 months, Utah owned) and a structured snippet (Service catalog: Home chamber rental, Business chamber rental, Delivery and setup, Staff training).

## What to expect
Clicks will drop at first because the generic keyword is paused; that is the point. Judge by booking submissions and calls, not clicks. Give it 14 days before touching anything. Leave auto-apply off.
