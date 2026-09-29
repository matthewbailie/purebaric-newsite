import os
from PIL import Image
from fpdf import FPDF

SRC = os.path.expanduser("~/projects/purebaric-newsite/images")
OUT = "/Users/bailie/Library/CloudStorage/OneDrive-Adobe/DMe-C&P/Claude_AI/purebaric-outreach/purebaric_facility_prospectus.pdf"
CROP = "/tmp/pbprev/crops"; os.makedirs(CROP, exist_ok=True)

INK=(43,35,32); MUTED=(111,99,91); CREAM=(247,242,234); CREAM2=(239,231,219)
TERRA=(184,101,77); TERRA_D=(154,79,58); TERRA_BG=(244,231,223); LINE=(230,220,205); WHITE=(255,255,255)
SOFT=(230,218,200)

# ---- the numbers, in one place
PRICE=75; RENT=979; SUPPLY=1.30; FEE=500; DAYS=26
def money(n): return "${:,.0f}".format(round(n))
def scen(per_day, price=PRICE):
    n = per_day*DAYS; gross = n*price; sup = n*SUPPLY
    return n, gross, sup, gross-RENT-sup

def crop(src, out, w, h, focus=(0.5,0.5)):
    im = Image.open(os.path.join(SRC, src)).convert("RGB"); tr = w/h
    if im.width/im.height > tr:
        nw = int(im.height*tr); x0 = int((im.width-nw)*focus[0]); im = im.crop((x0,0,x0+nw,im.height))
    else:
        nh = int(im.width/tr); y0 = int((im.height-nh)*focus[1]); im = im.crop((0,y0,im.width,y0+nh))
    p = os.path.join(CROP, out); im.save(p, quality=92); return p

PW, PH = 215.9, 279.4
M = 17; CW = PW-2*M; GUT = 8; COL = (CW-GUT)/2

class Doc(FPDF):
    def footer(self):
        self.set_draw_color(*LINE); self.line(M, PH-15, PW-M, PH-15)
        self.set_xy(M, PH-12.5); self.set_font("Helvetica","",7.6); self.set_text_color(*MUTED)
        self.cell(CW/2, 4, "Purebaric  |  purebaric.com  |  (801) 901-0873")
        self.cell(CW/2, 4, "Page %d of {nb}" % self.page_no(), align="R")

pdf = Doc(orientation="P", unit="mm", format="Letter")
pdf.set_auto_page_break(False)
pdf.add_font("Georgia","B","/System/Library/Fonts/Supplemental/Georgia Bold.ttf")
pdf.add_font("Georgia","","/System/Library/Fonts/Supplemental/Georgia.ttf")

def h1(y, text, x=M, w=CW, size=19, lh=8):
    pdf.set_xy(x,y); pdf.set_font("Georgia","B",size); pdf.set_text_color(*TERRA_D); pdf.multi_cell(w, lh, text, align="L"); return pdf.get_y()
def h2(y, text, x=M, w=CW, size=11.5, color=INK):
    pdf.set_xy(x,y); pdf.set_font("Georgia","B",size); pdf.set_text_color(*color); pdf.multi_cell(w, 5.4, text, align="L"); return pdf.get_y()
def para(y, text, x=M, w=CW, size=9.6, color=INK, lh=4.6, style=""):
    pdf.set_xy(x,y); pdf.set_font("Helvetica",style,size); pdf.set_text_color(*color)
    pdf.multi_cell(w, lh, text, align="L", markdown=True); return pdf.get_y()
def bullets(y, items, x=M, w=CW, size=9.4, lh=4.4, gap=1.9, color=INK):
    for t in items:
        pdf.set_fill_color(*TERRA); pdf.ellipse(x, y+1.3, 1.9, 1.9, "F")
        y = para(y, t, x=x+4.6, w=w-4.6, size=size, lh=lh, color=color) + gap
    return y
def steps(y, items, x=M, w=CW, size=9.4, lh=4.4, gap=2.4):
    for n,t in enumerate(items,1):
        pdf.set_fill_color(*TERRA); pdf.ellipse(x, y-0.4, 5.6, 5.6, "F")
        pdf.set_xy(x, y+0.35); pdf.set_font("Helvetica","B",8.2); pdf.set_text_color(*WHITE); pdf.cell(5.6, 4, str(n), align="C")
        y = max(para(y, t, x=x+8, w=w-8, size=size, lh=lh), y+5.6) + gap
    return y
def callout(y, title, body_fn, x=M, w=CW, h=30, fill=TERRA_BG, title_color=TERRA_D):
    pdf.set_fill_color(*fill); pdf.rect(x, y, w, h, "F")
    pdf.set_fill_color(*TERRA); pdf.rect(x, y, 1.6, h, "F")
    pdf.set_xy(x+6, y+4); pdf.set_font("Georgia","B",10.8); pdf.set_text_color(*title_color); pdf.cell(w-12, 5, title)
    body_fn(x+6, y+11, w-12); return y+h
def table(y, headers, rows, widths, x=M, rh=7.2, bold_last=True, size=8.8):
    pdf.set_xy(x,y); pdf.set_fill_color(*INK); pdf.set_text_color(*WHITE); pdf.set_font("Helvetica","B",size-0.6)
    for w_,h_ in zip(widths,headers): pdf.cell(w_, rh, h_, align="C", fill=True)
    pdf.ln(rh)
    for k,r in enumerate(rows):
        pdf.set_x(x); pdf.set_fill_color(*(CREAM if k%2==0 else WHITE)); pdf.set_draw_color(*LINE)
        for j,(w_,c) in enumerate(zip(widths,r)):
            last = bold_last and j==len(r)-1
            pdf.set_font("Helvetica","B" if last else "",size); pdf.set_text_color(*(TERRA_D if last else INK))
            pdf.cell(w_, rh, c, border=1, align="C", fill=True)
        pdf.ln(rh)
    return pdf.get_y()

n_l,g_l,s_l,net_l = scen(2); n_m,g_m,s_m,net_m = scen(4); n_s,g_s,s_s,net_s = scen(6)
breakeven = int(-(-RENT // (PRICE-SUPPLY)))  # ceil

# ============================ PAGE 1 ============================
pdf.add_page()
lg = os.path.join(SRC,"logo.png"); li = Image.open(lg); lw=40
pdf.image(lg, x=M, y=14, w=lw, h=lw*li.height/li.width)
pdf.set_xy(M, 15.5); pdf.set_font("Helvetica","B",8.4); pdf.set_text_color(*MUTED); pdf.cell(CW, 5, "FACILITY PROSPECTUS", align="R")
hero = crop("/Users/bailie/Library/CloudStorage/OneDrive-Adobe/DMe-C&P/Claude_AI/purebaric-outreach/branded-images/chamber-living-branded.jpg","pro_hero.jpg", PW, 108, focus=(0.5,0.5))
pdf.image(hero, x=0, y=27, w=PW, h=108)
y = 145
pdf.set_xy(M,y); pdf.set_font("Georgia","B",25); pdf.set_text_color(*INK)
pdf.multi_cell(CW, 10.2, "A New Revenue-Generating\nAmenity for Your Facility", align="L")
y = para(pdf.get_y()+4, "Offer mild hyperbaric sessions to the members and clients you already serve. Purebaric installs the chamber, "
  "trains your staff, supplies your consent forms, helps you craft a marketing pamphlet for your brand, and services the equipment. You set your prices and keep the session revenue.",
  size=10.6, color=MUTED, lh=5.2)
y += 8
gap = 4
unit = (CW-3*gap)/4.6
tiles = [("YOUR COST", money(RENT), "per month", "to rent, on a\n12-month term", unit, False),
         ("BREAK-EVEN", "%d sessions" % breakeven, "", "a month cover your\nrental and supplies", unit, False),
         ("ESTIMATED NET REVENUE", money(net_m), "per month", "at moderate usage, an average\nof four sessions daily", unit*1.6, True),
         ("SPACE NEEDED", "5 x 8 ft", "", "of floor space and\na wall outlet", unit, False)]
x = M
for eyebrow, big, suffix, lab, w_, hero in tiles:
    pdf.set_fill_color(*(TERRA if hero else TERRA_BG)); pdf.rect(x, y, w_, 36, "F")
    pdf.set_fill_color(*(INK if hero else TERRA)); pdf.rect(x, y, w_, 1.8, "F")
    pdf.set_xy(x+4, y+5); pdf.set_font("Helvetica","B",7.2); pdf.set_text_color(*(WHITE if hero else TERRA_D)); pdf.cell(w_-8, 4, eyebrow)
    pdf.set_xy(x+4, y+10.5); pdf.set_font("Georgia","B",24 if hero else 15); pdf.set_text_color(*(WHITE if hero else INK)); bw = pdf.get_string_width(big); pdf.cell(w_-8, 10 if hero else 8, big)
    if suffix:
        pdf.set_font("Helvetica","B",10 if hero else 7.6)
        pdf.set_xy(x+4+bw+1.6, y+(13.6 if hero else 12.2)); pdf.cell(20, 5, suffix)
    pdf.set_xy(x+4, y+(23 if hero else 20.5)); pdf.set_font("Helvetica","",8); pdf.set_text_color(*(WHITE if hero else INK)); pdf.multi_cell(w_-8, 3.8, lab, align="L")
    x += w_+gap
y += 36+8
y = h2(y, "What this prospectus covers")
bullets(y+2, [
  "**What the chamber is**, what a session looks like, and what your space needs.",
  "**The numbers:** what Utah facilities charge, what it costs you, and what you can expect to net.",
  "**What Purebaric provides** before and after installation, and answers to common owner questions.",
], size=9.4, gap=1.4)

# ============================ PAGE 2 ============================
pdf.add_page()
y = h1(18, "What Is a Mild Hyperbaric Chamber?")
yl = para(y+4, "A hyperbaric chamber is a sealed chamber in which the air pressure is raised above normal. A mild hyperbaric "
  "chamber is the soft-shell kind: the client lies down inside and the chamber pressurizes to **1.5 ATA**, about one and a "
  "half times normal air pressure.", w=COL)
yl = para(yl+3, "While inside, the client breathes **95 to 99.9% oxygen** through a mask.", w=COL)
yl = para(yl+3, "A session is quiet, personal time. The client can relax, nap, or be on their phone, tablet, or laptop. "
  "The average session length is 60 minutes.", w=COL)
yl = para(yl+3, "It is a wellness and recovery amenity, popular with athletes and active people.", w=COL)
im2 = crop("/Users/bailie/Library/CloudStorage/OneDrive-Adobe/DMe-C&P/Claude_AI/purebaric-outreach/branded-images/chamber-side-branded.jpg","pro_side.jpg", COL, 50)
pdf.image(im2, x=M+COL+GUT, y=y+5, w=COL, h=50); pdf.set_draw_color(*LINE); pdf.rect(M+COL+GUT, y+5, COL, 50)
pdf.set_xy(M+COL+GUT, y+56.5); pdf.set_font("Helvetica","",7.8); pdf.set_text_color(*MUTED)
pdf.cell(COL, 4, "The chamber, with its machine on the right.")
y = max(yl, y+62) + 4

yl = h2(y, "What a session looks like", w=COL)
yl = steps(yl+3, [
  "The client lies down inside and your staff closes the chamber.",
  "The chamber pressurizes gradually over a few minutes. Ears may pop, like on a plane.",
  "The client relaxes, naps, or uses their phone, tablet, or laptop. The average session length is 60 minutes.",
  "The chamber depressurizes gradually and the client steps out.",
  "Your staff wipes the chamber down and sets out a fresh mask for the next client.",
], w=COL)
def needs(x, y0, w):
    bullets(y0, ["**A 5 x 8 foot area**, about the size of a twin-size bed.", "**Access to a wall outlet.**",
                 "**A staff member** to start and end each session."], x=x, w=w, size=9.2, gap=1.3)
callout(y, "What's needed", needs, x=M+COL+GUT, w=COL, h=36)
def one(x, y0, w):
    para(y0, "One chamber serves one client at a time. With turnover, one chamber can run up to 8 sessions in a 10-hour day.",
         x=x, w=w, size=9.2, lh=4.3)
callout(y+40, "Capacity", one, x=M+COL+GUT, w=COL, h=26)
y = max(yl, y+66) + 4

y = h1(y, "Who Books Sessions?", size=16, lh=7)
y = para(y+2, "A chamber earns the most where clients already pay for recovery and wellness. These are the facilities that fit, "
  "and the clients within them who typically book.", color=MUTED)
groups = [
  ("Gyms and fitness centers", "Members recovering between workouts, weekend competitors, personal-training clients."),
  ("Sports teams and athletic programs", "Athletes in season, athletes in heavy training blocks, coaches and staff."),
  ("Recovery studios and med spas", "Clients already buying sauna, cold plunge, massage, or IV services."),
  ("Physical therapy and chiropractic clinics", "Clients who want a wellness add-on alongside their visits."),
  ("CrossFit and performance gyms", "Competitive athletes and members training five or more days a week."),
  ("Plastic surgery and medical practices", "Clients recovering after a procedure, with their provider's approval."),
]
y += 3; bh = 18.5
for k,(f,w_) in enumerate(groups):
    x = M + (k%2)*(COL+GUT); yy = y + (k//2)*(bh+3)
    pdf.set_fill_color(*TERRA_BG); pdf.rect(x, yy, COL, bh, "F")
    para(yy+2.6, "**"+f+"**", x=x+5, w=COL-10, size=9.2, lh=4.2)
    para(yy+7.4, w_, x=x+5, w=COL-10, size=8.6, lh=4, color=MUTED)

# ============================ PAGE 3 ============================
pdf.add_page()
y = h1(18, "The Numbers")
y = para(y+3, "Every figure below comes from a stated assumption, so you can replace our numbers with your own.", color=MUTED)
y0 = y+6
# left: local pricing
yl = h2(y0, "What Utah facilities charge today (1)", w=COL)
yy = yl+2.5
for l,v,n in [("Single session (60 min)","$79 - $129",""),("10-session pack","$750 - $1,290","$75 - $129 a session"),("20-session pack","$1,400 - $2,580","$70 - $129 a session")]:
    pdf.set_xy(M,yy); pdf.set_font("Helvetica","",9.2); pdf.set_text_color(*INK); pdf.cell(COL*0.55, 4.8, l)
    pdf.set_font("Helvetica","B",9.2); pdf.cell(COL*0.45, 4.8, v, align="R")
    if n:
        pdf.set_xy(M,yy+4.4); pdf.set_font("Helvetica","",7.6); pdf.set_text_color(*MUTED); pdf.cell(COL, 3.6, n, align="R"); yy += 3.4
    yy += 6; pdf.set_draw_color(*LINE); pdf.line(M, yy-0.8, M+COL, yy-0.8)
yl = para(yy+2, "You set your own prices. Packs bring revenue in up front and bring clients back.", w=COL, size=9, color=MUTED, lh=4.2)
# right: what it costs you
xr = M+COL+GUT
yr = h2(y0, "What it costs you", x=xr, w=COL)
yr = bullets(yr+2.5, [
  "**Chamber rental:** %s a month on a 12-month term." % money(RENT),
  "**Install, training, and initial supplies:** one-time %s fee. Supplies include 50 masks, a foam pad, two washable cover sheets, initial cleaning supplies, and the instructions and runbook." % money(FEE),
  "**Masks and cleaning supplies:** about $1.30 per use.",
  "**Staff time:** about 15 minutes per session. Not included in the estimates below.",
], x=xr, w=COL, size=9.1, lh=4.2, gap=1.5)
y = max(yl,yr)+6

y = h2(y, "What one chamber can earn each month")
y = para(y+1.5, "**Assumptions:** 60-minute sessions, open 6 days a week (26 days a month), at a blended **$75 a session**, "
  "between the local 20-pack rate and the lowest single price.", size=8.9, color=MUTED, lh=4.1)
W6 = [CW*0.22, CW*0.13, CW*0.17, CW*0.14, CW*0.14, CW*0.20]
y = table(y+3, ["Usage","Sessions","Gross revenue","Rental","Supplies","Est. net revenue"], [
  ["Light: 2 a day", str(n_l), money(g_l), "- "+money(RENT), "- "+money(s_l), money(net_l)],
  ["Moderate: 4 a day", str(n_m), money(g_m), "- "+money(RENT), "- "+money(s_m), money(net_m)],
  ["Strong: 6 a day", str(n_s), money(g_s), "- "+money(RENT), "- "+money(s_s), money(net_s)],
], W6)
y += 7
# left: price sensitivity ; right: callouts
yl = h2(y, "If you charge more", w=COL)
yl = para(yl+1.5, "Moderate usage (%d sessions a month) at different prices:" % n_m, w=COL, size=8.9, color=MUTED, lh=4.1)
rows=[]
for p in (70,75,100,129):
    n,g,s_,net = scen(4,p); rows.append(["$%d" % p, money(g), money(net)])
yl = table(yl+2.5, ["Session price","Gross revenue","Est. net revenue"], rows, [COL*0.30, COL*0.33, COL*0.37], rh=6.8)
first_year = net_m*12
def be(x, y0, w):
    para(y0, "At $75 a session, **%d sessions a month** cover the rental and supplies. That is about one session "
             "every other day you are open." % breakeven, x=x, w=w, size=9.1, lh=4.3)
callout(y, "Break-even", be, x=xr, w=COL, h=28)
def fy(x, y0, w):
    para(y0, "At moderate usage, an average of four sessions daily, 12 months of estimated net revenue comes to about **%s**." % money(first_year),
         x=x, w=w, size=9.1, lh=4.3)
callout(y+32, "First year", fy, x=xr, w=COL, h=28)
y = max(yl, y+60)+7

y = h2(y, "Three ways to sell sessions")
c3 = (CW-2*5)/3
for k,(t,b) in enumerate([
  ("Single sessions", "A simple way for a client to try it. Local single-session prices run $79 to $129."),
  ("Session packs", "10- and 20-session packs lower the per-session price and bring clients back on a schedule."),
  ("Membership add-on", "Add sessions to a premium membership tier, or offer them as a member-only add-on."),
]):
    x = M+k*(c3+5)
    pdf.set_fill_color(*CREAM); pdf.rect(x, y+2.5, c3, 30, "F"); pdf.set_fill_color(*TERRA); pdf.rect(x, y+2.5, c3, 1.4, "F")
    para(y+7, "**"+t+"**", x=x+4.5, w=c3-9, size=9.3, lh=4.3)
    para(y+12.3, b, x=x+4.5, w=c3-9, size=8.5, lh=3.95, color=MUTED)
para(y+37, "(1) Pricing drawn from published 2026 prices at facilities in Lehi, Orem, and Salt Lake City. All revenue figures are estimates, not "
  "guarantees, and are shown before staff time, facility overhead, and taxes. Actual results depend on your pricing, staffing, and client demand.",
  size=7.2, color=MUTED, lh=3.4)

# ============================ PAGE 4 ============================
pdf.add_page()
yl = h1(18, "How It Works", w=COL, size=16, lh=7)
yl = steps(yl+3.5, [
  "**Talk with us.** A short call about your space, clients, and goals.",
  "**We deliver and install.** We set up the chamber and machine at your business location.",
  "**We train your staff.** Hands-on training so your team can run sessions with confidence.",
  "**You start selling sessions.** Add it to your menu, packs, and memberships.",
], w=COL, size=9.2, lh=4.3, gap=2)
yr = h1(18, "After Installation,\nWe Support Your Needs", x=xr, w=COL, size=16, lh=7)
yr = bullets(yr+3.5, [
  "**Initial staff training.** Hands-on training with the chamber, so your team learns by running it.",
  "**Staff runbook.** A written runbook your staff can follow day to day and use to train new team members.",
  "**Template legal consent forms.** Ready-to-use client consent and waiver templates for your intake process.",
  "**A marketing pamphlet for your brand.** We help you craft a client-facing pamphlet, in your brand, that explains the sessions and helps you sign up new clients.",
  "**Equipment service.** We service and maintain the chamber and machine.",
  "**Ongoing support.** Call or text with questions. If something is not working, we fix it.",
], x=xr, w=COL, size=9.1, lh=4.2, gap=1.6)
y = max(yl,yr)+5
y = h1(y, "Questions Owners Ask", size=16, lh=7)
faq = [
 ("What is the commitment?", "The rental is %s a month on a 12-month term, plus a one-time %s fee that covers installation, staff training, and your initial supplies: 50 masks, a foam pad, two washable cover sheets, initial cleaning supplies, and the instructions and runbook." % (money(RENT), money(FEE))),
 ("Do I have to buy or maintain anything?", "No. You rent the chamber and machine, and Purebaric services and maintains them. Your ongoing purchase is masks and cleaning supplies, about $1.30 per use."),
 ("How does my staff learn to run it?", "We train your team in person on the chamber itself, and leave a written runbook they can follow and use to train new hires."),
 ("How do I handle consent and liability?", "We provide template consent and waiver forms. Have your own counsel review them for your business, and confirm coverage with your insurer before you launch."),
 ("Is this a medical treatment?", "No. The chamber is a general-wellness amenity, not a medical device. Describe it that way in your marketing, and direct clients with health conditions to check with their physician first."),
 ("What should I charge?", "You decide. Utah facilities publish single sessions from $79 to $129 and 20-session packs from $1,400 to $2,580. Our estimates use $75 a session."),
 ("What if something stops working?", "Call or text us. Servicing the equipment is our job, not yours."),
 ("Can I add a second chamber later?", "Talk with us. If your sessions fill up, we can look at adding a chamber alongside the first."),
]
ycol = [y+4, y+4]
for k,(q,a) in enumerate(faq):
    c = k%2; x = M + c*(COL+GUT)
    yy = para(ycol[c], "**"+q+"**", x=x, w=COL, size=9.3, lh=4.3, color=TERRA_D)
    ycol[c] = para(yy+0.6, a, x=x, w=COL, size=8.8, lh=4.05) + 4
y = max(ycol)+2
ch = 40
cy = min(y, PH-20-ch-14)
pdf.set_fill_color(*INK); pdf.rect(M, cy, CW, ch, "F"); pdf.set_fill_color(*TERRA); pdf.rect(M, cy, 1.8, ch, "F")
pdf.set_xy(M+9, cy+7); pdf.set_font("Georgia","B",14.5); pdf.set_text_color(*CREAM2); pdf.cell(CW*0.6, 7, "See if a chamber fits your facility")
para(cy+16.5, "Book a free 15-minute call. We will talk you through your space, your clients, and the numbers for your facility, with no obligation.",
     x=M+9, w=CW*0.56, size=9.2, color=SOFT, lh=4.4)
pdf.set_fill_color(*TERRA); pdf.rect(M+CW*0.66, cy+7, CW*0.30, 26, "F")
pdf.set_xy(M+CW*0.66+4, cy+10.5); pdf.set_font("Helvetica","B",10); pdf.set_text_color(*WHITE)
pdf.multi_cell(CW*0.30-8, 5.6, "(801) 901-0873\nhello@purebaric.com\npurebaric.com", align="L")
para(cy+ch+4, "Purebaric is Utah-based and serves the Wasatch Front. Purebaric provides general-wellness equipment. It is not a medical device and is "
  "not intended to diagnose, treat, cure, or prevent any disease. Revenue figures in this document are estimates, not guarantees.",
  size=7.2, color=MUTED, lh=3.4)

pdf.output(OUT); print("saved", OUT, "pages", pdf.pages_count, "| net", net_l, net_m, net_s, "| be", breakeven, "| fy", first_year)
