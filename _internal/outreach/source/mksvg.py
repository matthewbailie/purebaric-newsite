import os, glob
from fontTools.ttLib import TTFont
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen
from fontTools.pens.boundsPen import BoundsPen
from PIL import ImageFont

OUT="/Users/bailie/Library/CloudStorage/OneDrive-Adobe/DMe-C&P/Claude_AI/purebaric-brand/purebaric_chamber_logo.svg"
fr=glob.glob(os.path.expanduser("~/Library/Application Support/Claude/local-agent-mode-sessions/skills-plugin/*/*/skills/morning/assets/fonts/fraunces-latin-600-normal.woff2"))[0]
INK="#2b2320"; W=1136; LOGO_H=192
# measured from images/logo.png: left edge of each letter, baseline, cap height
LEFTS=[328,439,544,622,705,810,900,978,1029]; BASE=151; CAP_TOP=34

def glyph_path(font, ch, scale, x, base):
    gs=font.getGlyphSet(); name=font.getBestCmap()[ord(ch)]
    bp=BoundsPen(gs); gs[name].draw(bp); xmin=bp.bounds[0] if bp.bounds else 0
    return name, xmin, gs

f=TTFont(fr); gs=f.getGlyphSet(); cmap=f.getBestCmap()
bp=BoundsPen(gs); gs[cmap[ord("P")]].draw(bp); scale=(BASE-CAP_TOP)/bp.bounds[3]
word=[]
for ch,left in zip("Purebaric",LEFTS):
    n=cmap[ord(ch)]; b=BoundsPen(gs); gs[n].draw(b)
    pen=SVGPathPen(gs, ntos=lambda v:("%.2f"%v).rstrip("0").rstrip("."))
    gs[n].draw(TransformPen(pen,(scale,0,0,-scale,left-b.bounds[0]*scale,BASE)))
    word.append(pen.getCommands())

# tag line, same rules as the admin portal's .brand-admin-tag
TAG="1.5 ATA CHAMBER"; TRACK=0.22; X0=int(44/26*LOGO_H); GAP=int(5/26*LOGO_H)
ab="/System/Library/Fonts/Supplemental/Arial Bold.ttf"
size=80
while True:
    pf=ImageFont.truetype(ab,size)
    if sum(pf.getlength(c) for c in TAG)+TRACK*size*(len(TAG)-1)<=W-X0: break
    size-=1
a=TTFont(ab); ags=a.getGlyphSet(); acmap=a.getBestCmap(); s2=size/a["head"].unitsPerEm
base2=LOGO_H+GAP+int(size*0.8); x=X0; tag=[]
for ch in TAG:
    n=acmap[ord(ch)]
    pen=SVGPathPen(ags, ntos=lambda v:("%.2f"%v).rstrip("0").rstrip("."))
    ags[n].draw(TransformPen(pen,(s2,0,0,-s2,x,base2)))
    if pen.getCommands(): tag.append(pen.getCommands())
    x+=a["hmtx"][n][0]*s2+TRACK*size
H=LOGO_H+GAP+int(size*1.1)
svg=f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H}" width="{W}" height="{H}" role="img" aria-labelledby="t d">
  <title id="t">Purebaric 1.5 ATA Chamber</title>
  <desc id="d">Purebaric logo with the line "1.5 ATA Chamber" beneath the wordmark, for printing on the chamber.</desc>
  <g fill="none" stroke="{INK}" stroke-width="12" stroke-linecap="round">
    <circle cx="135.5" cy="95.5" r="84"/>
    <line x1="24" y1="151.5" x2="247" y2="151.5"/>
  </g>
  <path fill="{INK}" d="{' '.join(word)}"/>
  <path fill="{INK}" fill-opacity="0.6" d="{' '.join(tag)}"/>
</svg>
'''
open(OUT,"w").write(svg); print(OUT,len(svg),"tag size",size,"H",H)
