# Phase 8. File manifest and packaging

## Expected files (Knoxville names in brackets)
Top of the market folder (this list is the single source; `01` points here):
- `DOCUMENTS-INDEX.md`
- `SALES-REP-TRAINING-<slug>.md`, `.docx` (Knoxville: `SALES-REP-TRAINING`)
- `<SLUG>-GETTING-STARTED-ACTION-PLAN.md`, `.docx` (Knoxville: `TENNESSEE-GETTING-STARTED-ACTION-PLAN`)
- `pamphlets/Purebaric_<slug>_pamphlet_<industry>.pdf` x 7, `pamphlets/README.md` (Knoxville: `Purebaric_TN_...`)

Research folder (`<slug>/`):
- `BRIEF.md` (research brief and area rule), `README.md`
- `EXECUTIVE-BRIEF.md` (versioned, change log)
- `market_analysis.md`, `google_trends_check.md`, `classifieds_check.md`
- `hbot_providers.md`, `hbot_providers.json`, `purebaric_<slug>_hbot_providers.xlsx`
- `make_<slug>_list.py`, `purebaric_<slug>_prospects.xlsx`, `prospect_list_critique.md`
- `research/` (`gyms.json`, `crossfit.json`, `teams.json`, `recovery.json`, `pt.json`, `salons.json`, `expansion_counties.json`, `franchise_gyms.json`, `<cluster>_gaps.json`, `enriched_1..3.json`, `recovery_resweep.json`, `schools_<slug>.json`, `_overrides.json`, `*_for_review.csv`, `_recovery_existing.csv`)
- `legal_state_<state>.md`, `legal_federal_local_<slug>.md`, `legal_blockers_summary.md`
- `legal/Purebaric_LOI_Business_Chamber_Rental_<State>.docx`, `.pdf`, `README-LOI-<State>.md`, `Purebaric_<ST>_Business_Rental_Agreement_and_Liability_Waiver.docx`, `.pdf`, `Purebaric_<ST>_Automatic_Renewal_Disclosure.docx`, `.pdf` (where the state has a renewal statute), `<state>_auto_renewal_summary.md`
- `critique_documents_round1_sales.md`, `critique_documents_round1_decision.md`, `critique_documents_round1_response.md`, `critique_documents_round2_check.md`

Channel folder (`channel-<name>/`): proposal, targets JSON and workbook.

Repo (market-independent): `_internal/outreach/source/` generators (`make_loi.js`, `make_pamphlets_market.py`, `make_pamphlets_tn.py`, `md2docx.js`, `hbot_site_check.py`, `make_prospect_list.py` for Utah), `_internal/outreach/SALES-REP-TRAINING.md` template, `_internal/outreach/branded-images/`.

## Packaging steps
1. Rebuild the workbook one last time and confirm the Summary sheet.
2. Update `DOCUMENTS-INDEX.md`, the research `README.md` and the brief's section 6 so every file is listed once.
3. `rsync -a --exclude '*_for_review.csv' --exclude '_recovery_existing.csv' --exclude '~$*' "<Desktop folder>/" _internal/research/<slug>-<state>/` (the whole Desktop folder: research subfolder, channel folders, pamphlets, runbook, training, index).
4. `git add` the specific paths (never `-A`), commit and push as SKILL.md says.
4a. List files under `~/Library/CloudStorage/OneDrive-Adobe/` modified since the run started; if any Purebaric file landed there, move it to the Desktop folder and delete the OneDrive copy, and tell the owner.
5. Send the owner: both workbooks, the brief, the runbook and training Word files, the seven pamphlets, the LOI PDF, the critique and response files.
6. Final message: verdicts, what was fixed, what is still open, and the owner decisions, in plain language with counts in a table.
