# Phase 8. File manifest and packaging

## Expected files (Knoxville names in brackets)
Top of the market folder:
- `DOCUMENTS-INDEX.md`
- `SALES-REP-TRAINING.md`, `.docx`
- `<STATE>-OUTREACH-RUNBOOK.md`, `.docx` (`TENNESSEE-OUTREACH-RUNBOOK`)
- `pamphlets/Purebaric_<ST>_pamphlet_<industry>.pdf` x 7, `pamphlets/README.md`

Research folder (`<slug>/`):
- `BRIEF.md` (research brief and area rule), `README.md`
- `EXECUTIVE-BRIEF.md` (versioned, change log)
- `market_analysis.md`, `google_trends_check.md`, `classifieds_check.md`
- `hbot_providers.md`, `hbot_providers.json`, `purebaric_<slug>_hbot_providers.xlsx`
- `make_<slug>_list.py`, `purebaric_<slug>_prospects.xlsx`, `prospect_list_critique.md`
- `research/` (`gyms.json`, `crossfit.json`, `teams.json`, `recovery.json`, `pt.json`, `salons.json`, `expansion_counties.json`, `franchise_gyms.json`, `enriched_1..3.json`, `recovery_resweep.json`, `schools_<slug>.json`, `_overrides.json`, `*_for_review.csv`)
- `legal_state_<state>.md`, `legal_federal_local_<slug>.md`, `legal_blockers_summary.md`
- `legal/Purebaric_LOI_Business_Chamber_Rental_<State>.docx`, `.pdf`, `README-LOI-<State>.md`
- `critique_documents_round1_sales.md`, `critique_documents_round1_decision.md`, `critique_documents_round1_response.md`

Channel folder (`channel-<name>/`): proposal, targets JSON and workbook.

Repo (market-independent): `_internal/outreach/source/` generators (`make_loi.js`, `make_pamphlets_market.py`, `make_pamphlets_tn.py`, `md2docx.js`, `hbot_site_check.py`, `make_prospect_list.py` for Utah), `_internal/outreach/SALES-REP-TRAINING.md` template, `_internal/outreach/branded-images/`.

## Packaging steps
1. Rebuild the workbook one last time and confirm the Summary sheet.
2. Update `DOCUMENTS-INDEX.md`, the research `README.md` and the brief's section 6 so every file is listed once.
3. `rsync -a --exclude '*_for_review.csv' --exclude '_recovery_existing.csv' "<Desktop folder>/<slug>/" _internal/research/<slug>-<state>/` plus the channel folder, pamphlets, runbook, training and index.
4. `git add` the specific paths (never `-A`), commit with the trailer, `gh auth switch --user matthewbailie`, push, switch back to `bailie_adobe`.
5. Send the owner: both workbooks, the brief, the runbook and training Word files, the seven pamphlets, the LOI PDF, the critique and response files.
6. Final message: verdicts, what was fixed, what is still open, and the owner decisions, in plain language with counts in a table.
