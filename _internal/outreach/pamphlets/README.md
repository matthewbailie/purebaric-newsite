# Utah business pamphlets (trifold, letter landscape, print double-sided and fold)

One pamphlet per genre, generated 10 October 2026 by `_internal/outreach/source/make_pamphlets.py utah`. The generator is the owner's Utah facility pamphlet (`make_pamphlet2.py`) with a market table; the Utah set carries hello@purebaric.com, (801) 901-0873, the Utah price ranges and the "Utah-based and local" line. Compared with the older single `purebaric_facility_partnership_pamphlet.pdf`: the rental line reads "$979 a month, less on longer terms" (the old "$979 a month on a 12-month term" did not match the pricing table), the "you keep the session revenue" line, refresher training and the staff runbook are gone, and the "Who books sessions?" box is written for each genre.

Two genres are not businesses selling sessions and have their own copy: title "Help Your Athletes Recover Faster", a "Why It Helps Your Team" panel in place of "Why It Makes Money for You", a "What It Costs" panel with a 30-athlete example in place of the revenue table, and "Who uses the chamber?". The injury list in "Why It Helps Your Team" is a health-adjacent statement and needs the qualified-reviewer sign-off required by `_internal/RUNBOOK.md` section 14 before printing.

| File | Genre |
|---|---|
| `Purebaric_UT_pamphlet_gyms-and-fitness.pdf` | Gyms and fitness centers |
| `Purebaric_UT_pamphlet_crossfit-and-performance.pdf` | CrossFit and performance gyms |
| `Purebaric_UT_pamphlet_recovery-studios-and-med-spas.pdf` | Recovery studios and med spas |
| `Purebaric_UT_pamphlet_physical-therapy-and-chiropractic.pdf` | Physical therapy and chiropractic clinics |
| `Purebaric_UT_pamphlet_salons-and-day-spas.pdf` | Salons and beauty studios |
| `Purebaric_UT_pamphlet_sports-teams-and-clubs.pdf` | Sports teams and athletic programs (team copy) |
| `Purebaric_UT_pamphlet_high-schools-and-colleges.pdf` | High school and college athletics (team copy) |

Regenerated 16 October 2026 without the dashed fold marks (owner request). The generator needs fpdf2; run it with `~/.venvs/purebaric/bin/python make_pamphlets.py utah` (the system Python refuses package installs).

## Writing voice (owner, 16 Oct 2026)

Write as a plain-spoken sales consultant talking to a small-business owner about money, space and effort. Short declarative sentences. Every bullet is a one- or two-word bold label followed by plain text that states a concrete value: what the owner earns, saves, or avoids. Say "business" and "customers", not "facility" or "members". No slogans, no wordplay, no sentence fragments as headings. Describe what the chamber does and how a session works in the same plain terms.
