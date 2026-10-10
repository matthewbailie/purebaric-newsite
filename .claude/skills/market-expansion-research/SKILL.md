---
name: market-expansion-research
description: Full new-market research package for Purebaric chamber rentals (market scan and score, legal check, master prospect list, sales assets, critique rounds). Use when the owner asks to evaluate, research or prepare a new city or region for business, school or home rentals.
---

# Market expansion research for Purebaric

This skill reproduces the Knoxville, Tennessee research package of 10 October 2026 for any new area. The finished package is a folder the owner can hand to a sales representative and an attorney: a scored market analysis, a legal blockers memo, a master list of businesses and schools to contact in a set order, a state-specific letter of intent, one pamphlet per industry, a sales training document with industry talk tracks, an outreach runbook, and a documents index. Every document goes through adversarial critique before it is called done.

The worked example lives in the site repo at `_internal/research/knoxville-tennessee/` (with `_internal/research/channel-schools-athletic-recovery/` and `_internal/outreach/`). Read its `DOCUMENTS-INDEX.md` first; it shows the finished shape. Every reference file below points at the Knoxville file to copy from.

## Step 0. Intake (ask before doing anything)

Ask the owner these questions in one message with AskUserQuestion, then confirm the answers back:

1. **Area.** The city or metro to research, and the point to measure from (default: the downtown core; record the latitude and longitude).
2. **Distance.** Ask for the radius in miles, and confirm whether the number they gave is a radius or a diameter ("25 miles around downtown" is usually a radius; a 50-mile diameter is a 25-mile radius). Everything downstream uses the radius.
3. **Local contact details** to print on every market-specific pamphlet, letter of intent and training document: name, role (owner, representative or franchisee), phone and email. Never reuse another market's contact details, and never put a hello@purebaric.com address or a Utah phone number on a market pamphlet unless the owner says so.
4. **Scope.** Business placements only, or also schools and athletic programs, or also home rentals. Default for a new state: business and athletic-program placements, air-only configuration, no home rentals until the legal check clears them.
5. **Contracting entity** for that state (Purebaric LLC or Matthew Bailie d/b/a Purebaric) if known; otherwise record it as an open question for counsel and use one name consistently in drafts.
6. **Where the package lives.** Default: `~/Desktop/<Area> Research/` for the working folder, mirrored to the site repo under `_internal/research/<area-slug>/` and committed. Never write Purebaric files under the Adobe OneDrive path.

Also pull, without asking: live pricing from `https://purebaric.com/api/pricing` (home and business rates by term), the current Business Rental Agreement and Liability Waiver (`_internal/outreach/purebaric_business_rental_agreement_and_liability_waiver.docx`), and the rules in `_internal/RUNBOOK.md` section 14 (wellness-only claims; no medical claims without a qualified reviewer).

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

Phases 2, 3 and 4 can run in parallel once Phase 1 is done. Phase 6 needs 2, 3 and 4. Phase 7 runs inside every phase (see the cadence) and once more at the end on the whole folder.

## How to work

- **Delegate the searching.** Research and critique run in background subagents (Opus for legal, critique and anything with judgment; Sonnet for list-building). Give each agent an exact output path, the exact JSON keys, a search budget (60 to 70 WebSearch calls each; the session shares a 200-call budget per turn, so run at most three search-heavy agents at once), and the rule "never fabricate a fact about a real business; mark unverified items". Rewrite output files every 8 to 10 records so partial work survives.
- **The owner's standing rules.** Research only until the owner asks for site changes. Wellness-only claims: no treatment, cure, disease, therapy or outcome language anywhere, including pamphlets and scripts. Do not fabricate facts about real businesses. Batch deploys. Never `git add -A` in the site repo. Push with `gh auth switch --user matthewbailie`, then switch back to `bailie_adobe`. Commit trailer `Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>`.
- **Every number has one source.** Prices come from `/api/pricing` on the day; pamphlet arithmetic is checked by hand; competitor counts come from the workbook's "Already offer HBOT" sheet; prospect counts come from the workbook Summary sheet. When a document quotes a number, say where it came from.
- **Configuration.** For a new state assume air-only (no oxygen concentrator) for business and school placements until counsel and the local fire marshal have answered in writing. Say so in the LOI, pamphlets, training and runbook.
- **Minors.** No under-18 use until Purebaric's insurer confirms coverage in writing; then a parent's signed consent and a parent present, matching the agreement.
- **Verify renders.** Convert Markdown to Word with `_internal/outreach/source/md2docx.js`, export PDFs through Microsoft Word (osascript), render pages with the `pdf2png` Swift helper, and look at them. Extract pamphlet text with pypdf and grep for banned words, old contact details and the other market's name before sending anything.

## Done means

- `DOCUMENTS-INDEX.md` lists every file with a one-line description and the "still open" items.
- Both critique files and the response file exist, and every "Fix" in them is either applied or listed under owner decisions.
- Pamphlet text scan is clean (contact details twice per pamphlet, no banned words, no other market's name).
- The workbook Summary sheet, the brief, the README and the index agree on counts.
- The folder is mirrored to the repo, committed and pushed, and the owner has the download links.
- Owner decisions are listed in the final message: contracting entity, state version of the rental agreement, chamber model and 510(k) number, tax treatment, contact details on shared documents.
