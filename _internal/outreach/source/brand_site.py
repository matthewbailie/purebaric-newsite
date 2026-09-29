import os, brand2
from PIL import Image
brand2.SRC_LOGO=None
S=os.path.dirname(os.path.abspath(__file__))
jobs=[("chamber-living.webp",(718,478),340,-2.0),
      ("chamber-side.jpg",(484,490),320,-6.8),
      ("chamber-hero.jpg",(490,486),320,-7.1),
      ("chamber-room.webp",(609,474),340,-2.8)]
import brand2 as b
from PIL import ImageFilter, ImageChops
for f,c,w,ang in jobs:
    base=Image.open(os.path.join(S,"orig",f)).convert("RGB")
    dc=b.decal(); h=int(dc.height*w/dc.width)
    dc=dc.resize((w,h),Image.LANCZOS).rotate(ang,expand=True,resample=Image.BICUBIC).filter(ImageFilter.GaussianBlur(0.6))
    layer=Image.new("RGBA",base.size,(0,0,0,0)); layer.alpha_composite(dc,(c[0]-dc.width//2,c[1]-dc.height//2))
    a=layer.split()[3].point(lambda v:int(v*0.80))
    ink=Image.new("RGB",base.size,b.INK)
    res=Image.composite(Image.blend(ImageChops.multiply(base,ink),ink,0.35),base,a)
    out=os.path.join(S,"site",f)
    if f.endswith(".webp"): res.save(out,"WEBP",quality=88,method=6)
    else: res.save(out,quality=90,optimize=True,progressive=True)
    print(f,os.path.getsize(out),"orig",os.path.getsize(os.path.join(S,"orig",f)))
