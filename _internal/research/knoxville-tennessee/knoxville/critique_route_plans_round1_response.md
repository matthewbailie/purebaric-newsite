# Route plans: what changed after the round-1 critique (10 October 2026)

The critique (`critique_route_plans_round1.md`) found that the times left out the drive from home, that the exclusion filter threw out strong prospects and kept weak ones, that same-building businesses were split across days, and that map links broke. All of it was in the generator, so the generator was rewritten (`make_route_plan.py`, version 3) and both plans regenerated.

| Finding | What was done |
|---|---|
| Times excluded the drive from home | Every day is now timed door to door from the start point (downtown Knoxville as a placeholder until the real start address is set in `route_config_knoxville.json`; Lehi for Utah) and capped at two hours including the drive home. Drive speed is 22 mph on short legs, faster on arterials and highways. |
| Businesses too far for a two-hour loop | Listed under "Far trips" by town (Utah: Layton, Ogden, Kaysville and the rest of Davis and Weber counties) to be planned as half days. |
| Filter dropped Sauna House, Healing Hands and D1 Training | The filter now matches only the research's own status tags ("UNVERIFIED" on the business, "weak fit", the directory source, "appears closed") rather than any occurrence of a word. Strong prospects without a street address are listed under "Worth a visit, but the street address is missing" instead of being dropped. |
| "Best bet" rewarded complete rows, not fit | Scoring is by what the business sells: contrast, cryo, float, sauna, IV, stretch and recovery studios and performance gyms score highest; aesthetics-only med spas, functional-medicine and hormone clinics and chain gyms lowest. Weight-loss, testosterone, ketamine and plastic-surgery practices are excluded. College athletics departments and pro teams moved to an "Email first" list. |
| Days not in order of strength | Days are ranked by best bets per hour on the road; days with no best bet sit in a "Fill-in days" group at the end. |
| Same-building businesses split across days | Businesses within about 250 yards of a stop join that day at no drive cost; rows sharing an address and phone are merged with "also at this address". |
| Broken or vague map links | Links now carry street, city, state and ZIP for every stop, encode slashes, start and end at home, and are clickable in both the Word and Excel files. |
| Days over two hours and stub days | The cap is enforced after the stops are ordered; days under an hour are merged or moved to "On their own"; one-stop days are never shown as days. |
| Area names repeated or unreadable | Days are named by city and the most common street ("Farragut: Kingston Pike"), with part numbers where a corridor needs two days. |
| "Opening line" and "Ask for" columns were research notes | Renamed "Good to know" and cut to one clean sentence without sources; "Ask for" shows the named person or "the manager" with the phone; "top pick" is marked next to the business name. |
| Tennessee addresses repeated the city | Fixed. |

Not changed: the plan still cannot know real traffic or parking; the times are estimates. The Knoxville start point must be set before the plan is used for real.
