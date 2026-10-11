# Tooling, environment and the document scans

## Scratch environment (one setup per session)
```bash
python3 -m venv "$SCRATCH/venv" && "$SCRATCH/venv/bin/pip" install -q fpdf2 pillow pypdf openpyxl requests
```
`$SCRATCH` is the session's scratchpad directory (never the Adobe OneDrive working folder). Use this venv for every Python script in the package: the compile script and `hbot_site_check.py` (needs `requests`), the pamphlet generator (fpdf2, Pillow) and the PDF text scans (pypdf). The Homebrew Python refuses user installs, which is why the venv exists.

Node: `docx` is installed globally; run every generator with `NODE_PATH=$(npm root -g)`.

PDF page images: build the helper once from `_internal/outreach/source/pdf2png.swift`:
```bash
cp ~/projects/purebaric-newsite/_internal/outreach/source/pdf2png.swift "$SCRATCH/" && cd "$SCRATCH" && swiftc -O pdf2png.swift -o pdf2png
./pdf2png file.pdf prefix      # writes prefix-1.png, prefix-2.png, ...
```

Word to PDF (Microsoft Word is installed; LibreOffice and poppler are not). One document per call, with Word otherwise closed; if `active document` errors appear, `pkill -x "Microsoft Word"` and retry:
```bash
osascript -e 'with timeout of 200 seconds
tell application "Microsoft Word"
set d to open file name (POSIX file "'"$SCRATCH"'/doc.docx") as string
delay 3
save as d file name (POSIX file "'"$SCRATCH"'/doc.pdf") file format format PDF
close d saving no
end tell
end timeout'
```
Always check the exported PDF's text (pypdf) for a phrase unique to that document before copying it anywhere; a stale Word window exports the wrong document silently.

Browsers: the built-in browser for most sites; Claude in Chrome for Facebook Marketplace (owner's personal profile), Craigslist, OfferUp and Google Trends. Sites that return 403 to fetches (tn.gov, Justia, Municode, city sites behind Cloudflare) often load in the built-in browser; read them there with `get_page_text` or `find`.

WebSearch budget: 200 calls per turn shared by all agents; cap each agent at 60 to 70 and run at most three search-heavy agents at once.

## Scripts (all in `_internal/outreach/source/` unless noted)
| Script | Purpose | Market-specific parts |
|---|---|---|
| `<market>/make_<slug>_list.py` (copy of `knoxville/make_knoxville_list.py`) | Compile research JSON into the prospect workbook and the review CSVs | `CENTER`, `RADIUS_MI`, `OUT`, `CITIES`, aliases in `locate()`, ZIP regex in `in_radius()`, state and city words in `STOP`, Summary title |
| `hbot_site_check.py check\|apply <workbook>` | Crawl prospect websites for hyperbaric mentions; fill the column | none (cache is shared) |
| `make_loi.js '{"<state>":"<out.docx>"}'` with `LOI_DATE`, `LOI_ENTITY`, `PRICING_JSON` env | State letters of intent | a `STATES` entry (every key listed in `05-sales-assets.md`) |
| `STATE=<state> WAIVER_OUT=<out.docx> node make_waiver.js` | Business Rental Agreement and Liability Waiver, state version | a `STATES` entry (contact, notice email and phone, law, venue, airOnly, renewalSection, subtitleSuffix) and the state's renewal section text |
| `node make_renewal_rider.js <out.docx>` | Automatic-renewal and recurring-charge disclosure rider | the statute citation, contact details and cancellation channels in the script |
| `make_pamphlets_market.py <config.json> <out_dir>` | Seven trifold pamphlets from a config | the config file (keys in `05-sales-assets.md`) |
| `md2docx.js in.md out.docx "footer"` | Markdown to Word | none |
| `make_pamphlets_tn.py`, `make_prospect_list.py` | The Knoxville pamphlets as generated; the Utah compile script | reference only |

## Scans before anything is sent (run them, paste the result into the response file)
Extract text with pypdf (PDF) or by stripping `word/document.xml` (docx). Match whole words, case-insensitive.

**Pamphlets (each of the seven):**
- Must contain the market contact phone and email at least twice, and the website.
- Must not contain: `hello@purebaric.com`; any other phone number; the home state's name or city (`Utah`, `Wasatch`, `Lehi`) or any other market's name; `therapy` (except inside the exact disclaimer sentence); `HBOT`; `patients`; `episodes of care`; `treatment plan`; `inflammation`; `sleep`; `detox`; `immunity`; `cure`; `heals` or `healing`; `this month`; `only one`; `first in`; `not a medical device`.
- Allowed despite containing a banned stem: the fixed disclaimer sentence ("not offered to diagnose, treat, cure or prevent any disease"), "treatment room", "body treatment", "not a medical treatment". Match `treat` only as the whole word `treat` outside the disclaimer sentence, and `heal` only as `heals`/`healing`, so "health" does not trip it.

**Letter of intent (state version):** market contact details present; no `hello@purebaric.com`; no "Standard: with oxygen" option; no tax rate percentage; no other state's name except the home-state entity line and the Utah comparison, if any (`grep -i` for the previous market's state and city).

**Rental agreement (state version):** the renewal section present where the state has a renewal statute; the air-only Exhibit A line where that is the decision; market contact details; the state's law and venue; no `hello@purebaric.com`.

**Counts:** workbook Summary sheet = executive brief = research README = documents index = runbook.

**Pages:** every page of every generated PDF rendered and looked at once.
