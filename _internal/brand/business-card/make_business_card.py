# Purebaric business card, front and back. 3.5 x 2 in finished, 0.125 in bleed on every side, 0.125 in safe zone.
# Run with the scratch venv (fpdf2, pillow, qrcode): python3 make_business_card.py
from fpdf import FPDF
from PIL import Image
import qrcode, os, sys
HERE=os.path.dirname(os.path.abspath(__file__)); ROOT=os.path.abspath(os.path.join(HERE,"..","..",".."))
TMP=sys.argv[1] if len(sys.argv)>1 else HERE
INK=(43,35,32); CREAM=(247,242,234); TERRA=(184,101,77); MUTED=(111,99,91); CREAM2=(239,231,219)
W,H,B=88.9,50.8,3.175            # mm: 3.5 x 2 in, 1/8 in bleed
PW,PH=W+2*B,H+2*B
qr=qrcode.QRCode(error_correction=qrcode.constants.ERROR_CORRECT_M, box_size=20, border=0); qr.add_data("https://purebaric.com"); qr.make(fit=True)
qr.make_image(fill_color=INK, back_color=CREAM).convert("RGB").save(f"{TMP}/qr.png")
mark=Image.open(f"{HERE}/mark-2000.png").convert("RGBA"); a=mark.split()[3]
Image.merge("RGBA",(Image.new("L",mark.size,CREAM[0]),Image.new("L",mark.size,CREAM[1]),Image.new("L",mark.size,CREAM[2]),a)).save(f"{TMP}/mark-cream.png")
pdf=FPDF(unit="mm", format=(PW,PH)); pdf.set_auto_page_break(False)
pdf.add_font("Georgia","B","/System/Library/Fonts/Supplemental/Georgia Bold.ttf"); pdf.add_font("Georgia","","/System/Library/Fonts/Supplemental/Georgia.ttf")
# FRONT: cream, wordmark centred, terracotta rule, one-line promise
pdf.add_page(); pdf.set_fill_color(*CREAM); pdf.rect(0,0,PW,PH,"F")
logo=Image.open(f"{ROOT}/images/logo.png"); lw=50; lh=lw*logo.height/logo.width
pdf.image(f"{ROOT}/images/logo.png", x=(PW-lw)/2, y=B+13, w=lw, h=lh)
pdf.set_draw_color(*TERRA); pdf.set_line_width(0.5); pdf.line(PW/2-8, B+13+lh+5, PW/2+8, B+13+lh+5)
pdf.set_font("Georgia","",8.2); pdf.set_text_color(*INK); pdf.set_xy(B+6, B+13+lh+8); pdf.cell(W-12, 5, "Mild hyperbaric chamber rentals, delivered to your home", align="C")
pdf.set_font("Helvetica","",6.6); pdf.set_text_color(*MUTED); pdf.set_xy(B+6, B+13+lh+13.5); pdf.cell(W-12, 4, "U T A H   ·   P U R E B A R I C . C O M", align="C")
# BACK: ink, mark top-left, name and contact, QR bottom-right (everything inside the 1/8 in safe zone)
pdf.add_page(); pdf.set_fill_color(*INK); pdf.rect(0,0,PW,PH,"F")
pdf.image(f"{TMP}/mark-cream.png", x=B+6, y=B+5.5, w=11)
pdf.set_font("Georgia","B",12.5); pdf.set_text_color(*CREAM2); pdf.set_xy(B+6, B+19); pdf.cell(60, 6, "Matthew Bailie")
pdf.set_font("Helvetica","",7); pdf.set_text_color(*TERRA); pdf.set_xy(B+6, B+25); pdf.cell(60, 4, "OWNER, PUREBARIC")
pdf.set_font("Helvetica","",7.6); pdf.set_text_color(*CREAM2)
y=B+30.5
for line in ["(801) 901-0873", "hello@purebaric.com", "purebaric.com", "Lehi, Utah"]:
    pdf.set_xy(B+6, y); pdf.cell(60, 4, line); y+=4.1
qs=15; qx=PW-B-6-qs; qy=PH-B-6-qs
pdf.set_fill_color(*CREAM); pdf.rect(qx-1.5, qy-1.5, qs+3, qs+3, "F"); pdf.image(f"{TMP}/qr.png", x=qx, y=qy, w=qs, h=qs)
pdf.set_font("Helvetica","",5.2); pdf.set_text_color(*MUTED); pdf.set_xy(qx-1.5, qy-6); pdf.cell(qs+3, 3, "Book a chamber", align="C")
pdf.output(f"{HERE}/Purebaric_Business_Card_print.pdf"); print("saved", f"{HERE}/Purebaric_Business_Card_print.pdf")
