# Tooling and environment

## Scratch environment
- Scratchpad: the session's scratchpad directory (never the Adobe OneDrive working folder).
- Python: the Homebrew Python refuses user installs; create `python3 -m venv <scratch>/venv` and `pip install fpdf2 pillow pypdf openpyxl` there. `openpyxl` is also available in the system Python used by the compile scripts.
- Node: `docx` is installed globally; run generators with `NODE_PATH=$(npm root -g)`.
- Word export: Microsoft Word is installed; LibreOffice and poppler are not. Use osascript for PDF export and the Swift `pdf2png` helper (PDFKit) for page images.
- Browsers: the built-in browser for most sites; Chrome (Claude in Chrome) for Facebook Marketplace (owner's personal profile), Craigslist, OfferUp and Google Trends.
- WebSearch budget: 200 calls per turn shared by all agents; cap each agent at 60 to 70 and run at most three search-heavy agents at once.

## Scripts (all in `_internal/outreach/source/` unless noted)
| Script | Purpose | Market-specific parts |
|---|---|---|
| `<market>/make_<slug>_list.py` (copy of `knoxville/make_knoxville_list.py`) | Compile research JSON into the prospect workbook | `CENTER`, `RADIUS_MI`, `CITIES`, aliases in `locate()`, `OUT` name |
| `hbot_site_check.py check|apply <workbook>` | Crawl prospect websites for hyperbaric mentions; fill the column | none (cache is shared) |
| `make_loi.js` | State letters of intent from one template | add a `STATES` entry |
| `make_pamphlets_market.py <config.json>` | Seven trifold pamphlets from a config | the config file |
| `make_pamphlets_tn.py` | The Knoxville pamphlets as generated (reference) | hard-coded |
| `md2docx.js in.md out.docx "footer"` | Markdown to Word | none |
| `make_prospect_list.py` | The Utah compile script (different geography rules) | n/a |

## Checks before anything is sent
- Pamphlet text scan (pypdf): contact details twice, no hello@, no other phone, no other market's name, no banned words.
- LOI text scan: contact details, no Standard oxygen option for a new state, no tax rate.
- Counts agree: workbook Summary sheet = brief = README = index = runbook.
- Every page of every generated PDF rendered and looked at once.
