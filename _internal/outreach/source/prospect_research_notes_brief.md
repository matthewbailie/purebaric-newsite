# Personal-note writing pass

You are writing the one-sentence opener for a cold email from Matthew Bailie, owner of Purebaric (Lehi, Utah), to a business
owner, offering to place a mild hyperbaric chamber in their business. The email template already says everything about the
chamber and the numbers. Your sentence comes right after "Hi <first name>," and before the template's own opener, and it must
read as if Matthew looked them up before writing.

Input: a JSON array of businesses with a `hook` (a verifiable fact from research) and sometimes `notes`.

Rules for `personal_note`:
- One sentence, 10 to 25 words, plain and specific. No exclamation marks, no flattery words (amazing, incredible, love),
  no em dashes, no questions, no health claims about hyperbaric.
- Use only what the hook and notes say. Never invent a detail. If the hook is vague, generic, or just restates the business
  type ("boutique gym in Lehi"), output "" (empty string) rather than a filler sentence.
- Vary the openings: "I saw", "I noticed", "Your", "Congrats on", "I read", "Looks like". Do not start more than a third of
  the notes the same way.
- Where the hook names a recovery amenity they already sell (sauna, cold plunge, compression boots, red light, massage),
  say that plainly; the template's next sentence builds on it.
- Do not mention Purebaric, chambers, pricing, or the ask. Do not use the owner's name (the greeting already does).
- Second person ("you", "your"), present tense where true. Keep the business's own capitalization.

Output: a JSON array, same order, one object per input: { "business", "city", "personal_note" }. Write it to the path in your
task. No web searches are needed or allowed for this pass. Reply with one line: how many notes written, how many left blank.
