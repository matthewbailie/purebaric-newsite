// Model release and consent to use likeness, for Purebaric marketing shoots.
// Usage: NODE_PATH=$(npm root -g) node make_model_release.js <out.docx>
const fs = require("fs");
const { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType, AlignmentType, HeadingLevel, BorderStyle, ShadingType, LevelFormat, TabStopType, PageNumber, Footer } = require("docx");
const OUT = process.argv[2] || "/Users/bailie/projects/purebaric-newsite/_internal/marketing/Purebaric_Model_Release_and_Likeness_Consent.docx";
const FONT = "Calibri", INK = "2B2320", TERRA = "9A4F3A", MUTED = "6F635B";
const CONTACT = "hello@purebaric.com · (801) 901-0873";

function runs(text, o = {}) {
  return String(text).split(/(\*\*[^*]+\*\*)/g).filter(Boolean).map(s => s.startsWith("**")
    ? new TextRun({ text: s.slice(2, -2), bold: true, font: FONT, size: o.size ?? 22, color: o.color })
    : new TextRun({ text: s, font: FONT, size: o.size ?? 22, color: o.color }));
}
const p = (t, o = {}) => new Paragraph({ spacing: { after: o.after ?? 120, line: 276 }, alignment: o.align, children: runs(t, o) });
const h1 = t => new Paragraph({ heading: HeadingLevel.HEADING_1, keepNext: true, spacing: { before: 260, after: 100 }, children: [new TextRun({ text: t, bold: true, font: FONT, size: 26, color: TERRA })] });
const bullet = t => new Paragraph({ numbering: { reference: "bullets", level: 0 }, spacing: { after: 80, line: 276 }, children: runs(t) });
const blank = () => new Paragraph({ children: [new TextRun({ text: "", font: FONT })] });
const sig = (label, n = 46) => new Paragraph({ spacing: { before: 320, after: 60 }, tabStops: [{ type: TabStopType.RIGHT, position: 9360 }], children: [new TextRun({ text: label + ": ", font: FONT, size: 22 }), new TextRun({ text: "_".repeat(n), font: FONT, size: 22 }), new TextRun({ text: "   Date: ____________", font: FONT, size: 22 })] });
function kv(rows) {
  const W = [2600, 6760];
  return new Table({ width: { size: 9360, type: WidthType.DXA }, columnWidths: W, rows: rows.map(([k, v]) => new TableRow({ children: [
    new TableCell({ width: { size: W[0], type: WidthType.DXA }, shading: { type: ShadingType.CLEAR, fill: "F4E7DF", color: "auto" }, margins: { top: 80, bottom: 80, left: 120, right: 120 }, children: [new Paragraph({ children: [new TextRun({ text: k, bold: true, font: FONT, size: 21 })] })] }),
    new TableCell({ width: { size: W[1], type: WidthType.DXA }, margins: { top: 80, bottom: 80, left: 120, right: 120 }, children: [new Paragraph({ children: [new TextRun({ text: v, font: FONT, size: 21 })] })] }),
  ] })) });
}
const B = "______________________________";
const c = [];
c.push(new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 60 }, children: [new TextRun({ text: "PUREBARIC", bold: true, font: FONT, size: 40, color: INK })] }));
c.push(new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 60 }, children: [new TextRun({ text: "MODEL RELEASE AND CONSENT TO USE LIKENESS", bold: true, font: FONT, size: 28, color: TERRA })] }));
c.push(new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 240 }, children: [new TextRun({ text: "For photographs and video recorded for Purebaric marketing", font: FONT, size: 22, color: MUTED })] }));
c.push(p("This Model Release and Consent to Use Likeness (the \"Release\") is made on the date signed below between:"));
c.push(kv([
  ["Purebaric", "Matthew Bailie, doing business as Purebaric, Lehi, Utah (\"Purebaric\", \"we\", \"us\"). " + CONTACT],
  ["Model", "Name: " + B + "   Date of birth: ______________"],
  ["Model contact", "Address: " + B + "________________\nPhone: __________________   Email: " + B],
  ["Shoot", "Date(s): ______________   Location: " + B + "\nDescription: " + B + "________________"],
  ["Compensation", "☐ $__________, paid on completion of the shoot    ☐ Product or service: " + B + "    ☐ None (participation only)"],
]));
c.push(blank());

c.push(h1("1. What you are agreeing to"));
c.push(p("You give Purebaric, and anyone Purebaric authorizes, the **irrevocable, perpetual, worldwide, royalty-free right** to photograph and record you at the shoot described above (the \"Materials\"), and to use, reproduce, edit, adapt, combine with other material, publish, distribute, display and perform the Materials, in whole or in part, in any media now known or later developed. This includes your image, likeness, voice, movements, and, if you initial here ______, your first name and last initial."));
c.push(p("Purebaric may use the Materials for advertising, marketing and promotion of Purebaric's products and services, including on websites, in social media posts and advertisements, in online video, in paid digital and print advertising, in pamphlets and other printed materials, in email, at events, and in materials given to Purebaric's business customers."));

c.push(h1("2. Editing, context and approval"));
c.push(p("Purebaric may crop, retouch, alter, caption, and combine the Materials with other images, text, voice-over, music or graphics. You will not have the right to inspect or approve the Materials or any use of them. Purebaric is under no obligation to use the Materials at all."));
c.push(p("Purebaric will not attribute to you any spoken or written statement that you did not make. If you make a statement on camera about your own experience, you confirm that it is your honest opinion and experience, and Purebaric may use it only with this Release in place."));

c.push(h1("3. Compensation"));
c.push(p("The compensation stated above, or your participation in the shoot where none is stated, is the full consideration for this Release. You acknowledge that it is sufficient and that you are not entitled to any royalty, fee, or further payment for any use of the Materials, however often or widely they are used."));

c.push(h1("4. Ownership"));
c.push(p("The Materials, and all copyright and other rights in them, belong to Purebaric. You have no ownership interest in the Materials and may not sell, license or publish them. You may share finished pieces that Purebaric has published, for example by reposting Purebaric's social media posts."));

c.push(h1("5. Release of claims"));
c.push(p("To the fullest extent permitted by law, you release and agree not to bring any claim against Purebaric, Matthew Bailie, the photographer or videographer, any agency or printer working for Purebaric, and anyone acting with Purebaric's permission, arising from the making or use of the Materials as this Release allows, including any claim for invasion of privacy, violation of the right of publicity, defamation, false light, or copyright."));

c.push(h1("6. If you use a chamber during the shoot"));
c.push(p("Entering a Purebaric chamber during the shoot is voluntary. Before doing so you will complete Purebaric's health screening and sign its session consent and waiver, which is a separate document. A session during the shoot is a general-wellness activity and not a medical treatment."));

c.push(h1("7. Age and authority"));
c.push(p("You confirm that you are at least 18 years old and have the right to enter into this Release, or that your parent or legal guardian is signing below on your behalf. A parent or legal guardian who signs confirms that they have the authority to do so and agrees to every term of this Release on the minor's behalf and on their own behalf."));

c.push(h1("8. Later requests"));
c.push(p("This Release is irrevocable. Purebaric is not required to withdraw or destroy Materials that have been published, printed or distributed. If you write to Purebaric at the contact details above asking that new uses stop, Purebaric will consider the request in good faith."));

c.push(h1("9. General terms"));
c.push(bullet("This Release is governed by the laws of the State of Utah. Any dispute will be brought in the state courts located in Utah County, Utah."));
c.push(bullet("This is the entire agreement about the Materials and replaces any earlier discussion. It may be changed only in a writing signed by both parties."));
c.push(bullet("If any part of this Release is found unenforceable, the rest remains in effect."));
c.push(bullet("This Release may be signed electronically and in counterparts, each of which is an original."));
c.push(bullet("You have read this Release, you understand it, and you have had the opportunity to ask questions and to seek your own advice before signing."));

c.push(h1("Signatures"));
c.push(p("**Model**", { after: 40 }));
c.push(sig("Signature"));
c.push(p("Printed name: " + B + "________________", { after: 200 }));
c.push(p("**Parent or legal guardian** (required if the Model is under 18)", { after: 40 }));
c.push(sig("Signature"));
c.push(p("Printed name: " + B + "   Relationship to Model: ______________", { after: 200 }));
c.push(p("**Purebaric**", { after: 40 }));
c.push(sig("Matthew Bailie, doing business as Purebaric", 26));
c.push(p("**Witness** (optional)", { after: 40 }));
c.push(sig("Signature"));
c.push(p("Printed name: " + B + "________________"));

const doc = new Document({
  styles: { default: { document: { run: { font: FONT, size: 22 } } } },
  numbering: { config: [{ reference: "bullets", levels: [{ level: 0, format: LevelFormat.BULLET, text: "•", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 540, hanging: 300 } } } }] }] },
  sections: [{
    properties: { page: { size: { width: 12240, height: 15840 }, margin: { top: 1200, bottom: 1100, left: 1440, right: 1440 } } },
    footers: { default: new Footer({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "Purebaric Model Release and Consent to Use Likeness · Page ", font: FONT, size: 18, color: MUTED }), new TextRun({ children: [PageNumber.CURRENT], font: FONT, size: 18, color: MUTED })] })] }) },
    children: c,
  }],
});
Packer.toBuffer(doc).then(b => { fs.writeFileSync(OUT, b); console.log("wrote", OUT); });
