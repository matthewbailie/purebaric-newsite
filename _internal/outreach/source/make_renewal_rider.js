// Tennessee automatic-renewal and recurring-charge disclosure rider (Tenn. Code Ann. § 47-18-133), for attachment to the
// home rental agreement and waiver and the business agreement, and for display in the booking flow before payment.
// Usage: NODE_PATH=$(npm root -g) node make_renewal_rider.js <out.docx>
const fs = require("fs");
const { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, Footer, PageNumber } = require("docx");
const OUT = process.argv[2];
const FONT = "Calibri";
const run = (t, o = {}) => new TextRun({ text: t, font: FONT, size: 22, ...o });
const p = (t, o = {}) => new Paragraph({ spacing: { after: 140, line: 276 }, children: String(t).split(/(\*\*[^*]+\*\*)/g).filter(Boolean).map(s => s.startsWith("**") ? run(s.slice(2, -2), { bold: true }) : run(s)) });
const h = (t) => new Paragraph({ heading: HeadingLevel.HEADING_2, keepNext: true, spacing: { before: 220, after: 100 }, children: [run(t, { bold: true, size: 24, color: "9A4F3A" })] });
const kids = [];
kids.push(new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 60 }, children: [run("PUREBARIC", { bold: true, size: 36, color: "2B2320" })] }));
kids.push(new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 60 }, children: [run("AUTOMATIC RENEWAL AND RECURRING CHARGE DISCLOSURE", { bold: true, size: 26, color: "9A4F3A" })] }));
kids.push(new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 240 }, children: [run("Tennessee rentals (home and business). Attach to the rental agreement; show before payment when booking online.", { size: 20, color: "6F635B" })] }));
kids.push(p("Tennessee law (Tenn. Code Ann. § 47-18-133) requires us to present the terms of any automatically renewing charge clearly before you agree, to get your affirmative consent before charging your card or account, to give you a copy you can keep, and to make cancellation easy. This page does that. Read it, initial each item, and sign. Keep a copy."));
kids.push(h("1. What you are agreeing to"));
kids.push(p("**Rental:** one Purebaric mild hyperbaric chamber with compressor and accessories, delivered to the address on the rental agreement.  Configuration: ☐ Air-only   ☐ With oxygen concentrator (only where Purebaric has confirmed it is offered)."));
kids.push(p("**Initial term:** ______ month(s), from ______________, 20____ to ______________, 20____.   **Monthly fee:** $__________ per month, plus Tennessee sales and use tax.   **One-time fees:** $__________ (________________________)."));
kids.push(p("**Charge schedule:** the first month's fee and any one-time fee are charged when you book. Each later monthly fee is charged automatically, in advance, on the ______ day of each month, to the card or bank account you place on file. Initials: ______"));
kids.push(p("**After the initial term:**  ☐ the rental ends on the end date above and the chamber is collected, unless you ask in writing to extend;   ☐ the rental continues month to month at the same monthly fee until you cancel. (Purebaric checks one box before you sign.) Initials: ______"));
kids.push(h("2. Notice before a renewal charge"));
kids.push(p("If any automatic charge will occur more than 60 days after the date you sign this disclosure (for example the first charge after an initial term of three months or longer), Purebaric will send you clear notice of the amount and the date of that charge, by email to the address below, before the charge is made. Initials: ______"));
kids.push(h("3. How to cancel"));
kids.push(p("You may cancel at any time, at no cost, by any of these: email to **mlebailie@hotmail.com**; phone or text to **(801) 884-2113**; mail to Purebaric, ______________________________________________; or, if you booked online, by replying CANCEL to your booking confirmation email. Cancellation takes effect per the notice period in your rental agreement (30 days for business rentals; for home rentals, as stated in the agreement), and the chamber is collected at no charge. Initials: ______"));
kids.push(h("4. Changes and refunds"));
kids.push(p("Purebaric will give you clear notice of any material change to the fee, the charge date or these terms, and how to cancel, before the change takes effect. If a charge is made to your card or account without your affirmative consent, Purebaric will refund it on your request made within 7 days of the charge. Initials: ______"));
kids.push(h("5. Your consent"));
kids.push(p("By signing, you give your clear, affirmative, specific and informed consent to the charges described above, you confirm that you received a copy of this disclosure and of the rental agreement, and you confirm the email address below is the one to use for notices."));
kids.push(p("Customer name: ______________________________________   Email for notices: ______________________________________"));
kids.push(p("Signature: ______________________________________   Date: ______________, 20____"));
kids.push(p("Purebaric: ______________________________________   Date: ______________, 20____"));
kids.push(p("Prepared for Purebaric, 10 October 2026. Template for review by Purebaric's Tennessee counsel before use; not legal advice. The statute's consumer protections apply to individuals renting for personal, family or household purposes; Purebaric applies the same disclosure to business rentals as a matter of practice.", { }));
const doc = new Document({ styles: { default: { document: { run: { font: FONT, size: 22 } } } }, sections: [{ properties: { page: { size: { width: 12240, height: 15840 }, margin: { top: 1296, bottom: 1296, left: 1440, right: 1440 } } },
  footers: { default: new Footer({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [run("Purebaric Tennessee automatic renewal disclosure  ·  Page ", { size: 18, color: "6F635B" }), new TextRun({ children: [PageNumber.CURRENT], font: FONT, size: 18, color: "6F635B" })] })] }) }, children: kids }] });
Packer.toBuffer(doc).then(b => { fs.writeFileSync(OUT, b); console.log("wrote", OUT); });
