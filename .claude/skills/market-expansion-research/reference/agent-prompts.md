# Agent prompt templates

Each prompt states: who Purebaric is (Utah company renting 1.3 to 1.5 ATA soft-shell mild hyperbaric chambers to homes and businesses, wellness positioning, no prescription), the exact task, the exact output path and schema, the search budget, the no-fabrication rule, the "rewrite the file every N records" rule, and the short report format to return. Replace the angle-bracket fields.

## Category prospect research (Sonnet)
"You are a B2B prospect researcher for Purebaric. Read `<path>/BRIEF.md` for the area rule, tools, email rules and output schema, then build the list for the category `<industry>` within <R> miles of <centre>. Use at most <60> WebSearch calls. Write `<path>/research/<category>.json` as a JSON object with `prospects` and `already_has_hbot`, exactly the 15 keys, rewriting the file every 8 records. Aim for 25 to 40 qualified rows spread across the counties in the brief. Never construct an email; never invent a fact about a real business; mark unverified items in notes. Finish with: rows, rows with email, competitors found."

## Enrichment (Sonnet)
"Take `<path>/research/<category>_for_review.csv` rows where owner or email is blank. For each, run two or three targeted searches ('<business>' owner, '<business>' email, site:<domain> '@<domain>'). Write `<path>/research/enriched_N.json` keyed by exact business name with any of: owner, owner_title, email, email_confidence, email_source, phone, website, address, zip, notes, personal_note_hook. Budget <60> searches. Emails only when seen verbatim."

## Schools and colleges (Opus)
"Find every high school and college with athletic teams within <R> miles of <centre>. Fetch the state athletic association's member directory directly (curl) and each college's athletics staff page. One row per school with the athletic director (and the athletic trainer in notes, with the health system that employs them), email only if printed, classification, recent achievement as the hook, straight-line miles from <centre> in notes. Output `<path>/research/schools_<slug>.json` with `prospects` and `already_has_hbot`, 15 keys, industry 'High schools and colleges (athletics)'. Budget <70>. Note any school that already has a chamber."

## Provider inventory (Sonnet)
"Inventory every hyperbaric provider within <R> miles of <centre>: hospital wound-care programs, clinics, wellness studios, chiropractors, and unverified directory listings. For each: chamber type and pressure, session and package prices with source URLs, prescription requirement, address, phone, website. Also: chamber rental businesses in <state> and nationally with monthly rates; dealers and used chambers for sale; regional price references. Write `<path>/hbot_providers.json` and `hbot_providers.md`. Budget <70>. Mark anything from a single directory page as unverified."

## Market scorecard (Opus)
"Score <area> against the Wasatch Front and <comparison markets> on the ten-indicator rubric in `reference/02-market-scan-and-scorecard.md` with the weights given. Every cell needs a one-line justification with a numbered source. Then the verdict, five reasons for, five against, an entry model and a source appendix. Write `<path>/market_analysis.md`. Budget <70>. Quote figures as the source states them."

## Recovery re-sweep (Opus)
"Complete re-sweep of recovery studios, IV lounges, cryotherapy, cold plunge, sauna, float, red light, med spas, longevity and functional-medicine clinics within <R> miles of <centre>. First read `<path>/research/_recovery_existing.csv` (existing rows, competitors and dropped rows; do not re-add). Sweep each franchise brand on this list <brands> plus each service keyword by suburb. Output `<path>/research/recovery_resweep.json` with `prospects` (new only), `already_has_hbot`, `updates` ({business, field, new_value, source}), `closed_or_not_found`, `coverage`. Budget <70>."

## State legal memo (Opus)
Use the nine topics in `reference/04-legal-check.md` verbatim as the question list, primary sources only, `[not verified]` tags, section (d) questions for counsel, section (e) dated sources. Budget 60. Output `<path>/legal_state_<state>.md`.

## Federal and local legal memo (Opus)
Use the ten topics in `reference/04-legal-check.md`, with the local jurisdictions named (city, county, and the suburbs that hold the first outreach waves). Record Purebaric's chamber make, model and 510(k) number if the owner has supplied them. Budget 60. Output `<path>/legal_federal_local_<slug>.md`.

## List critique (Opus)
"Adversarial review of `<path>/research/prospects_for_review.csv`, `competitors_for_review.csv`, `dropped_for_review.csv` as a skeptical sales-ops lead. Structural checks first without searching (duplicates by address and phone, industry mislabels, prospect-and-competitor overlaps, rows without address or contact). Then 20 to 30 spot-checks by search (exists, owner current, email real, still open). Coverage gaps by geography and category. A top-20 call list. Write `<path>/prospect_list_critique.md` and append machine-readable fixes to `<path>/research/_overrides.json` using its keys (drop by exact name, flag, add, hold_email by address, set_phone, set_address, set_owner, call_first). Budget 60."

## Document critique (Opus, two in parallel)
Sales set: pamphlet extracted text, training, runbook, pamphlet README, against live pricing, the agreement, the LOI, the legal files, the provider notes and the workbook. Decision set: brief, market analysis, legal summary and memos, LOI and its README, channel proposals, index and READMEs, with five primary-source spot-checks of the statements the owner would rely on most. Both use the adversarial-critique output format and write `critique_documents_round1_<set>.md`. Budget 10 (sales) and 25 (decision).
