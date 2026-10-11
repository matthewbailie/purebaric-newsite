# Knoxville prospect list: adversarial review (2026-10-10)

Reviewer stance: skeptical sales-ops lead. The goal was to find what is wrong before any money or sender reputation is spent.
Inputs: `research/prospects_for_review.csv` (122 rows), `research/competitors_for_review.csv` (12), `research/dropped_for_review.csv` (7).
Machine-readable fixes: `research/_overrides.json` (6 drop, 43 flag, 6 add).
Search budget used: 58 of 60 WebSearch calls.

## Verdict in one paragraph

**Not ready for cold email.** Only 13 of 122 rows (11%) have an email address. Of those 13, I could confirm only 7 as real. Only about 4 of the 7 reach a plausible decision-maker: Massey at Maryville College, Perry at Johnson U, McKenna at One Knoxville SC and Gill at Webb. One email looks constructed from a pattern (Spa Visage), which the brief prohibits. One names the wrong person (CAK's athletic director changed). One is a hockey broadcaster's inbox.

As built, this is a phone and contact-form call list, not an email list. It is also weighted toward the wrong customers. 38 rows (31%) are chiropractors and PTs, many pulled from NPI, Healthgrades or WebMD records with no website. Only 17 rows are recovery studios or med spas, the businesses most likely to pay $783 to $979 a month for a chamber.

The competitor file does not do its job. Of 12 rows, only one is a confirmed mild-HBOT wellness provider (Bell Family Chiropractic, which has no address). Four are hospital or wound-care programs, two of which look like the same Parkwest program. Six are unverified claims from one Fresha booking-directory page, and four of those six also appear in the prospect list.

Usable after fixes: roughly 60 to 70 rows for phone or contact-form outreach, and fewer than 10 for email.

---

## 1. Structural checks (no searching)

### 1a. Duplicates and near-duplicates

| Rows (CSV line) | Problem | Evidence | Action |
|---|---|---|---|
| 62 `Healing Hands Spa - Farragut` / 114 `Healing Hands Spa (Farragut)` | Same business twice, under two industries (Recovery and Salons) | Same address (10935 Kingston Pike) and same phone (865) 671-3200. The enrich notes say "DUPLICATE" | Drop 114 |
| 38 `One Knox Collective & Youth Club` / 39 `One Knoxville SC` | Same organization, same address (4 Market Square), same domain | The youth club is a program of the pro club. Two cold emails to one 10-person front office looks like spam | Drop 38, keep 39 |
| 10 / 21 `Studio P Pilates` (Maryville and Lenoir City) | Same owner, same phone (256) 571-6837, same website | Two locations of one business | Drop the Lenoir City row; note it in the Maryville row |
| 121 `Sola - Turkey Creek` / 110 `Sola - Bearden` | Same franchise, same leasing manager (Judy Thompson), and the real Bearden phone is the Turkey Creek phone (327-0922) | Sola pages | Keep both, one outreach |
| 3 `Take Charge Fitness Program` / 72 `CORA PT - Clinton` | Same street address (1921 N Charles G Seivers Blvd) | Possibly a program inside the PT clinic | Flag |
| 113 `Jillian Nicole Aesthetics` (Maryville) / 117 `Knox Skin Society` (Knoxville) | Same phone 865-209-4713 for two unrelated businesses 15 miles apart | Notes admit the number also appears on other Fresha listings | Flag both; at least one phone is wrong |
| 7 `Blount Memorial Wellness Center at Cherokee` (1412 Sevierville Rd) / 23 `CrossFit CHF` (1410 Sevierville Rd) | CHF's address came from a listing saying 1412 Sevierville Rd "is used as a CrossFit gym" | One of the two addresses is wrong | Flag both |
| 89 Tristar, 90 Thrive, 94 ETSS, 97 Marble City | Listed as **prospects and competitors at the same time** | Same phone or name in both CSVs | Pick one. The HBOT evidence is a single Fresha page, so keep them as prospects, flagged "call to confirm HBOT", and remove them from the competitor file |

### 1b. Industry labels that do not fit

- **Competitors file**: Methodist (hospital wound care), Tristar PT, Thrive PT and Select PT are labeled "CrossFit and performance gyms". This is a source-file artifact from crossfit.json.
- Acupuncture and functional-medicine practices are labeled "Physical therapy, chiropractic, and sports medicine": Ascending Self, The Middle Path, West Knox Acupuncture, Balanced You Clinic and Knox Wellness. They may be fine prospects, but the label inflates the PT/chiro count.
- Private golf and tennis clubs are labeled "Sports teams and athletic programs": Fox Den CC, Cherokee CC, Holston Hills CC and Cedar Bluff Racquet Club. These are clubs, not teams. They are a reasonable amenity pitch but a different sales motion.
- Estheticians are split across two labels. Skin by Jenn is under "Recovery studios", while Knox Skin Society and The Skin Cleric are under "Salons". Healing Hands appears under both.
- Weak fits for a 1.5 ATA chamber rental: Obsidian Salon and Tattoo, Skin by Jenn, Green Meadow Swim Team and Maryville-Alcoa Flying Dolphins. Notes call the two swim teams "seasonal" and "volunteer-run", and the Flying Dolphins row has no phone.

### 1c. No phone AND no website (fails the brief's own rule)
- Row 5 `Koa Strength and Fitness`
- Row 32 `Performance Training Inc.`

Rows that pass only because a third-party listing is used as the website, with no phone: Get Fit Maryville, T3 Training & Stretch, Secret City CrossFit, CrossFit CHF, CrossFit First Creek, Rocky Top CrossFit, Benchmark x3, David Finch PT, Pruett Chiropractic, West Knox Acupuncture, ORCA, Flying Dolphins, Advanced Dermatology, Bentley Medical and One Knox x2. That is about 20 rows with no phone at all.

### 1d. Phone anomalies
- Non-Tennessee area codes: Studio P (256, Alabama) x2, Pilates With Susie (661, California), Skin by Jenn (925, California) and La Vita E Bella (586, Michigan). These are probably owner cell phones from people who moved, which is plausible but should be verified before any dialer campaign.
- Fox Den CC lists **423**-966-5533. Its own notes say this number was "not recorded" because the area code looks wrong, yet it is in the phone field. The notes also give the club line as (865) 966-9771. My search shows the 423 number only in golf-directory listings.
- Sola Bearden phone "(865) 865-0922" is a typo. The official page uses (865) 327-0922.
- Repeated across different businesses: 865-209-4713 (see 1a).
- Gold's Gym Lenoir City has no phone, but goldsgym.com lists (865) 988-0036.

### 1e. ZIP and city mismatches
- Fox Den CC: Farragut is listed with ZIP 37922, but Fox Den Dr is in 37934.
- Advanced Dermatology & Ameliore: no ZIP.
- Knox Wellness: 9320 Old Kingston Pike 37923 conflicts with Knox Aesthetics at 9320 Kingston Pike 37922 (same phone).
- Several notes admit the ZIP was "inferred" or "assumed": Koa, Peak Performance, Evan Butcher, Pruett, Innate Wellness and Ascending Self.

### 1f. Radius
- **The "Miles from downtown" column is a city-centroid lookup, not a geocode.** All 57 Knoxville rows read 0 and all Maryville rows read 14.4. The column cannot catch an out-of-radius street address. It has to be recomputed from geocoded addresses.
- **Out of radius:**
  - Row 71 `Gallaher Plastic Surgery & Spa - Tellico Village` reads 28 miles in its own distance column. The brief calls Tellico about 27 miles. Drop it.
  - Row 108 `Loudon Chiropractic` lists a Lenoir City address. Directories (BlueHive, NewPatients) place it at 806 Mulberry St or 702 Grove St in **Loudon city**, which is about 28 miles straight-line from 35.9606,-83.9207 by my haversine calculation. Drop it. The brief's area list includes Loudon city, but the brief is wrong on that point: Loudon is outside 25 miles.
- **Edge of radius, keep:** Oliver Springs (row 78, about 24 miles), Lenoir City (about 22 miles) and Norris (about 18 miles).
- **Coverage gap:** there are zero rows in Sevier (Seymour, Kodak), Union, or Jefferson (New Market), and only two in Powell/Halls.

### 1g. Email domain checks
- `judy@solasalons.com` uses a different domain from the website (solasalonstudios.com). It does appear verbatim on Sola's own Bearden page, so it is real. But it belongs to a leasing manager, and the people who might buy a chamber are the salon tenants.
- `blueridgeyoga@gmail.com` is a free-mail address that I could not find anywhere.
- `hsoffice@cakmail.org` is on a different domain from the website (cakwarriors.com) and is a generic office inbox, yet it is labeled "high".
- `joel@knoxvilleicebears.com` belongs to the director of broadcasting, not the GM.
- Row 41 Webb: the email domain (webbschool.org) is correct for Webb School of Knoxville. **But the notes mix in a different school.** "Bill McClain, Executive Director of Athletics", "Carlos Gonzalez … @webbschool.com" and the thewebbschool.com site all belong to **The Webb School in Bell Buckle, TN**, whose new AD came from St. George's in Collierville. A sender who uses those names will embarrass themselves.
- Row 35 Maryville College: the notes say "No email surfaced … left blank", but the email field is filled in. The email checks out (see 2), so only the notes need fixing.

### 1h. Hospital systems, national chains and franchises with no local owner (low value)
Blount Memorial x2 (hospital system); Gold's Gym Oak Ridge and Lenoir City (corporate GG East Tennessee LLC); YogaSix Bearden (reportedly for sale); StretchLab Bearden, HOTWORX Alcoa and Fitness Together Farragut (franchisees not named); Sola x2; Benchmark PT x3 (Upstream Rehabilitation); CORA PT; Tristar PT (8 clinics); Thrive PT (Chattanooga-owned); Meridiem Dermspa (Anne Arundel Dermatology); Holston Hills CC (McConnell Golf); Knoxville Smokies (Boyd Sports); BioworX (multi-state brand); UT Athletics (state procurement).

That is about 22 rows, 18% of the list. **The drop rule is applied inconsistently.** Elements Massage was dropped as "national chain, no local owner", while StretchLab, HOTWORX, YogaSix, Gold's and Benchmark were kept with the same profile. Independent PT Powell was dropped as "absorbed into BenchMark", yet three Benchmark clinics are kept.

### 1i. Competitor file problems
- Only **Bell Family Chiropractic** is a confirmed mild-HBOT wellness provider: 1.3 ATA, with a waitlist. That is the most important market signal in the whole research effort, and the row has no street address. My search did not find one either; the only source is a 2022 press release with phone 865-383-7730.
- `Mobile Hyperbaric Centers` and `The Hyperbaric Center at Parkwest` are probably the same program. mhcenters.com lists its Knoxville site at Parkwest.
- Six rows rest on Fresha "cupping therapy in Knoxville" landing pages that list "Hyperbaric Oxygen Therapy" for several PT and chiro clinics: Tristar, Thrive, Select PT, ETSS, OrthoTennessee Powell and Marble City. No clinic's own website confirms it. This looks like a directory artifact, not six competitors.
- Nothing captures what wellness HBOT sells for locally, which was the point of the competitor list.

---

## 2. Spot checks (WebSearch)

26 prospect rows were checked, weighted toward emails and rows marked unconfirmed. Results: **9 PASS, 6 FAIL, 11 UNCLEAR.**

| # | Row | Result | Finding |
|---|---|---|---|
| 1 | Maryville College Scots Athletics (Jenny Massey) | **PASS** | jenny.massey@maryvillecollege.edu and (865) 981-8289 are on the mcscots.com staff directory under Head Athletic Trainer/SWA. Only the notes are wrong. |
| 2 | Johnson University (Brandon Perry) | **PASS** | bperry@johnsonu.edu is on the athletics staff directory. Perry is listed as both Athletic Director and head men's basketball coach. |
| 3 | One Knoxville SC (Drew McKenna) | **PASS** | drew@oneknoxsc.com is on the club staff page; he is the founder and managing partner. |
| 4 | One Knox Collective (Sam Weisbrod) | UNCLEAR | Weisbrod is named in press as the club's first hire. sam@oneknoxsc.com was not found on the staff page. |
| 5 | UT Athletics (Jason McVeigh) | UNCLEAR | jmcveigh@utk.edu returned no hits at all, and the row's own enrich note says it was not re-confirmed. Do not send. |
| 6 | Webb School of Knoxville (Dan Gill) | **PASS**, notes need fixing | An April 2026 NFHS posting names Dan Gill, Director of Athletics. He has held the job since July 2023 (Farragut Press). The Bill McClain and Carlos Gonzalez notes belong to The Webb School in Bell Buckle. |
| 7 | Christian Academy of Knoxville (Ried Estus) | **FAIL** | CAK's own announcement names **Chad Speck** as Athletic Director and head football coach, and CAK's media page lists Speck as Director of Athletics. Estus is stale. The email is a generic office inbox. |
| 8 | Knoxville Ice Bears (Dave Feather) | **PASS** (contact), email caveat | Feather was promoted to GM on Oct 1, 2025 (WVLT, team release). The listed email belongs to the broadcaster. |
| 9 | Sauna House Knoxville | **PASS** | knoxville@saunahouse.com and (865) 284-2653 are on saunahouse.com; $50 drop-in. Opening slipped from spring 2025 to an early-2026 "opening this month". Confirm it is now open. |
| 10 | StretchLab Bearden | **PASS** | bearden@stretchlab.com and (865) 541-0833 are on the official studio page. This is a studio inbox; the franchisee is unknown. |
| 11 | Sola Salon Studios - Bearden | **FAIL** (phone) | Email confirmed on the Sola page (leasing manager). The phone (865) 865-0922 is a typo; the official number is (865) 327-0922. |
| 12 | Spa Visage (trisha@spavisage.com) | **FAIL** | The address appears on no page. The only "Trisha" I found is a Prospeo email-pattern page (Trisha Martin, Spa Director, Salon Visage, pattern first@salonvisage.com). This looks constructed, which breaks the brief's "never construct" rule. |
| 13 | Blue Ridge Yoga & Wellness | UNCLEAR | The business, owner (Jessica Mishu) and address are confirmed by Farragut Press and Lantern. The gmail address appears in no result. |
| 14 | Bryan Ardis, DC (Maryville) | **FAIL** | A critical review says Ardis now lives in Plano, TX, that his TN and TX chiropractic licenses have expired, and that he was disciplined in 2008. I could not confirm this against licensing-board records. The Maryville listing (est. 2004) appears to be the same person, and WebMD says not accepting patients. Ardis is reportedly the promoter of the "Watch the Water" COVID conspiracy video, which is a reputational risk. Drop. |
| 15 | Koa Strength and Fitness | UNCLEAR | Exists (Livability, July 2025; 697 Emory Valley Rd). No phone or website anywhere. |
| 16 | CrossFit CHF | UNCLEAR | CrossFit.com shows only "Maryville, TN" (owner Amanda Cagle). The 1412 Sevierville Rd real-estate listing does not name the gym. |
| 17 | Gold's Gym Lenoir City | **FAIL** (hook) | The hook "operated since 1965" is the year the Gold's brand was founded in Venice, CA, not this gym. Using it in an opener would be wrong. The phone exists, (865) 988-0036, but was left blank. |
| 18 | Performance Training Inc. | **PASS** (exists) | Knoxville Chamber listing at 403 Bearden Park Circle; founder Jackie Ansley; 9,500 sq ft opened Feb 2022; 40+ staff; corporate and university wellness contracts. Strong fit. Still no phone or website. |
| 19 | Forté Fitness | **PASS** | Knoxville Chamber (Jan 2026) confirms 1060 Worlds Fair Park Dr, Unit 104. The phone comes only from Lantern. |
| 20 | Tristar PT (HBOT claim) | UNCLEAR | Only a Fresha aggregator page lists HBOT. Neither tristarpt.com nor the job posts mention it. |
| 21 | Studio P Pilates | UNCLEAR | The 256 number is consistent on both Lantern listings (updated Apr 2026), but it comes only from directories. |
| 22 | Loudon Chiropractic | **FAIL** | The row's Lenoir City Hwy 321 address is not supported. Directories give 702 Grove St or 806 Mulberry St in Loudon 37774, with a different doctor (Christopher Estes) and website (estesfamilychiropractic.com). Loudon city is about 28 miles out, beyond the radius. |
| 23 | Fox Den Country Club | UNCLEAR | Golf directories give 423-966-5533. The GM was last named in 2019 (Ott) and 2018 (Nesbitt). |
| 24 | CrossFit Courageous | UNCLEAR | ClassPass gives 10420 Kingston Pike. A 2026 powerlifting event page gives 11245 Threadstone Ln. |
| 25 | La Vita E Bella Spa | UNCLEAR | Lantern gives 10321 Kingston Pike Ste 124. Fresha gives 11324 Parkside Dr Ste 18, which is the Sola Turkey Creek building, so it may be a Sola tenant. |
| 26 | BioworX Knoxville | UNCLEAR | Only a Lantern listing and an auto-generated peptide-directory page. No own site found. |

**Email scorecard, all 13 emails:**
- **Verified (7):** massey, bperry, drew, dan.gill, knoxville@saunahouse, bearden@stretchlab, judy@solasalons.
- **Verified but useless for a pitch (1):** joel@icebears. It is in the press releases but belongs to the broadcaster.
- **Wrong person (1):** hsoffice@cakmail.org, a generic inbox, and the named AD is wrong.
- **Unverified (3):** sam@oneknox, jmcveigh@utk, blueridgeyoga@gmail.
- **Likely constructed (1):** trisha@spavisage.

---

## 3. Coverage critique

**Missing prospect types:**
- **Franchise fitness with local owner-operators is missing entirely.** There are no rows for Burn Boot Camp, Orangetheory, F45, Club Pilates, Pure Barre, Planet Fitness, Anytime Fitness or Workout Anytime, though Anytime and Workout Anytime both have Knoxville and Farragut locations. The list does include YogaSix, StretchLab and HOTWORX, so the rule is inconsistent. Local multi-unit franchisees are often the fastest yes for an amenity add-on.
- **D1 Training Hardin Valley.** Athlete performance gym, 33,000 sq ft on Hardin Valley Rd, owner Devin Driscoll (KnoxTNToday), phone 865-622-7117 or 865-202-8622. **Not added** because I found no street number. It is a top-tier fit and worth one more lookup.
- **Sessions Wellness Center (Knoxville).** Its Vagaro listing offers cold plunge, infrared sauna, cryotherapy, red light and compression. It is the closest thing to a recovery studio in the market. **Not added**: no address found.
- **UT RecSports Sport Clubs** (38 clubs, TRECS). No contact surfaced. Public high-school athletics (Farragut, Bearden, Hardin Valley Academy, Maryville, Alcoa) are also absent; they are slow to buy, but booster clubs pay for amenities.
- **Shea Aesthetic Clinic, Oak Ridge.** Physician-owned (Dr. Kirk Bass), 40+ treatments. **Not added**: no address found.
- **Kim Day Training Gym**, 5429 N Broadway, and **National Fitness Center**, 1644 Broadway Ave, Maryville. **Not added**: no phone or website.
- **Climbing Roots Bouldering** (South Knoxville, Baker Creek Bottoms). Opened in late October, year not confirmed. **Not added**: no street address found.
- **Gold's Gym West Knoxville** (8445 Kingston Pike, (865) 693-2550) exists but is corporate, so it was left out on purpose.
- **Geographic gaps:** Seymour, Kodak, Halls/Powell, Karns, Maynardville and New Market.

**Added to `_overrides.json`** (6 rows, each with a street address and a phone or website confirmed by search):

| Business | City | Website / phone | Why |
|---|---|---|---|
| Maryville Chiropractic Clinic | Maryville | maryvillechiropracticclinic.com, 1812 E Lamar Alexander Pkwy | Blount chiro with a sports-injury focus and its own site, unlike the NPI-scraped Blount rows |
| East Tennessee Chiropractic (Dr. John Lay, DO) | Maryville | easttnchiro.com, (865) 681-2992, 133 Cherokee Heights Dr | Blount practice with its own site |
| Prime IV Hydration & Wellness - Farragut | Farragut | primeivhydration.com, (865) 200-4070, 10420 Kingston Pike Ste M | IV plus cryo plus infrared sauna recovery studio; sister studio at 4409 Kingston Pike |
| KnoxGlow Aesthetics Med Spa | Farragut | (865) 855-0498, 10843 Kingston Pike Ste 7 | Farragut med spa led by a CRNA |
| Pure Massage (Maryville) | Maryville | (865) 724-1123, 2602 US-411 Ste 103 | Maryville spa |
| Salon Visage | Knoxville | (865) 694-4000, 1701 Downtown West Blvd | Owners Frank and Belinda Gambuzza also own Spa Visage; one conversation covers two businesses |

I found 6 businesses that pass the brief's address-plus-phone-or-website rule, short of the 15 requested. Directory snippets rarely carry full addresses, and I prioritized spot checks within the 60-search budget.

---

## 4. Top 10 fixes, in priority order

1. **Do not send any of these emails as they stand:** trisha@spavisage.com (likely constructed), jmcveigh@utk.edu and sam@oneknoxsc.com (unverified), hsoffice@cakmail.org (wrong person; the AD is Chad Speck) and joel@knoxvilleicebears.com (broadcaster). That leaves 7 verified addresses, about 4 of which reach a decision-maker.
2. **Apply the 6 drops:** duplicates (Healing Hands, One Knox youth, Studio P Lenoir City), out of radius (Gallaher Tellico Village, Loudon Chiropractic) and Bryan Ardis DC (no longer practicing there, reputational risk).
3. **Fix the Webb row's notes.** Remove the Bell Buckle "Webb School" staff (McClain, Gonzalez, webbschool.com) before anyone writes an opener from them.
4. **Fix false or stale hooks:** Gold's Lenoir City "since 1965", and the 2017-2018 ownership hooks for Blue Ridge, New Start and Belleza. Re-verify any hook older than 2024 before using it in an opener.
5. **Settle the four HBOT rows that appear on both lists.** Phone Tristar, Thrive, ETSS and Marble City and ask "do you offer hyperbaric?". Then move each one to exactly one file.
6. **Rebuild the competitor file.** Get Bell Family Chiropractic's address and session price. Merge Mobile Hyperbaric Centers into Parkwest. Separate medical HBOT (four hospital programs) from wellness HBOT. Run a dedicated search for mild-HBOT wellness providers in Maryville, Farragut and Oak Ridge.
7. **Recompute distance from geocoded street addresses.** The current column is a city-centroid lookup and every Knoxville row reads 0.
8. **Apply one chain rule consistently.** Either drop corporate locations with no local owner (Gold's x2, Benchmark x3, CORA, Meridiem, Blount Memorial x2) or keep Elements Massage. Then add local multi-unit franchisees (Burn, Orangetheory, F45, Club Pilates, D1), which are probably better buyers than solo chiropractors.
9. **Rebalance toward the best-fit segments.** Cut the NPI- and Healthgrades-scraped solo practitioners that have no website (Richard Noe, John-Mark Chesney, Donna Kile, David Terry, Eugene Runne, Randy Cannon, Back Center, A Healthy Life, Dr. Wegener). Spend that effort on recovery studios, performance gyms and team athletic trainers, and fill the empty Seymour, Kodak, Powell and Halls coverage.
10. **Fix contact data:** Sola Bearden phone becomes (865) 327-0922; Gold's Lenoir City gets (865) 988-0036; Bentley Medical gets (865) 288-0911; Fox Den should use the club line (865) 966-9771 and ZIP 37934; resolve the shared 865-209-4713 between Jillian Nicole and Knox Skin Society; and resolve the address conflicts for CrossFit Courageous, La Vita E Bella, Knox Wellness and The Skin Cleric.

### Key sources
- [mcscots.com staff directory: Jenny Massey](https://mcscots.com/staff-directory/jenny-massey/147)
- [Johnson Royals: Brandon Perry](https://johnsonroyals.com/sports/mbkb/coaches/perry_brandon)
- [One Knoxville SC site](https://www.oneknoxsc.com/?p=1730)
- [NFHS posting naming Dan Gill](https://careercenter.nfhs.org/jobs/22211406/), [Farragut Press: Gill hired](https://farragutpress.com/articles/2023/01/12520), [The Webb School (Bell Buckle): Bill McClain](https://www.thewebbschool.com/athletics/athletics-news/athletic-news-details/~board/athletic-news/post/bill-mcclain-ead)
- [CAK announces AD and head football coach](https://www.cakwarriors.com/news-detail?pk=942726)
- [WVLT: Ice Bears name Feather GM](https://www.wvlt.tv/2025/10/01/knoxville-ice-bears-announce-new-general-manager)
- [Sauna House Knoxville](https://www.saunahouse.com/knoxville), [StretchLab Bearden](https://www.stretchlab.com/location/bearden), [Sola Bearden](https://www.solasalonstudios.com/locations/bearden)
- [Prospeo: Salon Visage email format](https://prospeo.io/c/salon-visage-email-format)
- [Gold's Gym Lenoir City](https://www.goldsgym.com/locations/tn/lenoir-city/), [Gold's acquires Rush Fitness (2014)](https://www.franchising.com/amp/news/20140728_golds_gym_continues_aggressive_growth_strategy_wit.html)
- [Knoxville Chamber: Performance Training Inc](https://www.knoxvillechamber.com/directory/listing/performance-training-inc/), [Knoxville Chamber: Forté Fitness](https://www.knoxvillechamber.com/former-knoxville-chamber-intern-opens-forte-fitness-in-downtown-knoxville-bringing-innovative-pilates-inspired-training-and-community-investment-to-worlds-fair-park/)
- [NewPatients: Stephanie Estes DC, Loudon](https://practicefinder.newpatientsinc.com/chiro/dr-stephanie-estes-dc-loudon-tn/), [BlueHive: Loudon Chiropractic](https://www.bluehive.com/provider/loudon-chiropractic)
- [Bell Family Chiropractic HBOT press release (2022)](https://business.mammothtimes.com/mammothtimes/news/read/42239991/knoxville_tn_hyperbaric_oxygen_therapy_for_post), [Mobile Hyperbaric Centers](https://mhcenters.com/centers.html)
- [KnoxTNToday: D1 Training team](https://www.knoxtntoday.com/meet-the-d1-training-team/), [Best Pros in Town: KnoxGlow](https://www.bestprosintown.com/tn/knoxville/knoxglow-aesthetics-/), [Salon Today: Salon Visage](https://www.salontoday.com/articles/salon-visage-pioneers-work-life-integration-adapting-to-modern-client-and-staff-preferences)

---

# Round 2 (2026-10-10, after rebuild to 177 rows)

Inputs: the regenerated `prospects_for_review.csv` (177 rows), `competitors_for_review.csv` (12) and `dropped_for_review.csv` (16), plus `_overrides.json` and `make_knoxville_list.py`.
Search budget used: 30 of 45. A backup of the overrides file before this round is in the reviewer's scratchpad.

## Verdict in one paragraph

**This is now good enough to start calling for a 3-chamber pilot, provided the call list is the 20 rows below and not all 177.** The recovery and longevity segment roughly doubled in useful depth. It now has real cash-pay IV, cryo, sauna and hormone clinics with named owners, among them RevitalyzeMD, The Wellness Room, Vital Hydration and Drip into Wellness. That segment is where a $783 to $979 a month chamber pays for itself.

The other 157 rows are still weak:
- **45 of 177 rows (25%) have no phone at all.** That includes 18 of the 25 franchise-gym adds.
- **PT/chiro is still the largest bucket and the lowest-yield one.** It grew from 38 to 46 rows, with 4 more Seymour solo chiropractors taken from Healthgrades or NPI records.
- **About half of the new "recovery" rows are aesthetics-first med spas** (Botox and filler), where hyperbaric is a weak add-on.
- **The competitor file was not touched at all,** and the build has two data-loss bugs.

As an email list it remains unusable: 9 emails, of which 2 are new and both confirmed.

## R2-1. Status of round-1 findings (5 resolved, 2 partial, 9 not resolved)

| # | Round-1 finding | Status | Evidence in the regenerated files |
|---|---|---|---|
| 1 | Hold back 5 bad emails | **Resolved** | 6 held, fields blanked, reason in Notes |
| 2 | Apply 6 drops | **Resolved, with a defect** | All 6 dropped, **but the build also dropped `Healing Hands Spa - Farragut`, the copy I meant to keep.** Cause: `NORM()` strips punctuation, so "Healing Hands Spa (Farragut)" and "Healing Hands Spa - Farragut" become the same key. The business disappeared from the list. **Fix: restored via `add`.** ADD rows skip the drop check. |
| 3 | 43 flags | **Resolved** | Flags are prepended to Notes. One dangling flag targets the dropped Advanced Dermatology row, and one targets a row that does not exist (`Holt Physical Therapy`). Both are harmless. |
| 4 | 6 adds | **Resolved, with a defect** | All 6 present, but `Prime IV Hydration & Wellness - Farragut` now appears **twice**. The east-gaps pass found it too, and dedupe keys on name plus city ("Farragut" vs "Knoxville"). **Fix: added to `drop`.** The drop only hits the research-file copy, so the add copy survives. |
| 5 | Phone corrections | **Resolved** | Sola Bearden, Gold's Lenoir City, Bentley, Fox Den and Marino are set. `set_address` writes "street, city, TN zip" into the Address field, so City and ZIP now appear twice in those rows (cosmetic). |
| 6 | Webb notes (Bell Buckle staff) | **Partial** | A correction note is prepended, but the McClain, Gonzalez and webbschool.com text is still in the Notes body, and the hook may also come from the Bell Buckle school. |
| 7 | CAK contact is Chad Speck, not Ried Estus | **Not resolved** | The owner field and the hook still say Estus. The script has no override key for owner or hook, so `teams.json` must be edited. |
| 8 | Gold's Lenoir City false "since 1965" hook | **Not resolved** | The hook is unchanged, for the same reason as #7. |
| 9 | Fox Den ZIP 37934 | **Not resolved** | Still 37922. Now set under `set_address`. |
| 10 | Shared phone 865-209-4713 (Jillian Nicole and Knox Skin Society) | **Not resolved** | Both rows unchanged |
| 11 | Four HBOT rows listed as both prospect and competitor | **Not resolved** | Tristar, Thrive, ETSS and Marble City are still in both files |
| 12 | Rebuild the competitor file | **Not resolved** | Identical to round 1: four PT and hospital rows still labeled "CrossFit and performance gyms", Mobile Hyperbaric and Parkwest not merged, no address for Bell Family. **New: Blackberry Mountain belongs here** (see R2-3). |
| 13 | Geocoded distances | **Not resolved** | Still city centroids. New Farragut-area rows labeled "Knoxville" show 0 miles, while their neighbors labeled "Farragut" show 14. |
| 14 | One chain rule | **Partial** | Franchises with named local owners were added, which is good. But corporate or out-of-state operators were added too (Crunch, Gold's Farragut, Neighborhood Barre x2, Curate, Select PT, Benchmark x2), while Elements Massage stays dropped. |
| 15 | Rebalance away from NPI-scraped solo chiropractors | **Not resolved (worse)** | PT/chiro went from 38 to 46, including Giammo, Berry, Jerviss and Buckridge, and Union County Chiro, whose NPI record dates from 2007 |
| 16 | Address conflicts (CrossFit Courageous, La Vita E Bella, Knox Wellness, Skin Cleric) | **Not resolved** | Unchanged. Knox Wellness now turns out to be a duplicate (see R2-2). |

## R2-2. Structural checks on the 56 new rows

These are the 25 franchise_gyms.json rows, the 32 recovery_east_gaps.json rows, and my own 6 adds. Rows from the new passes that overlap the old ones are counted once.

- **Duplicates:**
  - `Prime IV ... - Farragut` x2 (same address, same phone).
  - `Knox Aesthetics` (new) and `Knox Wellness` (old) share an address (9320 Kingston Pike) and a phone ((865) 801-9501), so they are one business. Drop Knox Wellness, which has the wrong "Old Kingston Pike" address.
  - Same owner, so one call each: Pure Barre x2 (Luftman and Hammett) and Workout Anytime x2 (Heifner).
  - Probably one franchisee group each: Club Pilates x3, Orangetheory x3 and HOTWORX x5.
  - `Sessions Wellness Center` was given 6512 Deane Hill Dr, next door to RevitalyzeMD at 6504. Its notes say the address was "supplied by the requester", and nothing confirms it.
- **Chains or corporate, with no local owner:**
  - Crunch Fountain City (Florida franchisee CR Fitness Holdings).
  - Gold's Farragut (corporate).
  - Neighborhood Barre Farragut and Bearden: the brand was bought by Extraordinary Brands in Aug 2024, and the Bearden studio is listed for sale.
  - Curate MedAesthetics (Chattanooga chain, no Knoxville phone).
  - Select PT Strawberry Plains (Select Medical); its Lenoir City sibling is in the competitor file.
  - Benchmark Kodak and Maynardville (Upstream Rehabilitation).
  - Anytime Fitness Farragut: owned by Baleo Fitness Inc. since Oct 2024; I could not confirm whether Baleo is local.
- **No phone AND no website:** Sessions Wellness Center and Thriving to a New You.
- **No street address:** D1 Training Hardin Valley and TITLE Boxing West Knoxville. Both fail the brief's rule.
- **No phone (website only):** 18 of 25 franchise rows, plus ASTRA Aesthetics, Curate, Prime IV Knoxville, Benchmark Kodak, Triple F and my Maryville Chiropractic Clinic add.
- **Out of radius:** none. Blackberry Mountain in Walland is about 17 miles; Maynardville about 21; Kodak about 17; Seymour about 12; Corryton about 14.
- **Inferred ZIPs:** Burn Boot Camp, Fit Body Boot Camp, F45, Club Pilates Bearden and Parkside, Sessions, and Anytime Farragut.
- **Non-Tennessee area codes:** none new. Blackberry Mountain uses an 800 number.
- **Other data problems:**
  - New You Hair Salon shares its phone with Janet's Hair & Nail Salon.
  - Simply Ageless has a phone conflict between sources.
  - Jerviss Family Chiropractic has an address conflict.
  - Curves Maynardville comes from city-data.com only and is probably closed.
  - Union County Chiropractic's NPI record dates from 2007.
- **Build-script hazards** (`make_knoxville_list.py`):
  1. `DROP` matches after stripping punctuation, which caused the Healing Hands loss.
  2. `set_phone`, `set_address` and `fix_notes` match by substring (`pk in k or k in pk`). A short key could hit several rows. I checked every current key and each matches exactly one row.
  3. Overrides cannot change the owner, hook or ZIP fields. Add `set_owner`, `set_hook` and `set_zip` keys, or edit the source JSON.
  4. There is no override path into the competitor file. Add a `move_to_competitors` key.

## R2-3. Spot checks of new rows (23 rows checked: 10 PASS, 5 FAIL, 8 UNCLEAR)

| # | Row | Result | Finding |
|---|---|---|---|
| 1 | Vibrance IV Hydration (Oak Ridge) | UNCLEAR | jennifer@vibranceiv.com and 865-902-2172 are on its own Jane page, so the email is real. But the page still reads "Opening Soon!", and the business was founded in 2024. |
| 2 | MC Wellness and Aesthetics | **PASS** | mcwellnessclinic@gmail.com is on its own Jane page. The address conflict is real: the Jane landing page says inside Saah Suites, 102 S Campbell Station Rd Ste 26, Farragut. |
| 3 | Sessions Wellness Center | **FAIL** | Nothing at 6512 Deane Hill Dr, and no listing beyond a Vagaro directory line. No phone or website. Drop until someone has a real address. |
| 4 | RevitalyzeMD (Dr. Debra Durst) | **PASS** | WATE: Knoxville flagship at 6504 Deane Hill Dr, grand opening Mar 26 2026, footprint more than tripled, adding longevity and regenerative services. No hyperbaric found. |
| 5 | The Wellness Room | **PASS** | 151 Sherway Rd #1, (865) 274-0199. Owner Stephanie Snowden-Harman, NP, per Lantern and Best Pros in Town; the row had no owner. |
| 6 | Old City Medspa | UNCLEAR | Address confirmed. The owner (Dr. Stephen Daniel, DDS) comes from 2019 only; current listings name Medical Director Mark Davenport, MD. |
| 7 | Beautique Medical Anti-Aging (Shara LaTorre) | **PASS** | Address and phone corroborated. Reviews still name "Nurse Shara". Website beautiquebeautiful.com was missing from the row. |
| 8 | Dolce Medical Spa | **PASS** | 120 Huxley Rd #102, (865) 658-1018 and the website agree across Lantern and Fresha. Owner unknown. |
| 9 | Workout Anytime (John Heifner) | **PASS**, with caveat | Athletech (Apr 2026) confirms he owns 3 clubs. **A BizQuest listing offers his Farragut, Halls and Powell clubs for sale.** Ownership may change. |
| 10 | F45 West Knoxville (Chip Gibson) | UNCLEAR | Gibson is named only in 2020. The address is confirmed. |
| 11 | Pure Barre Farragut (Luftman/Hammett) | UNCLEAR | Only a Feb 2020 pre-opening article. Current listings show only the Bearden studio. |
| 12 | Fit Body Boot Camp Farragut (Mathers) | UNCLEAR | Only the Nov 2023 "to open soon" article. No phone. |
| 13 | Burn Boot Camp Farragut | UNCLEAR | Only a Dec 2018 pre-opening article and an undated job post. |
| 14 | TITLE Boxing West Knoxville | **FAIL** | Owners confirmed (WATE), but no address or phone exists anywhere, so it cannot be called. |
| 15 | Triple F Elite Sports Training | UNCLEAR | Lee Smith's facility is real (WVLT 2022, App Store), but the Guinn Rd address and current operation are unconfirmed. |
| 16 | Anytime Fitness Farragut | **PASS** | Farragut Press, Dec 2024: sold to Baleo Fitness Inc. (Michael Chere, John Christopher) on Oct 1 2024. |
| 17 | Neighborhood Barre (both rows) | **PASS** (facts) | Extraordinary Brands bought the brand in Aug 2024, so it is corporate and low value. The Bearden studio is listed for sale. |
| 18 | Blackberry Mountain | **FAIL** | **It already offers a hyperbaric oxygen chamber** (Goop: "an hour in the hyperbaric oxygen chamber" after a massage), plus a Recovery Lab with compression and red light. It is a competitor and a high-end price reference. Moved to drop. |
| 19 | Curves Maynardville | UNCLEAR | city-data.com is the only source. Probably closed. |
| 20 | D1 Training Hardin Valley | **FAIL** (address) | Still only "Hardin Valley Rd". It fails the rule, but it is a top call, so get the address on the phone. |
| 21 | Above and Beyond Aesthetics (Seymour) | **PASS** | 124 Maryville Hwy is confirmed on its own Jane page. NP-run, with IV hydration, hormones and weight loss. Owner unnamed. |
| 22 | ASTRA Aesthetics (Maryville) | **PASS** | 921 Foch St Ste 9. Founder Molly Muecke, APRN (WATE, Evolus). No Maryville phone. |
| 23 | Knox Aesthetics | **FAIL** (duplicate) | Same address and phone as Knox Wellness; one business |

New emails: 2 of 2 confirmed (Vibrance, MC Wellness). Both reach the clinic directly, and both deserve a send once Vibrance is confirmed open.

## R2-4. Category balance, and whether this works as a call list

| Category | Rows | With phone | Judgment |
|---|---|---|---|
| PT / chiro / sports med | 46 | 38 | Biggest bucket, lowest yield. Insurance-billing clinics rarely resell $40 to $80 cash sessions. Most new rows are directory solo practitioners. |
| Gyms | 43 | 23 | Inflated by 21 franchise rows. About 12 have an unknown owner, and 5 are unstaffed HOTWORX studios, a poor fit for an attended chamber. |
| Recovery and med spa | 37 | 32 | **The core.** About 18 are true recovery or longevity businesses (IV, cryo, sauna, hormones, NAD+). The rest are aesthetics-first. |
| Sports programs | 19 | 16 | Slow, budget-cycle buyers. Good for a later phase, not a 3-chamber pilot. |
| Salons | 17 | 17 | Weak fit, except the Visage day spa. |
| CrossFit / performance | 15 | 6 | Good fit, but 9 of 15 have no phone. |

**Pilot call list: 20 rows, called in this order.** These are cash-pay recovery businesses, or performance facilities with athletes who already pay out of pocket. Each has a phone, and most have a named owner. 17 of the 20 sit in a West Knoxville and Bearden cluster, which keeps installation and service of 3 chambers simple. At a 10 to 15% meeting-to-yes rate, 20 calls should produce the 2 to 3 hosts the pilot needs.

| # | Business | Phone | Why call first |
|---|---|---|---|
| 1 | RevitalyzeMD (Dr. Debra Durst) | (865) 293-5828 | New flagship tripled in size in Mar 2026 to add longevity and regenerative services. Has space and is actively adding modalities. |
| 2 | Sauna House Knoxville (Peter and Dianna Osickey) | (865) 284-2653 | Contrast-therapy bathhouse at $50 per visit with members. Hyperbaric fits the circuit. Verified email too. |
| 3 | Vital Hydration (Corina West, RN) | (865) 282-4634 | Already sells IV, cryo and red-light sauna, so the multi-modality recovery buyer profile fits. |
| 4 | Drip into Wellness (Lauren McCrossin, RN) | (865) 214-6064 | Independent IV studio plus mobile service; owner-operated. |
| 5 | The Wellness Room (Stephanie Snowden-Harman, NP) | (865) 274-0199 | About 400+ five-star reviews and an IV menu; NP-owned. |
| 6 | Grow Wellness | (865) 409-9760 | One of Knoxville's first IV clinics; sells a "Recovery & Performance" drip. |
| 7 | Medispa at Choto | (865) 218-9000 | IV plus NAD+, 213 reviews, affluent Choto/Farragut clientele. |
| 8 | Knox Aesthetics | (865) 801-9501 | IV, hormone pellets, chelation and ketamine. Longevity-minded patients. |
| 9 | MC Wellness and Aesthetics | (865) 353-4093 | Concierge hormone, peptide and IV clinic. Email verified. |
| 10 | Prime IV Hydration & Wellness - Farragut | (865) 200-4070 | Already pairs IV with cryo and infrared sauna. The franchisee runs a second studio (4409 Kingston Pike), so one yes could place two chambers. |
| 11 | BioworX Knoxville (CryoFit) | (865) 240-4639 | Cryo plus IV aimed at athletes. The listing is unverified, so the call doubles as verification. |
| 12 | Stretch Fusion (Chad Becker) | (865) 599-3786 | Independent recovery and mobility studio with a recovery-paying clientele. |
| 13 | D1 Training Hardin Valley (Devin Driscoll) | 865-622-7117 | 33,000 sq ft, trains Vols players, on-site PT. Athletes and parents already pay for performance. |
| 14 | Athletic Republic Knoxville (Adam Scott) | (865) 855-3278 | 18,000 sq ft athlete speed facility; local franchisee owner. |
| 15 | Be Somebody Gym (Wes Kitts) | (865) 323-6393 | Owner is a US Olympic weightlifter; a recovery story with credibility. |
| 16 | CrossFit Knoxville (David LeGault) | (865) 356-9000 | 4.9 stars from 121 reviews; independent; established membership. |
| 17 | Webb School of Knoxville (Dan Gill) | (865) 693-0011 | Sports-performance center added 2023. Private-school budget and a verified email. |
| 18 | Balanced You Clinic (Rebekah Knause) | (865) 888-5342 | Already sells infrared sauna; 225 reviews; owner-operated. |
| 19 | Spa Visage, with Salon Visage (Gambuzza family) | (865) 694-9007 / 694-4000 | Most-awarded day spa. One conversation covers two premium businesses. |
| 20 | Smoky Mountain Hydration (Maryville) | (865) 233-8330 | Blount coverage. Already pitches IV for "athletic recovery". |

Alternates: Beautique Medical (Shara LaTorre), Vibrance IV in Oak Ridge (once open), CrossFit Pistol Creek (Maryville), Above and Beyond (Seymour), Knoxville Ice Bears (Dave Feather) and One Knoxville SC (Drew McKenna).

Rows **not** to spend pilot calls on: chains with no local owner, HOTWORX, salon-suite buildings, public institutions (UT, Smokies), the NPI-derived solo chiropractors, and anything without a phone.

## R2-5. Changes merged into `_overrides.json`

Nothing existing was removed; values were only appended.
- **drop (+4):**
  - `Prime IV Hydration & Wellness - Farragut`: removes only the research-file duplicate; the add copy survives.
  - `Knox Wellness`: duplicate of Knox Aesthetics.
  - `Blackberry Mountain (Blackberry Farm sister property)`: has a hyperbaric chamber, so it is a competitor.
  - `Sessions Wellness Center`: unverified address, no phone or website.
- **flag (+38):** the chain and corporate rows; franchise rows sourced only from pre-opening articles; Heifner's clubs possibly for sale; owners known only from 2019 or 2020; D1 and TITLE missing addresses; Vibrance "opening soon"; the MC Wellness address conflict; probably-closed Curves; phone conflicts; and low-priority solo chiropractors.
- **fix_notes (+9, Webb extended):** CAK contact should be Chad Speck; delete the Gold's 1965 hook; Fox Den ZIP; owners for The Wellness Room (Snowden-Harman) and ASTRA (Muecke); Beautique website; move Blackberry Mountain to competitors; Prime IV duplicate explanation; Healing Hands restore explanation.
- **set_address (+1):** Fox Den, `12284 N Fox Den Dr, Farragut, TN 37934`.
- **add (+1):** `Healing Hands Spa - Farragut` restored. It was lost through the punctuation-stripping drop match.

**Still needed outside the overrides file:**
1. Edit `teams.json` to fix the CAK owner and hook and remove the Bell Buckle text from the Webb notes. Edit `expansion_counties.json` to remove the Gold's hook.
2. Move Blackberry Mountain into the competitor file, and remove Tristar, Thrive, ETSS and Marble City from it. Merge Mobile Hyperbaric into Parkwest, fix the competitor industry labels, and find Bell Family's address and price.
3. Add `set_owner`, `set_hook`, `set_zip` and `move_to_competitors` override keys to the build script, and make `DROP` match exact names.
4. Geocode addresses for distance.
