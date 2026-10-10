# Research brief: Purebaric B2B prospect list, Knoxville, Tennessee (market research, 2026-10-10)

Purebaric (purebaric.com, Lehi, Utah) rents 1.5 ATA mild hyperbaric chambers and places them in businesses that sell
sessions to their clients. The owner is evaluating Knoxville, Tennessee as a second market. Build a list of businesses
within a 25-mile radius of downtown Knoxville (35.961, -83.921) that might rent a chamber. This is research only.

## Area (must match)
Inside the 25-mile circle: all of Knox County (Knoxville, Farragut, Powell, Halls, Karns, Hardin Valley, Fountain City,
Bearden, Cedar Bluff, West Knoxville, South Knoxville, Corryton, Mascot, Strawberry Plains, Concord), Blount County north
of Townsend (Maryville, Alcoa, Louisville, Friendsville, Rockford, Walland, Greenback), Anderson County (Oak Ridge,
Clinton, Norris, Andersonville, Oliver Springs, Rocky Top), Loudon County east half (Lenoir City, Loudon, Tellico Village
is borderline at about 27 miles), Sevier County west edge (Seymour, Kodak, Sevierville city centre is about 25 miles),
Union County (Maynardville, Luttrell), Jefferson County west edge (New Market, Dandridge is borderline at about 28 miles).
OUTSIDE (do not include): Pigeon Forge, Gatlinburg, Townsend, Morristown, Kingston, Harriman, Crossville, Athens,
Sweetwater, Madisonville, Jefferson City, Newport, LaFollette, Tazewell.
Record city and ZIP for every row. Knoxville-area ZIPs are 377xx and 378xx, but a ZIP alone does not prove the radius;
use the city list above.

## Tools
- Use WebSearch only. WebFetch and curl are blocked for business websites in this environment; do not retry them.
- Good query patterns: `"<business>" email`, `"<business>" owner`, `site:<domain> "@<domain>"`, `"@<domain>"`,
  `"<business>" "<city>" contact`, `<category> <city> tn owner`, and directory/aggregator results
  (Yelp, ZoomInfo, RocketReach snippets, Facebook pages, Mindbody, Vagaro, GlossGenius, ClassPass, Knoxville Chamber,
  Blount Partnership, Oak Ridge Chamber listings, Knoxville News Sentinel and Knox TN Today articles).
- An email counts only if it appears verbatim in a search result snippet or a page summary WebSearch returns.
  Never guess or construct an address like info@domain. If no email surfaces after two or three targeted queries, keep the
  row with email blank, set email_confidence to "none", and note the contact form URL if one is known.
- Owner name: include only if a source names them (About page snippet, news article, LinkedIn/ZoomInfo snippet, Yelp "owner" field).

## Output
Write ONE JSON file at the path given in your task: an array of objects with exactly these keys (use "" when unknown):
business, industry, owner, owner_title, email, email_confidence ("high" = on the business's own site or official
listing, "medium" = third-party directory, "none"), email_source, phone, website, address, city, zip, county,
notes, personal_note_hook

- industry must be one of: "Gyms and fitness centers", "CrossFit and performance gyms",
  "Sports teams and athletic programs", "Recovery studios and med spas",
  "Physical therapy, chiropractic, and sports medicine", "Salons and beauty studios".
- personal_note_hook: one specific, verifiable fact for a cold-email opener (a service they added, an award, a
  team they train, a notable review theme, a second location). Blank if you have nothing real.
- notes: anything the sender should know (franchise vs independent, multiple locations, closed/moved, "has HBOT already",
  the source you used for the address).
- Prefer independent, owner-operated businesses over national franchise locations, but include franchise locations
  when a local owner/GM email is found.
- Skip any business that already offers hyperbaric sessions; put it in a separate "already_has_hbot" array at the end
  of the file instead (same keys), because those are competitors / pricing references, not prospects. Knoxville has
  several HBOT providers; capturing them matters for the market assessment.

Aim for 25 to 40 qualified rows for your industry, spread across Knox, Blount, Anderson and Loudon counties, with as many
"high" emails as possible. Quality over count. Every row must have a real street address and either a phone or a website.
Stop when searches stop yielding new businesses. Write the file, then reply with a two-line summary: how many rows,
how many with emails, how many competitors found.
