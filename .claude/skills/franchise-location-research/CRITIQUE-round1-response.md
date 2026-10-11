# Skill critique round 1: disposition (10 October 2026)

Verdict before: Needs work before it goes out. After the fixes below the skill is ready to run; the owner-call items are listed at the end.

| # | Finding | Done |
|---|---|---|
| 1 | LOI generator had Tennessee text outside the STATES entry, fixed entity, date and prices | Fixed: the two strings use `st.name`; `entity` key with `LOI_ENTITY` default; `LOI_DATE` and `PRICING_JSON` env (table built from `/api/pricing`); 05 lists every STATES key; tooling.md LOI scan greps for other state names |
| 2 | Compile script did not write the review CSVs or `_recovery_existing.csv` | Fixed: `export_review_csvs()` added to the Knoxville script and documented in 01 and 03; gap-fill file named |
| 3 | Knoxville constants (ZIP regex, STOP words, Summary title) and industry-name mismatch | Fixed: 01 and tooling.md list all constants; 03 and 01 use the exact `INDUSTRIES` strings |
| 4 | Relative paths in agent prompts; OneDrive risk | Fixed: agent-prompts.md requires absolute paths and pasted rubrics; 07 step 4a checks OneDrive after the run |
| 5 | Pamphlet config described wrongly; "$75 below local price" hard-coded; banned-word scan could never pass | Fixed: exact key list in 05; `assumption_vs_local` config key added to the generator; scan rewritten in tooling.md with whole-word rules and an allowlist |
| 6 | Intake tool and missing questions | Fixed: plain chat message; items 7 (equipment and 510(k)) and 8 (comparison markets, distance) added; delivery method stated |
| 7 | "Phases 2, 3 and 4 in parallel" vs the three-agent cap | Fixed: batch schedule B1 to B5 in SKILL.md |
| 8 | Missing or fragmentary agent prompts | Fixed: agent-prompts.md rewritten with full prompts for every agent, pasted descriptions, schemas, budgets, rewrite cadence and report lines; 04 numbers the ten federal and local topics and the (a) to (e) layout |
| 9 | Training "template" is the live document; state-keyed file names collide | Fixed: slug-keyed names in 01 and 07; copy-and-delete-TN instruction in 01 and 05; repo destination is the market folder |
| 10 | Scorecard had weights but no anchors | Fixed: anchors per indicator, direction rule, nr = 3, Wasatch Front held at Knoxville's scores |
| 11 | Knoxville BRIEF contradicts the prompts | Fixed: 01 lists the three corrections to make when copying the brief |
| 12 | No generator for the provider or targets workbooks | Fixed: 02 gives the JSON keys and says to write the workbook with openpyxl after 2b and 2c; 05 says the same for the targets workbook |
| 13 | RUNBOOK section 14 says "not a medical device" | Fixed: SKILL.md Step 0 overrides it and tells the AI to flag the site line to the owner |
| 14 | Commit trailer hard-coded | Fixed: "the attribution line the session's system reminder gives" |
| 15 | Tooling gaps (requests, osascript, Swift path, lock files) | Fixed: one venv line, full osascript, Swift source path, `~$*` rsync exclude; the tracked lock file removed from git |
| 16 | Substring-matched overrides | Fixed: rule in 03 to key `set_*` and `fix_notes` by full name and to check the notes column after rebuild |
| 17 | Session grades its own fixes | Fixed: round-2 check row in 06 and a prompt in agent-prompts.md; disputed findings recorded |
| 18 | Repetition and drift | Fixed: scan list lives in tooling.md, file list in 07, git rules in SKILL.md, critic prompts in agent-prompts.md; other copies replaced with pointers |
| 19 | Vague memory-note step | Fixed: update the existing note, keep the index line |

Also added since the critique was written: the state, county and city consumer-contract check (automatic renewal, cancellation, refunds, late fees, e-signature) in 04 topic 4, the "required statements in the market's legal documents" step, the `make_waiver.js` state option and the `make_renewal_rider.js` rider in 05 and tooling.md, and the renewal-rule lesson in 06.

## Owner calls (from the critique's "Your call")
- Whether a new-market run may touch Utah assets: the skill now says no unless asked.
- Near markets: the runbook scaling note was added; confirm the "day's drive" threshold.
- Comparison markets: now an intake question.
- Leftover Purebaric files in the Adobe OneDrive (`purebaric-outreach/`, `purebaric-ads/`, `purebaric-brand/`, including the Utah rental agreement and the Utah B2B prospect workbook): moving and deleting them is the owner's decision; the skill forbids writing there.
