import os
from PIL import Image, ImageDraw, ImageFont, ImageFilter, ImageChops
SRC=os.path.expanduser("~/projects/purebaric-newsite/images")
OUT="/Users/bailie/Library/CloudStorage/OneDrive-Adobe/DMe-C&P/Claude_AI/purebaric-outreach/branded-images"
INK=(43,35,32)
TAG="1.5 ATA CHAMBER"; TRACK=0.22; TAG_ALPHA=150   # admin-portal pattern: small, uppercase, letter-spaced, softer

def decal():
    logo=Image.open(os.path.join(SRC,"logo.png")).convert("RGBA")
    x0=int(44/26*logo.height)            # same left indent as .brand-admin-tag (under the wordmark)
    avail=logo.width-x0
    size=80
    while True:
        f=ImageFont.truetype("/System/Library/Fonts/Supplemental/Arial Bold.ttf",size)
        w=sum(f.getlength(c) for c in TAG)+TRACK*size*(len(TAG)-1)
        if w<=avail: break
        size-=1
    gap=int(5/26*logo.height)
    im=Image.new("RGBA",(logo.width,logo.height+gap+int(size*1.1)),(0,0,0,0))
    im.alpha_composite(logo,(0,0))
    d=ImageDraw.Draw(im); x=x0; y=logo.height+gap
    for c in TAG:
        d.text((x,y+int(size*0.8)),c,font=f,fill=INK+(TAG_ALPHA,),anchor="ls"); x+=f.getlength(c)+TRACK*size
    return im

def apply(src,out,center,width,angle,opacity=0.80):
    base=Image.open(os.path.join(SRC,src)).convert("RGB")
    dc=decal(); h=int(dc.height*width/dc.width)
    dc=dc.resize((width,h),Image.LANCZOS).rotate(angle,expand=True,resample=Image.BICUBIC).filter(ImageFilter.GaussianBlur(0.6))
    layer=Image.new("RGBA",base.size,(0,0,0,0))
    layer.alpha_composite(dc,(center[0]-dc.width//2, center[1]-dc.height//2))
    a=layer.split()[3].point(lambda v:int(v*opacity))
    ink=Image.new("RGB",base.size,INK)
    printed=Image.blend(ImageChops.multiply(base,ink),ink,0.35)
    p=os.path.join(OUT,out); Image.composite(printed,base,a).save(p,quality=93); print(p)

if __name__=="__main__": apply("chamber-living.webp","chamber-living-branded.jpg",(718,478),340,-2.0)
if __name__=="__main__": apply("chamber-side.jpg","chamber-side-branded.jpg",(484,490),320,-6.8)
