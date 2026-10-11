# Phase 3. The master prospect list

## Categories
Seven industries, each with its own research agent and JSON file:
1. Gyms and fitness centers (independent first, then franchise locations with a named local owner; a second pass for franchise studios: D1, F45, Pure Barre, Burn Boot Camp, Anytime, Workout Anytime, TITLE Boxing)
2. CrossFit and performance gyms
3. Sports teams and athletic programs (pro and semi-pro clubs, youth academies, swim and rowing clubs, country clubs with athletics)
4. High schools and colleges (athletics): every state athletic-association member school and every college with teams inside the radius; athletic director and athletic trainer with emails from the association directory and athletics sites; note the health system that employs the trainer
5. "Recovery studios and med spas" (the priority category; covers IV lounges, cryotherapy, sauna, float, red light; see the re-sweep)
6. "Physical therapy, chiropractic, and sports medicine"
7. "Salons and beauty studios"

The quoted strings are the compile script's `INDUSTRIES` values; the agent prompts and every row use them verbatim (the normalizer matches only on the first word, so a different spelling drops rows from the Summary sheet).

Also run one "expansion counties" agent for the thin edges of the circle (output `expansion_counties.json`), one for franchise gyms (`franchise_gyms.json`), one gap-fill agent for whichever cluster the first compile shows thin (`<cluster>_gaps.json`), and two or three enrichment agents that take the rows with blank owner or email and try again (output `enriched_N.json`, keyed by business name; the compile script applies them).

## Schema and rules
Exactly these keys per row: business, industry, owner, owner_title, email, email_confidence (high / medium / none), email_source, phone, website, address, city, zip, county, notes, personal_note_hook. Files are a bare array or `{prospects: [...], already_has_hbot: [...]}`. Emails only when seen verbatim; hooks only when verifiable; competitors go to `already_has_hbot`, never into prospects.

## Compile pipeline
`make_<slug>_list.py` (copy of `knoxville/make_knoxville_list.py`): reads `research/*.json` (skips `_` and `enriched_` prefixes as sources, applies enrichment by name), normalizes industries, geocodes by city against `CITIES`, keeps rows within radius plus 2 miles, dedupes competitors, applies `research/_overrides.json`, sorts (Call first, industry, email confidence, county, city), writes the workbook with sheets Prospects, Already offer HBOT, Dropped or outside radius, Summary, calls `hbot_site_check.py apply` to fill the "Hyperbaric on website" column, and exports `prospects_for_review.csv`, `competitors_for_review.csv`, `dropped_for_review.csv` and `_recovery_existing.csv` (recovery-category prospects plus every competitor and dropped row) into `research/`.

`_overrides.json` keys: `drop` (list of business names), `flag` (name: note appended), `add` (full rows), `hold_email` (keyed by email address, with reason), `set_phone`, `set_address`, `set_owner`, `set_hook`, `set_zip`, `fix_notes` (name: text), `competitor_address`, `call_first` (list of names). Every critique fix goes through overrides, never by hand-editing the workbook, so the list can be rebuilt.

`_internal/outreach/source/hbot_site_check.py check <workbook>` crawls every website in the Prospects sheet for "hyperbaric", "hbot" or "mhbot" (homepage plus up to four topical links, cached in `hbot_site_check_cache.json`); `apply <workbook>` writes Yes / No / Unknown. Run `check` after every batch of new rows, then rebuild.

## Critique rounds on the list (mandatory, two rounds)
After the first compile, launch the list critic (prompt in `agent-prompts.md`). Apply its overrides, rebuild, then run round two on the rows added since round one plus a fresh sample. Record both rounds in the critique file and the brief.

Rules learned in Knoxville: key every `set_*` and `fix_notes` entry by the full business name as the workbook spells it, because the script matches those by substring and a short key such as "Core" rewrites every business containing it; after each rebuild, search the notes column for "corrected after critique" and confirm each hit is the intended row; drop by exact name, not stripped name (a stripped match removed both copies of a legitimate business); key email holds by address, not business; dedupe competitors before writing; a Sheet title must be 31 characters or fewer; the centre coordinate must be verified before the first compile.

## Priority-category re-sweep
After the critique rounds, run the re-sweep agent (prompt in `agent-prompts.md`; it reads `_recovery_existing.csv` as its exclusion list and writes `recovery_resweep.json` with `prospects`, `already_has_hbot`, `updates`, `closed_or_not_found` and `coverage`). Fold `updates` into overrides as flags, add closures to drop if they were prospects, rebuild, crawl, rebuild. Directory-only additions (weight-loss and hormone clinics from a peptide directory, in Knoxville's case) are flagged in notes and excluded from the pilot in the runbook.

## Schools and colleges
Run the schools agent after the business list: state athletic-association member directory (TSSAA, UHSAA and so on) fetched directly, athletics sites for colleges, every row with the AD or head athletic trainer, printed emails only, notes on the trainer's employer and the under-18 rule. Industry label "High schools and colleges (athletics)". Colleges already in the sports-teams category are not duplicated.

## Deliverable
`purebaric_<slug>_prospects.xlsx` with the Call first column, the Hyperbaric on website column, and the Summary sheet; send the file to the owner after each critique round and at packaging. The counts on the Summary sheet are the only counts that may appear in the brief, README, index and runbook.
