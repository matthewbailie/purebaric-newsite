# Phase 7. Critique cadence

Critique is not a final step; it runs at fixed points. Every critique uses the adversarial-critique format (verdict per document; "Fix these" worst first with where, what's wrong, what happens if not fixed, fix; "Your call"; "Checked and it's fine") and names an exact location and quoted text for every finding. Critics are Opus agents with the documents, the reference sources (live pricing JSON, agreement text, LOI text, legal files, workbooks) and a search budget of 10 to 25 calls for verification only.

| When | What is critiqued | Who | Output |
|---|---|---|---|
| After the first prospect compile | The list (structural checks, 20 to 30 spot-checks, coverage, top-20) | Opus critic, 60 searches | `prospect_list_critique.md` round 1, `_overrides.json` entries |
| After round-1 fixes and the follow-up passes | The rows added since round 1 plus a fresh sample | Same | `prospect_list_critique.md` round 2 |
| Before any idea is adopted (billboard copy, a new offer line, "unlimited sessions" wording) | The idea itself | One short critique | Noted in the brief or ads plan |
| After the legal memos | Does the summary match the memos; are buckets softened; which items are unverified | Part of the document critique | `critique_documents_round1_decision.md` |
| When the sales assets exist | Pamphlets (extracted text), training, runbook, LOI, proposal, brief, market analysis, legal files, index and READMEs, in two parallel critiques (sales documents; decision documents) | Two Opus critics | `critique_documents_round1_sales.md`, `critique_documents_round1_decision.md` |
| After fixes | Re-extract pamphlet text and rescan; re-render; confirm counts agree across the brief, README, index and workbook | You | `critique_documents_round1_response.md` |

## Applying a critique
1. Read the whole critique file, not the agent's summary.
2. Apply every fix you can make yourself, by editing the generator or the Markdown source, never by hand-editing an output file.
3. Regenerate outputs, render, rescan.
4. Write the response file: a table of verdicts before and after, a numbered list of what was fixed per document, and a list of what needs the owner's decision (contracting entity, agreement versions, chamber model, tax rulings, contact details on shared documents, score changes).
5. Bump the brief's version and add a change-log line; update the index.
6. Report to the owner with the verdicts, the worst findings in plain words, and the decisions, and attach the critique, the response and the regenerated files.

## Things critics caught in Knoxville that the next market must not repeat
- A false safety statement in a script (fires "in hospital chambers"); the agreement's release does not cover fraud.
- Revenue illustrations that did not follow from their own assumptions, and a "light" usage tier five times the plan's own success bar.
- Competitor claims ("only one practice", "be first") contradicted by the workbook's competitor sheet.
- "Not a medical device" in a disclaimer when the memo says the device is a cleared prescription device.
- "Patients" and "episodes of care" on a chiropractic pamphlet; "therapy" in a banner.
- Prices in a proposal that were not on the published price table.
- Minors' rules that drifted from the agreement (parent present) in one document.
- A brief whose entry model still recommended what its own legal section ruled out.
- Counts (prospects, emails, competitors, questions for counsel) that differed between the brief, README, index, runbook and workbook.
- The contracting entity named differently in the contracts and the memos.
- Conditions in an LOI that could never be met as written (a business licence the county does not issue to a business with no location).
