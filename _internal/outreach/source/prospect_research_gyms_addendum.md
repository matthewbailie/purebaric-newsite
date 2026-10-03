# Gyms pass 2: addendum to BRIEF.md

Industry for every row: "Gyms and fitness centers" (if you find a CrossFit affiliate or a sports-performance center, still
include it but set industry to "CrossFit and performance gyms").

## Broadened scope (the first pass was far too narrow)
Include every real, currently operating facility of these kinds in your assigned cities:
independent gyms and strength gyms, athletic clubs and health clubs (e.g. Sports Mall, Salt Lake Tennis & Health Club,
Cottonwood Club style), 24-hour gyms, women's gyms, personal-training studios, boutique studios (HIIT, spin, barre, Pilates
reformer, F45, Orangetheory, Burn Boot Camp, 9Round, Legends Boxing, TITLE Boxing, UFC Gym and similar franchises WITH a
local owner or GM), boxing / MMA / BJJ / martial-arts gyms with adult memberships, climbing gyms, racquet / tennis / pickleball
clubs, swim and athletic clubs, and large chain locations (VASA, EoS, Life Time, Planet Fitness, Anytime, Snap, Gold's,
24 Hour Fitness). For chain locations, use the location's own email or the GM/club manager if one is named; otherwise keep the
row with email blank and email_confidence "none" and the location phone. Municipal recreation centers: skip.

## Method (do discovery first, enrichment second, and SAVE AS YOU GO)
1. Discovery: for each assigned city run broad queries ("gyms in <city> utah", "<city> utah fitness center", "best gyms
   <city> utah", "<city> utah boxing gym", "<city> utah pilates studio", "<city> utah climbing gym", "<city> utah athletic club",
   Yelp / Google / gymbird / uslocalgyms / ClassPass / Mindbody listing pages). Collect every distinct name with its address.
2. Write the file after discovery with whatever you have (email blank), then enrich row by row: owner, email, hook.
   Rewrite the file every 8 to 10 rows so partial work survives if your search allowance runs out.
3. Targets: at least 30 rows for your region, more where the cities are dense. Coverage matters more than a perfect
   email on every row; a row with name, address, ZIP, phone and website is still useful.

## Already captured in pass 1 (do not repeat these)
- Big Mountain Barbell (Midvale)
- SLC Strength & Conditioning (Salt Lake City)
- X365 Fitness (Salt Lake City)
- The Backline SLC (Salt Lake City)
- The Gym at City Creek (Salt Lake City)
- Momentum Indoor Climbing (Trolley Square training gym) (Salt Lake City)
- The Front Climbing Club (Salt Lake City)
- Bouldering Project - The Granary (Salt Lake Bouldering Project) (Salt Lake City)
- Evolve Fitness (Lehi)
- Boom Fitness Culture (Lehi)
- CoreFit Studio (Lehi)
- Alpine Fitness (Alpine)
- Valhalla Strength Gym (American Fork)
- Elevate Fitness & Rehab (Orem)
- Trinity Iron Gym (Spanish Fork)
- Utah Iron Gym (Springville)
- The Refinery Gym (Bountiful) (Bountiful)
- Big John's Pro Gym / The Elite Training Facility (Bountiful)
- Pivot Fitness (Kaysville)
- Lifelong Fitness Personal Training Gym (Kaysville)
- Blue Collar Group Fitness (Layton)
- The Iron House Gym (Ogden)
- Iron Sharpens Iron LLC (Ogden)
- Resilience, A Private Gym (Park City)
- Park City Fit (Park City)
- Fierce Performance (formerly Iron Backs) (Heber City)
- The Fit Stop Health Club (Heber City)
- Gogan's Garage (Heber City)
- Salt Flats Sports + Fitness (Tooele)
- CrossFit Sandy (Sandy)
- CrossFit 801 (Woods Cross)
- CrossFit Lehi (Lehi)
- CrossFit Timpanogos (Lehi)
- PURE Life CrossFit (PURE Fitness SLC) (Salt Lake City (Millcreek))
- C2X CrossFit (Xcel Fitness) (Salt Lake City (Holladay))
- Salt Lake City CrossFit (Salt Lake City)
- Salt Lake City CrossFit The Point (Salt Lake City)
- Ute CrossFit (Salt Lake City (South Salt Lake))
- CrossFit EMC (Salt Lake City (Millcreek))
- Salty Hive CrossFit (Salt Lake City (Murray))
- Put It Up CrossFit (Orem)
- Rock Canyon CrossFit (Provo)
- CrossFit Draper (Draper)
- Wasatch CrossFit (Layton)
- CrossFit Kaysville (Kaysville)
- Acalo CrossFit (Centerville)
- CrossFit Iron Muscle (Depot Training) (Tooele)
- Elevated CrossFit American Fork (American Fork)
- CrossFit Hyperion (Pleasant Grove)
- Spanish Fork CrossFit (Spanish Fork)
- Hangar CrossFit SF (Spanish Fork)
- Skol CrossFit (Riverton)
- Saratoga Springs CrossFit (Saratoga Springs)
- Athletic Republic Park City (Park City)
- Athletic Republic West Jordan (West Jordan)
- Utah Performance Institute (West Haven)
- Elite Performance Prep Academy (Lehi) (Lehi)
- Utah Speed Academy (Utah County / Salt Lake County)
- Utah Speed and Strength (Layton)
- Sportgility (Utah County)

## Output
Same 15-key schema as BRIEF.md. Plain JSON array. Write to the path in your task.
