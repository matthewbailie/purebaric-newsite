# Phase 2. Market scan, provider inventory and the scorecard

Run three agents in parallel (Opus for the scorecard, Sonnet for the inventories), each with a 60 to 70 search budget, then do the Google Trends and classifieds checks yourself in the browser.

## 2a. Hyperbaric provider inventory
Agent output: `hbot_providers.json` (array of objects with keys: name, type, chamber_type, pressure_ata, session_price, package_prices, prescription_required, address, city, phone, website, source_url, source_date, verified) and `hbot_providers.md`. After 2b and 2c are done, write the workbook yourself with openpyxl from the JSON and the classifieds notes, `purebaric_<slug>_hbot_providers.xlsx`, with sheets: Providers (name, type: hospital wound care / clinic / wellness studio / chiropractic / unverified, chamber type and pressure, session and package prices, prescription requirement, address, phone, website, source), Chamber rental businesses (in the state and nationally, monthly rates), Dealers and sellers (new and used, including Facebook Marketplace listings with item links), Regional price references, Classifieds check, Summary. Every price needs a source URL and a date. Mark "unverified" anything that rests on one directory page (Fresha-only listings were the Knoxville trap).

## 2b. Classifieds and marketplaces
Do this in the browser yourself: Facebook Marketplace (needs the owner's personal profile, not a Page), Craigslist and OfferUp (both block the built-in browser; use Chrome), searching "hyperbaric" within 50 miles. Record every chamber for sale or rent, its price, how long it has been listed, and the seller type. Write `classifieds_check.md`. A used chamber unsold for months is a demand signal; a dealer selling new chambers locally is a competitor for home rentals.

## 2c. Google Trends
In Chrome, pull five-year "hyperbaric chamber" interest for the new metro versus Salt Lake City and the nearest big metro on one scale, then the four terms "hyperbaric chamber", "hyperbaric oxygen therapy", "hyperbaric near me" and "hyperbaric rental" in the new metro alone (Knoxville showed that "hyperbaric rental" has no reportable volume anywhere), (metro DMA codes; Knoxville was US-TN-557, Salt Lake City US-UT-770), the state versus Utah, the in-state metro ranking, the most recent weeks, and the rising related queries for each. Trends rate-limits scraping; wait, screenshot, and record numbers by hand. Write `google_trends_check.md` with the comparison table, the reading (awareness-stage versus purchase-stage queries) and the links. Note that small metros sit below the reporting threshold and that two-week comparisons are not trends.

## 2d. Demographics and demand signals
Metro population and growth, county median household incomes versus Salt Lake County, share of households over $100k, share over 65, cost-of-living adjustment, marathon and race registrations, running and cycling clubs, trail mileage, pro and college teams, stadium and attendance figures (quote what the source says, for example "70,500 season tickets sold", not "sells out"), hospital systems with hyperbaric programs, med-spa and gym counts. Every figure with a numbered source link. This is main-session work or one Sonnet agent (prompt in agent-prompts.md).

## 2e. The scorecard
`market_analysis.md` holds a ten-indicator table scored 1 to 5 with these weights (total 100; score = sum of weight x points / 5):

| Indicator | Weight |
|---|---|
| 1. Population and growth | 10 |
| 2. Income and spending | 15 |
| 3. Endurance and active lifestyle | 10 |
| 4. Fitness and recovery supply | 15 |
| 5. Beauty and med-spa industry | 10 |
| 6. Health system and sports | 10 |
| 7. Search and cultural demand | 10 |
| 8. Rental competition | 10 |
| 9. Logistics and regulation | 5 |
| 10. Marketing cost | 5 |

Score the new market and the comparison markets in the same table with a one-line justification and sources per cell. Hold the Wasatch Front column at Knoxville's scores (3, 5, 4, 4, 4, 4, 3, 2, 5, 3 for indicators 1 to 10, total 73) unless the agent cites new data; "nr" (not researched in depth) scores a neutral 3. Indicators 8, 9 and 10 score higher when the entrant has it easier (no rental competitor = 5; home base = 5; cheap media = 5). Anchors, calibrated on Knoxville's cells: indicator 1, 1 = shrinking metro under 300k, 3 = about 1 million growing 5 to 10 percent a decade, 5 = over 2 million growing fast; indicator 2, 1 = county median income under $60k, 3 = about $85k, 5 = over $100k with half of households over $100k; indicator 3, 1 = no marathon or clubs, 3 = a marathon with 3 to 5 registrants per 1,000 residents, 5 = over 8 per 1,000 with triathlons and trail systems; indicator 4, 1 = no recovery studios and no wellness HBOT, 3 = a few studios and one or two wellness chambers, 5 = a Restore-type chain plus independent studios (supply counts as placement opportunity, not as competition); indicator 5, 1 = under 20 med spas, 3 = 50 to 100, 5 = over 150; indicator 6, 1 = no Level I trauma centre or major teams, 3 = one health system and minor-league teams, 5 = several systems and a Power-conference program; indicator 7, 1 = Trends index near zero and no local coverage, 3 = index several times lower than Salt Lake City but visible, 5 = index at or above Salt Lake City with local coverage; indicator 8, 1 = two or more local renters, 3 = one renter or regional renters, 5 = none within 100 miles; indicator 9, 1 = over 1,500 miles with a licence blocker, 3 = within a day's drive, 5 = home base; indicator 10, 1 = top-20 media market CPMs, 3 = mid-market, 5 = cheap local media with a single dominant billboard vendor. State the rubric's limits: the score measures market attractiveness and does not price in legal feasibility; indicator 9 must be revisited after Phase 4 (say whether it changes). Then: verdict paragraph, five reasons to enter, five reasons against, recommended entry model (which must match the runbook once it exists), and a numbered source appendix. Knoxville scored 62 out of 100 against the Wasatch Front's 73; a pilot-sized bet was the verdict. Revisit indicator 9 after Phase 4 and say whether the score changed.

## 2f. Executive brief v1
`EXECUTIVE-BRIEF.md` is a living document with a version number and a change log. Sections: the question, verdict and score with likelihood of success, what we found (competition, demand, prospects, compliance and logistics), recommended entry model, channels under evaluation, facts to verify in person, legal check (added in Phase 4), sources and files, change log. Every later phase bumps the version and adds a change-log line. Write counts into it only from the workbook Summary sheet, and refresh them whenever the list changes (the Knoxville brief carried stale counts through three versions before the critique caught it).
