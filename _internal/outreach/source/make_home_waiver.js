// Purebaric home rental waiver as a Word document, built from the same text the admin shows for a
// finger signature (netlify/functions/_lib/waiver.js), with a signature page for up to seven adult
// users and a parent/guardian consent page for minors. No per-page initials: the footer carries the
// document name, version and "Page X of Y", and the signature block states the signer read every page.
//   STATE=utah|tennessee node make_home_waiver.js          (NODE_PATH must point at the global node_modules)
const fs = require("fs"); const path = require("path");
const { Document, Packer, Paragraph, TextRun, ImageRun, HeadingLevel, AlignmentType, Table, TableRow, TableCell, WidthType, BorderStyle, ShadingType, LevelFormat, PageBreak, Footer, PageNumber } = require("docx");
const W = require(path.join(__dirname, "../../../netlify/functions/_lib/waiver.js"));
const STATE = (process.env.STATE || "utah").toLowerCase();
const PROV = W.waiverText(STATE, "home").provider;
const OUT = process.env.WAIVER_OUT || (STATE === "tennessee"
  ? path.join(__dirname, "../../research/knoxville-tennessee/Purebaric - Home - Rental Waiver.docx")
  : path.join(__dirname, "../Purebaric_Home_Rental_Waiver_Utah.docx"));
const FONT = "Calibri", SERIF = "Georgia", INK = "2B2320", TERRA = "9A4F3A", MUTED = "6F635B", LINE = "E6DCCD", TINT = "F4E7DF";
const LOGO = fs.readFileSync(path.join(__dirname, "../../../images/logo.png")); // the dark wordmark, 1136 x 192
const run = (text, o = {}) => new TextRun({ text, font: FONT, size: o.size ?? 22, bold: o.bold, italics: o.italics, color: o.color });
const p = (text, o = {}) => new Paragraph({ spacing: { after: o.after ?? 120, line: 276 }, alignment: o.align, children: [run(text, o)] });
const h1 = t => new Paragraph({ heading: HeadingLevel.HEADING_1, keepNext: true, spacing: { before: 220, after: 80 }, children: [new TextRun({ text: t, font: SERIF, bold: true, size: 26, color: TERRA })] });
const h2 = t => new Paragraph({ heading: HeadingLevel.HEADING_2, keepNext: true, spacing: { before: 200, after: 80 }, children: [new TextRun({ text: t, font: SERIF, bold: true, size: 22, color: INK })] });
const bullet = t => new Paragraph({ numbering: { reference: "bullets", level: 0 }, spacing: { after: 60, line: 276 }, children: [run(t)] });
const blank = () => new Paragraph({ children: [run("")] });
const cell = (children, w, o = {}) => new TableCell({ width: { size: w, type: WidthType.DXA }, margins: { top: 100, bottom: 100, left: 120, right: 120 }, shading: o.fill ? { type: ShadingType.CLEAR, fill: o.fill, color: "auto" } : undefined, verticalAlign: "center", children });
const grid = (widths, rows, head) => new Table({ width: { size: widths.reduce((a, b) => a + b, 0), type: WidthType.DXA }, columnWidths: widths,
  rows: [ ...(head ? [new TableRow({ tableHeader: true, cantSplit: true, children: head.map((h, i) => cell([new Paragraph({ children: [run(h, { bold: true, size: 20 })] })], widths[i], { fill: TINT })) })] : []),
    ...rows.map(r => new TableRow({ cantSplit: true, height: { value: 450, rule: "atLeast" }, children: r.map((t, i) => cell([new Paragraph({ children: [run(t, { size: 20, color: t ? INK : MUTED })] })], widths[i])) })) ] });

const children = [];
children.push(new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 160 }, children: [new ImageRun({ type: "png", data: LOGO, transformation: { width: 213, height: 36 } })] }));
children.push(new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 40 }, children: [new TextRun({ text: "Waiver & Release of Liability", font: SERIF, bold: true, size: 32, color: INK })] }));
children.push(new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 280 }, border: { bottom: { style: BorderStyle.SINGLE, size: 12, color: "B8654D", space: 10 } }, children: [run("Mild hyperbaric chamber rented for home use" + (STATE === "tennessee" ? " (Tennessee)" : ""), { size: 22, color: MUTED })] }));
children.push(grid([3000, 6360], [
  ["Provider", `${PROV.name}  ·  ${PROV.phone}  ·  ${PROV.email}`],
  ["Primary renter", "Name: ______________________________________"],
  ["Installation address", "______________________________________________________"],
  ["Phone / email", "______________________________________________________"],
  ["Rental dates", "From ______________, 20____   to ______________, 20____"],
]));
children.push(blank());
for (const sec of W.waiverText(STATE, "home").sections) {
  children.push(h1(sec.heading));
  for (const it of sec.items) {
    if (it.t === "li") children.push(bullet(it.text));
    else children.push(p(it.text, { bold: it.t === "b" }));
  }
}

// ---------- Signature page: every adult user ----------
children.push(new Paragraph({ children: [new PageBreak()] }));
children.push(h1("12. Acknowledgment and Signatures"));
children.push(p("Each person signing below confirms that they are 18 or older, have read every page of this Agreement, including the Release of Liability (Section 6) and the Indemnification (Section 7), understand it, and sign voluntarily. One signature covers the whole Agreement; pages are not initialed.", { bold: true, size: 20 }));
children.push(p("Every adult who will use the chamber must sign.", { color: MUTED, size: 20 }));
children.push(grid([480, 3200, 3680, 2000], Array.from({ length: 7 }, (_, i) => [String(i + 1), "", "", ""]), ["", "Printed name", "Signature", "Date"]));

// ---------- Minors ----------
children.push(h1("13. Minors: Parent or Guardian Consent"));
children.push(p("For each user under 18, a parent or legal guardian signs below and confirms: I am the Minor's parent or legal guardian and have the authority to sign for them; I have read every page of this Agreement; I consent to the Minor's use of the chamber and accept this Agreement on the Minor's behalf and on my own behalf, including Sections 6 and 7; and a parent or guardian will be present for every session the Minor uses.", { bold: true, size: 20 }));
children.push(p("A Minor may not use the chamber until this is signed. A parent or guardian who will also use the chamber signs Section 12 as well.", { color: MUTED, size: 20 }));
children.push(grid([2300, 600, 2400, 3000, 1060], Array.from({ length: 3 }, () => ["", "", "", "", ""]), ["Minor's name", "Age", "Parent / guardian name", "Parent / guardian signature", "Date"]));

// ---------- Provider ----------
children.push(new Paragraph({ spacing: { before: 200, after: 60 }, children: [run(`Provider: ${PROV.name}`, { bold: true })] }));
children.push(p("Signature: ______________________________________        Date: ______________"));

const doc = new Document({
  creator: "Purebaric", title: "Purebaric Waiver & Release of Liability (Home Rental)",
  styles: { default: { document: { run: { font: FONT, size: 22 } } } },
  numbering: { config: [{ reference: "bullets", levels: [{ level: 0, format: LevelFormat.BULLET, text: "•", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 540, hanging: 270 } } } }] }] },
  sections: [{
    properties: { page: { size: { width: 12240, height: 15840 }, margin: { top: 1440, bottom: 1296, left: 1440, right: 1440 } } },
    footers: { default: new Footer({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [
      run(`Purebaric Waiver & Release of Liability (Home)  ·  ${W.WAIVER_VERSIONS.home}  ·  Page `, { size: 18, color: MUTED }),
      new TextRun({ children: [PageNumber.CURRENT], font: FONT, size: 18, color: MUTED }), run(" of ", { size: 18, color: MUTED }),
      new TextRun({ children: [PageNumber.TOTAL_PAGES], font: FONT, size: 18, color: MUTED }),
    ] })] }) },
    children,
  }],
});
Packer.toBuffer(doc).then(b => { fs.writeFileSync(OUT, b); console.log("wrote", OUT, b.length); });
