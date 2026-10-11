"""Market business pamphlets, one trifold per industry, driven by a JSON config.

Usage: <venv with fpdf2 + Pillow>/bin/python make_pamphlets_market.py <config.json> [out_dir]
See pamphlet_config_knoxville.json for the config keys. Default out_dir: ~/Desktop/<market> Research/pamphlets

Differences from the Utah facility pamphlet (make_pamphlet2.py): Tennessee contact details only,
no oxygen wording, no legacy hello@ address (Tennessee placements are offered air-only until counsel and the fire marshal answer), "recovery
session" wording with no "therapy", Knoxville price anchors, current business pricing with a sales-tax note, and
industry-specific cover, audience and value panels. The schools pamphlet uses a pilot-program panel instead of a
revenue panel.
"""
import os, sys, json
from PIL import Image
from fpdf import FPDF

CFG = json.load(open(sys.argv[1]))
MARKET = CFG["market"]            # e.g. "Knoxville"
STATE = CFG["state"]              # e.g. "Tennessee"
ST = CFG["state_abbrev"]          # e.g. "TN"
AIR_ONLY = CFG.get("air_only", True)
RATES = CFG["business_rates"]     # {"3": 929, "12": 783} from /api/pricing on the day
R3, R12 = int(RATES["3"]), int(RATES["12"])
ANCHORS = CFG["price_anchors"]    # list of [label, value, note]
ANCHOR_FOOT = CFG["price_anchor_footnote"]
COMING = CFG["coming_line"]       # back-panel paragraph, markdown bold allowed

HERE = os.path.dirname(os.path.abspath(__file__))
SITE_IMG = os.path.expanduser("~/projects/purebaric-newsite/images")
BRANDED = os.path.join(HERE, "..", "branded-images")
OUT_DIR = sys.argv[2] if len(sys.argv) > 2 else os.path.expanduser(f"~/Desktop/{MARKET} Research/pamphlets")
CROP = os.path.join(os.environ.get("TMPDIR", "/tmp"), "pb_mkt_crops"); os.makedirs(CROP, exist_ok=True); os.makedirs(OUT_DIR, exist_ok=True)

CONTACT_PHONE = CFG["contact_phone"]
CONTACT_EMAIL = CFG["contact_email"]
CONTACT_WEB = CFG.get("contact_web", "purebaric.com")

INK=(43,35,32); MUTED=(111,99,91); CREAM=(247,242,234); CREAM2=(239,231,219)
TERRA=(184,101,77); TERRA_D=(154,79,58); TERRA_BG=(244,231,223); LINE=(230,220,205); WHITE=(255,255,255)
PW, PH = 279.4, 215.9
W = PW/3; M = 9; CW = W - 2*M

def crop(src, out, w, h, focus=(0.5,0.5)):
    im = Image.open(src).convert("RGB"); tr = w/h
    if im.width/im.height > tr:
        nw = int(im.height*tr); x0 = int((im.width-nw)*focus[0]); im = im.crop((x0,0,x0+nw,im.height))
    else:
        nh = int(im.width/tr); y0 = int((im.height-nh)*focus[1]); im = im.crop((0,y0,im.width,y0+nh))
    p = os.path.join(CROP, out); im.save(p, quality=92); return p

INDUSTRIES = {
  "gyms-and-fitness": dict(
    label="GYMS AND FITNESS CENTERS", cover_img="chamber-gym-branded.jpg",
    title="A New Revenue-\nGenerating Amenity\nfor Your Gym",
    tagline="Offer recovery sessions to the members you already have. You keep the session revenue.",
    who=[("Members between hard workouts", "Lifters, runners and class regulars who want a quiet hour to recharge."),
         ("Personal-training clients", "Add a session to a training package or a premium membership tier."),
         ("Weekend competitors", "Race, tournament and league athletes who want a quiet hour in their routine."),
         ("Early and late regulars", "Members who fill the quiet hours when the chamber is free.")],
    why=["**Add-on revenue from members you already have.** Sell sessions, packages or a premium tier to people already walking through your door.",
         "**Fill quiet afternoons.** A chamber sells sixty-minute blocks in the hours your floor is empty.",
         "**A reason to choose you.** " + MARKET + " has very few places to book a chamber session; be the first gym in your area with one.",
         "**Retention.** A member who books a weekly session has one more reason to stay.",
         "**Earn from idle space.** A chamber needs only a 4 x 8 foot area and a wall outlet.",
         "**No capital outlay.** You rent the chamber. There is no equipment to buy, finance or resell."]),
  "crossfit-and-performance": dict(
    label="CROSSFIT AND PERFORMANCE GYMS", cover_img="chamber-gym-branded.jpg",
    title="A Quiet Hour Your\nAthletes Will Book",
    tagline="Your athletes already spend on recovery amenities. Give them a session where they train, and keep the revenue.",
    who=[("Athletes in a competition block", "Open, qualifier and meet prep, when athletes look for a quiet hour between sessions."),
         ("Members training five or more days", "The people who already buy massage, compression and cold plunge."),
         ("Masters athletes", "Members over forty, who book quiet time more than anyone else in the box."),
         ("Your coaches", "Staff use between classes; a coach runs the sessions.")],
    why=["**Your athletes talk.** One member's session becomes the whole 6 a.m. class asking about it.",
         "**Bundle it.** Add sessions to an athlete tier, a comp-prep package or a monthly recovery add-on.",
         "**A coach runs it.** Fifteen minutes of staff time per session, between classes.",
         "**Stand out from the box down the road.** A recovery room is a reason to switch gyms and a reason to stay.",
         "**Earn from idle space.** A 4 x 8 foot corner of the mobility area and a wall outlet.",
         "**No capital outlay.** Rent by the month; no equipment to buy or maintain."]),
  "sports-teams-and-clubs": dict(
    label="SPORTS CLUBS, TEAMS AND ATHLETIC FACILITIES", cover_img="chamber-gym-branded.jpg",
    title="Recovery for Your\nPlayers and Members",
    tagline="A supervised recovery amenity in your training room or clubhouse, rented by the season.",
    who=[("Players in season", "Adult players under the supervision of your trainer or sports-medicine lead."),
         ("Adult club members", "Swim, tennis, rowing and country-club members who pay for premium amenities."),
         ("Youth athletes", "Only after written insurer approval, with a parent's signed consent and a parent present."),
         ("Coaches and staff", "A quiet hour between sessions for the people who run the program.")],
    why=["**A player amenity in your training room.** Run under your trainer's supervision, for adult players first.",
         "**Member value.** Clubs sell sessions, include them in a premium tier, or offer them at tournaments and events.",
         "**Rent by the season.** Three, six or twelve months; we remove it when the season ends.",
         "**Simple to run.** Your trainer or fitness staff start and end every session.",
         "**Small footprint.** A 4 x 8 foot area and a wall outlet in the training room.",
         "**No capital outlay.** No equipment to buy, store in the off-season or resell."]),
  "high-schools-and-colleges": dict(
    label="ATHLETIC DEPARTMENTS: HIGH SCHOOLS AND COLLEGES", cover_img="chamber-gym-branded.jpg",
    title="A Quiet Room for\nYour Athletic\nProgram",
    tagline="A supervised, trainer-run recovery amenity in your training room, offered first as a 90-day pilot.",
    who=[("Adult athletes first", "College athletes and 18-plus high-school athletes, run by your athletic trainer under your program's policy."),
         ("Athletes under 18", "Only after Purebaric's insurer confirms coverage in writing, with a parent's signed consent and a parent present."),
         ("Club-sport and intramural athletes (colleges)", "A wellness amenity the recreation department can schedule."),
         ("Coaching and training staff", "Staff sessions between practices.")],
    why=["**Trainer-run.** Your athletic trainer starts and ends every session and keeps the log.",
         "**A pilot, not a commitment.** Ninety days, one chamber, then your staff decide with real usage numbers.",
         "**Funded from athletics or boosters.** The 90-day pilot costs about $" + f"{R3*3+200:,}" + ".",
         "**Air-only configuration.** No oxygen enrichment in school placements.",
         "**Small footprint.** A 4 x 8 foot corner of the training room and a wall outlet.",
         "**We handle the equipment.** Delivery, training, maintenance, consent-form templates and removal."],
    program=True),
  "recovery-studios-and-med-spas": dict(
    label="RECOVERY STUDIOS, IV LOUNGES AND MED SPAS", cover_img="chamber-clinic-branded.jpg",
    title="The Next Service\non Your Recovery\nMenu",
    tagline="Your clients already buy recovery services. Add a sixty-minute chamber session without buying anything.",
    who=[("Clients who book cryo, sauna or cold plunge", "The same people, the same price expectation, one more service."),
         ("IV and vitamin clients", "Offer a session in the same visit as a drip."),
         ("Members", "Add sessions to a monthly membership to lift its value."),
         ("Athletes and weekend competitors", "Sessions sold as a package alongside what they already book.")],
    why=["**Your clients already pay for recovery.** A chamber session fits the menu at the same price point as cryo or IV.",
         "**Packages and memberships.** Ten-session packs and monthly add-ons turn one visit into repeat revenue.",
         "**Cheaper to run than cryo.** A wall outlet, fifteen minutes of staff time and a fresh mask per client.",
         "**Be one of the first.** Few " + MARKET + " businesses offer chamber sessions, and almost none are recovery studios; yours can be the one clients drive to.",
         "**Fits a treatment room.** A 4 x 8 foot area in a quiet room with a wall outlet.",
         "**No capital outlay.** Rent by the month; no equipment to buy, maintain or resell."]),
  "physical-therapy-and-chiropractic": dict(
    label="CHIROPRACTIC AND WELLNESS PRACTICES", cover_img="chamber-clinic-branded.jpg",
    title="A Cash-Pay Wellness\nAmenity for Your\nPractice",
    tagline="A wellness service on the cash side of the practice, run by your front-desk or massage staff.",
    who=[("Clients between appointments", "A reason to keep coming in on the wellness side of the practice."),
         ("Cash-pay wellness clients", "People who already buy massage, sauna, red light or supplements from you."),
         ("Athletes you see", "Weekend competitors and team athletes who want a recovery routine."),
         ("Your staff", "Sessions in the room that sits empty part of the day.")],
    why=["**Cash-pay, not insurance.** A wellness amenity that never touches billing or treatment.",
         "**Keeps clients coming in.** A weekly wellness session gives them a reason to visit between appointments.",
         "**Front-desk simple.** Staff start and end sessions; fifteen minutes of time each.",
         "**Stand out.** Few " + MARKET + " businesses offer chamber sessions, and almost none of them are chiropractic or wellness practices.",
         "**Uses an empty room.** A 4 x 8 foot area and a wall outlet.",
         "**No capital outlay.** Rent by the month; no equipment to buy, maintain or resell."]),
  "salons-and-day-spas": dict(
    label="SALONS, DAY SPAS AND BEAUTY STUDIOS", cover_img="chamber-salon-branded.jpg",
    title="A Quiet Hour Your\nClients Will Book\nAgain",
    tagline="A relaxation chamber for your treatment room: a sixty-minute service clients add to a facial or massage.",
    who=[("Spa clients adding a treatment", "A quiet hour before or after a facial, massage or body treatment."),
         ("Weekly regulars", "Clients who already visit every week and want one more reason to stay longer."),
         ("Members", "A sixty-minute service that lifts the value of a spa membership."),
         ("Groups and occasions", "Bridal parties, mother-and-daughter days, self-care gift packages.")],
    why=["**Sell the hour.** Price it like a body treatment; clients book a quiet, pressurized hour of rest.",
         "**Turns a visit into a half day.** A salon appointment plus a session plus a treatment.",
         "**Fills a treatment room.** Sixty-minute blocks in the room that is empty on weekday mornings.",
         "**Simple to run.** Any trained team member starts and ends the session.",
         "**Fits a treatment room.** A 4 x 8 foot area and a wall outlet.",
         "**No capital outlay.** Rent by the month; no equipment to buy, maintain or resell."]),
}

def build(key, cfg):
    pdf = FPDF(orientation="L", unit="mm", format="Letter"); pdf.set_auto_page_break(False)
    pdf.add_font("Georgia","B","/System/Library/Fonts/Supplemental/Georgia Bold.ttf")
    pdf.add_font("Georgia","","/System/Library/Fonts/Supplemental/Georgia.ttf")
    def px(i): return i*W
    def heading(i, y, text, size=14.5, color=TERRA_D, lh=6.3):
        pdf.set_xy(px(i)+M, y); pdf.set_font("Georgia","B",size); pdf.set_text_color(*color); pdf.multi_cell(CW, lh, text, align="L"); return pdf.get_y()
    def sub(i, y, text, size=10.5):
        pdf.set_xy(px(i)+M, y); pdf.set_font("Georgia","B",size); pdf.set_text_color(*INK); pdf.multi_cell(CW, 5, text, align="L"); return pdf.get_y()
    def para(i, y, text, size=8.9, color=INK, lh=4.1, style="", w=None, dx=0):
        pdf.set_xy(px(i)+M+dx, y); pdf.set_font("Helvetica",style,size); pdf.set_text_color(*color); pdf.multi_cell(w or CW-dx, lh, text, align="L", markdown=True); return pdf.get_y()
    def bullets(i, y, items, size=8.9, lh=4.1, gap=2.0):
        for t in items:
            pdf.set_fill_color(*TERRA); pdf.ellipse(px(i)+M, y+1.2, 1.9, 1.9, "F"); y = para(i, y, t, size=size, lh=lh, dx=4.4) + gap
        return y
    def steps(i, y, items, size=8.9, lh=4.1, gap=2.4):
        for n, t in enumerate(items, 1):
            pdf.set_fill_color(*TERRA); pdf.ellipse(px(i)+M, y-0.3, 5.4, 5.4, "F")
            pdf.set_xy(px(i)+M, y+0.35); pdf.set_font("Helvetica","B",8); pdf.set_text_color(*WHITE); pdf.cell(5.4, 4, str(n), align="C")
            y2 = para(i, y, t, size=size, lh=lh, dx=7.6); y = max(y2, y+5.4) + gap
        return y
    def folds():
        pdf.set_draw_color(*LINE); pdf.set_dash_pattern(dash=1.2, gap=1.2)
        for k in (1,2): pdf.line(px(k),0,px(k),PH)
        pdf.set_dash_pattern()
    def logo(i, y, w=30, cream=False):
        f = os.path.join(SITE_IMG, "logo-cream.png" if cream else "logo.png"); im = Image.open(f); h = w*im.height/im.width
        pdf.image(f, x=px(i)+M, y=y, w=w, h=h); return y+h

    def lines(text, size, w, style="B"):
        pdf.set_font("Helvetica", style, size); import math
        return max(1, math.ceil(pdf.get_string_width(text.replace("**","")) / (w-0.5)))
    program = cfg.get("program", False)
    # ================= PAGE 1: OUTSIDE [flap | back | cover] =================
    pdf.add_page()
    y = heading(0, 13, "What Is a Mild\nHyperbaric Chamber?")
    y = para(0, y+3, "A mild hyperbaric chamber is a soft-shell chamber that a client lies down inside. A quiet compressor beside it gently raises the air pressure to about **1.3 to 1.5 ATA**, around one and a half times normal air pressure.")
    y = para(0, y+2.5, "Clients book sessions to rest, relax and recharge: a quiet hour that many people build into a recovery routine. It is a wellness amenity, not a medical treatment, and we make no health claims about it.")
    img = crop(os.path.join(BRANDED, "chamber-side-branded.jpg"), key+"_flap.jpg", CW, 40)
    pdf.image(img, x=px(0)+M, y=y+4, w=CW, h=40); pdf.set_draw_color(*LINE); pdf.rect(px(0)+M, y+4, CW, 40)
    y = sub(0, y+50, "What a session looks like")
    y = steps(0, y+2.5, ["The client lies down inside and your trained staff member closes the chamber.",
                         "The chamber pressurizes gradually over a few minutes. Ears may pop, like on a plane.",
                         "The client rests, reads or naps for the session; staff stay on the premises.",
                         "The chamber depressurizes gradually and the client steps out."])
    # back panel
    pdf.set_fill_color(*INK); pdf.rect(px(1), 0, W, PH, "F")
    ly = logo(1, 16, w=38, cream=True)
    pdf.set_xy(px(1)+M, ly+10); pdf.set_font("Georgia","B",15); pdf.set_text_color(*CREAM2)
    pdf.multi_cell(CW, 6.6, "See if a chamber fits\nyour " + ("program" if program else "business"), align="L")
    y = para(1, pdf.get_y()+4, "Book a free 15-minute call. We will walk through your space, your " + ("athletes" if program else "clients") + " and the numbers, with no obligation.", size=9.4, color=(230,218,200), lh=4.5)
    pdf.set_fill_color(*TERRA); pdf.rect(px(1)+M, y+6, CW, 27, "F")
    pdf.set_xy(px(1)+M+5, y+10); pdf.set_font("Helvetica","B",12.5); pdf.set_text_color(*WHITE)
    pdf.multi_cell(CW-10, 6.2, f"{CONTACT_PHONE}\n{CONTACT_EMAIL}\n{CONTACT_WEB}", align="L")
    y = y + 6 + 27
    y = para(1, y+9, COMING, size=9, color=(230,218,200), lh=4.3)
    para(1, PH-33, "Purebaric rents this equipment as a general-wellness amenity. It is not offered to diagnose, treat, cure or prevent any disease. Figures in this pamphlet are illustrations, not guarantees. Any applicable sales tax is applied at payment. " + (MARKET + " placements are air-only; configuration is confirmed at the site check." if AIR_ONLY else "Configuration is confirmed at the site check."), size=6.8, color=(170,158,146), lh=3.2)
    # cover
    cy = logo(2, 13, w=34)
    src = os.path.join(BRANDED, cfg["cover_img"]); src_im = Image.open(src); ih = W * src_im.height / src_im.width
    img = crop(src, key+"_cover.jpg", W, ih); pdf.image(img, x=px(2), y=cy+8, w=W, h=ih)
    pdf.set_xy(px(2)+M, cy+8+ih+9); pdf.set_font("Georgia","B",18.5); pdf.set_text_color(*INK); pdf.multi_cell(CW, 7.7, cfg["title"], align="L")
    y = para(2, pdf.get_y()+3.5, cfg["tagline"], size=9.6, color=MUTED, lh=4.6)
    y = bullets(2, y+5, ["**Installed and serviced** by Purebaric", "**Staff training, runbook** and refreshers", "**Template consent forms** for your intake",
                         "**Client pamphlet** crafted for your brand", "**No equipment to buy** or maintain"], size=9.2, lh=4.3, gap=2.0)
    pdf.set_fill_color(*TERRA); pdf.rect(px(2), PH-10, W, 10, "F")
    lbl = "CHAMBER RENTALS FOR " + cfg["label"]; fs = 8.2
    pdf.set_font("Helvetica","B",fs)
    while pdf.get_string_width(lbl) > W-6 and fs > 5.5: fs -= 0.2; pdf.set_font("Helvetica","B",fs)
    pdf.set_xy(px(2), PH-10); pdf.set_text_color(*WHITE); pdf.cell(W, 10, lbl, align="C")
    folds()

    # ================= PAGE 2: INSIDE [why | numbers | how] =================
    pdf.add_page()
    y = heading(0, 13, "Why It Works\nfor Your Program" if program else "Why It Makes\nMoney for You")
    y = bullets(0, y+4, cfg["why"], size=8.6, lh=3.9, gap=1.7)
    by0 = y+2
    boxh = 10.5 + sum(lines(f, 8.3, CW-8)*3.8 + lines(w_, 8.1, CW-8, "")*3.7 + 1.6 for f, w_ in cfg["who"]) + 3
    pdf.set_fill_color(*TERRA_BG); pdf.rect(px(0)+M, by0, CW, boxh, "F")
    pdf.set_xy(px(0)+M+4, by0+3.5); pdf.set_font("Georgia","B",10); pdf.set_text_color(*TERRA_D); pdf.cell(CW-8, 5, "Who books sessions?")
    yy = by0+10.5
    for fac, who in cfg["who"]:
        yy = para(0, yy, "**"+fac+"**", size=8.3, lh=3.8, dx=4, w=CW-8)
        yy = para(0, yy, who, size=8.1, lh=3.7, dx=4, w=CW-8, color=MUTED) + 1.6

    if not program:
        y = heading(1, 12, "The Numbers")
        y = sub(1, y+2, "What chamber sessions sell for in " + MARKET + "(1)", size=9.6)
        pdf.set_draw_color(*LINE); yy = y+1.5
        for l, v, n in ANCHORS:
            pdf.set_xy(px(1)+M, yy); pdf.set_font("Helvetica","",8.3); pdf.set_text_color(*INK); pdf.cell(CW*0.58, 4.3, l)
            pdf.set_font("Helvetica","B",8.3); pdf.cell(CW*0.42, 4.3, v, align="R")
            if n:
                pdf.set_xy(px(1)+M, yy+3.7); pdf.set_font("Helvetica","",7.1); pdf.set_text_color(*MUTED); pdf.cell(CW, 3.4, n, align="R"); yy += 3.2
            yy += 5.0; pdf.line(px(1)+M, yy-0.6, px(1)+M+CW, yy-0.6)
        y = para(1, yy+1.5, "**Our assumptions:** 60-minute sessions, open 6 days a week (26 days a month), at **$75 a session**" + (CFG.get("assumption_vs_local", ", below the local single-session price")) + ". One chamber can run up to 8 sessions in a 10-hour day; most new amenities start well below that.", size=8.1, color=MUTED, lh=3.7)
        ty = y+3; cw = [CW*0.35, CW*0.25, CW*0.40]; rh = 6.6
        pdf.set_xy(px(1)+M, ty); pdf.set_fill_color(*INK); pdf.set_text_color(*WHITE); pdf.set_font("Helvetica","B",7.6)
        for w_, h_ in zip(cw, ["Usage","Sessions / mo","Gross revenue / mo"]): pdf.cell(w_, rh, h_, align="C", fill=True)
        pdf.ln(rh)
        for k,(a,b,c) in enumerate([("1 a day","26","$1,950"),("2 a day","52","$3,900"),("4 a day","104","$7,800")]):
            pdf.set_x(px(1)+M); pdf.set_fill_color(*(CREAM if k%2==0 else WHITE)); pdf.set_draw_color(*LINE); pdf.set_font("Helvetica","",8.4); pdf.set_text_color(*INK)
            pdf.cell(cw[0], rh, a, border=1, align="C", fill=True); pdf.cell(cw[1], rh, b, border=1, align="C", fill=True)
            pdf.set_font("Helvetica","B",8.6); pdf.set_text_color(*TERRA_D); pdf.cell(cw[2], rh, c, border=1, align="C", fill=True); pdf.ln(rh)
        y = sub(1, pdf.get_y()+3.5, "What it costs you", size=9.6)
        import math
        cost_items = ["**Chamber rental:** from $" + f"{R12:,}" + " a month on a 12-month term ($" + f"{R3:,}" + " on 3 months). About " + str(math.ceil(R12/73.7)) + " sessions a month covers it.",
                      "**Training and initial supplies:** one-time $200 fee. Delivery and installation are included.",
                      "**Staff time:** about 15 minutes per session.",
                      "**Cleaning supplies and liners:** about $1.30 per use."]
        if AIR_ONLY: cost_items.append("**" + MARKET + " placements are air-only** (no oxygen enrichment).")
        y = bullets(1, y+2, cost_items, size=8.3, lh=3.8, gap=1.2)
        by = y+1.5
        pdf.set_fill_color(*TERRA_BG); pdf.rect(px(1)+M, by, CW, 43, "F")
        pdf.set_xy(px(1)+M+4, by+3.5); pdf.set_font("Georgia","B",10); pdf.set_text_color(*TERRA_D); pdf.cell(CW-8, 5, "Example: 2 sessions a day")
        pdf.set_font("Helvetica","",8.3); pdf.set_text_color(*INK); yy = by+9.5
        for l,v in [("Session revenue (52 x $75)","$3,900"),("Chamber rental (12-month rate)","- $" + f"{R12:,}"),("Cleaning supplies and liners (52 x $1.30)","- $68")]:
            pdf.set_xy(px(1)+M+4, yy); pdf.cell(CW-30, 4.6, l); pdf.cell(22, 4.6, v, align="R"); yy += 4.5
        pdf.set_draw_color(*TERRA); pdf.line(px(1)+M+4, yy+0.6, px(1)+M+CW-4, yy+0.6)
        pdf.set_xy(px(1)+M+4, yy+1.8); pdf.set_font("Helvetica","B",9.2); pdf.set_text_color(*TERRA_D); pdf.cell(CW-30, 5, "After rental and supplies"); pdf.cell(22, 5, "$" + f"{3900-R12-68:,}", align="R")
        para(1, yy+8, "Before card fees and staff time. First month only: subtract the one-time $200 fee.", size=7.6, color=MUTED, lh=3.5, dx=4, w=CW-8)
        para(1, by+45, ANCHOR_FOOT, size=6.5, color=MUTED, lh=3.0)
    else:
        y = heading(1, 12, "The 90-Day Pilot")
        y = para(1, y+3, "One chamber in your athletic training room for ninety days, run by your athletic trainer, so your staff can decide with real usage numbers.", size=8.9, lh=4.1)
        y = sub(1, y+3, "What the pilot includes", size=9.6)
        y = bullets(1, y+2, ["**One chamber, compressor and accessories,** air-only configuration, installed in your training room.",
                             "**Training for your athletic trainer and two staff,** a written runbook, a session log and consent-form templates.",
                             "**A written session policy template** for your program to adapt.",
                             "**Maintenance, support and removal** at the end of the pilot, with no obligation to continue."], size=8.4, lh=3.9, gap=1.5)
        y = sub(1, y+2, "What it costs", size=9.6)
        y = bullets(1, y+2, ["**Chamber rental:** $" + f"{R3:,}" + " a month on the three-month pilot term; from $" + f"{R12:,}" + " a month if you continue on a twelve-month term.",
                             "**Training and initial supplies:** one-time $200 fee. Delivery and installation are included.",
                             "**Staff time:** about 15 minutes of the trainer's time per session."], size=8.4, lh=3.9, gap=1.5)
        by = y+2
        pilot_items = ["Your athletic trainer reviews the session policy and the screening list.",
                  "Your athletic director confirms funding (athletics budget or boosters) and the room.",
                  "Purebaric's insurer confirms coverage in writing for supervised use; athletes under 18 join only after that confirmation, with a parent's signed consent and a parent present.",
                  "A short letter of intent sets the start date; the rental agreement follows."]
        ph = 10.5 + sum(lines(t, 8.2, CW-12, "")*3.8 + 1.6 for t in pilot_items) + 3
        pdf.set_fill_color(*TERRA_BG); pdf.rect(px(1)+M, by, CW, ph, "F")
        pdf.set_xy(px(1)+M+4, by+3.5); pdf.set_font("Georgia","B",10); pdf.set_text_color(*TERRA_D); pdf.cell(CW-8, 5, "Before a pilot starts")
        yy = by+10.5
        for t in pilot_items:
            pdf.set_fill_color(*TERRA); pdf.ellipse(px(1)+M+4, yy+1.1, 1.8, 1.8, "F")
            yy = para(1, yy, t, size=8.2, lh=3.8, dx=8.2, w=CW-12) + 1.6

    y = heading(2, 13, "How It Works")
    y = steps(2, y+4, ["**Talk with us.** A short call about your space, " + ("athletes" if program else "clients") + " and goals.",
                       "**Site check.** Photos or a video walk-through of the room: a 4 x 8 foot area and a wall outlet.",
                       "**We deliver and install.** We set up the chamber and compressor in your room and train your staff hands-on.",
                       "**You start " + ("scheduling sessions" if program else "selling sessions") + ".** " + ("Your trainer runs the program." if program else "Add it to your menu, packages and memberships.")], gap=2.2)
    by1 = y+1
    pdf.set_fill_color(*TERRA_BG); pdf.rect(px(2)+M, by1, CW, 27, "F")
    pdf.set_xy(px(2)+M+4, by1+3.5); pdf.set_font("Georgia","B",10); pdf.set_text_color(*TERRA_D); pdf.cell(CW-8, 5, "What's needed")
    yy = by1+10.5
    for t in ["**A 4 x 8 foot area**, about the size of a twin bed, in a dry, temperature-controlled room.", "**A grounded wall outlet** and no open flame or heat source nearby."]:
        pdf.set_fill_color(*TERRA); pdf.ellipse(px(2)+M+4, yy+1.1, 1.8, 1.8, "F"); yy = para(2, yy, t, size=8.4, lh=3.9, dx=8.2, w=CW-12) + 1.5
    y = by1+27
    y = heading(2, y+5, "After Installation,\nWe Support You", size=13, lh=5.7)
    y = bullets(2, y+3.5, ["**Staff training.** Hands-on training with the chamber; refreshers on request at no charge.",
                           "**Runbook and session log.** A written guide your staff follow day to day.",
                           "**Consent-form templates.** Client consent, screening and release forms ready for your intake. Have your own counsel review them.",
                           "**A client pamphlet in your brand.** We help you craft the piece that signs up " + ("athletes and parents" if program else "new clients") + ".",
                           "**Equipment service.** We maintain the chamber and compressor and respond within two business days.",
                           "**Ongoing support.** Call or text with questions. If something is not working, we repair or replace it."], size=8.5, lh=3.9, gap=1.6)
    pdf.set_fill_color(*INK); pdf.rect(px(2), PH-24, W, 24, "F")
    pdf.set_xy(px(2)+M, PH-20); pdf.set_font("Georgia","B",10.5); pdf.set_text_color(*CREAM2); pdf.cell(CW, 5.5, "Ready to talk?")
    pdf.set_xy(px(2)+M, PH-13.5); pdf.set_font("Helvetica","B",9.2); pdf.set_text_color(*WHITE); pdf.cell(CW, 5, f"{CONTACT_PHONE}  |  {CONTACT_EMAIL}")
    folds()
    out = os.path.join(OUT_DIR, f"Purebaric_{ST}_pamphlet_{key}.pdf"); pdf.output(out); print("saved", out)

for k, c in INDUSTRIES.items():
    build(k, c)
