# Utah route plan: independent check, 14 Oct 2026

**Verdict: PASS.** All 93 days are the shortest loop under the cost model, all 93 Google Maps links are correct, and every sanity check passes.

File checked: `netlify/functions/_data/routes_utah.json` (generated 2026-10-14, 93 days, 391 stops, home 3903 W 1700 N, Lehi, UT 84043).

## Optimal order

| Stops per day | Days checked | Optimal (within 0.1%) | Not optimal | Largest gap found |
|---|---|---|---|---|
| 2 | 20 | 20 | 0 | 0.0% |
| 3 | 15 | 15 | 0 | 0.0% |
| 4 | 20 | 20 | 0 | 0.0% |
| 5 | 13 | 13 | 0 | 0.0% |
| 6 | 16 | 16 | 0 | 0.0% |
| 7 | 7 | 7 | 0 | 0.0% |
| 8 | 2 | 2 | 0 | 0.0% |
| **All** | **93** | **93** | **0** | **0.0%** |

Every stored order costs exactly the same as the best order found by trying every possible order. The generator's claim holds.

**Failing days:** none.

## Google Maps links

**Link failures:** none. All 93 links start with `https://www.google.com/maps/dir/`. The first and last segments decode to "3903 W 1700 N, Lehi, UT 84043". The middle segments decode to each stop's "street, city, UT ZIP" in the stored order, with nothing missing, doubled or out of order. Every segment is URL-encoded and contains no raw spaces or unsafe characters.

## Sanity checks

**Sanity failures:** none.

- **No stop on two days.** No stop ID appears twice, and no business (same name and address) appears twice.
- **Coordinates.** All 391 stops have numeric lat/lon inside Utah (lat 36.9 to 42.1, lon -114.1 to -109.0).
- **Stop numbers** run 1, 2, 3 ... in order on every day.
- **drive_min.** Every stop's `drive_min` matches the model leg from the previous point (home for stop 1) to within 1 minute.
- **Two-hour cap.** No day goes over 120 minutes door to door (sum of legs including the drive home, plus 10 minutes per stop). The longest is 119.8 minutes. Each day's stored `minutes` matches the model total to within 0.5 minutes.

### Worth knowing (not a failure)

These don't break any rule above, but they cost drive time. In 9 buildings, different businesses that share the building are put on different days, so you drive to the same building two or three times:

| Building | Days | Businesses |
|---|---|---|
| 1881 W Traverse Pkwy, Lehi | 1, 41 | Prime IV Hydration (Ste D); Club Pilates Lehi (Ste B) |
| 401 S 850 E, Lehi | 1, 41, 63 | CrossFit Lehi; Momentum Indoor Climbing; Utah Barbell |
| 2415 W 700 S, Pleasant Grove | 3, 65 | MVMNT Fitness Group; Work Training Studio |
| 675 E 2100 S, Salt Lake City | 6, 62, 72 | US Cryotherapy; Salon Keiji; HOTWORX Sugarhouse |
| 8018 Welby Park Dr, West Jordan | 8, 74 | Utah Hit Lab; Gracie Barra West Jordan |
| 151 N Main St, Heber City | 18, 37 | The Mountain Gym; The Underground Barbell Club |
| 13216 S 5600 W, Herriman | 22, 61 | Burn Boot Camp Herriman; Laionebuilt Fitness |
| 1400 S Foothill Dr, Salt Lake City | 42, 50 | BodyWise Fitness; Move Better Pilates |
| 1612 W Ute Blvd, Park City | 51, 76 | HOTWORX Kimball Junction; Peak/45 Lagree |

The order within each day is optimal. Which stops go on which day is a separate choice, and these splits come from that choice. It's worth asking whether the business at the later day's visit can get its pamphlet on the earlier visit.

## Tennessee spot check

`_internal/research/knoxville-tennessee/TENNESSEE-ROUTE-PLAN.md` has no coordinates, so optimality can't be tested from it. A table of leg minutes doesn't give the times between stops that aren't next to each other. I checked the arithmetic instead:

| Day | Legs (min) | Back (min) | Stops | Computed total | Stated |
|---|---|---|---|---|---|
| 1 Knoxville and Farragut | 21, 7, 6, 5, 5 | 20 | 5 | 114 | 1 h 54 min (114) |
| 2 Knoxville (37920) | 3, 3, 2, 1, 2, 8, 12 | 12 | 7 | 113 | 1 h 54 min (114), rounding |
| 3 Knoxville: Sherway Rd | 18, 5, 0, 6, 12 | 21 | 5 | 112 | 1 h 52 min (112) |

All three add up, and each first leg matches the "min out" in the day header. Two side findings:

- **The Tennessee spreadsheet is stale.** `TENNESSEE-ROUTE-PLAN.xlsx` was last saved 10 Oct. The `.md` and `.docx` were saved 14 Oct. Their day numbering differs: in the spreadsheet, Day 1 is "Knoxville (37920)" and Day 2 is "Knoxville and Farragut, part 1". In the `.md`, those are Days 2 and 1. Regenerate the spreadsheet or delete it.
- **Tennessee map links repeat the city and state.** For example, Day 1 stop 1 is encoded as "9311 Kingston Pike, Knoxville, TN 37922, Knoxville, TN 37922". Google usually copes with this, but the Utah links don't have the problem. The start point is also still the placeholder "downtown Knoxville".

## Method

I wrote the verifier from scratch for this check. I did not read or import the generator's code.

1. **Cost model.** It is read from the JSON's `cost_model`. Straight-line distance uses the haversine formula with an Earth radius of 3,958.8 miles. Minutes for a leg = miles x road factor x 60 / mph. The bands are under 5 miles (factor 1.3, 22 mph), 5 to under 12 miles (1.2, 35 mph) and 12 miles or more (1.15, 50 mph). The 10-minute stop time is left out of the ordering test because it is the same for every order.
2. **Stored cost.** For each day: home, then the stops in stored order, then home, summing every leg.
3. **True optimum.**
   - Brute force: every day has 8 stops or fewer, so I tried every possible order (up to 40,320 per day) and kept the cheapest.
   - Held-Karp: I also ran my own Held-Karp dynamic program on every day. It matched brute force exactly on all 93 days.
   - The test: a day fails if its stored cost is more than 0.1% above the optimum.
4. **Links.** I stripped the `https://www.google.com/maps/dir/` prefix, split on "/", and URL-decoded each segment. The result had to equal the list [home address, then each stop's "address, city, UT ZIP" in stored order, then home address], exactly and in order. I also checked that each raw segment contains only URL-safe characters.
5. **Sanity checks.**
   - Duplicates: stop IDs, and name plus address, compared across all days.
   - Coordinates: a numeric type and the Utah bounding box.
   - drive_min: compared with the model leg from the previous point, allowing 1 minute.
   - Day totals: legs plus the drive home plus 10 minutes per stop must be 120 minutes or less (allowing 1 minute), and must match the stored `minutes`.
6. **Proof the checker catches errors.** I ran it on deliberately broken copies of the data, and it flagged each one:
   - Swapping two stops in an 8-stop day flagged the day as not optimal, its link as wrong and its drive minutes as off.
   - Deleting one stop from a link flagged that link.
   - Copying a stop into a second day flagged a duplicate.

   On the real file it flags nothing.
