# Purebaric Knoxville market research (10 Oct 2026)

Market-research only; nothing here touches the website.

| File | What it is |
|---|---|
| `purebaric_knoxville_prospects.xlsx` | Business prospect list, 25-mile radius: Prospects, Already offer HBOT, Dropped or outside radius, Summary. Built from `research/*.json` by `make_knoxville_list.py`, with the critique's drops, flags, adds, email holds and phone fixes applied from `research/_overrides.json`. |
| `prospect_list_critique.md` | Adversarial due-diligence review of the prospect list (26 spot-checks, structural checks, coverage gaps, top-10 fixes). |
| `purebaric_knoxville_hbot_providers.xlsx` | Every hyperbaric provider found in the radius with chamber type, session and package prices, contact and address; chamber rental businesses; dealers; regional price references; classifieds check. |
| `hbot_providers.md` / `hbot_providers.json` | Research notes and data behind the provider workbook. |
| `market_analysis.md` | Market-attractiveness scorecard: Knoxville 62/100 vs Wasatch Front 73/100, reasons for and against, entry model, sources. |
| `classifieds_check.md` | Facebook Marketplace, Craigslist and OfferUp results for chambers for sale or rent. |
| `BRIEF.md` | The research brief the agents followed (area rule, schema, email rules). |

Rebuild the prospect workbook: `python3 make_knoxville_list.py` (needs openpyxl). Edit `research/_overrides.json` to drop, flag, add rows, hold back an email, or correct a phone, then rerun.

Status after two critique rounds: 174 businesses, a Call-first column marking the reviewer's top 20, 9 verified emails, about a quarter of rows with no phone. It is a call and contact-form list, not an email list (a dedicated email pass found zero verbatim addresses). Remaining known gaps: distances are measured from city centres, four rows have conflicting addresses, and D1 Training and TITLE Boxing have no street address.
