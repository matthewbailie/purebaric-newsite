# Enrichment pass: find emails (and owners) for gyms already discovered

Read BRIEF.md for the rules (WebSearch only; an email counts only if it appears verbatim in a search result;
never construct one; owner only if a source names them).

Your input file is a JSON array of businesses with name, website, address, city, phone, and maybe an owner. For each:
1. Run 1 to 3 targeted queries: `"<business>" <city> email`, `site:<domain> "@"`, `"@<domain>"`,
   `"<business>" owner`, `"<owner name>" <business>`. Facebook "About" snippets, Mindbody/Vagaro/ClassPass/GloFox booking
   pages, Yelp "From the business" sections, chamber-of-commerce listings and news pieces often carry the address.
2. Stop on that business after 3 queries whether or not you found one. Do not retry blocked tools.
3. Keep a running output file and rewrite it every 8 businesses so partial work survives.

Output: a JSON array at the path in your task, one object per INPUT business (include the ones you could not enrich):
{ "business", "city", "email" ("" if none), "email_confidence" ("high" | "medium" | "none"), "email_source",
  "owner" ("" if unknown or unchanged), "owner_title", "notes" }
Reply with a two-line summary: how many businesses, how many emails found.
