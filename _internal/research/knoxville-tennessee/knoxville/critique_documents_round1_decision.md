# Adversarial critique, round 1: Knoxville decision documents (10 October 2026)

Reviewer stance: skeptical investor, Tennessee health-care regulatory attorney, fire marshal. Research critique, not legal advice. Workbook counts come from openpyxl reads of the two Knoxville workbooks and `targets.json` on 10 Oct 2026. Web spot-checks: 17 calls, listed under "Checked and it's fine".

## Verdict

- **Executive brief (`EXECUTIVE-BRIEF.md`):** Not ready
- **Market analysis (`market_analysis.md`):** Needs work before it goes out
- **Legal blockers summary (`legal_blockers_summary.md`):** Needs work before it goes out
- **State memo (`legal_state_tennessee.md`):** Needs work before it goes out
- **Federal/local memo (`legal_federal_local_knoxville.md`):** Needs work before it goes out
- **Tennessee LOI (text and `README-LOI-Tennessee.md`):** Not ready
- **Schools proposal (`PROPOSAL-schools-athletic-recovery.md`):** Not ready
- **Index and READMEs (`DOCUMENTS-INDEX.md`, `knoxville/README.md`, `BRIEF.md`, `google_trends_check.md`, `classifieds_check.md`, `hbot_providers.md`):** Needs work before it goes out

## Fix these (worst first)

### 1. The LOI and the agreement name the wrong contracting party
- **Where:** LOI, party block: "Matthew Bailie, doing business as Purebaric, Lehi, Utah (“Purebaric”)." The Definitive Agreement uses the same words. Compare the state memo header: "Prepared 2026-10-10 for Purebaric LLC (Utah)", and LOI Section 3(a): "a certificate of authority from the Tennessee Secretary of State".
- **What's wrong:** The memos treat Purebaric as a Utah LLC and the LOI conditions installation on a foreign-LLC certificate of authority. Both contracts make Matthew Bailie personally the lessor. A sole proprietor cannot get a certificate of authority, and an LLC that is not a party gets no benefit from the release, the indemnity or the liability cap.
- **What happens if you don't fix it:** Every Tennessee claim lands on the owner personally, with no LLC shield. The certificate-of-authority condition can never be met as written.
- **Fix:** Name "Purebaric LLC, a Utah limited liability company" as the party in both the LOI and the Definitive Agreement. Name it as additional insured too, and keep Matthew Bailie only as a released party.

### 2. The LOI still offers the oxygen configuration, and its conditions do not cover the blockers
- **Where:** LOI 1.1: "☐ Standard: with oxygen concentrator (oxygen delivered by mask inside the chamber)". Section 3(c): "and, if Purebaric asks, obtaining written confirmation from the fire marshal." Section 3(f): "Purebaric confirming with Tennessee counsel whether any Tennessee licence or registration applies to renting the selected configuration".
- **What's wrong:** The federal memo buckets the concentrator as "**Blocker**" (table row 2) and fire code at business sites as "**Blocker** (business sites)" (row 6). Condition (f) covers only a Tennessee "licence or registration". It does not cover the federal prescription-device problem (21 CFR 801.109) or the uncleared use of oxygen inside the chamber. Condition (c) puts the fire-code call on the host business and makes a written fire-marshal answer optional. The runbook says the opposite: "Air-only unless counsel and the fire marshal clear the concentrator in writing."
- **What happens if you don't fix it:** A business can sign for the Standard configuration and get an installation the memos call blocked. If there is a fire, the file will show that Purebaric knew about the §609 risk and did not ask the fire marshal.
- **Fix:** Remove the Standard checkbox from the Tennessee LOI until counsel and the Knoxville Fire Marshal clear it in writing. Make written fire-marshal confirmation for the chosen configuration a condition Purebaric must obtain, not one it may ask for.

### 3. "Air-only" in the LOI leads into an agreement that rents a concentrator, and the agreement controls
- **Where:** LOI 1.1: "☐ Air-only: no oxygen concentrator". LOI 1.10: "If this LOI and the Definitive Agreement differ, the Definitive Agreement controls." Agreement 1.1: "one soft-shell mild hyperbaric chamber rated to 1.5 atmospheres absolute (ATA), one air compressor, one oxygen concentrator". Exhibit A also has an "Oxygen concentrator" line with serial number and replacement value.
- **What's wrong:** No Definitive Agreement exists for an air-only placement. If the business signs the current form, the controlling document rents it a concentrator. Exhibit C's oxygen-drug screening and Section 7.1's oxygen fire risk also assume oxygen.
- **What happens if you don't fix it:** The air-only position that the runbook, training and pamphlets depend on falls apart the moment the agreement is signed. Your fire-marshal letter will say "air-only" while your contract says "oxygen concentrator".
- **Fix:** Add a configuration choice to agreement 1.1 and Exhibit A, with the concentrator line marked "not supplied" for air-only. Do this in a Tennessee version of the agreement.

### 4. LOI term pricing conflicts with the agreement's fixed fee and its 30-day exit
- **Where:** LOI 1.4: "the rates published at purebaric.com/pricing on the date the Definitive Agreement is signed will apply and will then be fixed for the initial term." LOI 1.9: "unless a minimum term is agreed in Section 1.3." Agreement Exhibit A: "$979.00 per chamber per month, due in advance". Agreement 2.4: "Either party may end this Agreement for any reason with at least 30 days' written notice".
- **What's wrong:** The LOI sells $783 on a 12-month term. The agreement prints $979 and lets either side leave on 30 days' notice with no carve-out for a minimum term. Under LOI 1.10 the agreement wins.
- **What happens if you don't fix it:** Either the business is billed $979 after negotiating $783, or it gets $783 and leaves after one month, keeping the 12-month discount without the commitment.
- **Fix:** Put the agreed term and its rate into Exhibit A, and make agreement 2.4 subject to the Exhibit A minimum term, with an early-exit charge set at the rate difference.

### 5. The brief's entry model was never updated after the legal check and contradicts section 5a and the runbook
- **Where:** EXECUTIVE-BRIEF section 4, step 2: "Freight three chambers: two for business placements, one for home rentals and demos." Step 4: "test a $479 to $529 home tier." Step 6: "one 4-week digital billboard flight near Turkey Creek (about $2,500)". Section 3: "a spare compressor and concentrator should be stocked locally."
- **What's wrong:** Section 5a says home rentals with the concentrator "are blocked as run in Utah". The runbook says "No home rentals in Tennessee", lists billboards as "deliberately out of scope" and defaults to air-only. The brief recommends the opposite on all three points.
- **What happens if you don't fix it:** The owner reads the recommendation and ships a home-rental chamber into a state where the memo says a $1,404 licence is needed. He also budgets a billboard the operating plan has already ruled out.
- **Fix:** Rewrite section 4 to match the runbook: air-only business placements only, no home tier, no billboard, and no shipping until Phase 0 clears.

### 6. "Both figures sit under the roughly $10,000 line" is false for the academic-year figure
- **Where:** Brief 4a: "Both figures sit under the roughly $10,000 line where Utah districts need written quotes and UT Knoxville needs bids". Proposal section 4 table: "Under the $30k two-written-quote tier (Utah LEA) and the $49,999 informal ceiling (UTK)".
- **What's wrong:** $25,470 is more than double $10,000. The proposal's own thresholds put it inside the Utah band of "$10,000 to $30,000, two written quotes" and the UTK band of "$10,000 to $49,999 needs informal bids with approval". It is not "under" either tier.
- **What happens if you don't fix it:** You pitch a no-bid purchase and the business office tells you it needs competing quotes. That costs a season.
- **Fix:** State it this way: "The pilot ($8,750) is under $10,000. The academic-year contract ($25,470) needs two written quotes in Utah districts and informal bids at UT Knoxville."

### 7. "Air-only is the most likely way through" has no support in the memos
- **Where:** Brief 5a: "An air-only configuration is the most likely way through." Proposal section 4: "This avoids the oxygen and fire-code questions in section 2". Summary, row 3: "Minnesota's fire marshal applies this to mild chambers".
- **What's wrong:** The federal memo treats air-only only as an open question (Q5: "Can the chamber be used **with air only** ... without falling under §609?"). Its evidence points the other way. An NFPA committee member wrote that Chapter 14 "apply to installations with mild hyperbaric chambers" without regard to oxygen, and another said Chapter 14 covers "0 to 100 psig" with PVHO-1 at 2 psi or more. The Minnesota interpretation the summary cites covers chambers with "90 to 95% oxygen by mask". The summary drops that qualifier, and it is the only fact that would support air-only. Air-only also leaves the chamber's own prescription label (21 CFR 801.109) untouched.
- **What happens if you don't fix it:** The owner treats air-only as a solution, places chambers, and then learns from the fire marshal that §609 applies to any pressurized chamber.
- **Fix:** Change the brief to: "Whether an air-only chamber is a 'hyperbaric facility' is unanswered; the evidence found leans toward yes." Restore the Minnesota oxygen qualifier in the summary.

### 8. Brief 4a misstates what the FDA clearances say about oxygen
- **Where:** Brief 4a: "the research reports that soft chambers are FDA-cleared to run on air and that adding oxygen is prohibited by the clearance".
- **What's wrong:** The federal memo says the opposite: "Neither summary contains that exact phrase (verified by reading both PDFs)". The FDA prohibition comes only from a UHMS statement, and "**the FDA document behind it was NOT VERIFIED**". The proposal's source for it is a South African society (SAUHMA).
- **What happens if you don't fix it:** You cite a prohibition in a clearance that does not contain one. Counsel and regulators will discount the rest of the analysis.
- **Fix:** Use: "The reviewed clearances describe air-only inflation and none covers oxygen; UHMS states FDA prohibits oxygen, which was not verified in an FDA document."

### 9. No document identifies Purebaric's own chamber or its 510(k) number, yet several imply it is cleared
- **Where:** Brief section 3: "mild chambers are FDA-cleared as prescription devices for acute mountain sickness". Summary federal row: "The cleared soft chambers (K072757, K220290) are prescription-only". LOI 1.1: "one soft-shell mild hyperbaric chamber rated to 1.5 atmospheres absolute (ATA)".
- **What's wrong:** K072757 is a soft chamber at 1.2 to 1.3 ATA. K220290 runs at up to 1.5 ATA but is "semi-rigid" (federal memo section 1), and its indication says "designed for use at physician offices and health institutions". No reviewed clearance matches a soft chamber at 1.5 ATA. Federal Q2 and proposal Q1 both ask for the model, and nobody has answered.
- **What happens if you don't fix it:** If the chamber has no clearance at all, the exposure is an uncleared device, not just a misbranded one, and every "cleared prescription device" sentence is wrong for your equipment.
- **Fix:** Record the make, model and K-number of the chamber and the concentrator in the federal memo. Rewrite the three quoted sentences to describe that device.

### 10. Schools proposal pricing departs from the live price table and conflicts with the pamphlet
- **Where:** Proposal section 4 table: "| **90-day Recovery Pilot** | 3 months | $950 |", "| Season rental | 4 months ... | $979 (top of the business band) |", "| **Academic-year Recovery Room** | 10 months, Aug to May | **$849** |". Brief 4a repeats "$849" and "$8,750".
- **What's wrong:** Live pricing is $929 for 3 months, $881 for 4 months and $810 for 10 months. $950 and $849 are not on the table, and $979 is the 1-to-2-month rate. The schools pamphlet offers "One chamber in your athletic training room for ninety days" at "$929 a month on the three-month pilot term". So the proposal pitches three chambers at $950 while the pamphlet pitches one at $929. The proposal also says "Delivery, setup, service and the $200 training and supplies fee per site are included", then adds "+ $200" to the pilot. The LOI and agreement charge $200 per chamber, which is $600 for three.
- **What happens if you don't fix it:** A school gets two different quotes from the same company. A 4-month season is quoted $98 a month above your published rate.
- **Fix:** Reprice every proposal row from `pricing_live.json`. Pick one pilot offer (one chamber or three) and make the proposal, brief 4a and pamphlet match. Charge the training fee per chamber, as the agreement does.

### 11. Schools proposal drops the parent-presence rule and lets student trainers run sessions
- **Where:** Proposal section 4: "Under-18 use happens only where the insurer approves it, with written parent consent and athletic-trainer supervision". Same section: "A 90-minute on-site certification for every athletic trainer and student trainer who will operate the chamber".
- **What's wrong:** Agreement 4.4(a) bars under-18 use unless a parent "signs the consent form and is present". The schools pamphlet says "a parent present for the session", and sales training says "Minors need a parent present under the current agreement". The proposal quietly removes parent presence and adds student operators, who may be minors and are not licensed. Its own text says "A licensed athletic trainer must be in the room for every session."
- **What happens if you don't fix it:** A school runs sessions the agreement forbids. The breach voids your indemnity argument exactly when a minor is hurt, and parental waivers are void in Tennessee (*Blackwell*).
- **Fix:** Keep the agreement's parent-present rule in the proposal unless you amend the agreement first. Limit operators to licensed athletic trainers.

### 12. Five of the eight "Tennessee" college targets are outside the Knoxville radius
- **Where:** Proposal section 3, rank 1: "Carson-Newman, Maryville College, Johnson, Tennessee Tech". Brief 4a: "20 in Tennessee (8 colleges ...)".
- **What's wrong:** `targets.json` lists Tennessee Tech (Cookeville), East Tennessee State (Johnson City), Middle Tennessee State (Murfreesboro), Vanderbilt (Nashville) and Carson-Newman (Jefferson City). `BRIEF.md` lists Jefferson City under "OUTSIDE (do not include)". Only UT Knoxville, Maryville College and Johnson are inside the 25 miles.
- **What happens if you don't fix it:** The Knoxville channel looks almost twice as deep as it is, and the "in parallel" Knoxville plan sends a rep to Cookeville with no local service.
- **Fix:** Split the Tennessee targets into "inside 25 miles" (15) and "outside, not serviceable in the pilot" (5), and restate the counts in the brief.

### 13. The summary and the brief soften the federal finding
- **Where:** Summary federal row: "Blocker in principle, rarely enforced". Brief 5a: "**Federal exposure exists in both states.**"
- **What's wrong:** Federal memo table rows 1 and 2 say "**Blocker**" without qualification. "Rarely enforced" is the summary's addition. The memo says only that no action was found "in three searches ... (not exhaustive)". The brief drops the word blocker entirely.
- **What happens if you don't fix it:** The owner reads the federal problem as a footnote. It applies to every Utah placement today.
- **Fix:** Use the memo's word in both places: "Blocker (no enforcement against renters found in a non-exhaustive search)".

### 14. The summary downgrades air-only home rentals below what the state memo says
- **Where:** Summary row 2: "**To homes, air-only (no concentrator)** | Requirement to handle | ... Unresolved; needs an opinion."
- **What's wrong:** The state memo says "A soft chamber that carries the federal Rx legend is arguably HME too". If that reading holds, air-only home rentals also need the HME licence, which makes them blocked, not a "requirement". The federal prescription problem applies on top. "Unresolved" and "Requirement to handle" are different buckets.
- **What happens if you don't fix it:** Air-only home rentals look like a workaround when they may need the same licence.
- **Fix:** Bucket it "Unresolved: may be blocked (HME definition and federal Rx label)".

### 15. The summary states as fact things the federal memo marks unverified
- **Where:** Summary row 3: "Knoxville adopted the 2024 International Fire Code (City Code § 11-21) and Knox County the 2018 edition." Same row: "Raleigh, Charlotte and Durham shut down mild-chamber wellness services in 2022". Line 3: "Both cite primary sources with access dates and mark anything not read in a primary source as not verified."
- **What's wrong:** On Knox County the memo says "No later adoption is listed; **the current edition is NOT VERIFIED**". The Durham source is "undated, around 2022; content from search snippet; the page now returns 404". The line-3 claim is false for both memos. The state memo reads statutes on FindLaw and rules on Cornell LII. It takes the 9.25% rate from Stripe, and the *Copeland* holding comes from search summaries ("opinion text did not load"), without inline [not verified] tags. The federal memo's own rule is "Wherever a source could not be read directly, the item is marked **NOT VERIFIED**". Yet its Knoxville licence details (source 21: "the direct fetch was blocked, so details are partly from snippets"), Maryville (source 22, snippet) and Durham (source 47) carry no tag. Executive summary item 8 then bolds "$15 each".
- **What happens if you don't fix it:** Counsel bills hours re-verifying everything because the verification labels cannot be trusted.
- **Fix:** Delete the line-3 sentence, or replace it with "Several items rest on secondary sources (FindLaw, Cornell, Stripe, search snippets); see each memo". Add NOT VERIFIED tags to the items listed above.

### 16. Neither memo answers the single-article question, the summary claims a conflict, and the LOI may over-collect tax
- **Where:** State memo Topic 6: "Single-article and local-cap treatment of periodic lease payments was not researched **[open]**." Federal memo section 9 and row 9: "(state memo to resolve)". Summary: "How the single-article cap applies to monthly payments is inconsistent in state guidance." LOI 1.5: "will be added to each invoice".
- **What's wrong:** Each memo hands the question to the other. The only source actually read (the DOR 2022 webinar) says local tax is charged on the first lease payment and "Each subsequent lease payment would have just the 7% state tax." The opposite reading rests on Letter Ruling 02-07 and SUT-43, which the memo says were "NOT read". So "inconsistent in state guidance" is an unverified claim. If the webinar is right, charging 9.25% on every invoice over-collects 2.25% from month 2 onward.
- **What happens if you don't fix it:** Tennessee customers are over-charged, which brings refund liability and a consumer-protection complaint, or prices are quoted wrong.
- **Fix:** Read LR 02-07 and SUT-43 (or request a letter ruling) before the first invoice. Until then, change LOI 1.5 to "applicable Tennessee sales and use tax" with no rate and no "each invoice".

### 17. The respiratory-care rule is cited from a superseded compilation
- **Where:** State memo executive summary item 4: "Under a Board of Respiratory Care rule (eff. 2021-06-07)". Source S9 is Cornell LII.
- **What's wrong:** The Secretary of State publishes Chapter 1330-01 compilations revised June 2024 and November 2025. A November 2025 rulemaking hearing and a March 2026 filing both list Rule 1330-01-.03. The 6.00 L/min nasal-cannula line still appears in the November 2025 compilation (per search summary), but the memo never read the current rule.
- **What happens if you don't fix it:** You rely on a home-walkthrough exemption whose current wording nobody has read.
- **Fix:** Re-read Rule 1330-01-.03 from the November 2025 compilation (or later) on publications.tnsosfiles.com and update the citation and effective date.

### 18. The question counts undercount what counsel must answer, including insurance
- **Where:** Summary, last section: "a Tennessee attorney answers the nine state questions and the three federal ones". Brief 5a: "The 12 attorney questions and 4 fire-marshal questions are listed in the memos." Runbook: "ask the twelve questions in `legal_state_tennessee.md` section (d) and `legal_federal_local_knoxville.md` section (d)".
- **What's wrong:** The memos contain 21 questions: 9 state plus 12 federal/local, of which 4 go to the fire marshal. The summary and brief leave out federal Q8 to Q12: physical location for licences, home-occupation zoning, medical-spa reclassification, the single-article cap and "12. Will general and product liability insurers cover chamber-plus-oxygen rentals". "Twelve" means three different sets in three documents.
- **What happens if you don't fix it:** The insurance and tax questions never reach counsel, and the pilot starts uninsurable or mis-taxed.
- **Fix:** Use "21 questions (9 state, 12 federal/local, of which 4 go to the fire marshal)" everywhere, and list insurance Q12 as a gate.

### 19. The brief's prospect numbers are a superseded version of the list
- **Where:** Brief section 3: "177 businesses compiled across Knox (110), Blount (33), Anderson (15), Sevier (8), Loudon (7) and Union (4)". Same section: "Nine verified emails remain". Same section: "Final list: 174 businesses, 21 marked \"Call first\", 9 verified emails, roughly a quarter of rows without a phone".
- **What's wrong:** The workbook has 263 prospects: Knox 171, Blount 43, Anderson 19, Loudon 12, Sevier 12, Union 5, Jefferson 1. It has 26 emails (25 high confidence), 88 recovery studios and med spas (brief says 37), 45 PT and chiropractic (brief says 46), 13 sports programs plus 42 schools (brief says 19), and 51 rows without a phone (19%). The v6b change log claims the update; the body does not show it. `knoxville/README.md` repeats "174 businesses ... 9 verified emails".
- **What happens if you don't fix it:** An investor checks the workbook against the brief and finds every number wrong.
- **Fix:** Regenerate section 3's counts from the workbook Summary sheet and update `knoxville/README.md` the same way.

### 20. Competitor counts disagree across the brief, the provider workbook and the prospect workbook
- **Where:** Brief section 3: "24 hyperbaric providers were identified in the radius. Only five sell wellness sessions to the public". Brief section 4: "Skip Bell, Sessions and ThermoDynamic, which already own chambers." Index: "24 existing chamber operators".
- **What's wrong:** The provider sheet has 25 rows (5 wellness, 7 medical, 13 unverified including Verge Fitness and Blackberry Mountain). The prospect workbook's "Already offer HBOT" sheet has 8, including The Functional Medicine MD, The Osteopathic Center and Mobile Hyperbaric Centers, none of which appear in the provider workbook. Sessions, KnOxygen and Redeem are not on that sheet; Sessions sits under "Dropped". The skip list omits the two new wellness operators.
- **What happens if you don't fix it:** Reps call two existing chamber operators as prospects, and "five wellness providers" understates competition.
- **Fix:** Merge the v6b re-sweep operators into the provider workbook. Restate the count as "25 entries; 7 confirmed wellness providers" (or whatever the merged figure is) and add them to the skip list.

### 21. The brief and the LOI README conflate IFC §609 with NFPA 99 Chapter 14
- **Where:** Brief 5a: "Knoxville's 2024 International Fire Code sends \"hyperbaric facilities\" to NFPA 99 chapter 14". `README-LOI-Tennessee.md`: "Knoxville applies the 2024 International Fire Code, whose §609 and NFPA 99 chapter 14 cover \"hyperbaric facilities\"".
- **What's wrong:** Per the federal memo, IFC §609 requires inspection, testing and maintenance "in accordance with NFPA 99". It is IBC §425.1 that points to Chapter 14, "through building permits". These are different hooks with different triggers: an operating inspection versus a permit review.
- **What happens if you don't fix it:** The fire-marshal letter asks the wrong question, and the answer does not cover the building-permit route.
- **Fix:** Write "IFC §609 (maintenance to NFPA 99) and IBC §425 (construction to NFPA 99 Chapter 14)" in both places.

### 22. LOI condition (a) requires a licence the county may not issue
- **Where:** LOI 3(a): "and the business tax license for the city and county of the Installation Location."
- **What's wrong:** The federal memo quotes the DOR manual. Without a Tennessee location "business licenses are generally not required nor issued", and an out-of-state seller registers through TNTAP. A chamber at a customer's premises is not Purebaric's location. The state memo's bucket 6 ("get a local business licence") disagrees with the federal memo on this point.
- **What happens if you don't fix it:** A condition that cannot be met blocks the first installation, or Purebaric waives its own condition.
- **Fix:** Replace it with "TNTAP registration, and city and county business licences if Purebaric has a Tennessee location".

### 23. The federal memo contradicts itself on bucket and chamber type
- **Where:** Table row 6: "**Blocker** (business sites)". Section 6: "That makes this a **potential blocker** for B2B in Knoxville". Executive summary item 1: "The soft chambers we found cleared by FDA (K072757, K220290)". Section 1: "It is a semi-rigid chamber".
- **What's wrong:** A blocker and a potential blocker are not the same bucket. K220290 is not a soft chamber. The summary carries the "soft" error forward and leaves out K220290's indication, "designed for use at physician offices and health institutions", which matters for home rentals.
- **What happens if you don't fix it:** Readers pick whichever bucket suits them, and the home-use limit in the only 1.5 ATA clearance goes unnoticed.
- **Fix:** Make row 6 read "Potential blocker (business sites)". Change item 1 to "one soft chamber (K072757) and one semi-rigid chamber (K220290)". Add the K220290 setting limit to the summary.

### 24. The state memo puts the Board of Pharmacy question in too soft a bucket
- **Where:** State memo bucket table row 2: "**Blocker (home rentals with concentrator)** / Requirement to handle (B2B)".
- **What's wrong:** The same memo says Rule 1140-01-.08 requires "the licence and an inspection before opening, including for out-of-state entities", and calls coverage of B2B rentals "open". An open licence with a pre-opening inspection is unresolved, not a requirement to handle. The runbook names it one of "The three answers that gate everything".
- **What happens if you don't fix it:** The summary says business placements depend only on the fire marshal, when a licence question could stop them too.
- **Fix:** Re-bucket B2B as "Unresolved: possible licence with pre-opening inspection (Board of Pharmacy)" and add it to the summary's business row status.

### 25. The market analysis verdict contradicts its own scorecard
- **Where:** Verdict: "the field looks open: no chamber-rental business found in Tennessee and only one confirmed mild-hyperbaric clinic." Indicator 8 lists "Hyperbaric Recoveries (Nashville metro ...) and At Home Hyper Wellness (Franklin ...)". Reasons to enter, item 3: "Five self-pay providers".
- **What's wrong:** Two Tennessee renters are named a few lines below, and the analysis counts five self-pay providers, not one.
- **What happens if you don't fix it:** The first sentence an investor reads is wrong twice.
- **Fix:** Replace it with "no chamber-rental business serves Knoxville (the nearest two are in Middle Tennessee) and five self-pay providers are confirmed".

### 26. Market analysis sections predate the legal check and the list rebuild
- **Where:** Indicator 9: "No Tennessee-specific rule found". Reasons against, item 3: "The prospect list has 96 candidates". Entry model: "For home rentals, test an entry tier at $479 to $529" and "keep a spare compressor and concentrator locally".
- **What's wrong:** The state memo found the HME licence and the respiratory-care rule. The list has 263 rows. The home tier and concentrator contradict the runbook.
- **What happens if you don't fix it:** The scorecard and the legal memos give the owner opposite answers on regulation.
- **Fix:** Update indicator 9 to cite the HME licence, the respiratory-care rule and the fire-code question, and decide whether its score drops from 2 to 1 (62 becomes 61). Change "96" to 263, and align the entry model with the runbook.

### 27. The competitor price gap is overstated
- **Where:** Brief section 3 and market analysis reasons to enter, item 1: "The nearest are in Nashville and Franklin at $1,495 to $2,850 a month, two to five times Purebaric's home rate."
- **What's wrong:** The provider workbook records that Hyperbaric Recoveries' "homepage separately says plans start at $555/mo (conflict)". At Home Hyper Wellness advertises "discounts for longer leases". $555 is about the same as Purebaric's home rates.
- **What happens if you don't fix it:** The pricing advantage looks larger than the evidence supports.
- **Fix:** Add "(one renter's homepage says from $555 a month; unconfirmed)" and drop "two to five times", or call to confirm.

### 28. "Sold-out 101,915-seat stadium" overstates the source
- **Where:** Brief section 3: "a sold-out 101,915-seat stadium". Market analysis reasons to enter, item 5: "Neyland Stadium sells out at 101,915".
- **What's wrong:** Source [46] reports that "70,500" season tickets sold out. It does not say that every game sells all 101,915 seats.
- **What happens if you don't fix it:** It is an easy factual hit for a skeptical reader.
- **Fix:** Write "101,915-seat stadium; 70,500 season tickets sold out for 2025".

### 29. The "recent weeks" Trends claim rests on two data points from a near-zero series
- **Where:** Brief section 3: "in the most recent weeks Knoxville runs at 55 to 60% of Salt Lake City." The market analysis repeats it.
- **What's wrong:** `google_trends_check.md` says Knoxville's series is "every week is 0 except five isolated spikes in five years". The 55 to 60% comes from two weeks (8 vs 13 and 6 vs 11). The 5-year figures of 1 and 6 are rounded integers: 1 could be anywhere from 0.5 to 1.49, so "a sixth" could be a fourth or a twelfth.
- **What happens if you don't fix it:** A two-week blip is presented as a trend that softens the demand weakness.
- **Fix:** Write "two recent weeks were at 55 to 60% of Salt Lake City; Knoxville is mostly below Trends' reporting threshold".

### 30. The state memo's *Blackwell* inference does not fit Purebaric
- **Where:** State memo Topic 5: "*Blackwell* also refused a foreign choice-of-law clause with no material connection to the deal [S23]. So a Utah choice-of-law clause in Purebaric's waiver may not be honored for Tennessee customers."
- **What's wrong:** Purebaric is based in Utah, so Utah has a material connection. *Blackwell*'s reason does not carry over directly. The stronger reason a Utah clause may fail is Tennessee public policy on minors and *Copeland*'s public-interest factor. The holding itself comes from "Recreation-Law commentary" and is not tagged as unverified.
- **What happens if you don't fix it:** Counsel is pointed at the wrong ground for revising the governing-law clause.
- **Fix:** Rewrite as "A Utah clause has a material connection, but Tennessee may refuse it on public policy for minors' claims; holding read in commentary only [not verified]."

### 31. Schools proposal still plans Tennessee home rentals and miscomputes them
- **Where:** Proposal section 6: "2 months as home rentals: 3 × $529 to $729 × 2 = $3,174 to $4,374". Risks table: "Fill summers with home rentals".
- **What's wrong:** Home rentals in Tennessee are blocked pending an HME licence (state memo, runbook). $529 is the 12-month home rate. A 2-month rental is $659, which gives $3,954, not a range starting at $3,174.
- **What happens if you don't fix it:** The school case in Knoxville counts revenue the business cannot legally book.
- **Fix:** For Tennessee, set summer redeployment to $0 and say so. For Utah, use the 2-month rate of $659.

### 32. Schools proposal timeline ignores the legal gates
- **Where:** Proposal section 8: "Knoxville (in parallel, tied to the Knoxville pilot) ... Days 61 to 90: 1 pilot running." Section 9: "3 signed (2 Utah, 1 Knoxville)". It is dated "Draft 1, 10 October 2026" and predates the memos.
- **What's wrong:** The brief says "the pre-sold pilot should wait for those answers". The runbook puts high schools in "Wave 5 ... only after waves 1 to 4 and insurer approval" and allows no placement before Phase 0. The proposal never mentions the HME licence, 21 CFR 801.109 or the fire-marshal questions.
- **What happens if you don't fix it:** A rep following the proposal books a Knoxville school pilot before counsel answers.
- **Fix:** Add a "Legal gates" line to section 8 that makes Knoxville days 1 to 90 conditional on runbook Phase 0, and cite the memos in section 7.

### 33. LOI training fee contradicts itself and the agreement
- **Where:** LOI 1.4: "A one-time training and supplies fee of $200 per chamber covers staff training" and "Delivery, installation, training, routine maintenance, and support are included in the monthly fee". Schedule 1, "Included in the monthly fee": "staff training". Agreement 3.2: "training for new staff at the rate in Exhibit A".
- **What's wrong:** Training is described as paid by the $200 fee, included in rent, and (under the agreement) billable for new staff.
- **What happens if you don't fix it:** You invite a dispute over the first new-staff training invoice.
- **Fix:** In LOI 1.4 and Schedule 1, say initial training is covered by the $200 fee, refreshers are free, and new-staff training is billed at the Exhibit A rate.

### 34. Brief file paths, file list and version are wrong
- **Where:** Brief 4a: "`../channels/schools-athletic-recovery/PROPOSAL-schools-athletic-recovery.md`". Brief header: "version 6", while the change log's top entry is "v6b". Section 6: "`research/` (raw research JSON, overrides and the compile script)".
- **What's wrong:** No `channels/` folder exists; the file is at `../channel-schools-athletic-recovery/`. The compile script `make_knoxville_list.py` is in `knoxville/`, not `research/`. Section 6 leaves out `google_trends_check.md`, the three legal files, the runbook and the sales training. The v2 log entry still says "once delivered".
- **What happens if you don't fix it:** Links break and readers cannot find the supporting files.
- **Fix:** Correct the path, call the document v6b in the header and index, and list every supporting file in section 6.

### 35. Index and supporting READMEs are stale
- **Where:** `knoxville/README.md`: "Status after two critique rounds: 174 businesses ... 9 verified emails". `hbot_providers.md`: "## Dealers / sellers (none found in East Tennessee)" and "Another 7 PT/chiro/integrative clinics appear only on Fresha". `DOCUMENTS-INDEX.md`: "24 existing chamber operators".
- **What's wrong:** The workbook has 263 prospects and 26 emails. The Marketplace dealer is in Knoxville. The provider sheet has 13 unverified rows and 25 in total. `knoxville/README.md` does not list `google_trends_check.md` or the critique files.
- **What happens if you don't fix it:** Three files give three competitor counts.
- **Fix:** Update the three quoted lines to the workbook figures, and add a "superseded by the workbook" note at the top of `hbot_providers.md`.

## Your call

- **Score versus verdict.** 62 measures market attractiveness and ignores legal blockers. The Wasatch Front's 73 scores regulation 5 ("Home base"), yet the federal blocker and Utah's own fire-official concerns apply there too. The state memo also leaves Utah's Class E pharmacy licence for DME unresearched while bucketing the Utah comparison "No issue found". Decide whether to rescore indicator 9 for both markets or label the score "excludes regulatory feasibility".
- **Indicator 4 direction.** Comparison markets score 2 because they have Restore studios, while Knoxville scores 3 with the note "few studios to place chambers in". The rubric does not say whether supply counts as competition or as placement opportunity.
- **Team-physician protocol as a prescription pathway.** The proposal's signed standing protocol might serve as the "order of such practitioner" under 21 CFR 801.109 for schools. Ask counsel; it could be the cleanest route through the federal blocker.
- **Fire precedent the memos missed.** A search found a 2024 Des Moines hyperbaric appeal and an Idaho Department of Insurance bulletin (B23-01) reading IFC §609 to require ASME PVHO-1. It also found that the NFPA 99 2024 committee removed "for medical applications" from the hyperbaric-facility definition. These are search summaries only, not read. They strengthen the fire-code finding, and Idaho borders Utah.
- **Contact details.** The pamphlets use "(801) 884-2113" and "mlebailie@hotmail.com". The LOI and agreement use "(801) 901-0873" and "hello@purebaric.com". Pick one set.
- **Outside the scope of this review.** Sales training says chamber fires "involved high-pressure hospital chambers". The Troy death was a 2.0 ATA chamber at a wellness clinic, not a hospital. Fix that sentence before a rep says it.

## Checked and it's fine

- **Scorecard arithmetic.** Weighted totals recompute exactly: Knoxville 62, Wasatch Front 73, Phoenix 70, Austin 68, Nashville 60. "62 of 100" is consistent across the brief, market analysis, summary, index and README.
- **Google Trends figures.** 1/6/2, Tennessee 5 vs Utah 11, third of six (Chattanooga 100, Nashville 92, Knoxville 83) and the 55 to 60% arithmetic (8/13, 6/11) match across the brief, market analysis and `google_trends_check.md`.
- **Prospect workbook figures that hold.** 263 prospects, 88 recovery, 42 schools with 10 emails, 21 "Call first", and 8 "Already offer HBOT" match the index and the v5/v6b change log. No prospect row is flagged "Yes" for hyperbaric on its website.
- **Schools targets.** `targets.json` has 53 rows (33 UT, 20 TN), 46 with a named contact and 29 with an email, matching the proposal and brief.
- **Provider prices.** Bell ($125, $100, $800/10, $1,400/20), hospitals ($482 to $497), Marketplace ($4,495, $5,995, Salus $5,500 after 23 weeks) and $5,995 / $529 = 11.3 months all match the workbooks.
- **Price ranges.** Brief section 1 ($529 to $729 home, $783 to $979 business) and LOI Schedule 1 (979/929/881/832/810/783 by term) match `pricing_live.json`. Proposal arithmetic ($8,550 + $200, $2,547 × 10 = $25,470) is correct on its own inputs.
- **Legal facts consistent across documents.** The HME fee ($1,404), the out-of-state eligibility since 2023, the 6 L/min nasal-cannula threshold, 9.25% Knox and 9.75% Blount/Anderson, the K072757 and K220290 descriptions and the *Copeland*/*Childress*/*Blackwell* citations are consistent between the summary and the memos (apart from the items under Fix these). Question counts per memo (9 state, 12 federal/local, fire questions 4 to 7) match the index.
- **LOI terms that match the agreement.** Insurance ($1M/$2M, additional insured), the under-18 rule (parent signs and is present), the late charge, the 2-business-day response and free removal all match the agreement.
- **Files named in the index exist.** All exist under the stated names: legal docx/pdf/README, `pamphlets/README.md`, `research/recovery_resweep.json`, `research/_overrides.json`, `make_knoxville_list.py`, runbook and training (.md/.docx), `targets.json` and `schools_athletic_targets.xlsx`.
- **K072757 database entry.** It shows product code CBF, regulation 868.5470, decision 02/08/2008, applicant Summit to Sea, matching the memo: https://www.accessdata.fda.gov/scripts/cdrh/cfdocs/cfpmn/pmn.cfm?ID=K072757

**Five spot-checks.** Direct fetches of tnsosfiles, Justia, Municode and knoxvilletn.gov returned 403 or empty pages. Where noted, results come from search summaries limited to those primary domains. One §609 search ran without a domain filter and is labelled.

- **(a) HME definition and fee.** Confirmed. Justia's 2024 Tennessee Code § 68-11-201 lists "oxygen care equipment and oxygen delivery systems" as home medical equipment. Subdivision (28) covers anyone who sells or rents for delivery to a Tennessee residence "regardless of the location" of the provider. Rule 0720-30-.02(2)(b), June 2024 revision, sets the annual fee at $1,404, and the HFC application form HF-3639 (Rev. 06/2024) states the same fee. AG Opinion 01-150 also reads the out-of-state language as covering remote sellers; the memo does not cite it. URLs: https://law.justia.com/codes/tennessee/title-68/health/chapter-11/part-2/section-68-11-201/ ; https://publications.tnsosfiles.com/rules/0720/0720-30.20240602.pdf ; https://www.tn.gov/content/dam/tn/hfc/documents/HFC-BLHCF-Home_Med_Equip_Initial_App.pdf ; https://www.tn.gov/content/dam/tn/attorneygeneral/documents/ops/2001/op01-150.pdf
- **(b) Rule 1330-01-.03, 6 L/min nasal cannula.** The threshold is confirmed, but the memo cites a superseded version. The November 2025 compilation keeps "set at less than 6.00 liters per minute ... through nasal cannula only" for concentrators. For high-flow and other equipment, all acts except delivery, repair and maintenance are respiratory care. A November 2025 rulemaking and a March 2026 filing list amendments to the rule; I could not read their text (PDF encrypted or 403). URLs: https://publications.tnsosfiles.com/rules/1330/1330-01.20251113.pdf ; https://www.tn.gov/content/dam/tn/health/healthprofboards/rc/2025.11.06-Respiratory-Rulemaking-Hearing.pdf
- **(c) Knoxville's 2024 IFC and §609's reference to NFPA 99.** Adoption is confirmed; §609 could not be verified. City pages state Knoxville adopted the 2024 IFC beginning January 2025, "with Local Amendments". I could not verify Ordinance O-145-2024 or the §11-21 text because Municode did not render. I could not verify 2024 IFC §609 on a primary source (ICC is outside the allowed domains). An unfiltered search shows California Fire Code 2025 §609.1, which is based on the 2024 IFC: "Hyperbaric facilities shall be inspected, tested and maintained in accordance with NFPA 99". That is consistent with the memo. URLs: https://www.knoxvilletn.gov/government/city_departments_offices/fire_department/fire_marshal_s_office___inspections/current_fire_code ; https://www.knoxvilletn.gov/886/Current-Codes ; https://library.municode.com/tn/knoxville/codes/code_of_ordinances?nodeId=PTIICOOR_CH11FIPRPR (did not render)
- **(d) 21 CFR 801.109.** Confirmed. Paragraph (a) has two conditions: possession by a lawful manufacturer, transporter, storer or wholesale/retail distributor, or by a licensed practitioner; and sale only to, or on the prescription or other order of, such a practitioner. This matches the memo. The standard eCFR URL redirected; the text came from the eCFR renderer API. URLs: https://www.ecfr.gov/current/title-21/chapter-I/subchapter-H/part-801/subpart-D/section-801.109 ; https://www.ecfr.gov/api/renderer/v1/content/enhanced/current/title-21?part=801&section=801.109
- **(e) Knox County combined rate.** Confirmed for Knox County. The Knox County Clerk lists local tax at 2.25% on the first $1,600, plus the 7% state rate, which gives 9.25%. The same page applies the local tax only to the first $1,600 of a single item, which bears on finding 16. I could not verify current Knoxville and Farragut city rates or the Blount/Anderson 2.75% (the DOR map did not render in search). URLs: https://www.knoxcounty.org/clerk/motorvehicle/sales_calculator.php ; https://www.tn.gov/revenue/taxes/sales-and-use-tax/local-sales-tax/local-sales-tax-rates-map.html
