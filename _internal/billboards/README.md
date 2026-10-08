# Purebaric digital billboard assets (2026-10-08)

Three designs, each exported at the four pixel sizes that cover most Wasatch Front digital boards.
Source photo: the living-room chamber render. Fonts: Inter (site font). Logo: site logo files.

| Design | Headline | Secondary line | URL treatment | Words |
|---|---|---|---|---|
| A | It's time to bring hyperbaric home. | Hyperbaric chamber rentals, delivered. | cream text | 6 + 4 |
| B | Hyperbaric at home. | none | terra pill | 3 |
| C | Bring hyperbaric home. | Chamber rentals from $529/mo | dark text on cream panel | 3 + 5 |

Sizes: 1400x400 (Lamar primary, 14'x48' bulletins, 3.5:1), 1536x384 (Blip 4:1), 1160x387 (Blip 3:1), 840x400 (Lamar secondary, 2.1:1).
Each is a JPG under 2 MB, RGB, no animation, no white background (Blip rejects pure white), no phone number, no fine print.
`sheet-*.png` are contact sheets. `*-2800x800-master.png` are 2x masters of the 1400x400 version.
`generate-billboards.py` rebuilds everything (needs Pillow and the Inter TTFs; paths at the top of the script).

## Vendor specs and one-month cost (researched 2026-10-08)
- **Blip Billboards** (self-serve slots on partner boards in Lehi, American Fork, Draper, Orem and more): JPG/PNG, RGB, max 2 MB, sizes shown per board in the campaign builder (common: 1536x384, 1160x387, 1840x526, 1762x470). 7.5 to 10 s per play. Pay per play, no minimum, no contract, no production fee; from about $20/day. Published estimates at $20/day: American Fork ~46 plays (~$0.43/play), Draper ~74 (~$0.27), Orem ~134 (~$0.15). A $500 month buys roughly 1,150 to 3,400 plays depending on board; $1,000 roughly double. Specs: https://help.blipbillboards.com/what-are-the-file-requirements-for-my-billboard-design
- **Reagan Outdoor** (largest Utah operator): rates and the Salt Lake digital spec sheet are not published; call 801-521-1775 and ask for "Salt Lake Art Specs DIGITAL" and slot count. Reagan says no production cost on digital.
- **YESCO Outdoor Media**: no published specs or rates; 8 slots of 8 s per board, 4-week cycles. 801-487-8481.
- **Lamar (Salt Lake)**: 1400x400 and 840x400 cover 90%+ of its screens; JPG at max quality, sRGB, no animated GIFs, text at least 15 in tall. Rates not published.
- **Third-party estimates for a 4-week digital bulletin slot** (one of ~8 advertisers in rotation): $1,500 to $4,500 typical for a local buy on Salt Lake freeways (AdQuick); $1,496 to $5,103, average $2,464 (Outdoor Advertising Guide); resellers quote $5,000 minimums (Blue Line Media).

## Recommendation for a first one-month run
Blip self-serve, $500 to $1,000 for the month, on boards along I-15 in Lehi, American Fork and Draper, using design B (fewest words) as the lead and A as the second creative. Check "See live pricing" per board before committing. Then ask Reagan and YESCO for quotes with their spec sheets for a proper rotation buy.

## Best practices applied
7 words or fewer per headline (A is 6 plus a 4-word tagline), bold sans-serif, mixed case, high contrast (cream on navy or ink on cream), one image, one message, logo plus short URL in the lower third at roughly a third of the headline size, no phone number, no fine print, no pure white background, 5-second read.
