// Minimal Markdown -> .docx converter for Purebaric internal documents.
// Supports: # / ## / ### headings, paragraphs, "- " bullets (one level, "  - " second level),
// "1. " numbered lists, pipe tables with a header row, **bold**, *italic*, `code`, "---" rules, "> " quotes.
// Usage: NODE_PATH=$(npm root -g) node md2docx.js input.md output.docx ["Footer text"]
const fs = require("fs");
const { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType, AlignmentType, HeadingLevel, BorderStyle, ShadingType, LevelFormat, PageNumber, Footer } = require("docx");

const [,, inPath, outPath, footerText] = process.argv;
const FONT = "Arial";
const md = fs.readFileSync(inPath, "utf8").replace(/\r/g, "");

function inline(text, base = {}) {
  // split on **bold**, *italic*, `code`
  const out = [];
  const re = /(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/g;
  let last = 0, m;
  while ((m = re.exec(text))) {
    if (m.index > last) out.push(new TextRun({ text: text.slice(last, m.index), font: FONT, size: 21, ...base }));
    const t = m[0];
    if (t.startsWith("**")) out.push(new TextRun({ text: t.slice(2, -2), font: FONT, size: 21, bold: true, ...base }));
    else if (t.startsWith("`")) out.push(new TextRun({ text: t.slice(1, -1), font: "Courier New", size: 19, ...base }));
    else out.push(new TextRun({ text: t.slice(1, -1), font: FONT, size: 21, italics: true, ...base }));
    last = m.index + t.length;
  }
  if (last < text.length) out.push(new TextRun({ text: text.slice(last), font: FONT, size: 21, ...base }));
  return out;
}
const B = { style: BorderStyle.SINGLE, size: 4, color: "999999" };
const borders = { top: B, bottom: B, left: B, right: B };

const kids = [];
const lines = md.split("\n");
let i = 0, listSeq = 0;
let para = [];
const flushPara = () => { if (para.length) { kids.push(new Paragraph({ spacing: { after: 120, line: 276 }, children: inline(para.join(" ")) })); para = []; } };
const numberingConfigs = [];
while (i < lines.length) {
  const line = lines[i];
  if (/^\s*$/.test(line)) { flushPara(); i++; continue; }
  let m;
  if ((m = line.match(/^(#{1,4})\s+(.*)$/))) {
    flushPara();
    const lvl = m[1].length;
    const sizes = { 1: 32, 2: 26, 3: 23, 4: 21 };
    kids.push(new Paragraph({ heading: [HeadingLevel.HEADING_1, HeadingLevel.HEADING_2, HeadingLevel.HEADING_3, HeadingLevel.HEADING_4][lvl - 1], keepNext: true, spacing: { before: lvl === 1 ? 360 : 240, after: 120 }, children: [new TextRun({ text: m[2].replace(/\*\*/g, ""), font: FONT, size: sizes[lvl], bold: true, color: "1F3A5F" })] }));
    i++; continue;
  }
  if (/^---+\s*$/.test(line)) { flushPara(); kids.push(new Paragraph({ border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: "BBBBBB", space: 1 } }, spacing: { after: 160 }, children: [] })); i++; continue; }
  if (line.startsWith("|")) {
    flushPara();
    const rows = [];
    while (i < lines.length && lines[i].startsWith("|")) { rows.push(lines[i]); i++; }
    const cells = rows.filter(r => !/^\|\s*:?-{2,}/.test(r)).map(r => r.replace(/^\|/, "").replace(/\|\s*$/, "").split("|").map(c => c.trim()));
    const ncol = Math.max(...cells.map(c => c.length));
    const total = 9360; const w = Math.floor(total / ncol);
    let widths;
    if (ncol === 2) widths = [2900, 6460];
    else { // proportional to content, with a floor so short columns stay readable
      const lens = Array(ncol).fill(0).map((_, ci) => Math.max(6, ...cells.map(r => Math.min(60, (r[ci] || "").length))));
      const sum = lens.reduce((a, b) => a + b, 0);
      widths = lens.map(l => Math.max(900, Math.floor(total * l / sum)));
      const over = widths.reduce((a, b) => a + b, 0) - total; if (over > 0) { const bi = widths.indexOf(Math.max(...widths)); widths[bi] -= over; }
    }
    kids.push(new Table({ width: { size: widths.reduce((a, b) => a + b, 0), type: WidthType.DXA }, columnWidths: widths, rows: cells.map((c, ri) => new TableRow({ tableHeader: ri === 0, children: widths.map((wd, ci) => new TableCell({ width: { size: wd, type: WidthType.DXA }, borders, margins: { top: 60, bottom: 60, left: 100, right: 100 }, shading: ri === 0 ? { type: ShadingType.CLEAR, fill: "EEF2F7", color: "auto" } : undefined, children: [new Paragraph({ spacing: { after: 0 }, children: inline(c[ci] || "", ri === 0 ? { bold: true } : {}) })] })) })) }));
    kids.push(new Paragraph({ spacing: { after: 120 }, children: [] }));
    continue;
  }
  if ((m = line.match(/^(\s*)[-*]\s+(.*)$/))) {
    flushPara();
    const level = m[1].length >= 2 ? 1 : 0;
    kids.push(new Paragraph({ numbering: { reference: "bullets", level }, spacing: { after: 60, line: 276 }, children: inline(m[2]) }));
    i++; continue;
  }
  if ((m = line.match(/^(\s*)(\d+)[.)]\s+(.*)$/))) {
    flushPara();
    // start a new numbered sequence whenever the previous non-blank line was not a numbered item
    const prev = lines.slice(0, i).reverse().find(l => !/^\s*$/.test(l));
    if (!prev || !/^\s*\d+[.)]\s+/.test(prev)) { listSeq++; numberingConfigs.push({ reference: "num" + listSeq, levels: [{ level: 0, format: LevelFormat.DECIMAL, text: "%1.", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 720, hanging: 360 } } } }] }); }
    kids.push(new Paragraph({ numbering: { reference: "num" + listSeq, level: 0 }, spacing: { after: 60, line: 276 }, children: inline(m[3]) }));
    i++; continue;
  }
  if ((m = line.match(/^>\s?(.*)$/))) {
    flushPara();
    kids.push(new Paragraph({ indent: { left: 540 }, border: { left: { style: BorderStyle.SINGLE, size: 12, color: "1F3A5F", space: 8 } }, spacing: { after: 120, line: 276 }, children: inline(m[1], { italics: true }) }));
    i++; continue;
  }
  para.push(line.trim()); i++;
}
flushPara();

const doc = new Document({
  creator: "Purebaric",
  styles: { default: { document: { run: { font: FONT, size: 21 } } } },
  numbering: { config: [
    { reference: "bullets", levels: [
      { level: 0, format: LevelFormat.BULLET, text: "•", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 720, hanging: 360 } } } },
      { level: 1, format: LevelFormat.BULLET, text: "–", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 1260, hanging: 360 } } } },
    ] },
    ...numberingConfigs,
  ] },
  sections: [{
    properties: { page: { size: { width: 12240, height: 15840 }, margin: { top: 1080, bottom: 1080, left: 1440, right: 1440 } } },
    footers: { default: new Footer({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: (footerText || "Purebaric") + "  ·  Page ", font: FONT, size: 16, color: "777777" }), new TextRun({ children: [PageNumber.CURRENT], font: FONT, size: 16, color: "777777" })] })] }) },
    children: kids,
  }],
});
Packer.toBuffer(doc).then(buf => { fs.writeFileSync(outPath, buf); console.log("wrote", outPath); });
