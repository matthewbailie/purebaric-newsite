import os
from PIL import Image
from fpdf import FPDF

SRC = os.path.expanduser("~/projects/purebaric-newsite/images")
OUT_DIR = "/Users/bailie/Library/CloudStorage/OneDrive-Adobe/DMe-C&P/Claude_AI/purebaric-outreach"
CROP = "/tmp/pbprev/crops"; os.makedirs(CROP, exist_ok=True)

INK=(43,35,32); MUTED=(111,99,91); CREAM=(247,242,234); CREAM2=(239,231,219)
TERRA=(184,101,77); TERRA_D=(154,79,58); TERRA_BG=(244,231,223); LINE=(230,220,205); WHITE=(255,255,255)

def crop(src, out, w, h, focus=(0.5,0.5)):
    im = Image.open(os.path.join(SRC, src)).convert("RGB")
    tr = w/h
    if im.width/im.height > tr:
        nw = int(im.height*tr); x0 = int((im.width-nw)*focus[0]); im = im.crop((x0,0,x0+nw,im.height))
    else:
        nh = int(im.width/tr); y0 = int((im.height-nh)*focus[1]); im = im.crop((0,y0,im.width,y0+nh))
    p = os.path.join(CROP, out); im.save(p, quality=92); return p

PW, PH = 279.4, 215.9
W = PW/3; M = 9; CW = W - 2*M

pdf = FPDF(orientation="L", unit="mm", format="Letter")
pdf.set_auto_page_break(False)
pdf.add_font("Georgia","B","/System/Library/Fonts/Supplemental/Georgia Bold.ttf")
pdf.add_font("Georgia","","/System/Library/Fonts/Supplemental/Georgia.ttf")

def px(i): return i*W

def heading(i, y, text, size=14.5, color=TERRA_D, lh=6.3):
    pdf.set_xy(px(i)+M, y); pdf.set_font("Georgia","B",size); pdf.set_text_color(*color)
    pdf.multi_cell(CW, lh, text, align="L"); return pdf.get_y()

def sub(i, y, text, size=10.5):
    pdf.set_xy(px(i)+M, y); pdf.set_font("Georgia","B",size); pdf.set_text_color(*INK)
    pdf.multi_cell(CW, 5, text, align="L"); return pdf.get_y()

def para(i, y, text, size=8.9, color=INK, lh=4.1, style="", w=None, dx=0):
    pdf.set_xy(px(i)+M+dx, y); pdf.set_font("Helvetica",style,size); pdf.set_text_color(*color)
    pdf.multi_cell(w or CW-dx, lh, text, align="L", markdown=True); return pdf.get_y()

def bullets(i, y, items, size=8.9, lh=4.1, gap=2.0):
    for t in items:
        pdf.set_fill_color(*TERRA); pdf.ellipse(px(i)+M, y+1.2, 1.9, 1.9, "F")
        y = para(i, y, t, size=size, lh=lh, dx=4.4) + gap
    return y

def steps(i, y, items, size=8.9, lh=4.1, gap=2.4):
    for n, t in enumerate(items, 1):
        pdf.set_fill_color(*TERRA); pdf.ellipse(px(i)+M, y-0.3, 5.4, 5.4, "F")
        pdf.set_xy(px(i)+M, y+0.35); pdf.set_font("Helvetica","B",8); pdf.set_text_color(*WHITE)
        pdf.cell(5.4, 4, str(n), align="C")
        y2 = para(i, y, t, size=size, lh=lh, dx=7.6)
        y = max(y2, y+5.4) + gap
    return y

def folds():
    pdf.set_draw_color(*LINE); pdf.set_dash_pattern(dash=1.2, gap=1.2)
    for k in (1,2): pdf.line(px(k),0,px(k),PH)
    pdf.set_dash_pattern()

def logo(i, y, w=30, cream=False):
    f = os.path.join(SRC, "logo-cream.png" if cream else "logo.png")
    im = Image.open(f); h = w*im.height/im.width
    pdf.image(f, x=px(i)+M, y=y, w=w, h=h); return y+h

# =================== PAGE 1: OUTSIDE  [flap | back | cover] ===================
pdf.add_page()

# ---- Flap (left): what it is + what a session looks like
y = heading(0, 13, "What Is a Mild\nHyperbaric Chamber?")
y = para(0, y+3,
  "A mild hyperbaric chamber is a soft-shell chamber that a client lies down inside. "
  "A quiet machine beside it gently raises the air pressure to **1.5 ATA**, about one and a half "
  "times normal air pressure, and supplies oxygen-enriched air.")
y = para(0, y+2.5,
  "Clients use sessions for general wellness and relaxation. It is popular with athletes and "
  "active people as part of a recovery routine. It is a wellness amenity, not a medical treatment.")
img = crop("/Users/bailie/Library/CloudStorage/OneDrive-Adobe/DMe-C&P/Claude_AI/purebaric-outreach/branded-images/chamber-side-branded.jpg", "flap.jpg", CW, 40)
pdf.image(img, x=px(0)+M, y=y+4, w=CW, h=40); pdf.set_draw_color(*LINE); pdf.rect(px(0)+M, y+4, CW, 40)
y = sub(0, y+50, "What a session looks like")
y = steps(0, y+2.5, [
  "The client lies down inside and your staff closes the chamber.",
  "The chamber pressurizes gradually over a few minutes. Ears may pop, like on a plane.",
  "The client rests, reads, or naps for the session.",
  "The chamber depressurizes gradually and the client steps out.",
])

# ---- Back (middle): credibility + offer + contact
pdf.set_fill_color(*INK); pdf.rect(px(1), 0, W, PH, "F")
ly = logo(1, 16, w=38, cream=True)
pdf.set_xy(px(1)+M, ly+10); pdf.set_font("Georgia","B",15); pdf.set_text_color(*CREAM2)
pdf.multi_cell(CW, 6.6, "See if a chamber fits\nyour facility", align="L")
y = para(1, pdf.get_y()+4,
  "Book a free 15-minute call. We will walk through your space, your members, and the numbers "
  "for your facility, with no obligation.", size=9.4, color=(230,218,200), lh=4.5)
pdf.set_fill_color(*TERRA); pdf.rect(px(1)+M, y+6, CW, 27, "F")
pdf.set_xy(px(1)+M+5, y+10); pdf.set_font("Helvetica","B",12.5); pdf.set_text_color(*WHITE)
pdf.multi_cell(CW-10, 6.2, "(801) 901-0873\nhello@purebaric.com\npurebaric.com", align="L")
y = y + 6 + 27
y = para(1, y+9, "**Utah-based and local.** Purebaric chambers are in use across the Wasatch Front today. "
  "You work directly with the owner, from the first call through installation and ongoing support.",
  size=9, color=(230,218,200), lh=4.3)
para(1, PH-30,
  "Purebaric provides general-wellness equipment. It is not a medical device and is not intended to "
  "diagnose, treat, cure, or prevent any disease. Revenue figures in this pamphlet are estimates, not guarantees.",
  size=6.8, color=(170,158,146), lh=3.2)

# ---- Cover (right)
cy = logo(2, 13, w=34)
src_im = Image.open(os.path.join(SRC, "/Users/bailie/Library/CloudStorage/OneDrive-Adobe/DMe-C&P/Claude_AI/purebaric-outreach/branded-images/chamber-living-branded.jpg"))
ih = W * src_im.height / src_im.width          # whole photo, no crop, so the full chamber shows
img = crop("/Users/bailie/Library/CloudStorage/OneDrive-Adobe/DMe-C&P/Claude_AI/purebaric-outreach/branded-images/chamber-living-branded.jpg", "cover.jpg", W, ih)
pdf.image(img, x=px(2), y=cy+8, w=W, h=ih)
pdf.set_xy(px(2)+M, cy+8+ih+10); pdf.set_font("Georgia","B",19); pdf.set_text_color(*INK)
pdf.multi_cell(CW, 7.9, "A New Revenue-\nGenerating Amenity\nfor Your Facility", align="L")
y = para(2, pdf.get_y()+4,
  "Offer hyperbaric sessions to your members and clients. You keep the session revenue.",
  size=9.8, color=MUTED, lh=4.7)
y = bullets(2, y+6, [
  "**Installed and serviced** by Purebaric",
  "**Staff training and runbook** included",
  "**Template consent forms** for your intake",
  "**Marketing pamphlet** crafted for your brand",
  "**No equipment to buy** or maintain",
], size=9.2, lh=4.3, gap=2.2)
pdf.set_fill_color(*TERRA); pdf.rect(px(2), PH-10, W, 10, "F")
pdf.set_xy(px(2), PH-10); pdf.set_font("Helvetica","B",9.3); pdf.set_text_color(*WHITE)
pdf.cell(W, 10, "HYPERBARIC CHAMBER RENTALS FOR FACILITIES", align="C")
folds()

# =================== PAGE 2: INSIDE  [why | numbers | how + included] ===================
pdf.add_page()

# ---- Inside left: why it makes money
y = heading(0, 13, "Why It Makes\nMoney for You")
y = bullets(0, y+4, [
  "**Add-on revenue from members you already have.** Sell sessions, packages, or a premium membership tier to people already walking through your door.",
  "**Recurring income.** Utah facilities sell 10- and 20-session packs and monthly memberships, which turns one-time visits into repeat revenue.",
  "**A reason to choose you.** A hyperbaric chamber is a premium amenity that helps your facility stand out from the gym or studio down the street.",
  "**Retention.** Clients who build a weekly session into their routine have one more reason to stay.",
  "**Earn from idle space.** A chamber needs only a 4 x 8 foot area and a wall outlet.",
  "**No capital outlay.** You rent the chamber. There is no equipment to buy, finance, or resell.",
], size=8.6, lh=3.9, gap=1.7)
by0 = y+2
pdf.set_fill_color(*TERRA_BG); pdf.rect(px(0)+M, by0, CW, 90, "F")
pdf.set_xy(px(0)+M+4, by0+3.5); pdf.set_font("Georgia","B",10); pdf.set_text_color(*TERRA_D)
pdf.cell(CW-8, 5, "Who books sessions?")
yy = by0+10.5
for fac, who in [
  ("Gyms and fitness centers", "Members recovering between workouts, weekend competitors, personal-training clients."),
  ("Sports teams and athletic programs", "Athletes in season, athletes in heavy training blocks, coaches and staff."),
  ("Recovery studios and med spas", "Clients already buying sauna, cold plunge, massage, or IV services."),
  ("Physical therapy and chiropractic clinics", "Clients who want a wellness add-on alongside their visits."),
  ("CrossFit and performance gyms", "Competitive athletes and members training five or more days a week."),
  ("Plastic surgery and medical practices", "Clients recovering after a procedure, with their provider's approval."),
]:
    yy = para(0, yy, "**"+fac+"**", size=8.3, lh=3.8, dx=4, w=CW-8)
    yy = para(0, yy, who, size=8.1, lh=3.7, dx=4, w=CW-8, color=MUTED) + 1.6

# ---- Inside middle: the numbers
y = heading(1, 12, "The Numbers")
y = sub(1, y+2, "What Utah facilities charge today(1)", size=9.6)
pdf.set_draw_color(*LINE)
yy = y+1.5
for l, v, n in [
  ("Single session (60 min)", "$79 - $129", ""),
  ("10-session pack", "$750 - $1,290", "$75 - $129 a session"),
  ("20-session pack", "$1,400 - $2,580", "$70 - $129 a session"),
]:
    pdf.set_xy(px(1)+M, yy); pdf.set_font("Helvetica","",8.3); pdf.set_text_color(*INK); pdf.cell(CW*0.58, 4.3, l)
    pdf.set_font("Helvetica","B",8.3); pdf.cell(CW*0.42, 4.3, v, align="R")
    if n:
        pdf.set_xy(px(1)+M, yy+3.7); pdf.set_font("Helvetica","",7.1); pdf.set_text_color(*MUTED); pdf.cell(CW, 3.4, n, align="R"); yy += 3.2
    yy += 5.0
    pdf.line(px(1)+M, yy-0.6, px(1)+M+CW, yy-0.6)
y = para(1, yy+1.5, "**Our assumptions:** 60-minute sessions, open 6 days a week (26 days a month), at a blended "
  "**$75 a session**, between the local 20-pack rate and the lowest single price. One chamber can run up to 8 sessions in a 10-hour day.",
  size=8.1, color=MUTED, lh=3.7)
ty = y+3
cw = [CW*0.35, CW*0.25, CW*0.40]; rh = 6.6
pdf.set_xy(px(1)+M, ty); pdf.set_fill_color(*INK); pdf.set_text_color(*WHITE); pdf.set_font("Helvetica","B",7.6)
for w_, h_ in zip(cw, ["Usage","Sessions / mo","Gross revenue / mo"]): pdf.cell(w_, rh, h_, align="C", fill=True)
pdf.ln(rh)
for k,(a,b,c) in enumerate([("Light: 2 a day","52","$3,900"),("Moderate: 4 a day","104","$7,800"),("Strong: 6 a day","156","$11,700")]):
    pdf.set_x(px(1)+M); pdf.set_fill_color(*(CREAM if k%2==0 else WHITE)); pdf.set_draw_color(*LINE)
    pdf.set_font("Helvetica","",8.4); pdf.set_text_color(*INK)
    pdf.cell(cw[0], rh, a, border=1, align="C", fill=True); pdf.cell(cw[1], rh, b, border=1, align="C", fill=True)
    pdf.set_font("Helvetica","B",8.6); pdf.set_text_color(*TERRA_D); pdf.cell(cw[2], rh, c, border=1, align="C", fill=True); pdf.ln(rh)
y = sub(1, pdf.get_y()+3.5, "What it costs you", size=9.6)
y = bullets(1, y+2, [
  "**Chamber rental:** $979 a month on a 12-month term. About 14 sessions a month covers it.",
  "**Install, training, and initial supplies:** one-time $500 fee.",
  "**Staff time:** about 15 minutes per session.",
  "**Masks and cleaning supplies:** about $1.30 per use.",
], size=8.3, lh=3.8, gap=1.2)
by = y+1.5
pdf.set_fill_color(*TERRA_BG); pdf.rect(px(1)+M, by, CW, 43, "F")
pdf.set_xy(px(1)+M+4, by+3.5); pdf.set_font("Georgia","B",10); pdf.set_text_color(*TERRA_D)
pdf.cell(CW-8, 5, "Example: moderate usage")
pdf.set_font("Helvetica","",8.3); pdf.set_text_color(*INK)
rows = [("Session revenue (104 x $75)","$7,800"),("Chamber rental","- $979"),("Masks and cleaning (104 x $1.30)","- $135")]
yy = by+9.5
for l,v in rows:
    pdf.set_xy(px(1)+M+4, yy); pdf.cell(CW-30, 4.6, l); pdf.cell(22, 4.6, v, align="R"); yy += 4.5
pdf.set_draw_color(*TERRA); pdf.line(px(1)+M+4, yy+0.6, px(1)+M+CW-4, yy+0.6)
pdf.set_xy(px(1)+M+4, yy+1.8); pdf.set_font("Helvetica","B",9.2); pdf.set_text_color(*TERRA_D)
pdf.cell(CW-30, 5, "Net revenue each month"); pdf.cell(22, 5, "$6,686", align="R")
para(1, yy+8, "First month only: subtract the one-time $500 fee for install, training, and initial supplies.", size=7.6, color=MUTED, lh=3.5, dx=4, w=CW-8)
para(1, by+45, "(1) Published 2026 prices from facilities in Lehi, Orem, and Salt Lake City. All figures are "
  "estimates before staff time, facility overhead, and taxes. Adjust the example with your own price.",
  size=6.5, color=MUTED, lh=3.0)

# ---- Inside right: how it works + what's included
y = heading(2, 13, "How It Works")
y = steps(2, y+4, [
  "**Talk with us.** A short call about your space, clients, and goals.",
  "**We deliver and install.** We set up the chamber and machine in your room.",
  "**We train your staff.** Hands-on training so your team can run sessions with confidence.",
  "**You start selling sessions.** Add it to your menu, packages, and memberships.",
], gap=2.2)
by1 = y+1
pdf.set_fill_color(*TERRA_BG); pdf.rect(px(2)+M, by1, CW, 27, "F")
pdf.set_xy(px(2)+M+4, by1+3.5); pdf.set_font("Georgia","B",10); pdf.set_text_color(*TERRA_D)
pdf.cell(CW-8, 5, "What's needed")
yy = by1+10.5
for t in ["**A 4 x 8 foot area**, about the size of a twin-size bed.", "**Access to a wall outlet.**"]:
    pdf.set_fill_color(*TERRA); pdf.ellipse(px(2)+M+4, yy+1.1, 1.8, 1.8, "F")
    yy = para(2, yy, t, size=8.6, lh=4, dx=8.2, w=CW-12) + 1.5
y = by1+27
y = heading(2, y+5, "After Installation,\nWe Support Your Needs", size=13, lh=5.7)
y = bullets(2, y+3.5, [
  "**Initial staff training.** Hands-on training with the chamber, so your team learns by running it.",
  "**Staff runbook.** A written runbook your staff can follow day to day and use to train new team members.",
  "**Template legal consent forms.** Ready-to-use client consent and waiver templates, so the chamber fits into your intake process from day one. Have your own counsel review them for your business.",
  "**A marketing pamphlet for your brand.** We help you craft a client-facing pamphlet, in your brand, to sign up new clients.",
  "**Equipment service.** We service and maintain the chamber and machine.",
  "**Ongoing support.** Call or text with questions. If something is not working, we fix it.",
], size=8.6, lh=3.9, gap=1.7)
pdf.set_fill_color(*INK); pdf.rect(px(2), PH-24, W, 24, "F")
pdf.set_xy(px(2)+M, PH-20); pdf.set_font("Georgia","B",10.5); pdf.set_text_color(*CREAM2)
pdf.cell(CW, 5.5, "Ready to talk?")
pdf.set_xy(px(2)+M, PH-13.5); pdf.set_font("Helvetica","B",9.2); pdf.set_text_color(*WHITE)
pdf.cell(CW, 5, "(801) 901-0873  |  hello@purebaric.com")
folds()

out = os.path.join(OUT_DIR, "purebaric_facility_partnership_pamphlet.pdf")
pdf.output(out); print("saved", out, "pages", pdf.pages_count)
