from PIL import Image, ImageDraw, ImageFont, ImageChops
import os
OUT=os.path.dirname(os.path.abspath(__file__))
SRC='/private/tmp/claude-503/-Users-bailie-Library-CloudStorage-OneDrive-Adobe-DMe-C-P-Claude-AI/80e57e63-bcda-4e7f-ac44-9f8193e4446b/images/30.webp'
LOGO_D='/Users/bailie/projects/purebaric-newsite/images/logo.png'
LOGO_C='/Users/bailie/projects/purebaric-newsite/images/logo-cream.png'
F=lambda w,s: ImageFont.truetype(os.path.join(OUT,'fonts/extras/ttf/Inter-%s.ttf'%w), max(8,int(s)))
INK=(43,35,32); CREAM=(247,242,234); TERRA=(184,101,77); TERRA_D=(154,79,58)
photo=Image.open(SRC).convert('RGB')
H=800

def fit(draw, text, weight, maxw, start, minsize=40):
    s=start
    while s>minsize:
        f=F(weight,s)
        if draw.textlength(text,font=f)<=maxw: return f
        s-=4
    return F(weight,minsize)

def logo(kind,h):
    im=Image.open(LOGO_C if kind=='cream' else LOGO_D).convert('RGBA')
    return im.resize((int(im.width*h/im.height),h),Image.LANCZOS)

def wall_fill(ph,w,h,wall_only=False):
    # strip sampled from the photo's plain wall, stretched to fill an area
    src=ph.crop((40,0,41,min(ph.height,int(ph.height*0.3)))) if wall_only else ph.crop((40,0,41,ph.height))
    return src.resize((w,h),Image.BILINEAR)


def top_fill(ph,w,h):
    """fill derived from the photo's own top rows: stretched, heavily blurred, lightly dithered so it never bands or blocks"""
    from PIL import ImageFilter
    import random
    # sample only the plain navy wall (left 40% of the photo's top rows) so wood and lamp tones don't smear into the band
    strip=ph.crop((0,0,max(2,int(ph.width*0.4)),6)).resize((w,h),Image.BILINEAR).filter(ImageFilter.GaussianBlur(45))
    noise=Image.effect_noise((w,h),6).convert('L')          # ~1.5% luminance dither
    return Image.composite(strip.point(lambda v:min(255,v+4)),strip,noise)

def blend_down(canvas,fill_src,x,top,span,width):
    """fade the band fill down over the photo's top `span` rows: fill alpha 1 at `top`, 0 at top+span"""
    span=max(8,span)
    fill=top_fill(fill_src,width,span)
    mask=Image.new('L',(width,span),0); md=ImageDraw.Draw(mask)
    for y in range(span): md.line([(0,y),(width,y)],fill=int(255*(1-y/span)**1.1))
    canvas.paste(fill,(x,top),mask)
    return canvas

def place_photo(canvas, pw, x0):
    """scale the photo to width pw; if shorter than H extend the wall upward, if taller crop vertically; paste at x0"""
    r=pw/photo.width; ph=photo.resize((pw,int(photo.height*r)),Image.LANCZOS)
    if ph.height<H:
        top=H-ph.height; ext=Image.new('RGB',(pw,H))
        ext.paste(top_fill(ph,pw,top+2),(0,0)); ext.paste(ph,(0,top))
        ext=blend_down(ext,ph,0,top,int(H*0.25),pw)
        ph=ext
    else:
        cut=ph.height-H; ph=ph.crop((0,int(cut*0.35),pw,int(cut*0.35)+H))
    canvas.paste(ph,(x0,0))
    # extend the wall to the left of the photo, then fade that extension INTO the photo in place (no pixel shift)
    if x0>0:
        from PIL import ImageFilter
        ext=wall_fill(ph,x0+2,H).filter(ImageFilter.GaussianBlur(6))
        canvas.paste(ext,(0,0))
        sw=min(700,max(60,pw//3)); fade=wall_fill(ph,sw,H).filter(ImageFilter.GaussianBlur(6))
        mask=Image.new('L',(sw,H),0); md=ImageDraw.Draw(mask)
        for x in range(sw): md.line([(x,0),(x,H)],fill=int(255*(1-x/sw)**1.6))
        canvas.paste(fade,(x0,0),mask)
    return canvas

def shade_left(im,W,reach=0.6):
    grad=Image.new('L',(W,H),0); gd=ImageDraw.Draw(grad); L=int(W*reach)
    for x in range(L): gd.line([(x,0),(x,H)],fill=int(150*(1-x/L)))
    # floor shading that fades out horizontally as well as vertically, so there is no hard edge
    band=Image.new('L',(W,H),0); bp=band.load(); L2=int(W*0.7)
    for y in range(300,H):
        v=90*min(1,(y-300)/320)
        for x in range(L2): bp[x,y]=int(v*(1-x/L2))
    grad=ImageChops.add(grad,band)
    return Image.composite(Image.new('RGB',(W,H),(10,18,28)),im,grad)

def photo_scene(W):
    r=H/photo.height; pw=int(photo.width*r); ph=photo.resize((pw,H),Image.LANCZOS)
    x0=W-pw
    im=Image.new('RGB',(W,H))
    if x0>=0: place_photo(im,pw,x0)
    else: im.paste(ph.crop((-x0,0,pw,H)),(0,0))
    im=shade_left(im,W)
    im.info['plant_x']=x0+int(pw*0.37)      # olive tree starts here
    im.info['cushion_x']=x0+int(pw*0.478)   # foam cushion under the chamber starts here
    return im

def pill(draw,xy,text,font,bg,fg,padx=36,pady=16,r=40):
    x,y=xy; w=draw.textlength(text,font=font); asc,desc=font.getmetrics(); h=asc+desc
    draw.rounded_rectangle([x,y,x+w+2*padx,y+h+2*pady],radius=r,fill=bg)
    draw.text((x+padx,y+pady),text,font=font,fill=fg)

def d0():
    return ImageDraw.Draw(Image.new('RGB',(10,10)))
def logo_row(im,d,kind,M,url_style,W,small=False,bottom_pad=None):
    lh=84 if small else 100; bp=M if bottom_pad is None else bottom_pad
    lg=logo(kind,lh); im.paste(lg,(M,H-bp-lg.height),lg)
    fu=F('Bold',60 if small else 72); x=M+lg.width+48; y=H-bp-lg.height+4
    if url_style=='pill': pill(d,(x,y-20),"purebaric.com",fu,TERRA,(255,255,255))
    else: d.text((x,y),"purebaric.com",font=fu,fill=CREAM if kind=='cream' else INK)

NARROW=2.6
def narrow_scene(W,band):
    # text band on top, photo bottom-right; the band is the photo's own top colour, blurred, and the photo fades up into it
    hp=H-band; r=hp/photo.height; pw=int(photo.width*r); ph=photo.resize((pw,hp),Image.LANCZOS)
    x0=max(0,W-pw)
    if pw>W: ph=ph.crop((pw-W,0,pw,hp)); pw=W
    im=Image.new('RGB',(W,H)); im.paste(top_fill(ph,W,band+2),(0,0))
    im.paste(ph,(x0,band))
    if x0>0:
        from PIL import ImageFilter
        im.paste(wall_fill(ph,x0+2,hp).filter(ImageFilter.GaussianBlur(6)),(0,band))
        sw=min(600,max(60,pw//3)); fade=wall_fill(ph,sw,hp).filter(ImageFilter.GaussianBlur(6))
        mask=Image.new('L',(sw,hp),0); md=ImageDraw.Draw(mask)
        for x in range(sw): md.line([(x,0),(x,hp)],fill=int(255*(1-x/sw)**1.6))
        im.paste(fade,(x0,band),mask)
    im=blend_down(im,ph,0,band,int(H*0.25),W)
    return shade_left(im,W,reach=0.9)

def design_a(W):
    if W/H<NARROW:
        M=80; colw=W-2*M
        f=F('ExtraBold',min(fit(d0(),"It\u2019s time to bring",'ExtraBold',colw,118).size,fit(d0(),"hyperbaric home.",'ExtraBold',colw,118).size)); s=f.size
        ft=fit(d0(),"Hyperbaric chamber rentals, delivered.",'SemiBold',colw,46)
        band=M-20+int(s*1.06)+int(s*1.15)+ft.size+24
        im=narrow_scene(W,band); d=ImageDraw.Draw(im); y=M-20
        d.text((M,y),"It\u2019s time to bring",font=f,fill=CREAM); y+=int(s*1.06)
        d.text((M,y),"hyperbaric home.",font=f,fill=CREAM); y+=int(s*1.15)
        d.text((M,y),"Hyperbaric chamber rentals, delivered.",font=ft,fill=(236,226,214))
        logo_row(im,d,'cream',M,'text',W,small=True); return im

    im=photo_scene(W); d=ImageDraw.Draw(im); M=100; colw=int(W*0.53)-M
    f=F('ExtraBold',min(fit(d,"It’s time to bring",'ExtraBold',colw,150).size,fit(d,"hyperbaric home.",'ExtraBold',colw,150).size)); s=f.size
    y=M; d.text((M,y),"It’s time to bring",font=f,fill=CREAM); y+=int(s*1.08)
    d.text((M,y),"hyperbaric home.",font=f,fill=CREAM); y+=int(s*1.25)
    ft=fit(d,"Hyperbaric chamber rentals, delivered.",'SemiBold',colw,58)
    d.text((M,y),"Hyperbaric chamber rentals, delivered.",font=ft,fill=(236,226,214))
    logo_row(im,d,'cream',M,'text',W); return im

def design_b(W):
    if W/H<NARROW:
        M=80; colw=W-2*M
        f=fit(d0(),"Hyperbaric at home.",'ExtraBold',colw,200); s=f.size
        band=M+int(s*1.15)+40
        im=narrow_scene(W,band); d=ImageDraw.Draw(im)
        d.text((M,M-10),"Hyperbaric at home.",font=f,fill=CREAM)
        logo_row(im,d,'cream',M,'pill',W,small=True); return im

    im=photo_scene(W); d=ImageDraw.Draw(im); M=100; colw=int(W*0.53)-M
    f=fit(d,"Hyperbaric",'ExtraBold',colw,230); s=f.size
    y=M-10; d.text((M,y),"Hyperbaric",font=f,fill=CREAM); y+=int(s*1.02)
    d.text((M,y),"at home.",font=f,fill=CREAM)
    logo_row(im,d,'cream',M,'pill',W); return im

def design_c(W):
    if W/H<NARROW:
        M=80; colw=W-2*M
        f=fit(d0(),"Bring hyperbaric home.",'ExtraBold',colw,140); s=f.size
        ft=fit(d0(),"Chamber rentals from $529/mo",'Bold',colw,58)
        pw=int(W*0.64); r=pw/photo.width; hp=int(photo.height*r); ph=photo.resize((pw,hp),Image.LANCZOS)
        band=H-hp
        im=Image.new('RGB',(W,H),CREAM); im.paste(ph,(W-pw,band))
        d=ImageDraw.Draw(im); y=M-24
        d.text((M,y),"Bring hyperbaric home.",font=f,fill=INK); y+=int(s*1.22)
        d.text((M,y),"Chamber rentals from $529/mo",font=ft,fill=TERRA_D)
        lg=logo('dark',84); fu=F('Bold',56); im.paste(lg,(M,H-M-lg.height-70),lg)
        d.text((M,H-M-lg.height-70+lg.height+14),"purebaric.com",font=fu,fill=INK)
        return im
    im=Image.new('RGB',(W,H),CREAM); d=ImageDraw.Draw(im)
    pw=int(W*0.585); x0=W-pw
    r=H/photo.height; ph=photo.resize((int(photo.width*r),H),Image.LANCZOS)
    if ph.width>=pw: ph=ph.crop((ph.width-pw,0,ph.width,H))
    else:
        tmp=Image.new('RGB',(pw,H)); place_photo(tmp,pw,0); ph=tmp
    mask=Image.new('L',(pw,H),255); md=ImageDraw.Draw(mask)
    for x in range(160): md.line([(x,0),(x,H)],fill=int(255*x/160))
    im.paste(ph,(x0,0),mask)
    M=100; colw=x0-M+40
    f=fit(d,"Bring hyperbaric",'ExtraBold',colw,150); s=f.size
    y=M; d.text((M,y),"Bring hyperbaric",font=f,fill=INK); y+=int(s*1.06)
    d.text((M,y),"home.",font=f,fill=INK); y+=int(s*1.3)
    ft=fit(d,"Chamber rentals from $529/mo",'Bold',colw,64)
    d.text((M,y),"Chamber rentals from $529/mo",font=ft,fill=TERRA_D)
    logo_row(im,d,'dark',M,'text',W); return im

CAP=0.72; XH=0.54; ASC=0.97          # Inter: cap height, x-height, ascent as fractions of font size
LOGO_INK=129/192                     # wordmark cap height as a fraction of the logo image height
def cap_text(d,x,cap_top,text,font,fill):
    """draw text so that its cap top sits exactly at cap_top; returns baseline y"""
    sz=font.size; d.text((x,cap_top-round(sz*(ASC-CAP))),text,font=font,fill=fill); return cap_top+round(sz*CAP)
def pill2(d,x,top,text,sz,bg,fg):
    """URL pill: height 2.75 x-heights, side padding and radius half the height, text centred on x-height"""
    f=F('ExtraBold',sz); xh=sz*XH; ph=int(xh*2.75); padx=ph//2
    tw=d.textlength(text,font=f)
    d.rounded_rectangle([x,top,x+tw+2*padx,top+ph],radius=ph//2,fill=bg)
    xtop=top+(ph-xh)/2; d.text((x+padx,xtop-sz*(ASC-XH)),text,font=f,fill=fg)
    return int(tw+2*padx),ph

FINAL_H=[400]   # set by the export loop: final pixel height, used for legibility floors
def design_d(W):
    """Hyperbaric at home. / From $529/mo.  Units of the headline cap height Hc:
       line pitch 1.48Hc, price cap 0.56Hc with 0.40Hc above, URL x-height 0.34Hc (floor 11 final px) in a 2.75x pill,
       wordmark cap 0.45Hc (floors 14px cap / 10px x-height), top margin 11%, bottom margin 10%."""
    k=H/FINAL_H[0]                      # master px per final px
    top=int(H*0.11); bot=int(H*0.10); M=100
    def parts(sz):
        Hc=sz*CAP
        price_sz=round(0.56*Hc/CAP)
        url_xh=max(0.34*Hc,11*k); url_sz=round(url_xh/XH); pill_h=round(url_sz*XH*2.75)
        logo_cap=max(0.45*Hc,14*k,10*k/0.72); logo_h=round(1.12*logo_cap/LOGO_INK)   # x1.12: the ink height includes the b ascender
        return Hc,price_sz,url_sz,pill_h,logo_h
    if W/H<NARROW:
        M=80; colw=W-2*M
        sz=fit(d0(),"Hyperbaric at home.",'ExtraBold',colw,190).size
        while True:
            Hc,price_sz,url_sz,pill_h,logo_h=parts(sz); gap=int(0.85*Hc)
            price_base=top+round(Hc)+round(0.40*Hc)+round(0.56*Hc)
            need=price_base+gap+pill_h+gap+logo_h+bot
            if need<=H or sz<=60: break
            sz-=4
        # cap the gap between price and pill at 1.2Hc; leftover goes to the top margin
        ly=H-bot-logo_h; pill_top=ly-gap-pill_h
        slack=(pill_top-price_base)-round(1.2*Hc)
        shift=max(0,slack); top+=shift; price_base+=shift
        band=price_base+int(0.3*Hc)
        im=narrow_scene(W,band); d=ImageDraw.Draw(im)
        base1=cap_text(d,M,top,"Hyperbaric at home.",F('ExtraBold',sz),CREAM)
        cap_text(d,M,base1+round(0.40*Hc),"From $529/mo",F('Bold',price_sz),(236,226,214))
        lg=logo('cream',logo_h); im.paste(lg,(M,ly),lg)
        pill2(d,M,pill_top,"purebaric.com",url_sz,TERRA,(255,255,255))
        return im
    im=photo_scene(W); d=ImageDraw.Draw(im)
    plant_x=im.info.get('plant_x',int(W*0.53)); cushion_x=im.info.get('cushion_x',W)
    col_right=min(int(W*0.53), plant_x); colw=col_right-M
    sz=fit(d,"Hyperbaric",'ExtraBold',colw,210).size
    while True:
        Hc,price_sz,url_sz,pill_h,logo_h=parts(sz); row_h=max(pill_h,logo_h)
        base2=top+round(1.48*Hc)+round(Hc); price_base=base2+round(0.40*Hc)+round(0.56*Hc)
        need=price_base+round(0.55*Hc)+row_h+bot
        lgw=round(logo_h*1136/192); fu=F('ExtraBold',url_sz)
        row_end=M+lgw+round(0.6*Hc)+d.textlength("purebaric.com",font=fu)+pill_h   # pill padding = half its height each side
        if (need<=H and row_end<=cushion_x-0.6*Hc) or sz<=80: break
        sz-=4
    top+= max(0,(H-need)//2)   # split any freed height above the headline and below the pill
    f=F('ExtraBold',sz)
    cap_text(d,M,top,"Hyperbaric",f,CREAM)
    base2=cap_text(d,M,top+round(1.48*Hc),"at home.",f,CREAM)
    price_base=cap_text(d,M,base2+round(0.40*Hc),"From $529/mo",F('Bold',price_sz),(236,226,214))
    row_top=price_base+round(0.55*Hc)
    lg=logo('cream',logo_h); im.paste(lg,(M,row_top+(row_h-lg.height)//2),lg)
    pill2(d,M+lg.width+round(0.6*Hc),row_top+(row_h-pill_h)//2,"purebaric.com",url_sz,TERRA,(255,255,255))
    return im

SIZES=[(1400,400,'lamar-bulletin'),(1536,384,'blip-4x1'),(1160,387,'blip-3x1'),(840,400,'lamar-840x400'),(880,240,'reagan-digital-bulletin'),(432,208,'reagan-digital-poster')]
DESIGNS=[('A-bring-hyperbaric-home',design_a),('B-hyperbaric-at-home',design_b),('C-split-price',design_c),('D-unlimited-price',design_d)]
os.makedirs(os.path.join(OUT,'final'),exist_ok=True)
for name,fn in DESIGNS:
    for w,h,tag in SIZES:
        W=int(round(H*w/h)); FINAL_H[0]=h; im=fn(W)
        out=im.resize((w,h),Image.LANCZOS)
        if name.startswith('D') and W/H<NARROW:
            n=Image.effect_noise((w,h),3).convert('L')   # +/-2 levels
            out=Image.composite(out.point(lambda v:min(255,v+2)),out.point(lambda v:max(0,v-2)),n)
        out.save(os.path.join(OUT,'final','%s-%dx%d-%s.jpg'%(name,w,h,tag)),quality=94)
        if (w,h)==(1400,400): im.save(os.path.join(OUT,'final','%s-2800x800-master.png'%name))
# contact sheets: one per design, all sizes stacked
for name,_ in DESIGNS:
    ims=[Image.open(os.path.join(OUT,'final','%s-%dx%d-%s.jpg'%(name,w,h,tag))) for w,h,tag in SIZES]
    sw=max(i.width for i in ims); sh=sum(i.height for i in ims)+30*(len(ims)-1)
    sheet=Image.new('RGB',(sw,sh),(255,255,255)); y=0
    for i in ims: sheet.paste(i,(0,y)); y+=i.height+30
    sheet.save(os.path.join(OUT,'final','sheet-%s.png'%name))
print('ok')

from PIL import ImageFont as _IF
def d_sheet():
    rows=[]; lab=F('SemiBold',22)
    for w,h,tag in SIZES:
        im=Image.open(os.path.join(OUT,'final','D-unlimited-price-%dx%d-%s.jpg'%(w,h,tag)))
        scale=min(1.0,1400/w); im=im.resize((int(w*scale),int(h*scale)),Image.LANCZOS)
        rows.append((im,'%dx%d  %s'%(w,h,tag)))
    sw=1400; sh=sum(r[0].height+40 for r in rows)+20
    sheet=Image.new('RGB',(sw,sh),(255,255,255)); d=ImageDraw.Draw(sheet); y=10
    for im,t in rows:
        d.text((0,y),t,font=lab,fill=(60,60,60)); y+=30; sheet.paste(im,(0,y)); y+=im.height+10
    sheet.save(os.path.join(OUT,'final','sheet-D-all-sizes.png'))
d_sheet()
