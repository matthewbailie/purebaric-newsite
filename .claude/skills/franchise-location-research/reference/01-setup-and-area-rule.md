# Phase 1. Setup and the area rule

## Folder tree
Create `~/Desktop/<Area> Research/` with:
```
<Area> Research/
  DOCUMENTS-INDEX.md
  SALES-REP-TRAINING.md / .docx        (written in phase 6; one per market)
  <STATE>-OUTREACH-RUNBOOK.md / .docx  (phase 6)
  pamphlets/                           (phase 6)
  <area-slug>/                         (the research folder; Knoxville's is "knoxville")
    BRIEF.md, README.md, EXECUTIVE-BRIEF.md, market_analysis.md
    hbot_providers.md/.json, purebaric_<slug>_hbot_providers.xlsx
    classifieds_check.md, google_trends_check.md
    make_<slug>_list.py, purebaric_<slug>_prospects.xlsx, prospect_list_critique.md
    legal_state_<state>.md, legal_federal_local_<slug>.md, legal_blockers_summary.md
    legal/  (LOI docx, pdf, README-LOI-<State>.md)
    critique_documents_round1_*.md
    research/  (per-category JSON, _overrides.json, *_for_review.csv)
  channel-<name>/                      (phase 5, if any)
```
File names are keyed on the market slug, not the state, so two cities in one state do not collide: `<SLUG>-OUTREACH-RUNBOOK.md`, `SALES-REP-TRAINING-<slug>.md`, `pamphlets/Purebaric_<slug>_pamphlet_<industry>.pdf` (Knoxville predates this rule and uses TN). Mirror the whole Desktop folder to the site repo as `_internal/research/<area-slug>-<state>/` (Knoxville: `knoxville-tennessee`), including the runbook, training, pamphlets and index, plus `_internal/research/channel-<name>/` for channels. Generator scripts live in `_internal/outreach/source/`. The Knoxville training at `_internal/outreach/SALES-REP-TRAINING.md` is the Tennessee working document, not a blank template: copy it, delete the lines marked **TN**, and write the new state's rules.

Update the existing memory note `purebaric-no-adobe-onedrive.md` (in the memory folder named in the system prompt) to add the new market's Desktop and repo folders, and keep its one-line entry in `MEMORY.md`; do not create a second note.

## The area rule
Convert the owner's distance to a radius. Fix the centre point (downtown coordinates). Then write the area rule into `BRIEF.md` the way `knoxville/BRIEF.md` does:
- A list of every city, town and neighbourhood inside the circle, grouped by county, with borderline places marked with their distance.
- A list of places just outside the circle that agents must not include.
- A note that ZIP prefixes do not prove the radius; the city list does.
- The 15 output keys, the seven industry strings exactly as the compile script's `INDUSTRIES` list spells them ("Gyms and fitness centers", "CrossFit and performance gyms", "Sports teams and athletic programs", "High schools and colleges (athletics)", "Recovery studios and med spas", "Physical therapy, chiropractic, and sports medicine", "Salons and beauty studios"), the email rules and the "already_has_hbot" rule. Fix three things the Knoxville brief got wrong: the output is one JSON object `{"prospects": [...], "already_has_hbot": [...]}`, not an array plus a second array; WebFetch and curl are allowed for athletic-association directories and college athletics pages (business sites still block them); and the chamber pressure is stated once as 1.3 to 1.5 ATA.

The compile script needs the same geography as a `CITIES` table (city, latitude, longitude, county). Copy `knoxville/make_knoxville_list.py`, rename it, and replace every Knoxville constant: `CENTER`, `RADIUS_MI`, `OUT`, the `CITIES` table, the city aliases in `locate()`, the ZIP-prefix fallback in `in_radius()` (`37[78]\d\d` for Knoxville; use the new market's prefixes or remove it), the state and city words in the dedupe stop-list `STOP`, and the Summary sheet title. The 2-mile tolerance on the radius stays. The script writes the review CSVs (`prospects_for_review.csv`, `competitors_for_review.csv`, `dropped_for_review.csv`, `_recovery_existing.csv`) at the end of every run; the critique and re-sweep agents read those. Build the table from a gazetteer or Wikipedia coordinates for 40 to 60 places; it is the single most common source of error (Knoxville's first version had the wrong downtown latitude and pushed Maryville out of the circle).

## Research brief
`BRIEF.md` is what every list-building agent reads. Keep the Knoxville structure: purpose and radius, area rule, tools (WebSearch only for business sites; WebFetch is blocked for most), query patterns, email rules ("an email counts only if it appears verbatim in a search result or page summary; never construct info@domain"), output schema, industries, hooks, the already-has-hbot rule, target of 25 to 40 rows per category, stop rule and the two-line summary the agent returns.

## Home-market comparison
The scorecard compares the new market with the Wasatch Front (Purebaric's base) and two or three markets where hyperbaric wellness is already popular (Knoxville used Phoenix/Scottsdale, Austin and Nashville). Decide the comparison set now so the market-scan agent researches them lightly in the same pass.
