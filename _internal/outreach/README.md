# B2B outreach assets

Sales collateral for placing chambers in businesses (gyms, recovery studios, clinics).
Lives under `_internal/`, so it is in git but never served on purebaric.com.

| File | What it is |
|---|---|
| `purebaric_facility_prospectus.pdf` | 4-page prospectus for business owners |
| `purebaric_facility_partnership_pamphlet.pdf` | Double-sided trifold pamphlet |
| `email_greg_prospectus.html` | Branded email that goes with the PDFs |
| `email_greg_copy_for_gmail.html` | Same email with a "Copy email" button, for pasting into Gmail |
| `purebaric_chamber_logo.svg` | Logo with "1.5 ATA CHAMBER" beneath, as printed on the chamber photos |
| `branded-images/` | Chamber photos with the logo on the chamber, as used in the PDFs |
| `purebaric_b2b_prospects.xlsx` | Prospect list for the service area |
| `source/` | Python scripts that generated the PDFs, photos and SVG |

The scripts in `source/` were run from a temporary folder (fpdf2, pymupdf, Pillow, fontTools)
and contain paths from that machine; adjust the paths before re-running.
