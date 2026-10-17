# Four treatments of the break-even + revenue module, rendered as the pamphlet's middle panel (same width, fonts, palette).
import os, sys, subprocess
from fpdf import FPDF
OUT=sys.argv[1]
INK=(43,35,32); MUTED=(111,99,91); CREAM=(247,242,234); CREAM2=(239,231,219)
TERRA=(184,101,77); TERRA_D=(154,79,58); TERRA_BG=(244,231,223); LINE=(230,220,205); WHITE=(255,255,255)
PW,PH=279.4,215.9; W=PW/3; M=9; CW=W-2*M
ROWS=[("Session revenue (104 x $75)","$7,800"),("Chamber rental, one-year lease","- $783"),("Masks and cleaning (104 x $1.30)","- $135")]
def new():
    pdf=FPDF(orientation="P",unit="mm",format=(W,PH)); pdf.set_auto_page_break(False); pdf.set_margins(0,0,0)
    pdf.add_font("Georgia","B","/System/Library/Fonts/Supplemental/Georgia Bold.ttf"); pdf.add_font("Georgia","","/System/Library/Fonts/Supplemental/Georgia.ttf")
    pdf.add_page(); return pdf
def txt(pdf,x,y,s,font=("Helvetica","",8.3),color=INK,w=None,lh=4.0,align="L"):
    pdf.set_xy(x,y); pdf.set_font(*font); pdf.set_text_color(*color); pdf.multi_cell(w or (CW-(x-M)), lh, s, align=align); return pdf.get_y()
def context(pdf):
    # the panel above the module, so critics see it in place
    y=txt(pdf,M,12,"What it costs you",("Georgia","B",9.6),TERRA_D)
    y+=2
    for b,t in [("Chamber rental:"," $783 a month on a one-year lease."),("Training and initial supplies:"," one-time $200 fee. Delivery and installation are included."),("Staff time:"," about 15 minutes per session."),("Masks and cleaning supplies:"," about $1.30 per use.")]:
        pdf.set_fill_color(*TERRA); pdf.ellipse(M,y+1.2,1.8,1.8,"F")
        pdf.set_xy(M+4.4,y); pdf.set_font("Helvetica","B",8.3); pdf.set_text_color(*INK); pdf.write(3.8,b); pdf.set_font("Helvetica","",8.3); pdf.write(3.8,t); y=pdf.get_y()+3.8+1.2
    return y+1.5
def rows(pdf,x,y,w,size=8.3,lh=4.6,net_size=9.4,label="Net revenue each month",net="$6,882",rule=True):
    for l,v in ROWS:
        pdf.set_xy(x,y); pdf.set_font("Helvetica","",size); pdf.set_text_color(*INK); pdf.cell(w-22,lh,l); pdf.cell(22,lh,v,align="R"); y+=lh-0.1
    if rule: pdf.set_draw_color(*TERRA); pdf.line(x,y+0.8,x+w,y+0.8)
    pdf.set_xy(x,y+2); pdf.set_font("Helvetica","B",net_size); pdf.set_text_color(*TERRA_D); pdf.cell(w-22,5,label); pdf.cell(22,5,net,align="R")
    return y+7.5
def footnote(pdf,y):
    txt(pdf,M,y,"First month only: subtract the one-time $200 fee for training and initial supplies.",("Helvetica","",7.4),MUTED,lh=3.3)

# ---- A: stat lockup, one cream card
def A(pdf):
    y=context(pdf); top=y
    pdf.set_fill_color(*TERRA_BG); pdf.rect(M,top,CW,58,"F")
    pdf.set_xy(M+4,top+3); pdf.set_font("Georgia","B",30); pdf.set_text_color(*TERRA_D); pdf.cell(16,12,"11")
    txt(pdf,M+21,top+4,"sessions a month\nto break even",("Helvetica","B",9.2),INK,w=CW-25,lh=4.4)
    txt(pdf,M+4,top+17,"At $75 a session, 11 sessions cover the $783 rental.",("Helvetica","",7.8),MUTED,w=CW-8,lh=3.5)
    pdf.set_draw_color(*LINE); pdf.line(M+4,top+23.5,M+CW-4,top+23.5)
    txt(pdf,M+4,top+25.5,"Revenue potential at moderate usage",("Georgia","B",9.5),TERRA_D,w=CW-8,lh=4.5)
    yy=rows(pdf,M+4,top+31.5,CW-8)
    footnote(pdf,top+58+3)
# ---- B: terracotta header band attached to the card
def B(pdf):
    y=context(pdf); top=y
    pdf.set_fill_color(*TERRA); pdf.rect(M,top,CW,13,"F")
    txt(pdf,M+4,top+2.3,"Break even at 11 sessions a month",("Georgia","B",10.2),WHITE,w=CW-8,lh=4.6)
    txt(pdf,M+4,top+7.3,"Fewer than three sessions a week",("Helvetica","",7.8),CREAM2,w=CW-8,lh=3.5)
    pdf.set_fill_color(*TERRA_BG); pdf.rect(M,top+13,CW,37,"F")
    txt(pdf,M+4,top+16,"Revenue potential at moderate usage",("Georgia","B",9.5),TERRA_D,w=CW-8,lh=4.5)
    rows(pdf,M+4,top+22,CW-8)
    footnote(pdf,top+50+3)
# ---- C: session scale with two markers
def C(pdf):
    y=context(pdf); top=y
    pdf.set_fill_color(*TERRA_BG); pdf.rect(M,top,CW,60,"F")
    txt(pdf,M+4,top+3,"Revenue potential at moderate usage",("Georgia","B",9.5),TERRA_D,w=CW-8,lh=4.5)
    x0,x1=M+4,M+CW-4; ty=top+15
    pdf.set_fill_color(*LINE); pdf.rect(x0,ty,x1-x0,2.2,"F")
    bx=x0+(x1-x0)*11/104
    pdf.set_fill_color(*TERRA); pdf.rect(x0,ty,bx-x0,2.2,"F")
    pdf.set_fill_color(*TERRA_D); pdf.ellipse(bx-1.6,ty-0.7,3.6,3.6,"F"); pdf.ellipse(x1-3.6,ty-0.7,3.6,3.6,"F")
    txt(pdf,x0,ty+4,"11 sessions\nbreak even",("Helvetica","B",7.6),TERRA_D,w=30,lh=3.3)
    txt(pdf,x1-34,ty+4,"104 sessions\nmoderate usage",("Helvetica","B",7.6),INK,w=34,lh=3.3,align="R")
    txt(pdf,M+4,ty+12,"Every session past the eleventh is profit.",("Helvetica","",7.8),MUTED,w=CW-8,lh=3.5)
    rows(pdf,M+4,top+34,CW-8)
    footnote(pdf,top+60+3)
# ---- D: net revenue first, break-even as a pill
def D(pdf):
    y=context(pdf); top=y
    pdf.set_fill_color(*TERRA_BG); pdf.rect(M,top,CW,57,"F")
    txt(pdf,M+4,top+3,"Revenue potential at moderate usage",("Georgia","B",9.5),TERRA_D,w=CW-8,lh=4.5)
    pdf.set_xy(M+4,top+8.5); pdf.set_font("Georgia","B",22); pdf.set_text_color(*TERRA_D); pdf.cell(34,10,"$6,882")
    txt(pdf,M+39,top+10.5,"net revenue\neach month",("Helvetica","B",8.4),INK,w=CW-43,lh=3.9)
    pdf.set_fill_color(*TERRA); pdf.rect(M+4,top+21,CW-8,7,"F")
    txt(pdf,M+4,top+22.4,"Break even at 11 sessions a month",("Helvetica","B",8.2),WHITE,w=CW-8,lh=4.2,align="C")
    rows(pdf,M+4,top+32,CW-8,size=7.9,lh=4.3,net_size=8.6,label="Net revenue",rule=True)
    footnote(pdf,top+57+3)
for name,fn in (("A",A),("B",B),("C",C),("D",D)):
    pdf=new(); fn(pdf); p=os.path.join(OUT,f"variant_{name}.pdf"); pdf.output(p)
    subprocess.run(["qlmanage","-t","-s","1100","-o",OUT,p],capture_output=True); print("rendered",name)

# ---- E: band with the numeral, connector, plain rows, big net figure (from the critiques)
def E(pdf):
    y=context(pdf); top=y+1
    bw=CW
    pdf.set_fill_color(*TERRA_BG); pdf.rect(M,top,bw,53.5,"F")
    pdf.set_fill_color(*TERRA_D); pdf.rect(M,top,bw,15,"F")
    pdf.set_xy(M+4,top+2.2); pdf.set_font("Helvetica","B",27); pdf.set_text_color(*CREAM); pdf.cell(14,11,"11")
    pdf.set_xy(M+19,top+2.6); pdf.set_font("Helvetica","B",10); pdf.set_text_color(*CREAM); pdf.multi_cell(bw-23,4.6,"sessions a month\nto break even")
    # connector triangle
    cx=M+10; pdf.set_fill_color(*TERRA_D); pdf.polygon([(cx-2,top+15),(cx+2,top+15),(cx,top+17)],style="F")
    txt(pdf,M+5,top+19.5,"Revenue potential at moderate usage",("Georgia","B",9.5),TERRA_D,w=bw-10,lh=4.4)
    txt(pdf,M+5,top+24,"About 4 sessions a day, 6 days a week",("Helvetica","",7.6),MUTED,w=bw-10,lh=3.4)
    yy=top+29; x=M+5; w=bw-10
    for l,v in [("Session revenue (104 x $75)","$7,800"),("Chamber rental","- $783"),("Masks and cleaning (104 x $1.30)","- $135")]:
        pdf.set_xy(x,yy); pdf.set_font("Helvetica","",8.5); pdf.set_text_color(*INK); pdf.cell(w-22,4.6,l); pdf.cell(22,4.6,v,align="R"); yy+=4.6
    pdf.set_draw_color(*TERRA); pdf.set_line_width(0.3); pdf.line(x,yy+0.6,x+w,yy+0.6)
    pdf.set_xy(x,yy+3.2); pdf.set_font("Helvetica","B",9); pdf.set_text_color(*INK); pdf.cell(w-34,8,"Net each month")
    pdf.set_font("Helvetica","B",21); pdf.set_text_color(*TERRA_D); pdf.cell(34,8,"$6,882",align="R")
    txt(pdf,M,top+53.5+3.5,"First month only: less the one-time $200 for training and initial supplies.",("Helvetica","",7),(80,70,64),lh=3.2)
pdf=new(); E(pdf); p=os.path.join(OUT,"variant_E.pdf"); pdf.output(p); subprocess.run(["qlmanage","-t","-s","1100","-o",OUT,p],capture_output=True); print("rendered E")

# ---- F: E with the typographer's fixes (title fits, true multiplication sign, en-dash minus, tighter rhythm)
def F(pdf):
    y=context(pdf); top=y+1; bw=CW; ix=M+4; iw=bw-8
    pdf.set_fill_color(*TERRA_BG); pdf.rect(M,top,bw,54,"F")
    pdf.set_fill_color(*TERRA_D); pdf.rect(M,top,bw,15,"F")
    pdf.set_xy(ix,top+2.2); pdf.set_font("Helvetica","B",27); pdf.set_text_color(*CREAM); pdf.cell(14,11,"11")
    pdf.set_xy(ix+15,top+2.6); pdf.set_font("Helvetica","B",10); pdf.set_text_color(*CREAM); pdf.multi_cell(iw-15,4.6,"sessions a month\nto break even")
    cx=ix+6; pdf.set_fill_color(*TERRA_D); pdf.polygon([(cx-2,top+15),(cx+2,top+15),(cx,top+17)],style="F")
    txt(pdf,ix,top+19.5,"Revenue potential at moderate usage",("Georgia","B",9),TERRA_D,w=iw,lh=4.2)
    txt(pdf,ix,top+24,"About 4 sessions a day, 6 days a week",("Helvetica","",7.6),INK,w=iw,lh=3.4)
    yy=top+29.5
    for l,v in [("Session revenue (104 × $75)","$7,800"),("Chamber rental","- $783"),("Masks and cleaning (104 × $1.30)","- $135")]:
        pdf.set_xy(ix,yy); pdf.set_font("Helvetica","",8.5); pdf.set_text_color(*INK); pdf.cell(iw-22,4.6,l); pdf.cell(22,4.6,v,align="R"); yy+=4.6
    pdf.set_draw_color(*TERRA); pdf.set_line_width(0.3); pdf.line(ix,yy+0.6,ix+iw,yy+0.6)
    pdf.set_xy(ix,yy+3.2); pdf.set_font("Helvetica","B",9); pdf.set_text_color(*INK); pdf.cell(iw-34,8,"Net each month")
    pdf.set_font("Helvetica","B",21); pdf.set_text_color(*TERRA_D); pdf.cell(34,8,"$6,882",align="R")
    txt(pdf,M,top+54+3,"First month only: less the one-time $200 fee.",("Helvetica","",7.2),INK,lh=3.2)
pdf=new(); F(pdf); p=os.path.join(OUT,"variant_F.pdf"); pdf.output(p); subprocess.run(["qlmanage","-t","-s","1100","-o",OUT,p],capture_output=True); print("rendered F")
