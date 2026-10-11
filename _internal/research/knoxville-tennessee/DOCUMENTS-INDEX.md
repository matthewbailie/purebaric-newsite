# Tennessee Research: index of documents

Folder: `~/Desktop/Tennessee Research/`. Canonical git copy: `~/projects/purebaric-newsite/_internal/research/knoxville-tennessee/` (Knoxville), `_internal/research/channel-schools-athletic-recovery/` (schools channel) and `_internal/outreach/` (sales and Utah documents). Updated 10 October 2026.

## Decision documents
| Document | Path | What it is |
|---|---|---|
| Executive brief (v7) | `knoxville/EXECUTIVE-BRIEF.md` | Verdict, score (62 of 100), likelihood of success, findings, recommended entry model, legal check, change log. Living document; final review pending. |
| Market analysis | `knoxville/market_analysis.md` | Ten-indicator scorecard vs the Wasatch Front and comparison markets, with sources. |
| Legal blockers summary | `knoxville/legal_blockers_summary.md` | One page: what blocks home and business rentals in Tennessee and what would change the answer. |
| Tennessee state-law memo | `knoxville/legal_state_tennessee.md` | Licensing, oxygen and device rules, prescription rules, consumer protection, waivers, taxes, legislation, fire code; nine questions for counsel. |
| Federal and Knoxville memo | `knoxville/legal_federal_local_knoxville.md` | FDA and FTC baseline; Knoxville and Knox County licensing, fire code, zoning, health department, sales tax; twelve open questions. |

## Operating documents
| Document | Path | What it is |
|---|---|---|
| Tennessee outreach runbook | `TENNESSEE-OUTREACH-RUNBOOK.md` / `.docx` | Proof-of-concept definition, Phase 0 gates, the ordered outreach waves with named businesses, per-prospect steps, weekly cadence, decision points, rules. |
| Sales representative training | `SALES-REP-TRAINING.md` / `.docx` | Product, pricing, key terms, claims rules, visit method, objections, and talk tracks for seven industries; Tennessee notes. |
| Letter of intent, Tennessee | `knoxville/legal/Purebaric_LOI_Business_Chamber_Rental_Tennessee.docx` / `.pdf` + `README-LOI-Tennessee.md` | Non-binding term sheet for business placements with Tennessee tax, registration and fire-code conditions. |
| Tennessee business rental agreement | `knoxville/legal/Purebaric_TN_Business_Rental_Agreement_and_Liability_Waiver.docx` / `.pdf` | Tennessee version of the Definitive Agreement: air-only, initial term and rate, Section 2.7 automatic-renewal disclosure, Tennessee contact, law and venue. For counsel's review. |
| Tennessee automatic-renewal disclosure | `knoxville/legal/Purebaric_TN_Automatic_Renewal_Disclosure.docx` / `.pdf` + `tennessee_auto_renewal_summary.md` | One-page rider under Tenn. Code Ann. § 47-18-133 for home and business rentals and the booking flow; the summary explains the rule and where it appears. |
| Letter of intent, Utah | repo `_internal/outreach/Purebaric_LOI_Business_Chamber_Rental_Utah.docx` / `.pdf` + `README-LOI-Utah.md` | Utah counterpart. |
| Tennessee business pamphlets (7) | `pamphlets/` | One trifold per industry with Tennessee contact details, air-only wording and Knoxville price anchors; see `pamphlets/README.md`. |
| Schools channel proposal | `channel-schools-athletic-recovery/PROPOSAL-schools-athletic-recovery.md` | "Recovery Room" pilot for athletic programs (Utah and Tennessee), risks for minors, air-only recommendation. |

## Lists and data
| Document | Path | What it is |
|---|---|---|
| Knoxville prospect list | `knoxville/purebaric_knoxville_prospects.xlsx` | 263 prospects in seven industries incl. 42 schools and colleges and 88 recovery, IV and med spa businesses; Call-first flag; Hyperbaric-on-website column; dropped and competitor sheets. Rebuilt by `knoxville/make_knoxville_list.py` from `knoxville/research/*.json` and `_overrides.json`. |
| Hyperbaric providers | `knoxville/purebaric_knoxville_hbot_providers.xlsx` + `hbot_providers.md` | 25 provider entries (5 confirmed wellness, 7 hospital, 13 unverified) with prices and contacts; rental businesses; dealers (incl. Marketplace listings); regional price references. The prospect workbook's competitor sheet (8 rows) is the outreach skip list. |
| Schools and colleges targets | `channel-schools-athletic-recovery/schools_athletic_targets.xlsx` + `targets.json` | 53 athletic programs for the schools channel. |
| Prospect list critique | `knoxville/prospect_list_critique.md` | Two rounds of adversarial review and the corrections applied. |
| Classifieds check | `knoxville/classifieds_check.md` | Facebook Marketplace, Craigslist and OfferUp sweep for chambers for sale or rent. |
| Google Trends check | `knoxville/google_trends_check.md` | Search-interest comparison: Knoxville vs Salt Lake City vs Nashville, Tennessee vs Utah. |
| Raw research | `knoxville/research/` | Source JSON per category (gyms, CrossFit, teams, recovery, PT, salons, schools, recovery re-sweep), overrides, review CSVs. |

## Critique
| Document | Path | What it is |
|---|---|---|
| Round-1 document critique | `knoxville/critique_documents_round1_sales.md`, `knoxville/critique_documents_round1_decision.md` | Adversarial review of the pamphlets, training, runbook, brief, legal files, LOI and schools proposal. |
| Round-1 response | `knoxville/critique_documents_round1_response.md` | What was fixed and what needs the owner's decision. |

## Still open
- Final review of the executive brief (owner to request).
- Counsel and fire-marshal answers (runbook Phase 0).
- Recovery, wellness and IV re-sweep: merged 10 Oct 2026 (54 added, 3 new competitors, 7 corrections; 13 closed businesses recorded in `knoxville/research/recovery_resweep.json`).
