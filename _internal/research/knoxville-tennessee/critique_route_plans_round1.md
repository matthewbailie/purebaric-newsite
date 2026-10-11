# Route plans critique, round 1

Reviewed: `TENNESSEE-ROUTE-PLAN.md` and `.xlsx`, `UTAH-ROUTE-PLAN.md` and `.xlsx`, `make_route_plan.py`, `geocode_prospects.py`, `geocode_cache.json`, both Prospects sheets. Every count below comes from the files, not from estimates.

## Verdict

- **Tennessee:** Not ready. The first screen now reads clearly and the counts add up, but the time figure leaves out the drive the owner asked to include, the filter drops some of the best prospects, and several "best bets" are weight-loss, hormone and esthetician businesses the research already marked weak.
- **Utah:** Not ready. It has the same faults plus two days over the 2-hour cap, a broken map link, college athletics departments ranked as best bets, the same building split across up to three days, and 51 days with no best bet that bury the 30 days worth driving.

## Fix these

### 1. The time figure leaves out the drive the owner asked to include

- **Where:** Both plans, intro: "Driving from home to the first stop and back is extra." Read me first sheet: "It does not include driving from home to the first stop or back." The Utah config holds a home-base note ("Drive time from Lehi to the first stop ... is not counted") that the generator never prints.
- **What's wrong:** The owner asked for one to two hours in total including driving. The plan caps the visits alone at two hours and drops the trip there and back. Measured straight-line from Lehi to each day's first stop: Day 6 (Ogden) is 53 miles, Day 20 is 58, Day 26 is 63, Day 30 (Ephraim) is 73. Day 6 is "About 1 h 56 min" on paper and close to four hours door to door. Day 30 is 31 minutes of visits after a drive of well over an hour each way.
- **What happens if you don't fix it:** The owner plans a two-hour morning, loses half a day, and stops trusting the plan after the first far-off day.
- **Fix:** Add the round trip from the home base to every day's time and cap the total at 120 minutes. Print "Total time from home and back" next to "Time at the doors". Ask the owner for his Knoxville starting point; the Tennessee plan names none.

### 2. The filter throws out strong prospects because one word appears anywhere in the notes

- **Where:** `make_route_plan.py` line 29, the `BAD_NOTES` pattern; "Not on any route" lists them as "notes flag it as unverified, closed or directory-only".
- **What's wrong:** The pattern matches words about something else in the same note.
  - Sauna House Knoxville (reviewer's pick, named owners, high-confidence email, contrast-therapy bathhouse) is out because its note says "ZIP for Jennings Ave is likely 37917 (unverified)". The same note says "it appears to be open".
  - Healing Hands Spa - Farragut is out because its note says "RESTORED in round 2: dropped by mistake".
  - Knox Aesthetics (reviewer's pick, IV) is out because its note mentions "the dropped Knox Wellness row".
  - CryoStretch (cryotherapy, NormaTec, sauna, 9411 S Northshore Dr, next door to Day 13's F45) is out because its sister studio's "address unverified".
  - Utah: Float Spa 19 (named owner) is out because its note says a different spa "has closed". Roy CrossFit (owners named, 4.9 stars) is out because the owners "Dropped CrossFit affiliation".
  - No street address: D1 Training Hardin Valley, whose note says "it is a top call. Get the address on the call", sits on Hardin Valley Rd beside Days 24 and 25. Utah drops Drp IV - Lehi, PLUNJ Park City and Performance & Recovery Group (Provo) the same way.
- **What happens if you don't fix it:** The owner reads "closed" next to open businesses and never visits some of the best fits on either list.
- **Fix:** Match only the status tags the research uses ("UNVERIFIED:", "REVIEW ... weak fit", "MyPeptideMatch" as the source) instead of any occurrence of the word. Then read the remaining exclusions by hand. Print the actual reason ("only a directory listing", "no street address: get it by phone") in place of the catch-all text. Put the no-address recovery and performance businesses on a "Call first for the address" list.

### 3. "Best bet" measures how complete the research row is, not how likely the business is to sign

- **Where:** Intro: "**Best bets** are the businesses most likely to say yes: recovery studios, IV lounges and performance gyms". Generator scoring: med spa base 5 plus one point for any named contact, hook or high-confidence email reaches the best-bet line of 6.
- **What's wrong:** Every med spa with any one fact becomes a best bet, so 41 of Tennessee's 48 best bets are "Recovery studios and med spas", a category that includes plastic surgery, weight-loss and testosterone clinics. Examples labelled Best bet:
  - Skin by Jenn (Day 5). The workbook note reads "solo esthetician with 925 (CA) phone; weak fit for a $783+/mo chamber".
  - Pure Haus Aesthetics, which starts Day 9: "built around medically supervised weight-loss injections"; IV "not confirmed on site"; approximate address.
  - Performance Medicine, which starts Day 12. Its note says "may have moved ... Phone/website not found; verify."
  - Premier Weight Management & Esthetics - Maryville (Day 6) is a best bet while its own Clinton office is excluded.
  - Also: Gameday Men's Health (testosterone clinic), Gallaher Plastic Surgery, and Restorative Functional Medicine ("No IV/sauna seen on home page") on Day 1.
  - Utah: 11 of its 12 sports-team best bets are college athletics departments (University of Utah football, Weber State, BYU, UVU, SLCC, Westminster, Snow College), although the intro says "Not included: schools (approach the athletic director by email)". Days 29, 30 and 31 each start at one. Utah's sheet has no "Call first" column, so a Utah best bet means "has a name, a hook and a high-confidence email". An email address does nothing for a walk-in visit.
- **What happens if you don't fix it:** The owner opens days with the weakest kind of prospect, gets turned away at a testosterone clinic or a stadium front desk, and concludes the plan is wrong.
- **Fix:** Score on the type of service, not on how full the row is. Contrast therapy, cryo, float, IV, sauna, stretch and recovery studios plus CrossFit and performance gyms get the top base. Aesthetics, weight-loss, hormone and plastic-surgery practices get a lower base. Any note containing "weak fit" or "verify" caps the row at Good fit. Treat college and pro athletics as "High schools and colleges (athletics)", which already go to email.

### 4. The days are not in order of strength, and the intro says they are

- **Where:** Intro: "Every day starts at its best bet ... Do the days in order; Day 1 is the strongest." Generator line 120 sorts days by their single highest score.
- **What's wrong:** In Utah, Day 17 (Lehi, 1 mile from home, "all 8 are best bets") and Day 18 (Orem and Provo, all 8) come after Day 10 (Nephi, "3 businesses, 1 is a best bet. About 36 min") and Day 11 (Morgan, "2 businesses ... About 21 min"). Day 3 (Park City, 2 best bets) sits third. In Tennessee, Day 4 (8 best bets) and Day 6 (7) come after Day 3 (4). "Every day starts at its best bet" is false for 11 Tennessee days and 51 Utah days that have none.
- **What happens if you don't fix it:** The owner follows the instruction and spends his third and tenth outings on thin days far from home while the strongest days near home wait.
- **Fix:** Rank days by best bets per hour of total time including the home drive from item 1. Drop the sentence about every day starting at a best bet, or say "Days 1 to N start at a best bet".

### 5. Businesses in the same building land on different days

- **Where:** Utah Stops sheet. 18 street addresses with 40 businesses are split across days.
- **What's wrong:**
  - 675 E 2100 S appears on Day 2 (US Cryotherapy), Day 23 (HOTWORX Sugarhouse) and Day 72 (Salon Keiji).
  - 401 S 850 E, Lehi, appears on Day 17 (CrossFit Lehi), Day 50 (Utah Barbell) and Day 63 (Momentum Indoor Climbing).
  - 1881 W Traverse Pkwy is on Day 17 (Prime IV) and Day 50 (Club Pilates).
  - Day 19's The Mountain Gym has the opening line "shares the 151 N Main building with The Underground Barbell Club", yet the Barbell Club is on Day 51.
  - Tennessee: StretchLab Bearden (Day 2) and YogaSix Bearden (Day 20) share 224 Brookview Centre Way. Be Somebody Gym (906 Callahan Dr, Day 3) and Base Knox Athletics (914 Callahan Drive, Day 12) are neighbours.
- **What happens if you don't fix it:** The owner walks past a prospect's door, then drives back to the same parking lot weeks later. This breaks the brief's "adding nearby ones".
- **Fix:** After building a day, add every unassigned business within a few hundred metres of any stop at no drive cost, even if it pushes the day a few minutes over. Same-building businesses always travel together.

### 6. Map links break or point to the wrong place

- **Where:** "Map with the stops in order" links in both plans and the Days sheet.
- **What's wrong:**
  - **Broken link.** Utah Day 60 contains "1993 1/2 S 1100 E". The slash is not encoded, so Google Maps reads 10 stops for a 9-stop day and the route breaks at "1993 1".
  - **No city or state.** When the street name contains the town name, the generator drops the city and state (line 131 checks `city in address`). Tennessee Day 18 sends Google "2915 Maynardville Hwy" and "4356 Maynardville Hwy, Suite 3"; Day 21 sends "8 W Norris Rd, Suite B"; Day 22 sends "1403 Oak Ridge Turnpike"; Day 8 sends "500 Howard Baker Jr. Avenue (Knoxville Civic Coliseum)". Utah Days 1, 6, 22, 25, 38, 42, 75 and 82 do the same ("681 W South Jordan Pkwy", "4751 S Holladay Blvd").
  - **Not addresses.** Links include "Biddle Farms at Town Center (street address not found)" (TN Day 4), "Kimball Junction (exact suite not verified)" (Utah Day 3), "Downtown Salt Lake City (also Sugar House and South Jordan)" (Day 29), "Sugar House" (Day 60) and "2184 W Amber Blossom Way (per directory listing; verify)" (Day 13). The intro promises that "rows without a street address" are excluded.
  - **Notes and odd city names.** Utah Day 12 sends cities such as "Salt Lake City (Millcreek), UT". In all, 41 map stops (8 in Tennessee, 33 in Utah) carry text in brackets, such as "(Kohl's Plaza)" and "(basement of Church and State)".
  - **Not clickable in the workbook.** The Days sheet stores each map link as plain text with no hyperlink, so Excel does not open it on a tap.
- **What happens if you don't fix it:** The owner taps the link in the car and gets a broken route, a pin in the wrong state, or a search result instead of a stop.
- **Fix:** Build the link from street, city, state and ZIP fields, always with city and state. Strip anything in brackets. Encode "/" (`quote(..., safe="")`). Leave non-addresses out of the link and flag them in the stop table. Write the link as a real hyperlink cell, with a short label such as "Open map".

### 7. Wrong map points give wrong drive times and wrong stop order

- **Where:** `geocode_prospects.py` marks a result "approximate" only when it falls back to the town. A match on the street with no house number counts as exact.
- **What's wrong:** 17 Tennessee stops and 27 Utah stops sit at the midpoint of their street, not at the building.
  - The worked example itself is off. Day 1's Prime IV (10420 Kingston Pike) lands at the Farragut end of Kingston Pike, which produces "21 min from stop 5" and puts it last, though 10420 Kingston Pike and stop 3 (10426 Jackson Oaks Way) carry neighbouring numbers.
  - 11121, 10001 and 10708 Kingston Pike all land on one point in Bearden. So Day 14 shows "0 min from stop 1" between addresses about a mile apart, and Day 25 puts Gold's Gym Farragut in Bearden.
  - Salt Flats Sports + Fitness (1122 W 60 S, Tooele) landed on the centre of Tooele County, out in the desert. It is listed "On their own" with the text "Nothing else on the list is near these", though Tooele has Days 4 and 47 (Day 47 runs 49 minutes).
  - Approximate stops all share the town's centre point, which yields "0 min" legs: Day 6 shows "0 min from stop 1" and "0 min from stop 2" for three Maryville addresses on different roads.
- **What happens if you don't fix it:** Drive times and stop order are wrong on the days that matter most, and a real Tooele prospect gets no visit.
- **Fix:** Mark a geocode approximate when the house number is missing from the result, and geocode those again with the full address (or a second provider). Show "(address approximate)" in the workbook too; today only the Markdown shows it.

### 8. Two Utah days break the 2-hour cap, and some days double back

- **Where:** "Day 19, Heber City 84032: 10 businesses ... About 2 h 06 min"; "Day 69 ... About 2 h 05 min".
- **What's wrong:** The generator checks the cap while it adds stops. Then it reorders them nearest-first (line 83) and never checks the cap again, so the reorder pushes these days over. The reorder also backtracks:
  - Day 19 ends at WPT Sports Performance (476 N Main St, a best bet) after "10 min from stop 9", a few blocks from stop 1 at 151 N Main St.
  - Day 69 drives "18 min from stop 5" back north from Midvale.
  - Tennessee Day 21 goes Clinton, Clinton, Norris, then "25 min from stop 3" back to downtown Clinton.
- **What happens if you don't fix it:** The plan breaks its own stated rule on two days, and the owner drives back over the same road.
- **Fix:** After ordering, recompute the time and drop the lowest-scoring stop until the day fits. Order stops as a loop (try every start point, keep the shortest) instead of always starting from the highest score.

### 9. Stub days that are not worth the trip

- **Where:** Tennessee Day 9 (2 businesses, 44 min), Day 18 (3, 41 min), Day 19 (2, 51 min, "0 are best bets", a 31-minute leg), Day 24 (3, 47 min). Utah Day 10 (36 min), Day 11 (21 min), Day 30 (31 min), Day 44 (Coalville, 2 businesses, 20 min), Day 47 (49 min), Day 56 (47 min), Day 59 (46 min), Day 83 (52 min).
- **What's wrong:** These are leftovers that the merge step (line 92) joined into "days". Tennessee Day 9 pairs a weight-loss clinic with a physical therapy office "24 min" away. Utah Day 44 is 20 minutes of visits about 43 miles from Lehi.
- **What happens if you don't fix it:** The plan claims 26 and 83 outings when several are errands, and the brief's "one to two hours" floor is broken.
- **Fix:** Fold any day under 60 minutes into the nearest day, or move its stops to "On their own: pair with an errand". Do the same for remote towns (Nephi, Morgan, Ephraim, Coalville, Grantsville).

### 10. Area names repeat and some are unreadable

- **Where:** The day list and the Days sheet.
- **What's wrong:**
  - Tennessee repeats "Knoxville and Farragut" (Days 1, 4, 24), "Farragut and Knoxville" (Days 5, 11), "Knoxville 37919" (Days 2, 26) and "Maryville and Alcoa" (Days 6, 16).
  - Utah repeats "Lehi 84043" four times (Days 17, 50, 63, 70), "Park City 84098" three times, "Orem and Provo" three times, plus "Tooele 84074", "Saratoga Springs and Eagle Mountain", and "Salt Lake City and South Salt Lake".
  - Day 12 reads "Holladay and Salt Lake City (Millcreek), Salt Lake City (South Salt Lake), South Salt Lake, Salt Lake City (Murray), Salt Lake City (Holladay)".
  - ZIP codes ("Knoxville 37902, 37915, 37916") mean nothing to a driver.
- **What happens if you don't fix it:** This is the same "numbers repeated under each day" confusion the owner raised last time, now in the area names.
- **Fix:** Name each day by its corridor or landmark ("Turkey Creek and Parkside Dr", "Bearden: Kingston Pike 4400 to 6500", "Lehi: Traverse Mountain"). Where two days share a town, add "part 1" and "part 2" with the street that separates them. Clean the City field to plain town names.

### 11. The "Opening line" column is research notes, not something to say

- **Where:** Stop tables, "Opening line" column. Read me first: "Reviewer's pick at the start of an Opening line = a business the list critique singled out as a top prospect."
- **What's wrong:** Many entries are sources or internal advice:
  - Sources: "Lantern shows a 5.0 rating from 213 reviews", "Listed in the BestofSLC directory as a CrossFit studio", "Recently opened affiliate (#34331)", "(EIN Presswire New Year specials release)".
  - Advice that would backfire if said aloud: "so a business-to-business pitch may land well", "Independent cryo shop competing a few blocks from Restore Draper's HBOT menu".
  - Cut off mid-word: the generator truncates at 140 characters, which cuts 6 Tennessee and 29 Utah lines ("red light sauna al", "Knoxville offi", "both doctors board ").
  - Starts with "Reviewer's pick. " and nothing after it (MC Wellness, Prime IV Knoxville).
  - "Reviewer's pick" is jargon, and the Utah guide explains it although it never appears in the Utah plan. Spa Visage reads "Reviewer's pick" yet is rated only "Good fit".
- **What happens if you don't fix it:** The owner reads a citation aloud at the counter or stops trusting the column.
- **Fix:** Rename the column "Good to know". Strip source names and bracketed citations. Cut at a sentence end. Move "Reviewer's pick" to its own Yes/blank column called "Top pick", and drop the Read me line from the Utah workbook.

### 12. The "Ask for" column often has no one to ask for

- **Where:** "Ask for" column.
- **What's wrong:**
  - A bare phone number sits in the column: "(865) 274-0199".
  - Two pairs of brackets: "Chad Becker ((865) 599-3786)".
  - Research leftovers: "Jerry J. (per Yelp owner field)", "Saah (name as given by Farragut Press)", "Kimberly (first name only)".
  - "ask for the owner" at corporate chains whose owner is never on site (Orangetheory, VASA, EoS, Club Pilates). Utah has 128 chain stops and 91 stops with neither a name nor a phone number.
- **What happens if you don't fix it:** The owner asks for "(865) 274-0199" or for an owner who does not exist at a VASA front desk.
- **Fix:** Split the column into "Ask for" (name and role, or "the manager") and "Phone". Strip the research notes in brackets. At chains, say "the general manager; leave a pamphlet for the franchise owner".

### 13. The same business appears twice, or with the wrong fact

- **Where:** Utah Day 6, Day 19; Tennessee Day 6.
- **What's wrong:**
  - Utah Day 6 lists CrossFit Freight Train Co and CrossFit The Club as two best bets at 6671 S 2500 E. The opening line says Freight Train is "at the old CrossFit The Club space", and the workbook note says they "may be the same facility".
  - Utah Day 19 lists Gogan's Garage and Ruthless Performance with the same phone number (435-671-8423). Gogan's note gives Ruthless's address as its own old address.
  - Tennessee Day 6 gives Gallaher Plastic Surgery (Maryville) the line "Second location inside Tellico Village", which is in Loudon County, not Maryville.
- **What happens if you don't fix it:** The owner hands two pamphlets to one gym or opens with a wrong fact.
- **Fix:** Merge rows that share an address and a phone number. Correct the Gallaher line.

### 14. Tennessee addresses repeat the city

- **Where:** Tennessee stop tables, 9 rows: "11533 Kingston Pike, Farragut, TN, Farragut"; "9311 Kingston Pike, Knoxville, TN 37922, Knoxville".
- **What's wrong:** Line 177 always appends the City field, even when the address already contains it.
- **What happens if you don't fix it:** It looks like a mistake, which was the owner's complaint about the first version.
- **Fix:** Use the same city check as the map link, made correct (see item 6).

### 15. Small text errors

- **What's wrong:**
  - The intro says schools "are listed at the end". They are not: 42 Tennessee and 99 Utah school rows appear nowhere.
  - "1 more businesses sit alone" should read "1 more business sits alone".
  - The intro says "26 outings", then "Across all 26 days". Pick one word.
  - "carry the pamphlet for that type of business" never says which pamphlet goes with which type.
  - `route_config_knoxville.json` points to `.../Tennessee Research/knoxville/purebaric_knoxville_prospects.xlsx`, which does not exist. The workbook is one folder up, so the next rerun fails.
- **What happens if you don't fix it:** Small errors make readers doubt the numbers. The stale path costs the next session a debugging step.
- **Fix:** Correct each one. Map each "Kind of business" to its pamphlet file name in the intro.

## Your call

- **Utah at 83 days.** Do not present it as one list. 337 of its 577 stops sit on Days 33 to 83, which have no best bet. 282 of those are generic gyms, and 110 are chains. I would split it into three parts:
  1. **The plan:** the roughly 30 days with at least two best bets after the fixes above, grouped by region (Utah County, south Salt Lake County, Salt Lake City, Davis, Weber, Park City and Heber, Tooele), with regions ordered by distance from Lehi.
  2. **If you are in the area:** the zero-best-bet days as a short appendix, one line per day.
  3. **Email, not doors:** chain gyms, pro teams (Jazz, Mammoth, RSL, Royals, Archers, Warriors, Grizzlies, Stars) and college athletics.

  The owner can see the whole job on one page and finish it in five or six weeks, instead of facing four months.
- **Phone use on the road.** An 8-column Markdown table and a 12-column Stops sheet are unreadable on a phone. A one-page card per day (map link, then stop, name, ask for, phone, one line to know) would work better. Add a "Visited" and "Outcome" column to the Stops sheet so the plan doubles as a log.
- **Ten minutes per stop.** 19 Tennessee and 74 Utah legs show "0 min", which ignores parking and walking between buildings. Adding two minutes per stop keeps a 9-stop day honest.
- **"Already offers hyperbaric".** The Lash Bar (Lehi) and Crown BJJ (Bluffdale) carry this flag. If they rent from Purebaric now, the reason should say "current customer". If not, confirm the flag before writing them off.

## Checked and it's fine

- On the first screen, a reader learns what a Day is, why the count differs ("capped at about 2 hours, not at a fixed number of visits"), what Best bets means, and what the time includes and leaves out. Item 1 is a fault in the method, not in the wording.
- Day counts agree across the day list, the stop tables, the Days sheet and the Stops sheet: 26 Tennessee days and 83 Utah days, no mismatches.
- Best-bet counts agree in all four places, day by day.
- The totals lines match the sums: Tennessee 163 businesses, 48 best bets, 38.1 hours; Utah 577, 115, 133.8 hours.
- Worked examples: Tennessee 6 x 10 = 60 plus 51 minutes of rounded legs, giving "about 1 h 50 min"; Utah 8 x 10 = 80 plus 26, giving 1 h 46 min. The arithmetic is right; the Tennessee leg it rests on is wrong (item 7).
- No row disappears without a trace: Tennessee 263 = 163 routed + 1 on its own + 57 not routed + 42 schools; Utah 736 = 577 + 4 + 56 + 99 schools.
- Every day that has a best bet starts at one.
- I spot-checked Tennessee Days 1, 6, 14, 21, 25 and Utah Days 1, 6, 12, 19, 69 against their addresses. Every stop belongs to its day's area, with no address in the wrong town. Across all stops, only 3 Tennessee and 5 Utah map points name a neighbouring town (for example Fitness Together Farragut geocoded as Knoxville 37934), and all of those are adjacent. The faults are the street-midpoint points in item 7, not wrong towns.
- Apart from Days 19 and 69 in Utah, every day stays within 120 minutes as the plan defines it.
- The `.docx` versions were regenerated at the same time as the `.md` and `.xlsx`.
