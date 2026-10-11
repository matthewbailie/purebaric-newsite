---
name: market-expansion-research
description: Full new-market research package for Purebaric chamber rentals (market scan and score, legal check, master prospect list, sales assets, critique rounds). Use when the owner asks to evaluate, research or prepare a new city or region for business, school or home rentals.
---

# Market expansion research for Purebaric

This skill reproduces the Knoxville, Tennessee research package of 10 October 2026 for any new area. The finished package is a folder the owner can hand to a sales representative and an attorney: a scored market analysis, a legal blockers memo, a master list of businesses and schools to contact in a set order, a state-specific letter of intent, one pamphlet per industry, a sales training document with industry talk tracks, an outreach runbook, and a documents index. Every document goes through adversarial critique before it is called done.

A human-readable mirror of this skill is kept at `_internal/skills/market-expansion-research/` in the site repo (update the `.claude/skills/` copy first, then mirror it there and to `~/.claude/skills/`). The worked example lives in the site repo at `_internal/research/knoxville-tennessee/` (with `_internal/research/channel-schools-athletic-recovery/` and `_internal/outreach/`). Read its `DOCUMENTS-INDEX.md` first; it shows the finished shape. Every reference file below points at the Knoxville file to copy from.

## Step 0. Intake (ask before doing anything)

Ask the owner these questions in one plain chat message (AskUserQuestion, where available, only for the scope choice), then confirm the answers back. If the owner names a region rather than a point ("the Treasure Valley"), convert it to a centre and radius and confirm the city list. Ask at the same time for the browser access the run needs: Facebook Marketplace requires the owner signed in on their personal profile, and Craigslist, OfferUp and Google Trends need Claude in Chrome; stop and ask rather than sign in yourself.

1. **Area.** The city or metro to research, and the point to measure from (default: the downtown core; record the latitude and longitude).
2. **Distance.** Ask for the radius in miles, and confirm whether the number they gave is a radius or a diameter ("25 miles around downtown" is usually a radius; a 50-mile diameter is a 25-mile radius). Everything downstream uses the radius.
3. **Local contact details** to print on every market-specific pamphlet, letter of intent and training document: name, role (owner, representative or franchisee), phone and email. Never reuse another market's contact details, and never put a hello@purebaric.com address or a Utah phone number on a market pamphlet unless the owner says so.
4. **Scope.** Business placements only, or also schools and athletic programs, or also home rentals. Default for a new state: business and athletic-program placements, air-only configuration, no home rentals until the legal check clears them.
5. **Contracting entity** for that state (Purebaric LLC or Matthew Bailie d/b/a Purebaric) if known; otherwise record it as an open question for counsel and use one name consistently in drafts.
6. **Where the package lives.** Default: `~/Desktop/<Area> Research/` for the working folder, mirrored to the site repo under `_internal/research/<area-slug>-<state>/` and committed. Never write Purebaric files under the Adobe OneDrive path; every path given to a subagent is absolute.
7. **Equipment.** The chamber make, model and 510(k) number, the concentrator make and model, and the standard configuration shipped. The federal memo needs these; Knoxville's package lacked them.
8. **Comparison markets** for the scorecard (default: Wasatch Front plus Phoenix/Scottsdale, Austin and Nashville) and the home-market distance: if the new market is within a day's drive of Lehi, the runbook's freight, storage and local-representative items are scaled down.

**Delivery.** Send files to the owner with the file-sending tool at milestones (workbook after each critique round, the brief at each version, the sales assets once clean), and give absolute paths in the final message; never describe a path the owner cannot open.

Also pull, without asking: live pricing from `https://purebaric.com/api/pricing` (home and business rates by term; save the JSON, it feeds the LOI and pamphlet generators), the current Business Rental Agreement and Liability Waiver (`_internal/outreach/purebaric_business_rental_agreement_and_liability_waiver.docx`), and the rules in `_internal/RUNBOOK.md` section 14 (wellness-only claims; no medical claims without a qualified reviewer). One correction to that section: do not write "not a medical device" in any market document; write "rented as a general-wellness amenity" and refer regulatory questions to the owner (the chambers are cleared prescription devices). Tell the owner the site's own disclaimer has the same problem; do not edit the site.

## The phases, in order

| Phase | Output | Reference |
|---|---|---|
| 1. Setup | Folder tree, area rule (city list inside and outside the circle), research brief, memory note | `reference/01-setup-and-area-rule.md` |
| 2. Market scan and score | Provider inventory workbook, classifieds check, Google Trends check, demographics, scorecard (62-style score out of 100 against the Wasatch Front), executive brief v1 | `reference/02-market-scan-and-scorecard.md` |
| 3. Master prospect list | Per-category research JSON, compile script, overrides, website crawl for existing hyperbaric, two critique rounds, priority-category re-sweep, schools and colleges, download-ready workbook | `reference/03-prospect-list.md` |
| 4. Legal and regulatory check | State memo, federal and local memo, one-page blockers summary with buckets and the question list for counsel and the fire marshal | `reference/04-legal-check.md` |
| 5. Channel proposals (optional) | One proposal per new channel (the schools "Recovery Room" is the template) | `reference/05-sales-assets.md` section 5 |
| 6. Sales assets | State letter of intent, seven industry pamphlets, sales representative training with talk tracks, outreach runbook with ordered waves, documents index | `reference/05-sales-assets.md` |
| 7. Critique rounds | Adversarial critique of every document, fixes applied, response file, owner decisions listed | `reference/06-critique-cadence.md` |
| 8. Packaging | Index updated, folder mirrored to the repo, committed and pushed, files sent to the owner | `reference/07-file-manifest.md` |

Run the agents in batches of three (the shared search budget is 200 calls per turn): B1 provider inventory, gyms, recovery; B2 CrossFit, sports teams, PT and chiropractic; B3 salons, state legal memo, federal and local legal memo (jurisdictions = the three cities with the most rows after B1 and B2); B4 schools, expansion counties, franchise gyms; then compile, crawl, list critique round 1; B5 enrichment x2 and the scorecard (after the inventory, Trends and classifieds exist); then round 2; then the recovery re-sweep. Do Trends, classifieds and demographics in the main session during B1 and B2. Phase 6 needs everything before it. Phase 7 runs at the points in the cadence, and a short independent check runs after the fixes.

## How to work

- **Delegate the searching.** Research and critique run in background subagents (Opus for legal, critique and anything with judgment; Sonnet for list-building), launched from the prompts in `reference/agent-prompts.md`. Give each agent an absolute output path, the exact JSON keys, a search budget (60 to 70 WebSearch calls each; at most three search-heavy agents at once), the rule "never fabricate a fact about a real business; mark unverified items", and the rule to rewrite output files every 8 to 10 records. Paste any rubric or topic list into the prompt; subagents cannot see this skill's files.
- **The owner's standing rules.** Research only until the owner asks for site changes. Wellness-only claims: no treatment, cure, disease, therapy or outcome language anywhere, including pamphlets and scripts. Do not fabricate facts about real businesses. Batch deploys. Never `git add -A` in the site repo. Push with `gh auth switch --user matthewbailie`, then switch back to `bailie_adobe`. End commit messages with the attribution line the session's system reminder gives. A new-market run does not change Utah assets (the Utah agreement, the Utah prospect list, the Utah pamphlets) unless the owner asks.
- **Every number has one source.** Prices come from `/api/pricing` on the day; pamphlet arithmetic is checked by hand; competitor counts come from the workbook's "Already offer HBOT" sheet; prospect counts come from the workbook Summary sheet. When a document quotes a number, say where it came from.
- **Configuration.** For a new state assume air-only (no oxygen concentrator) for business and school placements until counsel and the local fire marshal have answered in writing. Say so in the LOI, pamphlets, training and runbook.
- **Minors.** No under-18 use until Purebaric's insurer confirms coverage in writing; then a parent's signed consent and a parent present, matching the agreement.
- **Consumer and contract law goes into the documents, not just the memo.** The legal check (Phase 4) must cover, at state, county and city level, the rules that touch a rental contract: automatic renewal and recurring-charge disclosure, cancellation methods, refund rights, late fees and interest caps, electronic signatures, liability-waiver enforceability, minors, sales tax on rentals, and any licence for the equipment. Every market legal document (letter of intent, business rental agreement, home rental agreement and waiver, booking terms) then carries the state-specific statements those rules require, in the state version of the document, before it is used. Tennessee's automatic-renewal statute (Tenn. Code Ann. § 47-18-133) is the worked example in `reference/04-legal-check.md`.
- **Verify renders.** Convert, export, render and scan as `reference/tooling.md` describes, and look at every page once.

## Done means

- `DOCUMENTS-INDEX.md` lists every file with a one-line description and the "still open" items.
- Both critique files and the response file exist, and every "Fix" in them is either applied or listed under owner decisions.
- The document scans in `reference/tooling.md` pass (pamphlets, LOI, agreement).
- The workbook Summary sheet, the brief, the README and the index agree on counts.
- The folder is mirrored to the repo, committed and pushed, and the owner has the download links.
- Owner decisions are listed in the final message: contracting entity, state version of the rental agreement, chamber model and 510(k) number, tax treatment, contact details on shared documents.
