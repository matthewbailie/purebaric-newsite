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
Mirror to the site repo as `_internal/research/<area-slug>-<state>/` (Knoxville: `knoxville-tennessee`) plus `_internal/research/channel-<name>/`. Market-independent assets (training template, generator scripts) live in `_internal/outreach/` and `_internal/outreach/source/`.

Write a memory note recording the folder locations and the rule that nothing goes in the Adobe OneDrive.

## The area rule
Convert the owner's distance to a radius. Fix the centre point (downtown coordinates). Then write the area rule into `BRIEF.md` the way `knoxville/BRIEF.md` does:
- A list of every city, town and neighbourhood inside the circle, grouped by county, with borderline places marked with their distance.
- A list of places just outside the circle that agents must not include.
- A note that ZIP prefixes do not prove the radius; the city list does.
- The 15 output keys, the industry list, the email rules and the "already_has_hbot" rule (copy them from the Knoxville brief; they are the contract the compile script depends on).

The compile script needs the same geography as a `CITIES` table (city, latitude, longitude, county). Copy `knoxville/make_knoxville_list.py`, rename it, and replace `CENTER`, `RADIUS_MI`, the `CITIES` table and the city aliases in `locate()`. The 2-mile tolerance on the radius stays. Build the table from a gazetteer or Wikipedia coordinates for 40 to 60 places; it is the single most common source of error (Knoxville's first version had the wrong downtown latitude and pushed Maryville out of the circle).

## Research brief
`BRIEF.md` is what every list-building agent reads. Keep the Knoxville structure: purpose and radius, area rule, tools (WebSearch only for business sites; WebFetch is blocked for most), query patterns, email rules ("an email counts only if it appears verbatim in a search result or page summary; never construct info@domain"), output schema, industries, hooks, the already-has-hbot rule, target of 25 to 40 rows per category, stop rule and the two-line summary the agent returns.

## Home-market comparison
The scorecard compares the new market with the Wasatch Front (Purebaric's base) and two or three markets where hyperbaric wellness is already popular (Knoxville used Phoenix/Scottsdale, Austin and Nashville). Decide the comparison set now so the market-scan agent researches them lightly in the same pass.
