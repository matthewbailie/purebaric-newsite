"""Purebaric business pamphlets, one per industry, for any market.

Usage:  python3 make_pamphlets.py <market> [out_dir]      market = tennessee | utah

This is the owner's Utah facility pamphlet (make_pamphlet2.py) with the market details
swapped (contact, local line, price anchors, footnote) and, since 10 Oct 2026, with:
  - a title and inside panels written for the two team genres (sports teams and clubs;
    high school and college athletics), which are not businesses selling sessions;
  - a "Who books sessions?" / "Who uses the chamber?" box written for each genre.
Everything else is the owner's wording. The chamber package is identical in every market.
"""
import os, sys
from PIL import Image
from fpdf import FPDF

MARKET = (sys.argv[1] if len(sys.argv) > 1 else "tennessee").lower()
MARKETS = {
  "tennessee": dict(
    prefix="Purebaric_TN_pamphlet_", phone="(801) 884-2113", email="mlebailie@hotmail.com",
    out_default=os.path.expanduser("~/Desktop/Tennessee Purbaric V2.0/pamphlets"),
    local="**Now serving Knoxville, Tennessee.** Purebaric chambers are in use in homes and businesses today, and we are now delivering to the Knoxville area. You work directly with the owner, from the first call through installation and ongoing support.",
    facilities_word="Facilities", charge_label="What facilities charge today(1)",
    price_rows=[("Single session (60 min)", "$100", ""), ("10-session pack", "$800", "$80 a session"), ("20-session pack", "$1,400", "$70 a session")],
    footnote="(1) Published 2026 prices for 60-minute mild-chamber sessions from a Knoxville-area clinic. All figures are estimates before staff time, facility overhead, and taxes.",
    single_range="$100", studio_word="a Knoxville-area clinic", footnote_src="(1) Published 2026 prices for 60-minute mild-chamber sessions from a Knoxville-area clinic.",
    team_footnote="(1) Published 2026 price for a 60-minute mild-chamber session from a Knoxville-area clinic. All figures are estimates, not guarantees."),
  "utah": dict(
    prefix="Purebaric_UT_pamphlet_", phone="(801) 901-0873", email="hello@purebaric.com",
    out_default=os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "pamphlets"),
    local="**Utah-based and local.** Purebaric chambers are in use across the Wasatch Front today. You work directly with the owner, from the first call through installation and ongoing support.",
    facilities_word="Utah facilities", charge_label="What Utah facilities charge today(1)",
    price_rows=[("Single session (60 min)", "$79 - $129", ""), ("10-session pack", "$750 - $1,290", "$75 - $129 a session"), ("20-session pack", "$1,400 - $2,580", "$70 - $129 a session")],
    footnote="(1) Published 2026 prices from facilities in Lehi, Orem, and Salt Lake City. All figures are estimates before staff time, facility overhead, and taxes.",
    single_range="$79 to $129", studio_word="a Wasatch Front studio", footnote_src="",
    team_footnote="(1) Published 2026 single-session prices from facilities in Lehi, Orem, and Salt Lake City. All figures are estimates, not guarantees."),
}
MK = MARKETS[MARKET]
CONTACT_PHONE, CONTACT_EMAIL = MK["phone"], MK["email"]

SRC = os.path.expanduser("~/projects/purebaric-newsite/images")
BRANDED = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "branded-images")
OUT_DIR = sys.argv[2] if len(sys.argv) > 2 else MK["out_default"]
CROP = os.path.join(os.environ.get("TMPDIR", "/tmp"), "pb_pamphlet_crops"); os.makedirs(CROP, exist_ok=True); os.makedirs(OUT_DIR, exist_ok=True)

# ---------------------------------------------------------------- genre content
BUSINESS_TITLE = "A New Revenue-\nGenerating Amenity\nfor Your Business"
TEAM_TITLE = "Help Your Athletes\nRecover Faster"

GENRES = [
  dict(key="gyms-and-fitness", kind="business", label="GYMS AND FITNESS CENTERS", cover="chamber-gym-branded.jpg",
       who_title="Who books sessions?", who=[
         ("Members who already buy extras", "The people paying for training, classes or massage are the first to add a chamber pack."),
         ("Weekend competitors", "Runners, cyclists and rec-league players who book sessions around race weekends and tournaments."),
         ("Personal-training clients", "Trainers sell a session as the recovery day in a program, a new line on the trainer's package too."),
         ("Premium-tier members", "Put sessions in the top tier and give the members paying the most one more reason to stay."),
         ("Midday members", "Sessions in the quiet hours between the morning and evening rush fill time the chamber would otherwise sit empty."),
       ]),
  dict(key="crossfit-and-performance", kind="business", label="CROSSFIT AND PERFORMANCE GYMS", cover="chamber-gym-branded.jpg",
       who_title="Who books sessions?", who=[
         ("Members who train twice a day", "Competitors who double up on training days and already pay for recovery somewhere else."),
         ("Members in a heavy block", "Volume before the Open, a meet or a race; sell a 10-pack for the block."),
         ("Masters athletes", "Members over 40 who need more recovery between sessions and have the budget for it."),
         ("Members on a deload week", "A reason to come in and spend during the week they would otherwise skip."),
         ("Your coaches", "Members follow what their coaches do. A coach who uses the chamber is your best advertisement."),
       ]),
  dict(key="recovery-studios-and-med-spas", kind="business", label="RECOVERY STUDIOS AND MED SPAS", cover="chamber-clinic-branded.jpg",
       who_title="Who books sessions?", who=[
         ("Your recovery regulars", "Clients already buying sauna, cold plunge, contrast, massage or IV, adding a chamber session to the same visit at the same price point."),
         ("Athletes on a recovery day", "Runners, lifters and weekend competitors who come in after hard training."),
         ("Clients who want a reset", "Clients book a session for the same reason they book a float or a massage: a quiet hour to themselves."),
         ("Spa-day clients", "A session paired with a facial or body service makes a longer, higher-ticket visit."),
         ("Package and membership buyers", "The clients on monthly plans; a chamber adds a tier above the one they have."),
       ]),
  dict(key="physical-therapy-and-chiropractic", kind="business", label="PHYSICAL THERAPY AND CHIROPRACTIC CLINICS", cover="chamber-clinic-branded.jpg",
       who_title="Who books sessions?", who=[
         ("Maintenance patients", "The patients who come in monthly for an adjustment or tune-up and pay out of pocket; they add a session the way they add massage."),
         ("Patients who already buy extras", "People buying massage, supplements or other add-ons from you are your proven wellness buyers."),
         ("Patients finishing a course of visits", "When the visits end, the revenue ends. A monthly session keeps them coming back and paying."),
         ("Athletes and active patients", "The runners, lifters and weekend athletes who come in for tune-ups and book sessions around their events."),
         ("Spouses and parents who come along", "The person waiting in your lobby can take a session in the time they would spend waiting."),
       ]),
  dict(key="salons-and-day-spas", kind="business", label="SALONS AND BEAUTY STUDIOS", cover="chamber-salon-branded.jpg",
       who_title="Who books sessions?", who=[
         ("Facial and massage clients", "Clients who already buy a treatment-room service and will add a quiet hour to it, priced like a body treatment."),
         ("Event and wedding clients", "Brides, bridal parties and clients preparing for photos who want a rested hour before the day."),
         ("Your regulars", "Clients with a standing appointment who add a monthly session to it."),
         ("Clients who want a longer visit", "Hair, nails, a facial and a session in one half-day booking."),
         ("Gift buyers and groups", "Sessions sell as gift cards and in spa-day packages for groups."),
       ]),
  dict(key="sports-teams-and-clubs", kind="team", label="SPORTS TEAMS AND ATHLETIC PROGRAMS", cover="chamber-gym-branded.jpg",
       who_title="Who uses the chamber?", who=[
         ("Athletes in season", "A recovery hour after games and the hardest practices of the week."),
         ("Athletes in two-a-days", "A recovery hour between the morning and afternoon sessions of camp and preseason."),
         ("Athletes on tournament weekends", "A rest hour between games on multi-game days."),
         ("Rosters after road trips", "Rest and recovery after long travel days."),
         ("Coaches and staff", "A rest hour between early mornings, long practices and late games."),
       ],
       notice="A recovery amenity that shows players the club invests in them.", lead="Your trainer or coach"),
  dict(key="high-schools-and-colleges", kind="team", label="HIGH SCHOOL AND COLLEGE ATHLETICS", cover="chamber-gym-branded.jpg",
       who_title="Who uses the chamber?", who=[
         ("In-season athletes", "Recovery between games, especially multi-sport athletes with no off-season."),
         ("Preseason and camp", "A recovery hour between the morning and afternoon sessions of two-a-days."),
         ("Tournament and playoff weekends", "A rest hour between games on multi-game days."),
         ("Student-athletes under load", "Rest during stretches of travel, exams and competition."),
         ("Athletic trainers, coaches and staff", "A rest hour between early mornings, long practices and late games."),
       ],
       notice="A recovery amenity in your training room that athletes and families can see the program invests in.", lead="Your athletic trainer"),
]

TEAM_WHY = [
  "**Recovery between efforts.** Athletes get a quiet hour in the chamber after hard practices, two-a-days and games, in your own building.",
  "**Part of the recovery routine.** {lead} decides how sessions fit each athlete's routine. Some teams schedule them alongside standard care in weeks with muscle soreness, sprains and strains, bruises, overuse aches, or heavy travel. A session is not a treatment for any of these.",
  "**No trips across town.** No driving athletes to a studio and no per-session fees. The chamber is in the training room when they need it.",
  "**One flat monthly cost for the whole roster.** Rent by the month or the season. The more athletes use it, the less each session costs.",
  "**{notice}**",
  "**{lead} stays in charge.** Sessions are a wellness amenity scheduled by your staff. They do not replace evaluation and care from {lead_lc} or a physician.",
]

for G in GENRES:
    KEY, LABEL, COVER_IMG, TEAM = G["key"], G["label"], G["cover"], G["kind"] == "team"

    INK=(43,35,32); MUTED=(111,99,91); CREAM=(247,242,234); CREAM2=(239,231,219)
    TERRA=(184,101,77); TERRA_D=(154,79,58); TERRA_BG=(244,231,223); LINE=(230,220,205); WHITE=(255,255,255)

    def crop(src, out, w, h, focus=(0.5,0.5)):
        im = Image.open(src if os.path.isabs(src) else os.path.join(SRC, src)).convert("RGB")
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

    def mheight(text, size, lh, w, style=""):
        pdf.set_font("Helvetica", style, size)
        return pdf.multi_cell(w, lh, text, align="L", markdown=True, dry_run=True, output="HEIGHT")

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
        pass  # no printed fold marks (owner, 16 Oct 2026): the panels fold cleanly without them

    def logo(i, y, w=30, cream=False, center=False):
        f = os.path.join(SRC, "logo-cream.png" if cream else "logo.png")
        im = Image.open(f); h = w*im.height/im.width
        x = px(i) + (W - w)/2 if center else px(i)+M
        pdf.image(f, x=x, y=y, w=w, h=h); return y+h

    def who_box(i, y, title, rows, size_t=8.3, size_d=8.1, intro=""):
        """Tinted box listing who books/uses, sized to its content."""
        h = 10.5 + 2.5 + (mheight(intro, 7.9, 3.6, CW-8) + 1.5 if intro else 0)
        for t, d in rows:
            h += mheight("**"+t+"**", size_t, 3.8, CW-8) + mheight(d, size_d, 3.7, CW-8) + 1.6
        pdf.set_fill_color(*TERRA_BG); pdf.rect(px(i)+M, y, CW, h, "F")
        pdf.set_xy(px(i)+M+4, y+3.5); pdf.set_font("Georgia","B",10); pdf.set_text_color(*TERRA_D)
        pdf.cell(CW-8, 5, title)
        yy = y+10.5
        if intro: yy = para(i, yy, intro, size=7.9, lh=3.6, dx=4, w=CW-8, color=MUTED, style="I") + 1.5
        for t, d in rows:
            yy = para(i, yy, "**"+t+"**", size=size_t, lh=3.8, dx=4, w=CW-8)
            yy = para(i, yy, d, size=size_d, lh=3.7, dx=4, w=CW-8, color=MUTED) + 1.6
        return y + h

    person = "athlete" if TEAM else "client"
    staff = "your athletic trainer or coach" if TEAM else "your staff"

    # =================== PAGE 1: OUTSIDE  [flap | back | cover] ===================
    pdf.add_page()

    # ---- Flap (left): what it is + what a session looks like
    y = heading(0, 13, "What Is a Mild\nHyperbaric Chamber?")
    y = para(0, y+3,
      f"A mild hyperbaric chamber is a soft-shell chamber that {'an' if TEAM else 'a'} {person} lies down inside. "
      "A quiet machine beside it raises the air pressure to **1.5 ATA**, about one and a half "
      "times normal air pressure, and supplies oxygen-enriched air through a mask.")
    if TEAM:
        y = para(0, y+2.5,
          "Athletes use sessions for rest and recovery between practices, games and travel. A session usually runs "
          "60 to 90 minutes. It is a wellness amenity, not a medical treatment.")
    else:
        y = para(0, y+2.5,
          "Clients book a session to rest and recover in a quiet, private space. A session runs 60 to 90 minutes. "
          "It is a wellness amenity, not a medical treatment.")
    img = crop(os.path.join(BRANDED, "chamber-side-branded.jpg"), KEY + "_flap.jpg", CW, 40)
    pdf.image(img, x=px(0)+M, y=y+4, w=CW, h=40); pdf.set_draw_color(*LINE); pdf.rect(px(0)+M, y+4, CW, 40)
    y = sub(0, y+50, "What a session looks like")
    y = steps(0, y+2.5, [
      f"The {person} lies down inside and {staff} closes the chamber.",
      "The chamber pressurizes gradually over a few minutes. Ears may pop, like on a plane.",
      f"The {person} rests, reads, or naps for the session.",
      f"The chamber depressurizes gradually and the {person} steps out.",
    ])

    # ---- Back (middle): credibility + offer + contact
    pdf.set_fill_color(*INK); pdf.rect(px(1), 0, W, PH, "F")
    ly = logo(1, 16, w=38, cream=True)
    pdf.set_xy(px(1)+M, ly+10); pdf.set_font("Georgia","B",15); pdf.set_text_color(*CREAM2)
    pdf.multi_cell(CW, 6.6, "See if a chamber fits\nyour program" if TEAM else "See if a chamber fits\nyour business", align="L")
    y = para(1, pdf.get_y()+4,
      ("Book a free 15-minute call. We will walk through your training room, your roster, and the cost "
       "for your program, with no obligation.") if TEAM else
      ("Book a free 15-minute call. We will go over your space, your customers, and the numbers "
       "for your business. No obligation."), size=9.4, color=(230,218,200), lh=4.5)
    pdf.set_fill_color(*TERRA); pdf.rect(px(1)+M, y+6, CW, 27, "F")
    pdf.set_xy(px(1)+M+5, y+10); pdf.set_font("Helvetica","B",12.5); pdf.set_text_color(*WHITE)
    pdf.multi_cell(CW-10, 6.2, CONTACT_PHONE + "\n" + CONTACT_EMAIL + "\npurebaric.com", align="L")
    y = y + 6 + 27
    y = para(1, y+9, MK["local"], size=9, color=(230,218,200), lh=4.3)
    para(1, PH-30,
      "Purebaric provides general-wellness equipment. It is not a medical device and is not intended to "
      "diagnose, treat, cure, or prevent any disease. " + ("Figures" if TEAM else "Revenue figures") + " in this pamphlet are estimates, not guarantees.",
      size=6.8, color=(170,158,146), lh=3.2)

    # ---- Cover (right)
    cy = logo(2, 12, w=46, center=True)  # cover logo: centred and larger (owner, 16 Oct 2026)
    src_im = Image.open(os.path.join(BRANDED, COVER_IMG))
    ih = W * src_im.height / src_im.width          # whole photo, no crop, so the full chamber shows
    img = crop(os.path.join(BRANDED, COVER_IMG), KEY + "_cover.jpg", W, ih)
    pdf.image(img, x=px(2), y=cy+8, w=W, h=ih)
    pdf.set_xy(px(2)+M, cy+8+ih+10); pdf.set_font("Georgia","B",19); pdf.set_text_color(*INK)
    pdf.multi_cell(CW, 7.9, TEAM_TITLE if TEAM else BUSINESS_TITLE, align="L")
    y = para(2, pdf.get_y()+4,
      ("A mild hyperbaric chamber in your own training room, for recovery between practices, games and road trips.") if TEAM else
      ("Rent a hyperbaric chamber and sell sessions to the customers you already have."),
      size=9.8, color=MUTED, lh=4.7)
    y = bullets(2, y+6, [
      "**Installed and serviced** by Purebaric",
      "**Staff training** for your athletic trainers and coaches" if TEAM else "**Staff training** included",
      "**Template consent forms**, including parent consent for athletes under 18" if TEAM else "**Consent forms** ready for your intake",
      "**One flat monthly cost** for the whole roster" if TEAM else "**Customer pamphlet** made for your business",
      "**No equipment** to buy or maintain",
    ], size=9.2, lh=4.3, gap=2.2)
    pdf.set_fill_color(*TERRA); pdf.rect(px(2), PH-10, W, 10, "F")
    pdf.set_xy(px(2), PH-10); pdf.set_font("Helvetica","B",9.3); pdf.set_text_color(*WHITE)
    lbl = "HYPERBARIC CHAMBER RENTALS FOR " + LABEL; fs = 9.3
    pdf.set_font("Helvetica","B",fs)
    while pdf.get_string_width(lbl) > W-6 and fs > 6: fs -= 0.2; pdf.set_font("Helvetica","B",fs)
    pdf.set_xy(px(2), PH-10); pdf.cell(W, 10, lbl, align="C")
    folds()

    # =================== PAGE 2: INSIDE  [why | numbers | how + included] ===================
    pdf.add_page()

    # ---- Inside left: why (money for businesses, the team for programs) + who books/uses
    if TEAM:
        y = heading(0, 13, "Why It Helps\nYour Team")
        y = bullets(0, y+4, [b.format(notice=G["notice"], lead=G["lead"], lead_lc=G["lead"][0].lower()+G["lead"][1:]) for b in TEAM_WHY], size=8.4, lh=3.8, gap=1.5)
        who_box(0, y+2, G["who_title"], G["who"], size_t=8.1, size_d=7.9, intro="Who the chamber is for.")
    else:
        y = heading(0, 13, "Why a Chamber\nMakes You Money")
        y = bullets(0, y+4, [
          "**Added revenue.** Sell single sessions, packs of sessions, or a premium membership tier to the customers who already walk through your door.",
          f"**Recurring income.** {MK['facilities_word']} sell memberships and packs of sessions to regular customers. Each regular becomes steady monthly revenue.",
          "**A value add for your customers.** Your customers will see the addition of a hyperbaric chamber as a premium amenity and a reason to keep coming back to your business.",
          "**Retention.** Clients who build a weekly session into their routine regularly walk through your door.",
          "**Small footprint.** The chamber needs a 4 by 8 foot area and a wall outlet. An unused room or corner becomes a paid service.",
          "**No large investment up front.** You rent the chamber by the month. There is no equipment to buy, finance, or resell.",
        ], size=8.6, lh=3.9, gap=1.7)
        who_box(0, y+2, G["who_title"], G["who"], intro="The customers you already have who will pay for sessions.")

    # ---- Inside middle: the numbers (businesses) or the cost (teams)
    if TEAM:
        y = heading(1, 12, "What It Costs")
        y = bullets(1, y+3, [
          "**Chamber rental:** $783 a month on a one-year lease. Shorter terms cost more per month.",
          "**Training and initial supplies:** one-time $200 fee. Delivery and installation are included.",
          "**Staff time:** about 15 minutes per session to start, end and wipe down the chamber.",
          "**Masks and cleaning supplies:** about $1.30 per session.",
          "**Nothing to buy, finance or resell.** Purebaric owns, services and maintains the equipment.",
        ], size=8.6, lh=3.9, gap=1.7)
        by = y+2
        pdf.set_fill_color(*TERRA_BG); pdf.rect(px(1)+M, by, CW, 50, "F")
        pdf.set_xy(px(1)+M+4, by+3.5); pdf.set_font("Georgia","B",10); pdf.set_text_color(*TERRA_D)
        pdf.cell(CW-8, 5, "Example: a 30-athlete roster")
        pdf.set_font("Helvetica","",8.3); pdf.set_text_color(*INK)
        rows = [("Chamber rental, one month", "$783"), ("Rental per athlete, per month", "about $26"), ("One session at a local " + ("clinic" if MARKET == "tennessee" else "studio") + "(1)", MK["single_range"])]
        yy = by+9.5
        for l, v in rows:
            pdf.set_xy(px(1)+M+4, yy); pdf.set_font("Helvetica","",8.3); pdf.cell(CW-32, 4.6, l); pdf.cell(24, 4.6, v, align="R"); yy += 4.5
        pdf.set_draw_color(*TERRA); pdf.line(px(1)+M+4, yy+0.6, px(1)+M+CW-4, yy+0.6)
        para(1, yy+2.5, "One month of rental costs about the same as " + ("eight" if MARKET == "tennessee" else "six to ten") + " single sessions. One chamber holds one athlete at a time and runs "
             "up to 8 sessions in a 10-hour day. That covers one session a week for a 30-person roster when your staff schedule sessions across the day, not only after practice.",
             size=7.8, color=INK, lh=3.5, dx=4, w=CW-8)
        y = by + 50
        y = sub(1, y+5, "How programs pay for it", size=9.6)
        y = bullets(1, y+2, [
          "The athletic department or club budget, as a recovery line item.",
          "A booster club or parent association, as a season sponsorship.",
          "Split across the teams that share the training room.",
        ], size=8.3, lh=3.8, gap=1.2)
        y = sub(1, y+3, "Athletes under 18", size=9.6)
        y = para(1, y+1.5, "Athletes under 18 use the chamber only with a parent's signed consent and a parent present for the session, and only once our insurer has confirmed cover for minors. We supply the consent form; your own counsel reviews it.", size=8.3, lh=3.8)
        para(1, PH-12, MK["team_footnote"], size=6.5, color=MUTED, lh=3.0)
    else:
        y = heading(1, 12, "The Numbers")
        y = sub(1, y+2, MK["charge_label"], size=9.6)
        pdf.set_draw_color(*LINE)
        yy = y+1.5
        for l, v, n in MK["price_rows"]:
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
          "**Chamber rental:** $783 a month on a one-year lease.",
          "**Training and initial supplies:** one-time $200 fee. Delivery and installation are included.",
          "**Staff time:** about 15 minutes per session.",
          "**Masks and cleaning supplies:** about $1.30 per use.",
        ], size=8.3, lh=3.8, gap=1.2)
        # Break-even and revenue potential as one module (design round of 16 Oct 2026, three critics):
        # a dark terracotta band with the numeral "11" flows through a connector into the revenue rows,
        # which end on a large net figure. Numerals are Helvetica Bold (Georgia's are old-style figures).
        top = y+1.5; bx = px(1)+M; ix = bx+4; iw = CW-8
        pdf.set_fill_color(*TERRA_BG); pdf.rect(bx, top, CW, 54, "F")
        pdf.set_fill_color(*TERRA_D); pdf.rect(bx, top, CW, 15, "F")
        pdf.set_xy(ix, top+2.2); pdf.set_font("Helvetica","B",27); pdf.set_text_color(*CREAM); pdf.cell(14, 11, "11")
        pdf.set_xy(ix+15, top+2.6); pdf.set_font("Helvetica","B",10); pdf.set_text_color(*CREAM); pdf.multi_cell(iw-15, 4.6, "sessions a month\nto break even")
        cx = ix+6; pdf.set_fill_color(*TERRA_D); pdf.polygon([(cx-2, top+15), (cx+2, top+15), (cx, top+17)], style="F")
        pdf.set_xy(ix, top+19.5); pdf.set_font("Georgia","B",9); pdf.set_text_color(*TERRA_D); pdf.cell(iw, 4.2, "Revenue potential at moderate usage")
        pdf.set_xy(ix, top+24); pdf.set_font("Helvetica","",7.6); pdf.set_text_color(*INK); pdf.cell(iw, 3.4, "About 4 sessions a day, 6 days a week")
        yy = top+29.5
        for l, v in [("Session revenue (104 \u00d7 $75)", "$7,800"), ("Chamber rental", "- $783"), ("Masks and cleaning (104 \u00d7 $1.30)", "- $135")]:
            pdf.set_xy(ix, yy); pdf.set_font("Helvetica","",8.5); pdf.set_text_color(*INK); pdf.cell(iw-22, 4.6, l); pdf.cell(22, 4.6, v, align="R"); yy += 4.6
        pdf.set_draw_color(*TERRA); pdf.set_line_width(0.3); pdf.line(ix, yy+0.6, ix+iw, yy+0.6); pdf.set_line_width(0.2)
        pdf.set_xy(ix, yy+3.2); pdf.set_font("Helvetica","B",9); pdf.set_text_color(*INK); pdf.cell(iw-34, 8, "Net each month")
        pdf.set_font("Helvetica","B",21); pdf.set_text_color(*TERRA_D); pdf.cell(34, 8, "$6,882", align="R")
        para(1, top+54+3.5, MK["footnote"], size=6.5, color=MUTED, lh=3.0)

    # ---- Inside right: how it works + what's included
    y = heading(2, 13, "How It Works")
    y = steps(2, y+4, [
      "**Talk with us.** A short call about your training room, roster and schedule." if TEAM else "**Talk with us.** A short call about your space, your customers, and your goals.",
      "**We deliver and install.** We set up the chamber and machine in your training room." if TEAM else "**We deliver and install.** We set up the chamber inside your business.",
      "**We train your staff.** Hands-on training for your athletic trainers and coaches." if TEAM else "**We train your staff.** Hands-on training so your team can run sessions with confidence.",
      "**Your athletes start using it.** Your staff schedule sessions around practices and games." if TEAM else "**You start generating additional income.** Add it to your menu, packages, and memberships.",
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
      "**Staff training.** Hands-on training on the chamber itself, for every staff member who will run sessions.",
      ("**Template consent forms.** Athlete and parent consent and waiver templates, so the chamber fits your program's paperwork from day one. Have your own counsel review them." if TEAM else
       "**Consent forms.** Client consent and waiver templates, ready for your intake process. Have your own counsel review them."),
      ("**An information sheet for athletes and parents.** We help you craft a one-page explainer, in your team's colors, so families know what a session is." if TEAM else
       "**Marketing pamphlet.** A client-facing pamphlet in your brand, to help you sell sessions."),
      "**Equipment service.** We service and maintain the chamber and machine.",
      "**Ongoing support.** Call or text with questions. If something is not working, we fix it.",
    ], size=8.6, lh=3.9, gap=1.7)
    # The box starts at the content margin, not the fold, so it never shows on the middle panel when folded; it still runs off the right edge.
    pdf.set_fill_color(*INK); pdf.rect(px(2)+M, PH-30, W-M, 30, "F")
    pdf.set_xy(px(2)+M+5, PH-26); pdf.set_font("Georgia","B",10.5); pdf.set_text_color(*CREAM2)
    pdf.cell(CW, 5.5, "Ready to book?")
    pdf.set_xy(px(2)+M+5, PH-19); pdf.set_font("Helvetica","B",10); pdf.set_text_color(*WHITE)
    pdf.cell(CW, 5, "purebaric.com/book/business")
    pdf.set_xy(px(2)+M+5, PH-12.5); pdf.set_font("Helvetica","B",9.2); pdf.set_text_color(*WHITE)
    pdf.cell(CW, 5, CONTACT_PHONE + "  |  " + CONTACT_EMAIL)
    folds()

    out = os.path.join(OUT_DIR, f"{MK['prefix']}{KEY}.pdf")
    pdf.output(out); print("saved", out)
