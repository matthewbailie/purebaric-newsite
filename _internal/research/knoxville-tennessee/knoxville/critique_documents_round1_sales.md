# Critique, round 1: Tennessee pamphlets, sales representative training, outreach runbook

Reviewed 10 October 2026. Documents under review: the seven Tennessee trifold pamphlets (extracted text), `SALES-REP-TRAINING.md`, `TENNESSEE-OUTREACH-RUNBOOK.md`, `pamphlets/README.md`. Checked against live pricing (purebaric.com/api/pricing), the Business Rental Agreement, the Tennessee LOI, the three legal files, `hbot_providers.md`, the prospects workbook (all four sheets, read with openpyxl) and the schools proposal. Reviewed as a skeptical Knoxville owner, a Tennessee regulator and a plaintiff's lawyer. Research, not legal advice.

**Verdict:**
- **Pamphlets:** Needs work before it goes out. The arithmetic is right. Three claims a Knoxville owner can disprove from a phone search, and the patient and athlete-recovery wording, have to change before printing.
- **Training:** Not ready. The fire objection answer is false, the revenue illustration does not follow from its own assumptions, and one offer line promises a refund the agreement does not give. A representative who uses this script word for word creates liability.
- **Runbook:** Needs work before it goes out. The sequencing logic holds. The clocks, the targets, the budget and about a dozen wave entries do not match each other or the workbook.

---

## Fix these (worst first)

### 1. The fire objection answer is false and understates a known risk
- **Where:** Training, Part 5, objection "Is this safe? I read about chamber fires.": "Those fires involved high-pressure hospital chambers and oxygen in a sealed room. Ours is a soft chamber at low pressure, the oxygen comes from a concentrator with nothing stored..."
- **What's wrong:** The fires an owner has read about were not in hospitals. The January 2025 Troy, Michigan death happened at the Oxford Center, an alternative-medicine clinic that the Joint Commission does not accredit (NBC News, Michigan AG). The federal/local memo (section 10) also lists a 2025 Arizona wellness-clinic death and a 2023 explosion at a Utah wellness spa, in Purebaric's home state. Raleigh, Charlotte and Durham shut down mild soft-chamber wellness services in 2022 on fire-code grounds (memo section 6). Your own agreement, Section 7.1, lists "fire risk associated with oxygen-enriched environments" as a risk that "cannot be eliminated". The answer also describes the concentrator, which Tennessee placements will not include.
- **What happens if you don't fix it:** An owner relies on a false safety statement to sign. After any incident, a plaintiff argues fraudulent inducement. The agreement's release (8.2) and liability cap (10.3) both exclude fraud, so the false statement removes the protection the agreement is built on.
- **Fix:** Replace the answer with: "Chamber fires have happened, including at wellness clinics, and that is why we take it seriously. In Tennessee we place the air-only configuration with no oxygen enrichment, the safety rules ban flame, heat, oils and electronics in the chamber, a trained staff member starts and ends every session, and nothing is installed until your fire marshal, landlord and insurer have had the chance to say no."

### 2. The training's revenue illustration does not follow from its own assumptions and contradicts the pamphlet
- **Where:** Training, Part 1, "The revenue illustration": "Break-even is about 13 sessions a month at the $979 rate... Forty sessions a month net roughly $2,850 after the rental; eighty net roughly $6,700; one hundred and twenty net roughly $10,500." Repeated in 6.2 Proof: "forty sessions nets about $2,850".
- **What's wrong:** At the stated $73.70 per session net: 40 sessions = $2,948, minus $783 = $2,165 (minus $979 = $1,969). 80 sessions = $5,896, minus $783 = $5,113. 120 sessions = $8,844, minus $783 = $8,061. The training overstates net by $685, $1,587 and $2,439 even at the cheapest rate. Break-even at $979 is $979 / $73.70 = 13.3, so 14 sessions, not 13 (15 with Knox County tax). The pamphlet the representative hands over says 104 sessions nets $6,882, while the training says 80 sessions nets $6,700. The owner sees two numbers that cannot both be true.
- **What happens if you don't fix it:** The representative quotes inflated figures that no stated assumption supports. Section 10.2 of the agreement ("not relying on any revenue projection") is weaker against a Tennessee Consumer Protection Act claim (§ 47-18-104(b)(5)) when the projection itself is wrong on arithmetic.
- **Fix:** Replace the paragraph with the pamphlet's table (52, 104, 156 sessions at $75; $783 rental; $1.30 supplies) and correct break-even to "about 11 sessions at $783, about 14 at $929 or $979, one more with sales tax."

### 3. The pamphlet's "Light" usage tier is five times the runbook's own success bar
- **Where:** All six revenue pamphlets, "The Numbers": "Light: 2 a day 52 $3,900 / Moderate: 4 a day 104 $7,800 / Strong: 6 a day 156 $11,700" and "Example: moderate usage ... Net revenue each month $6,882". Runbook, Section 1: "Sessions per chamber per month, by month 2: 10 or more".
- **What's wrong:** Purebaric's internal success target is 10 sessions a month. The pamphlet calls 52 a month "Light" and builds its worked example on 104. Nothing in the research supports four sessions a day at a new amenity; the only local data point is one chiropractor with a waitlist and no published volume. "Net revenue" excludes the sales tax the same panel says applies ($783 x 9.25% = $72.43, so $6,810 in Knox County), card processing, and 26 staff hours a month (104 x 15 minutes).
- **What happens if you don't fix it:** In a dispute, the runbook is discoverable. It shows Purebaric expected 10 sessions while telling owners 52 was the low case. That is the core of a deceptive-projection claim, and the disclaimer "illustrations, not guarantees" does not cure it under FTC guidance ("a disclaimer won't cure an otherwise deceptive ad").
- **Fix:** Relabel the tiers "1 a day (26), 2 a day (52), 4 a day (104)", base the worked example on 2 a day ($3,900 - $783 - $68 = $3,049), and rename "Net revenue" to "Revenue after rental and supplies, before tax, card fees and staff time".

### 4. The representative is told to promise a refund the agreement does not contain
- **Where:** Training, 6.1 Offer: "If it doesn't pay for itself by month two we take it out at no charge."
- **What's wrong:** The agreement has no performance-based exit. Section 2.4 allows ending on 30 days' notice, Section 2.3 makes the $200 fee non-refundable, Section 10.2 says no revenue promise was made, and Section 11.8 says the written agreement supersedes all discussions. "Pays for itself" is a revenue guarantee, which Part 1 forbids ("never a forecast"). On a three-month rate, an exit in month two also breaks the term the $929 rate depends on.
- **What happens if you don't fix it:** An owner who exits in month two and is billed the $200, prorated rent or the $979 rate difference claims an oral promise. Purebaric either honors a term it never wrote or fights a customer over its own representative's words.
- **Fix:** Delete the sentence. Use: "You can end it with 30 days' notice and we remove it at no charge."

### 5. Term pricing has no term in the contract
- **Where:** Pamphlets, "What it costs you": "Chamber rental: from $783 a month on a 12-month term ($929 on 3 months)". Training, 6.1: "Three months at $929, first month and $200 fee before install, 30 days' notice to end." Training, Part 2: "Definitive Agreement... Month to month, 30 days' notice".
- **What's wrong:** The agreement's Exhibit A shows $979 and "Minimum term: None (month to month; 30 days' notice to end)". If any business can leave on 30 days' notice, every business picks the $783 twelve-month rate and leaves when it likes. The training tells the representative to quote a three-month rate and a 30-day exit in the same sentence. The LOI (1.3, 1.9) allows a minimum term but the agreement has no early-termination charge.
- **What happens if you don't fix it:** Purebaric gives away the $196-a-month difference between $979 and $783 with no commitment behind it, or argues later about what "12-month term" meant.
- **Fix:** Add one line to Exhibit A and the training: "The rate is fixed for the initial term; ending before the term ends converts past months to the rate for the term actually completed."

### 6. Three statements about Knoxville competitors are untrue
- **Where:**
  - Physical therapy and chiropractic pamphlet, "Why It Makes Money for You": "Stand out. Only one practice in the Knoxville area offers chamber sessions today."
  - Recovery studios pamphlet: "Be first in Knoxville. Almost no studio in the area offers a chamber; yours can be the one clients drive to."
  - Training, 6.6 Proof: "The one Knoxville chiropractor who offers it charges $100 to $125".
  - Runbook, Wave 1 row 6 (Vibrance): "Performance and recovery IV in Oak Ridge, a market with no recovery competition".
- **What's wrong:** The workbook's "Already offer HBOT" sheet lists eight, including Bell Family Chiropractic, The Functional Medicine MD (an IV and functional-medicine clinic with a full "Hyperbaric Therapy" menu), The Osteopathic Center and ThermoDynamic Health. `hbot_providers.md` adds KnOxygen (self-pay clinic, Lenoir City) and Redeem Chiropractic. ThermoDynamic Health is a recovery studio with a chamber at 142 Fairbanks Rd, Oak Ridge, the same town the runbook calls free of recovery competition; the runbook's own next paragraph names it. A studio cannot "be first in Knoxville."
- **What happens if you don't fix it:** The first owner who searches "hyperbaric Knoxville" finds Bell, The Functional Medicine MD and ThermoDynamic in a minute, and stops trusting the numbers on the next panel. A false "only one" claim is also a TCPA (b)(5) exposure in its own right.
- **Fix:** Pamphlets: "Few Knoxville businesses offer chamber sessions, and almost none of them are gyms or studios." Training 6.6: "The one local wellness provider that publishes prices charges $100 to $125." Runbook row 6: "Oak Ridge has one recovery studio with a chamber (ThermoDynamic Health); Vibrance would be the second."

### 7. "Not a medical device" misstates the FDA position your own memo reaches
- **Where:** All seven pamphlets, back-panel disclaimer: "As offered here it is not a medical device and is not intended to diagnose, treat, cure or prevent any disease." Training, Part 2, Prescription status: "Do not discuss FDA status with customers beyond 'we rent it as a wellness amenity, not as a medical device or treatment'."
- **What's wrong:** The federal/local memo (section 1) finds the chambers are Class II, prescription-only devices (K072757, K220290), that the general-wellness policy covers only low-risk products FDA does not actively regulate, and that "the 'not a medical device' disclaimer therefore probably does not take the product out of FDA's reach." The chamber in the owner's room carries an Rx-only label that contradicts the pamphlet. The training then tells the representative to deflect any question about it.
- **What happens if you don't fix it:** An owner, inspector or plaintiff reads the label on the device and the pamphlet side by side. The pamphlet becomes evidence of a misleading statement, and the deflection instruction reads as concealment.
- **Fix:** Pamphlet: "Purebaric rents this equipment as a general-wellness amenity. It is not offered to diagnose, treat, cure or prevent any disease." Training: if asked, "The chamber model is FDA-cleared as a prescription device for a different use. We rent it as a wellness amenity, and Matthew can answer regulatory questions directly."

### 8. The athlete pamphlets imply recovery and performance outcomes
- **Where (exact sentences):**
  - CrossFit pamphlet cover: "A Recovery Room for Your Athletes" and "Your athletes already believe in recovery."
  - CrossFit, "Who books sessions?": "Athletes in a competition block: Open, qualifier and meet prep, when recovery sessions sell themselves."
  - CrossFit: "Members over forty who book recovery more than anyone else in the box."
  - Gyms pamphlet: "Weekend competitors: Race, tournament and league athletes in the days before and after an event."
  - Sports clubs pamphlet: "A player amenity that signals you take recovery seriously."
  - Recovery studios pamphlet: "Athletes and weekend competitors: Pre- and post-event sessions sold as a package." and "Pair a drip with a session as a recovery bundle."
  - High schools pamphlet cover: "A Recovery Room for Your Athletic Program".
- **What's wrong:** The FTC guidance summarized in the federal memo (section 3) names "recovery" that suggests injury treatment and "athletic-performance claims without RCTs" as claims needing substantiation. Timing a session before and after competition, and pairing it with an IV drip, implies a physiological effect. Your schools proposal (section 1, source 21) cites a 2024 randomized trial in which a one-hour session "did not significantly change recovery markers." Purebaric holds evidence against the implied claim.
- **What happens if you don't fix it:** A regulator reads "pre- and post-event" plus "recovery bundle" with an IV as a performance and recovery claim. Purebaric has no substantiation and has a trial in its own files that cuts the other way. The agreement makes the business responsible for its marketing, but Purebaric wrote this text.
- **Fix:** Keep "recovery routine" only in the memo's safe form ("a calm hour in a recovery routine"). Delete "in the days before and after an event", "pre- and post-event", "when recovery sessions sell themselves" and "recovery bundle". Retitle the CrossFit and schools covers "A Quiet Hour Your Athletes Will Book".

### 9. The physical therapy pamphlet sells the chamber to "patients" inside a care relationship
- **Where:** Physical therapy and chiropractic pamphlet: "Keeps patients coming in. A weekly session between episodes of care keeps the relationship active." / "Patients between episodes of care: A reason to keep coming in once the treatment plan ends." / banner "CHAMBER RENTALS FOR PHYSICAL THERAPY, CHIROPRACTIC AND SPORTS MEDICINE".
- **What's wrong:** A licensed practitioner offering a pressurized session to its patients, framed around "episodes of care" and "the treatment plan", is the fact pattern closest to "professes to treat" under § 63-6-204. The Tennessee memo (Topic 5) notes that the more Purebaric looks like a health-care service, the weaker its release under *Copeland*. The panel's own line "never touches billing or a treatment plan" is contradicted two sentences later. The banner puts "THERAPY" on the pamphlet, which the training's Part 3 forbids "including on the pamphlet."
- **What happens if you don't fix it:** The pamphlet that most needs to stay non-clinical is the most clinical one. A chiropractor following it will put the chamber in front of injured patients.
- **Fix:** Replace "patients" with "clients" throughout, delete "between episodes of care" and "once the treatment plan ends", and retitle the banner "CHAMBER RENTALS FOR CHIROPRACTIC AND WELLNESS PRACTICES".

### 10. The training approves a sleep claim
- **Where:** Training, Part 3, Say column: "'Some clients tell us they sleep well after a session.' (only as a reported experience, never as a promise)".
- **What's wrong:** FTC guidance (federal memo section 3) says testimonials cannot carry a claim the advertiser could not substantiate directly. The Tennessee memo's open question 9 asks counsel whether "sleep" marketing risks "professes to treat." Purebaric has no Knoxville clients, so "clients tell us" is either Utah anecdote or invented.
- **What happens if you don't fix it:** The representative repeats it, the owner puts "clients sleep better" on the menu, and the approved line is the source.
- **Fix:** Move the sentence to the Do not say column.

### 11. The schools pamphlet markets under-18 varsity use that the proposal calls unworkable, and the clubs pamphlet drops the insurer condition
- **Where:** High schools pamphlet, "Who books sessions?": "Varsity athletes in season: Run by your athletic trainer under the team physician's protocol." / "Athletes under 18: Only with a parent's signed consent and a parent present for the session." Sports clubs pamphlet: "Academy and youth athletes: Only with a parent present and the program's medical approval."
- **What's wrong:** High-school varsity athletes are mostly minors. The schools proposal (section 2) says the parent-present rule "makes ordinary team use by a high school unworkable." A parent cannot waive a child's claims in Tennessee (*Childress*, *Blackwell*), and the runbook (Section 8) bars under-18 use without the insurer's written confirmation, which does not exist yet. The schools pamphlet at least lists insurer confirmation as a pre-start step; the clubs pamphlet omits it, omits the parent signature that Agreement 4.4 requires, and adds a "medical approval" condition that appears in no agreement. The "team physician's protocol" framing turns a wellness amenity into a physician-directed modality, which contradicts "not a medical treatment" on the same pamphlet.
- **What happens if you don't fix it:** Purebaric hands out a document promoting minor use before it has insurance for minors, and a school relies on it.
- **Fix:** Until the insurer confirms in writing, print the schools pamphlet for colleges only (adult athletes) and change the clubs line to "Adult players and members. Youth use only after written insurer approval, with a parent's signed consent and a parent present."

### 12. Air-only placements, masks, and an oxygen price anchor
- **Where:** Six pamphlets: "Masks and cleaning supplies: about $1.30 per use" and "Masks and cleaning (104 x $1.30) - $135". Recovery studios pamphlet: "a fresh mask per client". Training Part 1: "At $75 per session with a 1.30 card fee". Training Part 1, The product: "in the standard configuration, a 10-litre oxygen concentrator that delivers 95 to 99 percent oxygen through a mask". Pamphlet price anchor: "Single session (60 min) $100 - $125".
- **What's wrong:** The mask delivers oxygen from the concentrator. Tennessee placements are air-only (training Part 8, runbook Section 8), so a per-client mask cost suggests oxygen is part of the session. The training calls the same $1.30 a "card fee"; the pamphlet calls it masks and cleaning; neither includes real card processing. Only the schools pamphlet tells the owner the placement is air-only; the others say "configuration is confirmed at the site check." The $100 to $125 anchor is Bell Family Chiropractic's oxygen session ("hyperbaric-oxygen-therapy-knoxville" page); $125 is a first visit that includes a consultation (`hbot_providers.md`).
- **What happens if you don't fix it:** An owner prices an air-only session against an oxygen session, then learns at the site check that there is no oxygen. That owner feels misled, and the $75 assumption loses its anchor.
- **Fix:** In the six pamphlets, change the line to "Cleaning supplies and liners: about $1.30 per use", add "Knoxville placements are air-only (no oxygen enrichment)" to the cost panel, and footnote the anchor "an oxygen-enriched session at a chiropractic office; $125 is a first visit with consultation." In the training, call $1.30 "supplies" and describe the Tennessee product as air-only first.

### 13. "This month" contradicts the runbook's timeline
- **Where:** Recovery studios pamphlet cover: "Add a sixty-minute chamber session this month, with nothing to purchase." Training 6.5 Opener: "a chamber is the one recovery amenity you can add this month without buying anything."
- **What's wrong:** Runbook Phase 0 takes weeks 1 to 4 and Phase 2 adds 14 to 21 days per prospect. LOI Section 3 makes installation conditional on registrations, insurance, counsel and fire code. Training Part 8 says "do not promise an install date until the runbook's Phase 0 is complete."
- **What happens if you don't fix it:** The first promise an owner hears is one Purebaric cannot keep.
- **Fix:** Replace "this month" with "without buying anything" in both places.

### 14. The liability answer misdescribes the agreement and claims insurance Purebaric does not have yet
- **Where:** Training, Part 5, "What about liability?": "...and we carry our own. The agreement puts the equipment on us and the sessions on you, which is the same split you have with any equipment lease." Training Part 2, COI: "Most businesses already carry this; the broker adds the additional insured in a day."
- **What's wrong:** The agreement does more than split equipment and sessions. Section 8.1 has the business release Purebaric even for Purebaric's own ordinary negligence, and Section 9.2 has the business indemnify Purebaric "regardless of whether a Released Party is alleged to have been negligent." Purebaric's Tennessee coverage is unconfirmed (runbook Phase 0 item 4; federal memo question 12). Whether a gym's standard CGL covers hyperbaric sessions is unverified; the schools proposal notes insurers disputed coverage in the Troy death suit.
- **What happens if you don't fix it:** *Copeland* weighs clarity and bargaining power. A representative who described the release as an ordinary equipment split hands the plaintiff an argument that the business did not understand what it signed.
- **Fix:** "The agreement asks you to release and indemnify us broadly, including for our ordinary negligence; please have your attorney and your insurance broker read it, and confirm with your broker that your policy covers chamber sessions."

### 15. The contracting party does not match the entity being registered
- **Where:** Training Part 2, COI: "naming Matthew Bailie d/b/a Purebaric as additional insured". Runbook Phase 2 step 3: "additional insured: Matthew Bailie d/b/a Purebaric". Runbook Phase 0 item 5: "Tennessee Secretary of State certificate of authority for the LLC".
- **What's wrong:** The runbook registers an LLC in Tennessee, the memos are addressed to "Purebaric LLC (Utah)", but the training, runbook, LOI and agreement contract and insure in Matthew Bailie's personal name as a sole proprietor. A certificate of authority for the LLC does nothing for a contract signed by an individual.
- **What happens if you don't fix it:** Claims run against Matthew personally, and the LLC registered in Tennessee is not the party doing business there.
- **Fix:** Decide the contracting party with counsel in Phase 0 and use one name (for example "Purebaric LLC") in the LOI, agreement, COI requirement, training and runbook.

### 16. Owners see three different sets of contact details
- **Where:** Pamphlets: "(801) 884-2113 | mlebailie@hotmail.com". Tennessee LOI and agreement header: "hello@purebaric.com · (801) 901-0873". Runbook Phase 0 item 6: "An 865 phone number forwarding to the representative... the facility pamphlet reprinted with Tennessee wording ('recovery session', tax line, Knoxville contact)." Training Part 4 step 2: "leave the one-page pamphlet with your cell number". Training Part 9: "Pamphlet (facility partnership), beauty-client pamphlet (salons)".
- **What's wrong:** Training Part 7 sends the LOI the same day as the pamphlet, so the owner receives a second phone number and the hello@ address the README says was removed. The pamphlets carry no 865 number and no representative contact, and they say "chamber session", not the "recovery session" wording the runbook requires. The pamphlets are trifolds, not one-page, and the two pamphlet names in Part 9 do not exist; there are seven industry pamphlets.
- **What happens if you don't fix it:** Owners call the wrong number, and the representative has no pamphlet with their own contact to leave.
- **Fix:** Put (801) 884-2113 and mlebailie@hotmail.com in the LOI and agreement headers, decide whether the 865 number goes on the pamphlet, and rewrite Part 9 to list the seven pamphlets by industry.

### 17. The training points the representative at a schools proposal that contradicts the pamphlet and Tennessee rules
- **Where:** Training, 6.4 Pitch angle: "The 'Recovery Room' proposal in the schools channel folder". 6.4 Proof: "The proposal document".
- **What's wrong:** The proposal prices the pilot at "$950" with "3 chambers: $8,550 + $200 = $8,750"; live pricing and the pamphlet say $929 for one chamber. It offers "a QR code for athletes' families to rent for home", summer "home rentals", and NIL deals that "trade posts for home-chamber access". Home rentals are out of scope in Tennessee (runbook Section 1 and 8; training Part 8). It requires a licensed athletic trainer "in the room" and a "quarterly refresher"; the pamphlet says "staff stay on the premises" and "Training for your athletic trainer and two staff."
- **What happens if you don't fix it:** A school receives two prices and a home-rental offer Purebaric cannot fulfil in Tennessee.
- **Fix:** Tell the representative to use the schools pamphlet only, and mark the proposal "Utah draft, not for Tennessee distribution" until it is updated to $929, one chamber, and no home-rental or NIL terms.

### 18. The training hands owners a reason to buy instead of rent, and quotes home rates Purebaric cannot offer in Tennessee
- **Where:** Training Part 5, "Can I buy one instead?": "You can buy a new one for about $5,000 to $6,000 plus the concentrator". Training Part 1: "Home rental rates run from $729 for one month to $529 at twelve months. You will be asked; know them, because the household price is what a member compares the session price to."
- **What's wrong:** `hbot_providers.md` shows new soft chambers from $7,995 (Summit to Sea Shallow Dive) to $9,995 (Hyperbaric Recoveries); nothing in the research supports $5,000 to $6,000. If the script's figure were true, twelve months at $783 ($9,396) costs more than buying. Telling a gym owner that a member can rent a chamber at home for $529 a month also argues against the owner's own sessions (eight sessions at $75 is $600), and no Tennessee member can rent one.
- **What happens if you don't fix it:** The representative argues the owner out of renting, and invites home-rental requests Purebaric must refuse.
- **Fix:** Replace the purchase answer with "New soft chambers run about $8,000 to $10,000 before the compressor, service and training; renting lets you test demand first." Delete the home-rate paragraph from the Tennessee material.

### 19. The runbook's clocks and targets do not line up
- **Where:** Runbook Section 1: "Success looks like this within 120 days of the first outreach call", "Renewals at the end of the first term: 2 of 3". Section 6: "Week 8: First six LOIs targeted" and "Week 16 (day 120): Score against Section 1." Section 3: "move to the next wave only when the current wave's named prospects have each had three touches". Section 5: "Three touches per named prospect over three weeks". Training Part 4: "A good week is forty visits... and one LOI."
- **What's wrong:** Outreach starts in week 5, so 120 days from the first call is about week 22, not week 16. The earliest installs land around week 12; a three-month first term ends around week 25, so "renewals at the end of the first term" cannot be scored at week 16, and "sessions by month 2" cannot be scored before week 20. Week 8 is four weeks into outreach; at the training's own one LOI in a good week, the maximum is four, not six. Three weeks per wave across waves 1 to 3 alone is nine weeks, longer than Phase 1's eight. The training's forty visits a week does not match the runbook's three walk-in days at 8 to 12 visits (24 to 36).
- **What happens if you don't fix it:** The day-120 decision is made on metrics that cannot exist yet, and week 8 reads as failure when the plan is on pace.
- **Fix:** Count every milestone from the first outreach call, move the decision to day 120 of outreach (about week 21), set week 8 at three LOIs, and score renewals at a separate day-180 checkpoint.

### 20. The $15,000 budget has no line items
- **Where:** Runbook Section 1: "Fully loaded cost of the phase (freight, local labour, legal, travel): Under $15,000". Section 2 item 9: "Budget freight at the actual quote; do not estimate." Section 7 lists the categories.
- **What's wrong:** No figure supports the cap. The representative is "commission plus day rate" with no rate stated. As an illustration, $150 a day for four days a week across weeks 5 to 16 is $7,200, leaving $7,800 for Tennessee counsel on 21 open questions (9 state plus 12 federal and local, not "twelve" as item 1 says), the insurance endorsement, freight for three kits, storage, the $300 minimum registration, franchise and excise tax, printing and Matthew's travel. I could not verify counsel or freight costs, but a health-care regulatory opinion is the item most likely to exceed the remainder.
- **What happens if you don't fix it:** The phase runs over before week 12 and the day-120 review compares actual spend to a number nobody built.
- **Fix:** Get the counsel quote and the freight quote in week 1 and write the budget as line items before committing to $15,000.

### 21. Phase 0 leaves out Farragut, has no rule for silence, and lets the representative run sessions
- **Where:** Runbook Phase 0 item 2: "Email the City of Knoxville Fire Prevention Bureau and the Knox County Fire Prevention Bureau... Ask Maryville and Oak Ridge only if a prospect there reaches the LOI stage." Item 8: "Ship one chamber to them for demonstrations". Training Part 5, "I'll think about it": "Offer a session at an existing placement. Set the date."
- **What's wrong:** Farragut adopts its own codes (edition not verified, federal memo section 6) and holds a large share of wave 1 (Stretch Fusion, Prime IV Farragut, Rocky Top Vitality, SweatHouz, Anytime Fitness Farragut). Item 2 only requires asking; the week 4 decision covers a block but not a fire marshal who has not answered. No Knoxville placement exists to offer a session at. Demonstration sessions on the representative's chamber make Purebaric the session operator, before its Tennessee insurance is confirmed, and stock at the representative's home may create a "physical location" (federal memo question 8).
- **What happens if you don't fix it:** Purebaric installs in Farragut without asking its fire official, and its first Tennessee session is run by Purebaric itself with no confirmed coverage.
- **Fix:** Add the Town of Farragut to item 2, add "no reply by week 4 means no outreach until there is one", and limit the demonstration chamber to staff familiarization until insurance is bound.

### 22. Runbook wave entries that do not match the workbook
- **Where and what's wrong (each checked against the Prospects, Already offer HBOT and Dropped sheets):**
  - Section 3: "The list has 210 prospects." The Summary sheet and the Prospects sheet both total 263.
  - Wave 1 row 4, BioworX: "107 five-star reviews". The workbook says "5.0 rating from 107 reviews", "only a Lantern directory listing; no own site found", "treat as unverified/chain-like", and its phone appears on a Peak IV listing. `hbot_providers.md` lists bioworX as checked with no chamber. It is ranked fourth with no confirmed existence or owner.
  - Wave 1 row 6, Vibrance: the workbook says the booking page "still shows an Opening Soon banner" and "Jennifer... is not confirmed as owner." The runbook does not flag either.
  - Wave 1 row 2, Vital Hydration: "owner is a nurse... likes press". The workbook says "CEO title... ownership stake unconfirmed" and contains nothing about liking press. Its address (10932 Murdock Dr, 37932) is Hardin Valley, cluster B, not A.
  - Wave 1 row 9, Prime IV: "(865) 200-4070" for both locations. The Knoxville row has no phone, and the Farragut row also sits on the Dropped sheet ("DROPPED after the adversarial critique").
  - Wave 1 row 10: Smoky Mountain Hydration is "UNVERIFIED" and "one Yelp snapshot shows it as closed." Knox Aesthetics shares its address and phone with the dropped Knox Wellness row (dropped for "reputation risk"), offers "ketamine" and "chelation", and Knox Wellness appears in `hbot_providers.md` as an unverified chamber listing.
  - Wave 2 row 4, CrossFit Knoxville: cluster "C". The address is 9311 Kingston Pike, 37922, which is cluster A.
  - Wave 2 row 6: TITLE Boxing has "no street address or phone anywhere. Not callable as is" and hosts Rock Steady Boxing for people with Parkinson's, a disease population. Anytime Fitness Farragut has no phone and changed owners in October 2024; the "Club Platinum" award the training's 6.1 opener congratulates them on was the prior owners' (2023 results). The Heifner Workout Anytime clubs are listed for sale on BizQuest, which undercuts "can place more than one."
  - Wave 3 row 4: "116 five-star reviews". The workbook says "rated 5/5 across 116 Google reviews."
  - Wave 5: Christian Academy of Knoxville is listed among schools "that have an email on record". The workbook has no email for it.
  - Ranking logic: "businesses... that have a named owner". Wave 1 rows 4, 6, 7 and 9 have no named owner in the workbook.
  - Training 6.3 opener: "Drew, the One Knox Collective is impressive". The One Knox Collective is the youth arm (its row is on the Dropped sheet), so the opener leads a pro-club pitch with the under-18 program the rules say to approach last.
- **What happens if you don't fix it:** The representative walks into a business that may not exist, quotes a wrong owner, or congratulates new owners on the old owners' award.
- **Fix:** Drop BioworX, Smoky Mountain Hydration, Knox Aesthetics and TITLE Boxing from the waves until verified, mark Vibrance and Rocky Top Vitality "confirm open", correct the clusters and counts, and change the 6.1 and 6.3 hook examples.

### 23. The training's tax list misses a county in the waves
- **Where:** Training Part 1: "add sales tax to every quote (9.25 percent in Knox County, 9.75 percent in Blount and Anderson counties)."
- **What's wrong:** Wave 4 includes Carson-Newman in Jefferson City, Jefferson County, which is 9.75% (7% plus 2.75%, verified by web search). The federal memo also flags that Tennessee guidance conflicts on whether the local portion applies to every monthly payment or only the first (single-article cap, question 11), so "add 9.25 percent to every quote" may overcharge.
- **What happens if you don't fix it:** A wrong rate on a quote to a college, and possible over-collection on every invoice.
- **Fix:** Add "9.75 percent in Jefferson County; confirm any other address on the Department of Revenue lookup" and "tax treatment of monthly payments pending counsel."

### 24. "Training included" and "$200 training fee" on the same pamphlet
- **Where:** All seven pamphlet covers: "Staff training and runbook included". Inside: "Training and initial supplies: one-time $200 fee."
- **What's wrong:** The agreement (Exhibit A) and LOI (1.4) charge the $200 for "staff training and initial supplies." The cover says training is included.
- **What happens if you don't fix it:** An owner points to the cover when the $200 invoice arrives.
- **Fix:** Change the cover line to "Staff training, runbook and refreshers".

### 25. A two-business-day service promise with no local technician
- **Where:** Pamphlets: "Equipment service. We maintain the chamber and compressor and respond within two business days." / "If something is not working, we fix it." Runbook Phase 0 item 8: one representative "who can also deliver, install and service."
- **What's wrong:** Agreement 6.1 promises a response in two business days and reasonable efforts to repair in seven, with proration as the sole remedy. The runbook relies on one contractor for sales, installs and service, and equipment ships from Lehi. If that person is unavailable, nobody in Tennessee can respond. "We fix it" is unqualified.
- **What happens if you don't fix it:** The first breakdown during a representative's absence breaks a written promise at a pilot site.
- **Fix:** Add a named backup service contact to Phase 0, and change "we fix it" to "we repair or replace it."

---

## Your call

- **The hotmail address.** mlebailie@hotmail.com is the required contact, and it is on every pamphlet. A Knoxville owner may read a hotmail address on a business pamphlet as a small operation. A purebaric.com mailbox other than hello@ would fix that.
- **"Purebaric chambers are in use in homes"** on every cover. It is true, but Tennessee home rentals are out of scope. Owners and members will ask for one.
- **"A season of chamber rental costs less than one travel tournament"** (schools pamphlet). A four-month season at $929 to $979 plus tax is about $4,000 to $4,300. I could not verify travel-tournament costs.
- **"Standard in elite programs"** (training 6.3) and "Elite programs run chambers" (6.2). The proposal confirms eight college programs and not Tennessee's. Implied athlete endorsements carry the performance claim the claims rules forbid.
- **Public schools and indemnity.** The agreement's indemnity (Section 9) may be unsignable by a Tennessee public school; the proposal says this was not researched.
- **LOI Section 3(a)** requires city and county business licences before installation, while the federal memo says an out-of-state business with no location generally cannot get one. Choose whether the LOI or the runbook's item 5 wording governs.
- **"Published 2026 prices"** (pamphlet footnote). `hbot_providers.md` cites Bell's page from search snippets and does not date it. Drop "2026" unless someone confirms the page date.
- **Twenty-eight weight-loss, hormone and testosterone clinics as fill-ins** (runbook). They are medical practices with the highest claims risk on the list. Consider leaving them out of the pilot.

---

## Checked and it's fine

- **Live pricing.** The training's rate table matches `pricing_live.json` exactly: 1 to 2 months $979, 3 months $929, 4 to 5 $881, 6 to 8 $832, 9 to 11 $810, 12 $783. Home rates $729 (1 month) to $529 (12 months) match. Pamphlet rates ($783 on 12 months, $929 on 3) match.
- **Pamphlet arithmetic.** 26 days x 2, 4, 6 = 52, 104, 156 sessions. 52 x $75 = $3,900; 104 x $75 = $7,800; 156 x $75 = $11,700. 104 x $1.30 = $135.20, shown as $135. $7,800 - $783 - $135 = $6,882. Eight 60-minute sessions plus 15 minutes of staff time each fit a 10-hour day.
- **Per-session net and 12-month break-even.** $75 - $1.30 = $73.70. $783 / $73.70 = 10.6, so 11 sessions (pamphlet "About 11" holds before tax; 12 with tax).
- **Sales tax.** 9.25% Knox County (Knoxville, Farragut) and 9.75% Blount and Anderson match the federal memo's reading of the Department of Revenue map. Jefferson County 9.75% verified separately.
- **Price anchors.** $100 session, $125 first visit, 10 for $800 ($80 each), 20 for $1,400 ($70 each) match Bell Family Chiropractic in `hbot_providers.md`. "A hospital-run session is several hundred dollars" matches the $482 and $497 MDsave prices.
- **Contact details on the pamphlets.** All seven show (801) 884-2113, mlebailie@hotmail.com and purebaric.com. None shows hello@purebaric.com or mentions Utah.
- **Banned words in the pamphlets.** No "HBOT", "oxygen therapy", "heal", "inflammation", "detox", "immunity" or "sleep". The only "therapy" is the physical therapy industry banner (finding 9). The only "oxygen" is the schools pamphlet's "No oxygen enrichment".
- **Pamphlets against the agreement.** COI $1,000,000 per occurrence and $2,000,000 aggregate (training) matches Section 5.3 and the LOI. Consent retention for four years matches 4.3. Two-business-day response matches 6.1. Free refreshers match 3.2. The pamphlet in the business's brand matches 1.2(e). Delivery and installation included, and the $200 fee, match Exhibit A. Removal at no charge matches 2.4. The schools pamphlet's under-18 rule (parent's signed consent and presence) matches 4.4.
- **Safety and technical facts.** The training's contraindication list matches Exhibit C. 1.3 to 1.5 ATA as about 10 to 16 feet underwater is correct (0.3 to 0.5 atm at about 33 feet per atmosphere). The runbook's walk-away triggers and out-of-scope list (no Tennessee home rentals, air-only default, fire-marshal inquiry before outreach) match `legal_blockers_summary.md`.
- **Wave contacts that matched the workbook.** Sauna House (Osickey, knoxville@saunahouse.com, (865) 284-2653), Drip into Wellness (McCrossin, (865) 214-6064), RevitalyzeMD (Durst, (865) 293-5828, March 2026 Deane Hill opening), StretchLab Bearden (bearden@stretchlab.com, (865) 541-0833), Stretch Fusion (Becker, (865) 599-3786), D1 Training (Driscoll, 865-622-7117), Be Somebody (Kitts, (865) 323-6393), Athletic Republic (Scott, (865) 855-3278, 18,000 sq ft), CrossFit Knoxville (LeGault, (865) 356-9000, 4.9 on 121), Scott Chiropractic, Marino Physiotherapy, John's Chiropractic, Balanced You, One Knoxville SC (drew@oneknoxsc.com), Ice Bears (Feather, (865) 525-7825), Smokies ((865) 286-2300), all five colleges (Massey, Petz, Wolfe, Evans, McVeigh with matching emails and phone), and the wave 5 names and emails (Gill, Surlas, Shinlever, Dodgen, Robl, Gaddis). Webb's TOA trainer coverage is in the workbook. The re-sweep's 88 recovery rows match; the workbook attributes 53 rows to the re-sweep file against the runbook's 54.
- **Competitor sheet use.** No business on the Already offer HBOT sheet appears in a wave, and Bell is correctly listed as a referral call, not a placement.
