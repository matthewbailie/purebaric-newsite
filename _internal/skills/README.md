# Skills (reusable AI playbooks for the business)

| Skill | What it does | Invoke |
|---|---|---|
| `franchise-location-research/` | The full new-market research package: intake (area, radius, local contact), market scan and scorecard, legal check (state, federal, county, city, including consumer-contract rules such as automatic renewal), master prospect list with critique rounds, state letter of intent and rental agreement, seven industry pamphlets, sales training, outreach runbook, daily route plan, documents index, and adversarial critique of everything. Built from the Knoxville, Tennessee package of 10 October 2026. | In Claude Code: `/franchise-location-research` (the executable copy lives in `.claude/skills/franchise-location-research/` and in `~/.claude/skills/`; this folder is the human-readable mirror, kept identical). |

Generators the skill relies on are in `_internal/outreach/source/` (`make_loi.js`, `make_waiver.js`, `make_renewal_rider.js`, `make_pamphlets_market.py`, `make_route_plan.py`, `geocode_prospects.py`, `hbot_site_check.py`, `md2docx.js`). The worked example is `_internal/research/knoxville-tennessee/`.

When the skill changes, change `.claude/skills/franchise-location-research/` first, then copy it here and to `~/.claude/skills/` so the three copies stay the same.
