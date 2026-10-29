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


B = "/Users/bailie/Library/CloudStorage/OneDrive-Adobe/DMe-C&P/Claude_AI/purebaric-outreach/branded-images/"
SOFT=(230,218,200)

def box(i, y, h, title):
    pdf.set_fill_color(*TERRA_BG); pdf.rect(px(i)+M, y, CW, h, "F")
    pdf.set_xy(px(i)+M+4, y+3.5); pdf.set_font("Georgia","B",10); pdf.set_text_color(*TERRA_D)
    pdf.cell(CW-8, 5, title); return y+10.5

def study(i, y, tag, title, found, fine):
    pdf.set_fill_color(*TERRA); pdf.rect(px(i)+M, y, 1.2, 1, "F")
    y0 = y
    pdf.set_xy(px(i)+M+4, y); pdf.set_font("Helvetica","B",6.8); pdf.set_text_color(*TERRA_D); pdf.cell(CW-4, 3.4, tag)
    y = para(i, y+4.2, "**"+title+"**", size=8.6, lh=3.9, dx=4)
    y = para(i, y+0.8, found, size=8.2, lh=3.8, dx=4)
    y = para(i, y+0.8, fine, size=7.1, lh=3.3, dx=4, color=MUTED)
    pdf.set_fill_color(*TERRA); pdf.rect(px(i)+M, y0, 1.2, y-y0, "F")
    return y

# =================== PAGE 1: OUTSIDE  [flap | back | cover] ===================
pdf.add_page()

# ---- Flap: what it is + what a session looks like
y = heading(0, 13, "What Is a\nHyperbaric Session?")
y = para(0, y+3,
  "You lie back inside a soft, private chamber. A quiet machine gently raises the air pressure to "
  "**1.5 ATA**, about one and a half times normal, while you breathe **95 to 99.9% oxygen** through a mask.")
y = para(0, y+2.5,
  "The added pressure helps more oxygen dissolve into your bloodstream. "
  "For you, it is 60 minutes of quiet time: relax, nap, or scroll your phone.")
img = crop(B+"chamber-side-branded.jpg", "b_flap.jpg", CW, 40)
pdf.image(img, x=px(0)+M, y=y+4, w=CW, h=40); pdf.set_draw_color(*LINE); pdf.rect(px(0)+M, y+4, CW, 40)
y = sub(0, y+50, "What your session looks like")
y = steps(0, y+2.5, [
  "**Settle in.** Lie down inside and get comfortable. Our team closes the chamber.",
  "**Pressure rises gently.** It takes a few minutes.",
  "**Relax for 60 minutes.** Rest, nap, read, or use your phone or tablet.",
  "**Pressure eases off** and you step out, ready for the rest of your day.",
])

# ---- Back: how to book
pdf.set_fill_color(*INK); pdf.rect(px(1), 0, W, PH, "F")
ly = logo(1, 16, w=38, cream=True)
pdf.set_xy(px(1)+M, ly+10); pdf.set_font("Georgia","B",15); pdf.set_text_color(*CREAM2)
pdf.multi_cell(CW, 6.6, "Book your\nfirst session", align="L")
y = para(1, pdf.get_y()+4,
  "Add a session before or after your lash appointment, or come in just for the chamber.",
  size=9.4, color=SOFT, lh=4.5)
pdf.set_fill_color(*TERRA); pdf.rect(px(1)+M, y+6, CW, 24, "F")
pdf.set_xy(px(1)+M+5, y+10.5); pdf.set_font("Helvetica","B",12); pdf.set_text_color(*WHITE)
pdf.multi_cell(CW-10, 6, "Ask your lash artist\nor the front desk", align="L")
y = y+6+24
y = para(1, y+9, "**Ask about** single sessions, session packs, and pairing a session with your fill.",
  size=9, color=SOFT, lh=4.3)
y = para(1, y+5, "**Chamber provided by Purebaric**, a Utah company. purebaric.com", size=9, color=SOFT, lh=4.3)
para(1, PH-38,
  "Hyperbaric sessions here are offered for general wellness and relaxation. The chamber is not a medical device "
  "and is not intended to diagnose, treat, cure, or prevent any disease or skin condition. The studies summarized "
  "inside used different pressures, oxygen levels, and schedules than this chamber, and individual results vary. "
  "Talk with your doctor before a session if you are pregnant or have a health condition.",
  size=6.8, color=(170,158,146), lh=3.2)

# ---- Cover
cy = logo(2, 13, w=34)
src_im = Image.open(B+"chamber-living-branded.jpg")
ih = W * src_im.height / src_im.width
img = crop(B+"chamber-living-branded.jpg", "b_cover.jpg", W, ih)
pdf.image(img, x=px(2), y=cy+8, w=W, h=ih)
pdf.set_xy(px(2)+M, cy+8+ih+10); pdf.set_font("Georgia","B",19); pdf.set_text_color(*INK)
pdf.multi_cell(CW, 7.9, "Beauty Rest,\nUnder Pressure", align="L")
y = para(2, pdf.get_y()+4,
  "Hyperbaric oxygen sessions, now part of your beauty routine. Sixty quiet minutes for your skin and for you.",
  size=9.8, color=MUTED, lh=4.7)
y = bullets(2, y+6, [
  "**Oxygen for your skin**, from the inside",
  "**Backed by early research** on skin and aging",
  "**An hour to fully switch off**",
  "**Pairs with your lash appointment**",
], size=9.2, lh=4.3, gap=2.2)
pdf.set_fill_color(*TERRA); pdf.rect(px(2), PH-10, W, 10, "F")
pdf.set_xy(px(2), PH-10); pdf.set_font("Helvetica","B",9.3); pdf.set_text_color(*WHITE)
pdf.cell(W, 10, "HYPERBARIC SESSIONS  |  NOW AVAILABLE HERE", align="C")
folds()

# =================== PAGE 2: INSIDE  [why | research | expect] ===================
pdf.add_page()

# ---- Inside left: why
img = crop("hsa-person.jpg", "b_person.jpg", W, 58, focus=(0.5,0.25))
pdf.image(img, x=px(0), y=0, w=W, h=58)
y = heading(0, 66, "Why Beauty Clients\nBook Sessions")
y = para(0, y+3, "You already invest in how you look. Healthy-looking skin starts below the surface, "
  "and skin cells rely on oxygen to do their work.", size=8.9, color=MUTED, lh=4.1)
y = bullets(0, y+4, [
  "**Collagen and elasticity.** In one clinical study, skin samples showed denser collagen and longer elastic fibers after a course of hyperbaric sessions.(1)",
  "**A more even-looking tone.** In a study of mild hyperbaric sessions, sun-induced pigmentation faded and age spots on the face became smaller.(2)",
  "**Deep relaxation.** In healthy young women, one mild session raised a marker of the body's rest-and-recover nervous system activity.(3)",
  "**Time that is only yours.** No treatments, no needles, no downtime. Just an hour to lie back.",
  "**Fits your routine.** Book it around the appointments you already keep.",
], size=8.6, lh=3.9, gap=1.9)

# ---- Inside middle: research
y = heading(1, 13, "What the\nResearch Says")
y = para(1, y+3, "Research on hyperbaric oxygen and skin is early but growing. Here is what three published, "
  "peer-reviewed studies found, and the fine print for each.", size=8.6, color=MUTED, lh=3.9)
y = study(1, y+4, "(1)  AGING (ALBANY NY), 2021", "Skin aging, measured under the microscope",
  "After 60 sessions over three months, skin biopsies showed more collagen, longer elastic fibers, more small blood vessels, and fewer aged (senescent) cells.",
  "Fine print: 13 men, average age 68. 90-minute sessions at 2 ATA with 100% oxygen. No placebo group. Some authors work for a hyperbaric company.")
y = study(1, y+4.5, "(2)  SKIN RESEARCH AND TECHNOLOGY, 2011", "Pigmentation and age spots",
  "Pigmentation caused by UV light faded after four weeks of sessions. In a second group, women's facial age spots became smaller.",
  "Fine print: small study of healthy adults. One-hour sessions at 1.25 ATA with 32% oxygen, two to three times a week.")
y = study(1, y+4.5, "(3)  LIFE (BASEL), 2023", "Relaxation in healthy young women",
  "After one 70-minute session, a heart-rate marker of rest-and-recover (parasympathetic) activity rose, with no rise in oxidative stress.",
  "Fine print: 16 women aged 20 to 28. 1.4 ATA with 35 to 40% oxygen. Measured after a single session.")
by = y+5
yy = box(1, by, 33, "Reading this honestly")
para(1, yy, "These studies used different pressures, oxygen levels, and schedules than our chamber "
  "(1.5 ATA). They are small, and they do not promise you the same result. We share them so you can decide for yourself.",
  size=8.2, lh=3.8, dx=4, w=CW-8)
para(1, PH-21, "(1) Hachmo Y, et al. Aging. 2021;13(22):24500-24510.  (2) Nishizaka T, et al. Skin Res Technol. "
  "2011;17:332-338.  (3) Nisa BU, et al. Life. 2023;13(2):408.", size=6.4, color=MUTED, lh=3.0)

# ---- Inside right: what to expect
y = heading(2, 13, "Good to Know")
y = sub(2, y+3, "How often do people come?", size=9.6)
y = para(2, y+1.5, "In the skin studies, people had sessions **two to five times a week for four weeks or more**. "
  "A simple way to start is one session a week alongside your regular appointments.", size=8.6, lh=3.9)
y = sub(2, y+4, "What should I wear or bring?", size=9.6)
y = bullets(2, y+2, [
  "Comfortable clothes. You stay fully dressed.",
  "Your phone, tablet, or a book.",
  "Socks. Shoes stay outside the chamber.",
], size=8.6, lh=3.9, gap=1.3)
y = sub(2, y+3, "How does it feel?", size=9.6)
y = para(2, y+1.5, "Like a quiet, cozy nook. As pressure changes you will feel it in your ears, the same as "
  "during takeoff and landing. Swallowing or yawning helps.", size=8.6, lh=3.9)
by1 = y+5
yy = box(2, by1, 50, "Check with your doctor first if you")
for t in ["are pregnant", "have a cold, sinus congestion, or an ear infection",
          "have had recent ear surgery or ear injury", "have a lung condition or a history of collapsed lung",
          "have any ongoing health condition or take prescription medication"]:
    pdf.set_fill_color(*TERRA); pdf.ellipse(px(2)+M+4, yy+1.1, 1.8, 1.8, "F")
    yy = para(2, yy, t, size=8.4, lh=3.9, dx=8.2, w=CW-12) + 1.3
pdf.set_fill_color(*INK); pdf.rect(px(2), PH-24, W, 24, "F")
pdf.set_xy(px(2)+M, PH-20); pdf.set_font("Georgia","B",10.5); pdf.set_text_color(*CREAM2)
pdf.cell(CW, 5.5, "Ready to try it?")
pdf.set_xy(px(2)+M, PH-13.5); pdf.set_font("Helvetica","B",9.2); pdf.set_text_color(*WHITE)
pdf.cell(CW, 5, "Ask your lash artist to book a session")
folds()

out = os.path.join(OUT_DIR, "purebaric_beauty_client_pamphlet.pdf")
pdf.output(out); print("saved", out, "pages", pdf.pages_count)
