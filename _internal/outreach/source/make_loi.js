const fs = require("fs");
const { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType, AlignmentType, HeadingLevel, BorderStyle, ShadingType, LevelFormat, PageNumber, Footer, Header, TabStopType } = require("docx");

const DATE = process.env.LOI_DATE || new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
const ENTITY = process.env.LOI_ENTITY || "Matthew Bailie, doing business as Purebaric, Lehi, Utah";
// PRICING: pass PRICING_JSON='{"business":{"1":979,...,"12":783}}' (the /api/pricing response) to build the table from live rates.
function tableFromApi(biz) {
  const r = m => "$" + Number(biz[String(m)]).toLocaleString("en-US");
  const rows = []; let start = 1;
  for (let m = 2; m <= 13; m++) { if (m === 13 || biz[String(m)] !== biz[String(start)]) { rows.push([start === m - 1 ? `${start} month${start > 1 ? "s" : ""}` : `${start} to ${m - 1} months`, r(start)]); start = m; } }
  return rows;
}
const PRICING = process.env.PRICING_JSON ? tableFromApi(JSON.parse(process.env.PRICING_JSON).business)
  : [["1 to 2 months", "$979"], ["3 months", "$929"], ["4 to 5 months", "$881"], ["6 to 8 months", "$832"], ["9 to 11 months", "$810"], ["12 months", "$783"]];

const STATES = {
  tennessee: {
    name: "Tennessee", short: "TN",
    title: "Tennessee version",
    taxClause: "Tennessee treats the rental of tangible personal property as a taxable sale. Applicable Tennessee sales and use tax will be added to the fees unless the Business gives Purebaric a valid Tennessee resale or exemption certificate. Purebaric is confirming with the Tennessee Department of Revenue how the local portion of the tax applies to monthly rental payments and will invoice accordingly.",
    airOnly: true,
    conditions: [
      "Purebaric completing its Tennessee registrations before installation: a certificate of authority from the Tennessee Secretary of State for the contracting entity, sales and use tax and business tax registration with the Tennessee Department of Revenue, and city and county business licenses if Purebaric has a Tennessee location.",
      "Purebaric establishing delivery and service capacity in the Knoxville area, including commercial general liability insurance that covers its Tennessee operations.",
      "Purebaric obtaining a written answer from the fire official for the jurisdiction of the Installation Location (the City of Knoxville, Knox County and the Town of Farragut apply the International Fire Code, which contains provisions on hyperbaric facilities) that the air-only Equipment may be installed and used for sessions at the Installation Location, or stating the conditions for doing so, and the Business confirming that its lease and zoning permit the Equipment and the sessions and obtaining any landlord consent.",
      "A satisfactory site check under Section 2.",
      "Purebaric having Equipment available for the Installation Location on the target date.",
      "Purebaric confirming with Tennessee counsel that no Tennessee or federal license, registration, or prescription requirement bars renting the air-only Equipment to a business for wellness sessions, and obtaining any license or registration that applies.",
    ],
    conditionsNote: "Purebaric will tell the Business in writing when the conditions in (a), (b), (c), and (f) are met, and the parties will then set the target installation date. Purebaric expects a longer lead time for its first Tennessee installations than for its Utah installations. The Definitive Agreement for a Tennessee placement will list the air-only configuration, the agreed term and rate, and the contracting entity.",
    lawClause: "This LOI is governed by the laws of the State of Tennessee, without regard to its conflict-of-law rules. Any action relating to this LOI will be brought exclusively in the state or federal courts located in Knox County, Tennessee, and each party consents to that jurisdiction and venue. The Definitive Agreement will state its own governing law and venue.",
    time: "Eastern Time",
    counsel: "Tennessee",
    foot: "Purebaric LOI, Business Chamber Rental, Tennessee",
    contact: "mlebailie@hotmail.com · (801) 884-2113",
  },
  utah: {
    name: "Utah", short: "UT",
    title: "Utah version",
    taxClause: "Utah sales and use tax applies to the rental of tangible personal property and will be added to each invoice at the combined state and local rate for the Installation Location unless the Business gives Purebaric a valid Utah exemption certificate.",
    conditions: [
      "A satisfactory site check under Section 2.",
      "The Business confirming that its lease and zoning permit the Equipment and the sessions at the Installation Location, and obtaining any landlord consent.",
      "Purebaric receiving the Business's certificate of insurance described in Section 1.7(e).",
      "Purebaric having Equipment available for the Installation Location on the target date.",
    ],
    conditionsNote: "Purebaric usually installs within 14 days after the Definitive Agreement is signed and the first payment is received, subject to Equipment availability.",
    lawClause: "This LOI is governed by the laws of the State of Utah, without regard to its conflict-of-law rules. Any action relating to this LOI will be brought exclusively in the state or federal courts located in Utah County, Utah, and each party consents to that jurisdiction and venue.",
    time: "Mountain Time",
    counsel: "Utah",
    foot: "Purebaric LOI, Business Chamber Rental, Utah",
    contact: "hello@purebaric.com · (801) 901-0873",
  },
};

const FONT = "Arial";
const run = (t, o = {}) => new TextRun({ text: t, font: FONT, size: 21, ...o });
const p = (t, o = {}) => new Paragraph({ spacing: { after: 120, line: 276 }, ...o, children: typeof t === "string" ? [run(t, o.r || {})] : t });
const h1 = (t) => new Paragraph({ heading: HeadingLevel.HEADING_1, spacing: { before: 280, after: 120 }, children: [run(t, { bold: true, size: 24, color: "1F3A5F" })] });
const clause = (num, title, text) => p([run(num + " ", { bold: true }), run(title + ". ", { bold: true }), run(text)]);
const bullet = (t, ref = "bul") => new Paragraph({ numbering: { reference: ref, level: 0 }, spacing: { after: 80, line: 276 }, children: typeof t === "string" ? [run(t)] : t });
const blank = (n = 36) => "_".repeat(n);
const B = { style: BorderStyle.SINGLE, size: 4, color: "999999" };
const borders = { top: B, bottom: B, left: B, right: B };
const cell = (children, w, shade) => new TableCell({ width: { size: w, type: WidthType.DXA }, borders, margins: { top: 80, bottom: 80, left: 120, right: 120 }, shading: shade ? { type: ShadingType.CLEAR, fill: "EEF2F7", color: "auto" } : undefined, children: Array.isArray(children) ? children : [p(children, { spacing: { after: 0 } })] });
const table = (rows, widths, headerShade = false) => new Table({ width: { size: widths.reduce((a, b) => a + b, 0), type: WidthType.DXA }, columnWidths: widths, rows: rows.map((r, i) => new TableRow({ children: r.map((c, j) => cell(c, widths[j], (headerShade && i === 0) || (!headerShade && j === 0))) })) });

function build(st) {
  const kids = [];
  kids.push(new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 40 }, children: [run("PUREBARIC", { bold: true, size: 30, color: "1F3A5F" })] }));
  kids.push(new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 40 }, children: [run("LETTER OF INTENT", { bold: true, size: 26 })] }));
  kids.push(new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 40 }, children: [run("Mild Hyperbaric Chamber Rental at a Business Location", { size: 22 })] }));
  kids.push(new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 240 }, children: [run(st.title, { italics: true, size: 20, color: "555555" })] }));

  kids.push(p([run("This Letter of Intent (the "), run("“LOI”", { bold: true }), run(") is dated " + blank(22) + ", 20____ (the "), run("“LOI Date”", { bold: true }), run(") and records the terms on which the parties below intend to enter into a rental of one or more mild hyperbaric chambers for use at the Business’s premises. "), run("Except for Section 7 (Binding Provisions), this LOI is a statement of intent only. It does not create a binding obligation on either party to proceed, and no rental, lease, or other agreement exists until both parties sign the Definitive Agreement described in Section 1.10.", { bold: true })]));

  kids.push(table([
    ["Purebaric", (st.entity || ENTITY) + " (“Purebaric”). " + st.contact],
    ["Business", blank(34) + " (legal name), a " + blank(14) + " (entity type and state of formation), doing business as " + blank(26) + " (“Business”)"],
    ["Business address", blank(62)],
    ["Authorized signer", "Name: " + blank(26) + "   Title: " + blank(20)],
    ["Installation Location", [p(blank(62), { spacing: { after: 0 } }), p("(street address of the premises where the Equipment will be installed; the \u201cInstallation Location\u201d)", { spacing: { after: 0 }, r: { size: 18, color: "555555" } })]],
    ["Business contact", "Phone: " + blank(18) + "   Email: " + blank(28)],
  ], [2300, 7060]));

  kids.push(h1("1. Proposed Rental (Term Sheet)"));
  kids.push(clause("1.1", "Equipment", "For each chamber rented, Purebaric will supply one soft-shell mild hyperbaric chamber rated to 1.5 atmospheres absolute (ATA), one air compressor, a mattress pad, pillow, tubing, pressure gauge, mask kit, owner’s manual, and Purebaric’s operating runbook (together, the “Equipment”), in the configuration selected below. The Equipment remains Purebaric’s property at all times, and the Business acquires no ownership interest in it."));
    kids.push(p([run(st.airOnly ? "Configuration: Air-only (no oxygen concentrator). An oxygen-enriched configuration is not offered in " + st.name + " unless and until Purebaric\u2019s counsel and the local fire official confirm in writing that it may be installed." : "Configuration (select one):   \u2610 Standard: with oxygen concentrator (oxygen delivered by mask inside the chamber)      \u2610 Air-only: no oxygen concentrator")], { indent: { left: 540 } }));
  kids.push(clause("1.2", "Number of chambers", "The Business intends to rent " + blank(6) + " chamber(s)."));
  kids.push(clause("1.3", "Term and start", "Proposed initial term (select one):   ☐ Month to month      ☐ " + blank(6) + " months.   Target installation date: " + blank(20) + ". After any initial term, the rental continues month to month until ended under Section 1.9."));
  kids.push(clause("1.4", "Fees", "The monthly rental fee per chamber is set by the length of the initial term, as shown in Schedule 1, and is due in advance each month. A one-time training and supplies fee of $200 per chamber covers the initial staff training and the initial supplies listed in Schedule 1; refresher training is free, and training for staff added later is charged at the rate in the Definitive Agreement. Delivery, installation, routine maintenance, and support are included in the monthly fee; there is no separate delivery or removal charge. The first month’s rental fee and the training and supplies fee are due before installation. The rates in Schedule 1 are current as of the LOI Date; the rates published at purebaric.com/pricing on the date the Definitive Agreement is signed will apply and will then be fixed for the initial term."));
  kids.push(clause("1.5", "Taxes", st.taxClause));
  kids.push(p([run("1.6 ", { bold: true }), run("Services included. ", { bold: true }), run("Purebaric will:")]));
  ["deliver and install the Equipment at the Installation Location;", "provide initial hands-on training to the Business’s designated staff, and refresher training on request;", "supply a written operating runbook, a health-screening list, and template client consent and release forms;", "help the Business prepare a client-facing informational pamphlet in the Business’s branding;", "service and maintain the Equipment for normal wear, responding to a reported malfunction within 2 business days; and", "provide phone and text support during business hours."].forEach(t => kids.push(bullet(t, "alpha1")));
  kids.push(p([run("1.7 ", { bold: true }), run("Business responsibilities. ", { bold: true }), run("The Business will:")]));
  ["offer, schedule, price, and supervise all client sessions itself; Purebaric is an equipment lessor and service provider only and has no relationship with the Business’s clients;", "provide a clean, dry, indoor area of at least 4 feet by 8 feet with a grounded wall outlet on a circuit able to supply the Equipment, and reasonable temperature control;", "have a staff member trained by Purebaric on the premises for the whole of every session, able to depressurize and open the chamber at any time;", "obtain each client’s signed consent, health screening, and release before the client’s first session, on a form at least as protective of Purebaric as the template Purebaric supplies, and keep a session log;", "maintain commercial general liability insurance of at least $1,000,000 per occurrence and $2,000,000 aggregate covering the sessions, name Matthew Bailie d/b/a Purebaric as an additional insured, and deliver a certificate of insurance before the first session;", "describe the sessions only as a general wellness and relaxation amenity, and make no claim that sessions diagnose, treat, cure, prevent, or mitigate any disease or condition (see Section 7.4);", "keep the Equipment at the Installation Location, clean and in the condition delivered, and not move, modify, open, or repair it; and", "confirm that its lease, zoning, and applicable fire code permit the Equipment and the sessions, and obtain any landlord consent."].forEach(t => kids.push(bullet(t, "alpha2")));
  kids.push(clause("1.8", "Who may use the chamber", "Sessions are for adults who have completed the health screening. A person under 18 may use the chamber only if a parent or legal guardian signs the consent form and is present for the session, and, for " + st.name + " placements, only after Purebaric has confirmed in writing that its insurance covers such use. A person who reports a listed health condition may use the chamber only with written clearance from a licensed physician. The Business may refuse or end any session."));
  kids.push(clause("1.9", "Ending the rental", "Either party may end the rental for any reason on 30 days’ written notice (email is sufficient), with fees prorated to the removal date, unless a minimum term is agreed in Section 1.3. Purebaric may end the rental immediately for non-payment, unsafe use, medical claims in breach of the agreement, or damage from misuse."));
  if (st.airOnly) {
    kids.push(clause("1.9a", "Automatic continuation and recurring charges (Tennessee)", "After the initial term the rental continues month to month until ended under Section 1.9. Each monthly fee, plus applicable Tennessee sales and use tax, is charged in advance on the same day of each month to the card or bank account the Business places on file, with the Business\u2019s affirmative consent recorded in the Definitive Agreement; Purebaric gives written notice of the amount and date of any charge that falls more than 60 days after that consent; the Business may cancel by email, phone, or mail at the contact details in this LOI (and online if it signed online); Purebaric gives notice of any material change before it takes effect; and a charge made without affirmative consent is refunded on request within 7 days. The Definitive Agreement for Tennessee carries this disclosure in full (Section 2.7), as Tenn. Code Ann. \u00a7 47-18-133 contemplates."));
  }
  kids.push(clause("1.10", "Definitive Agreement", "The rental will be documented in Purebaric’s Business Rental Agreement and Liability Waiver (the “Definitive Agreement”), which contains, among other terms, an assumption of risk, a release of liability, an indemnity by the Business, a disclaimer of warranties, and a limitation of Purebaric’s liability. The Business acknowledges that it has received, or may request, a copy of the current form of the Definitive Agreement and that it should review it with its own attorney before signing. If this LOI and the Definitive Agreement differ, the Definitive Agreement controls."));

  kids.push(h1("2. Steps to Installation"));
  ["The Business returns this LOI signed, with Sections 1.1 to 1.3 completed.", "Within 7 days, Purebaric completes a site check of the Installation Location by photographs, video call, or visit, and confirms that the space, power, and access are suitable.", "The Business sends Purebaric its certificate of insurance and, if required, its landlord’s written consent.", "Purebaric confirms the conditions in Section 3 are met and sends the Definitive Agreement for signature.", "Both parties sign the Definitive Agreement, and the Business pays the first month’s rental fee and the training and supplies fee.", "Purebaric delivers and installs the Equipment, trains the Business’s staff, and completes the installation checklist with the Business.", "The Business begins offering sessions to its clients."].forEach(t => kids.push(bullet(t, "steps")));

  kids.push(h1("3. Conditions"));
  kids.push(p("Installation under the Definitive Agreement is subject to the following conditions:"));
  st.conditions.forEach(t => kids.push(bullet(t, "cond")));
  kids.push(p(st.conditionsNote));

  kids.push(h1("4. Reservation of Equipment (optional)"));
  kids.push(p("☐ Purebaric will hold " + blank(6) + " chamber(s) for the Business until the Expiry Date in Section 6 and will not commit them to another customer during that period."));
  kids.push(p("☐ The Business pays a reservation deposit of $" + blank(10) + " on signing this LOI. The deposit is credited against the first month’s rental fee and is refunded in full within 10 days if the Definitive Agreement is not signed by the Expiry Date, for any reason."));
  kids.push(p("If neither box is checked, no Equipment is reserved and no deposit is due."));

  kids.push(h1("5. Non-Binding Nature"));
  kids.push(p("Except for Section 7, this LOI is not a binding agreement and creates no obligation on either party to enter into the Definitive Agreement or any other agreement. Either party may end discussions at any time for any reason by written notice, and neither party will have any claim against the other for costs or expenses incurred in reliance on this LOI. No course of dealing, partial performance, or oral statement creates a binding rental; only a Definitive Agreement signed by both parties does."));

  kids.push(h1("6. Expiry"));
  kids.push(p("This LOI expires at 5:00 p.m. " + st.time + " on " + blank(22) + ", 20____ (the “Expiry Date”), which the parties intend to be 30 days after the LOI Date, unless the Definitive Agreement has been signed or the parties extend the Expiry Date in writing. Section 7.1 survives expiry."));

  kids.push(h1("7. Binding Provisions"));
  kids.push(p("The parties agree that the following provisions are binding on them from the LOI Date:"));
  kids.push(clause("7.1", "Confidentiality", "Each party will keep confidential the other party’s non-public information received in connection with this LOI, including Purebaric’s pricing, prospectus, revenue illustrations, runbook, and forms, and the Business’s client, financial, and premises information, and will use it only to evaluate and carry out the proposed rental. This obligation lasts for two years after the LOI Date and does not apply to information that is public through no fault of the receiving party, already known to it, independently developed, or required by law to be disclosed (with prompt notice to the other party where lawful)."));
  kids.push(clause("7.2", "Costs", "Each party bears its own costs and expenses in connection with this LOI and the Definitive Agreement, including attorney fees."));
  kids.push(clause("7.3", "Announcements and marketing", "Neither party will make a public announcement about the proposed rental, or use the other party’s name or logo, without the other party’s written approval. The Business will not advertise or offer hyperbaric sessions at the Installation Location until the Definitive Agreement is signed and installation is complete."));
  kids.push(clause("7.4", "Wellness amenity; no medical claims", "The Business acknowledges that the Equipment is offered as a general wellness and relaxation amenity, that neither Purebaric nor the Business provides medical diagnosis, treatment, or advice through it, and that any session demand, pricing, or revenue figures Purebaric has shared are illustrations based on stated assumptions and not a promise or forecast on which the Business is relying."));
  kids.push(clause("7.5", "Relationship", "The parties are independent contractors. Nothing in this LOI creates a partnership, joint venture, franchise, agency, or employment relationship, and neither party may bind the other."));
  kids.push(clause("7.6", "Governing law and venue", st.lawClause));
  kids.push(clause("7.7", "Entire LOI; counterparts", "This LOI is the entire understanding of the parties about its subject and supersedes prior discussions about it. It may be amended only in a writing signed by both parties, and may be signed in counterparts and electronically, each of which is an original."));

  kids.push(h1("Signatures"));
  kids.push(p("By signing below, each party confirms its intent to proceed on the terms above and agrees to be bound by Section 7."));
  const sig = (who, name, title) => [p(who, { r: { bold: true } }), p("Signature: " + blank(26)), p("Name: " + (name || blank(30))), p("Title: " + (title || blank(31))), p("Date: " + blank(31))];
  kids.push(new Table({ width: { size: 9360, type: WidthType.DXA }, columnWidths: [4680, 4680], borders: { top: { style: BorderStyle.NIL }, bottom: { style: BorderStyle.NIL }, left: { style: BorderStyle.NIL }, right: { style: BorderStyle.NIL }, insideHorizontal: { style: BorderStyle.NIL }, insideVertical: { style: BorderStyle.NIL } }, rows: [new TableRow({ children: [
    new TableCell({ width: { size: 4680, type: WidthType.DXA }, borders: { top: { style: BorderStyle.NIL }, bottom: { style: BorderStyle.NIL }, left: { style: BorderStyle.NIL }, right: { style: BorderStyle.NIL } }, children: sig("BUSINESS") }),
    new TableCell({ width: { size: 4680, type: WidthType.DXA }, borders: { top: { style: BorderStyle.NIL }, bottom: { style: BorderStyle.NIL }, left: { style: BorderStyle.NIL }, right: { style: BorderStyle.NIL } }, children: sig("PUREBARIC", "Matthew Bailie", "Owner, Purebaric") }),
  ] })] }));

  kids.push(new Paragraph({ pageBreakBefore: true, heading: HeadingLevel.HEADING_1, spacing: { after: 120 }, children: [run("Schedule 1: Business Pricing and Initial Supplies", { bold: true, size: 24, color: "1F3A5F" })] }));
  kids.push(p("Monthly rental fee per chamber, by length of the initial term (rates current as of " + DATE + "; see purebaric.com/pricing):"));
  kids.push(table([["Initial term", "Monthly fee per chamber"], ...PRICING], [4000, 3600], true));
  kids.push(p(""));
  kids.push(table([
    ["Training and supplies fee", "$200 per chamber, one time, due before installation; non-refundable after installation."],
    ["Included in the monthly fee", "Delivery, installation, operating runbook, template consent forms, refresher training, routine maintenance and repair for normal wear, phone and text support, and removal at the end of the rental."],
    ["Initial supplies", "50 single-use masks, 1 foam pad, 2 washable cover sheets, initial cleaning supplies, printed instructions and runbook. Later consumables are the Business’s responsibility."],
    ["Payment", "Card on file (Stripe) or ACH; due in advance each month. Fees more than 10 days late accrue a late charge of 1.5% per month or the highest rate allowed by law, if lower."],
    ["Additional chambers", "Each additional chamber at the same location is charged at the same monthly rate for the same term."],
  ], [2600, 6760]));
  kids.push(p(""));
  kids.push(p("Prepared for Purebaric. This letter of intent is a template for review by Purebaric’s and the Business’s own attorneys licensed in " + st.counsel + " before use, and is not legal advice.", { r: { italics: true, size: 18, color: "555555" } }));

  const numbering = { config: [
    { reference: "alpha1", levels: [{ level: 0, format: LevelFormat.LOWER_LETTER, text: "(%1)", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 900, hanging: 360 } } } }] },
    { reference: "alpha2", levels: [{ level: 0, format: LevelFormat.LOWER_LETTER, text: "(%1)", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 900, hanging: 360 } } } }] },
    { reference: "cond", levels: [{ level: 0, format: LevelFormat.LOWER_LETTER, text: "(%1)", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 900, hanging: 360 } } } }] },
    { reference: "steps", levels: [{ level: 0, format: LevelFormat.DECIMAL, text: "%1.", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 900, hanging: 360 } } } }] },
    { reference: "bul", levels: [{ level: 0, format: LevelFormat.BULLET, text: "•", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 900, hanging: 360 } } } }] },
  ] };
  return new Document({
    creator: "Purebaric", title: "Purebaric Letter of Intent, Business Chamber Rental (" + st.name + ")",
    styles: { default: { document: { run: { font: FONT, size: 21 } } } },
    numbering,
    sections: [{
      properties: { page: { size: { width: 12240, height: 15840 }, margin: { top: 1080, bottom: 1080, left: 1440, right: 1440 } } },
      footers: { default: new Footer({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [run(st.foot + "  ·  Page ", { size: 16, color: "777777" }), new TextRun({ children: [PageNumber.CURRENT], font: FONT, size: 16, color: "777777" })] })] }) },
      children: kids,
    }],
  });
}

(async () => {
  const outs = JSON.parse(process.argv[2]);
  for (const [key, path] of Object.entries(outs)) {
    const buf = await Packer.toBuffer(build(STATES[key]));
    fs.writeFileSync(path, buf); console.log("wrote", path);
  }
})();
