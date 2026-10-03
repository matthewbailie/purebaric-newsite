# Research brief: Purebaric B2B email prospect list

Purebaric (purebaric.com, Lehi, Utah) rents 1.5 ATA mild hyperbaric chambers and wants to place them in
businesses. Build a list of businesses to email, inside the delivery area, with a real contact email.

## Delivery area (must match)
A business qualifies if its street-address ZIP starts with 840, 841, or 844, OR is one of:
84201 84244 84601 84602 84603 84604 84605 84606 84626 84633 84651 84653 84660 84663 84664 84050 84018
84648 84645 84628 84639 84621 84623 84627 84629 84630 84642 84647 84667 84622 84632 84634 84643 84646 84662 84665
In practice: Salt Lake County, Utah County (Lehi, American Fork, Pleasant Grove, Orem, Provo, Springville,
Spanish Fork, Payson, Saratoga Springs, Eagle Mountain), Davis County (Bountiful, Farmington, Kaysville, Layton),
Weber County (Ogden, Roy, South Ogden), Summit (Park City), Wasatch (Heber, Midway), Tooele, plus Morgan, Nephi,
Sanpete towns. Record the ZIP for every row and drop anything outside the rule.

## Tools
- Use WebSearch only. WebFetch and curl are blocked for business websites in this environment; do not retry them.
- Good query patterns: `"<business>" email`, `"<business>" owner`, `site:<domain> "@<domain>"`, `"@<domain>"`,
  `"<business>" "<city>" contact`, `<category> <city> utah owner`, and directory/aggregator results
  (Yelp, ZoomInfo, RocketReach snippets, Facebook pages, Mindbody, Vagaro, GlossGenius, ClassPass, chamber of commerce listings).
- An email counts only if it appears verbatim in a search result snippet or a page summary WebSearch returns.
  Never guess or construct an address like info@domain. If no email surfaces after two or three targeted queries, keep the
  row with email blank, set email_confidence to "none", and note the contact form URL if one is known.
- Owner name: include only if a source names them (About page snippet, news article, LinkedIn/ZoomInfo snippet, Yelp "owner" field).

## Output
Write ONE JSON file at the path given in your task: an array of objects with exactly these keys
(use "" when unknown):
business, industry, owner, owner_title, email, email_confidence ("high" = on the business's own site or official
listing, "medium" = third-party directory, "none"), email_source, phone, website, address, city, zip, county,
notes, personal_note_hook

- industry must be one of: "Gyms and fitness centers", "CrossFit and performance gyms",
  "Sports teams and athletic programs", "Recovery studios and med spas",
  "Physical therapy, chiropractic, and sports medicine", "Salons and beauty studios".
- personal_note_hook: one specific, verifiable fact for a cold-email opener (a service they added, an award, a
  team they train, a notable review theme, a second location). Blank if you have nothing real.
- notes: anything the sender should know (franchise vs independent, multiple locations, closed/moved, "has HBOT already").
- Prefer independent, owner-operated businesses over national franchise locations, but include franchise locations
  when a local owner/GM email is found.
- Skip any business that already offers hyperbaric sessions; note it in a separate "already_has_hbot" array at the end
  of the file instead (same keys), because those are competitors / pricing references, not prospects.

Aim for 20 to 35 qualified rows for your industry, spread across the counties, with as many "high" emails as possible.
Quality over count: a row with a real email and a real owner is worth ten without. Stop when searches stop yielding new
businesses with emails. Write the file, then reply with a two-line summary: how many rows, how many with emails.
