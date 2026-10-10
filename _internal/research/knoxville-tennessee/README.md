# Purebaric Knoxville market research (10 Oct 2026)

Market-research only; nothing here touches the website.

| File | What it is |
|---|---|
| `purebaric_knoxville_prospects.xlsx` | Business prospect list, 25-mile radius: Prospects, Already offer HBOT, Dropped or outside radius, Summary. Built from `research/*.json` by `make_knoxville_list.py`, with the critique's drops, flags, adds, email holds and phone fixes applied from `research/_overrides.json`. |
| `prospect_list_critique.md` | Adversarial due-diligence review of the prospect list (26 spot-checks, structural checks, coverage gaps, top-10 fixes). |
| `purebaric_knoxville_hbot_providers.xlsx` | Hyperbaric providers found in the radius (25 entries: 5 confirmed wellness, 7 hospital, 13 unverified; the prospect workbook's competitor sheet adds two operators found later) with chamber type, session and package prices, contact and address; chamber rental businesses; dealers; regional price references; classifieds check. |
| `hbot_providers.md` / `hbot_providers.json` | Research notes and data behind the provider workbook. |
| `market_analysis.md` | Market-attractiveness scorecard: Knoxville 62/100 vs Wasatch Front 73/100, reasons for and against, entry model, sources. |
| `classifieds_check.md` | Facebook Marketplace, Craigslist and OfferUp results for chambers for sale or rent. |
| `google_trends_check.md` | Search-interest comparison, Knoxville vs Salt Lake City vs Nashville. |
| `critique_documents_round1_sales.md`, `critique_documents_round1_decision.md`, `critique_documents_round1_response.md` | Adversarial critique of every document in the Tennessee Research folder and the fixes applied. |
| `BRIEF.md` | The research brief the agents followed (area rule, schema, email rules). |

Rebuild the prospect workbook: `python3 make_knoxville_list.py` (needs openpyxl). Edit `research/_overrides.json` to drop, flag, add rows, hold back an email, or correct a phone, then rerun.

Status (10 Oct 2026, after two critique rounds, the schools addition and the recovery re-sweep): 263 prospects, 21 marked Call first, 26 verified emails (10 of them athletic directors), 8 businesses on the Already offer HBOT sheet, about 19% of rows with no phone. It is a call and walk-in list ordered by `../TENNESSEE-OUTREACH-RUNBOOK.md`, not an email list. Remaining known gaps: distances are measured from city centres, some rows have conflicting addresses, and D1 Training and TITLE Boxing have no street address.
- `research/schools_knox.json`: 44 high schools and colleges with athletic programs within about 25 miles (TSSAA and college athletics sites); compiled into the prospects workbook under "High schools and colleges (athletics)". Loudon and Roane State fall outside the radius.
- `legal_state_tennessee.md`, `legal_federal_local_knoxville.md`, `legal_blockers_summary.md`: state, federal and local legal research (10 Oct 2026) with the blockers for home and business rentals. `legal/`: Tennessee letter of intent for business placements (docx, pdf, drafting notes).
