const fs = require("fs");
const { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, Table, TableRow, TableCell, WidthType, BorderStyle, ShadingType, LevelFormat, PageBreak, Footer, PageNumber, TabStopType } = require("docx");

const OUT = "/Users/bailie/Library/CloudStorage/OneDrive-Adobe/DMe-C&P/Claude_AI/purebaric-outreach/purebaric_business_rental_agreement_and_liability_waiver.docx";
const FONT = "Calibri";
const INK = "2B2320", TERRA = "9A4F3A", MUTED = "6F635B";

const p = (text, o = {}) => new Paragraph({ spacing: { after: o.after ?? 120, line: 276 }, alignment: o.align, children: runs(text, o) });
function runs(text, o = {}) {
  // **bold** segments
  const parts = String(text).split(/(\*\*[^*]+\*\*)/g).filter(Boolean);
  return parts.map(s => s.startsWith("**") ? new TextRun({ text: s.slice(2, -2), bold: true, font: FONT, size: o.size ?? 22, color: o.color }) : new TextRun({ text: s, font: FONT, size: o.size ?? 22, bold: o.bold, italics: o.italics, color: o.color, allCaps: o.caps }));
}
const h1 = t => new Paragraph({ heading: HeadingLevel.HEADING_1, spacing: { before: 280, after: 120 }, children: [new TextRun({ text: t, bold: true, font: FONT, size: 26, color: TERRA })] });
const h2 = t => new Paragraph({ heading: HeadingLevel.HEADING_2, spacing: { before: 200, after: 80 }, children: [new TextRun({ text: t, bold: true, font: FONT, size: 22, color: INK })] });
const bullet = (t, lvl = 0) => new Paragraph({ numbering: { reference: "bullets", level: lvl }, spacing: { after: 80, line: 276 }, children: runs(t) });
const num = (t) => new Paragraph({ numbering: { reference: "numbers", level: 0 }, spacing: { after: 80, line: 276 }, children: runs(t) });
const caps = t => new Paragraph({ spacing: { after: 120, line: 276 }, children: [new TextRun({ text: t, font: FONT, size: 22, bold: true })] });
const blank = (n = 1) => Array.from({ length: n }, () => new Paragraph({ children: [new TextRun({ text: "", font: FONT })] }));
const line = (label, w = 9360) => new Paragraph({ spacing: { after: 160 }, tabStops: [{ type: TabStopType.RIGHT, position: w }], children: [new TextRun({ text: label + " ", font: FONT, size: 22 }), new TextRun({ text: "\t", font: FONT, size: 22, underline: {} })] });

function kv(rows) {
  const W = [3000, 6360];
  return new Table({ width: { size: 9360, type: WidthType.DXA }, columnWidths: W, rows: rows.map(([k, v]) => new TableRow({ children: [
    new TableCell({ width: { size: W[0], type: WidthType.DXA }, shading: { type: ShadingType.CLEAR, fill: "F4E7DF", color: "auto" }, margins: { top: 80, bottom: 80, left: 120, right: 120 }, children: [new Paragraph({ children: [new TextRun({ text: k, bold: true, font: FONT, size: 21 })] })] }),
    new TableCell({ width: { size: W[1], type: WidthType.DXA }, margins: { top: 80, bottom: 80, left: 120, right: 120 }, children: [new Paragraph({ children: [new TextRun({ text: v, font: FONT, size: 21 })] })] }),
  ] })) });
}

const children = [];
// ---------- Title ----------
children.push(new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 60 }, children: [new TextRun({ text: "PUREBARIC", bold: true, font: FONT, size: 40, color: INK })] }));
children.push(new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 60 }, children: [new TextRun({ text: "BUSINESS RENTAL AGREEMENT AND LIABILITY WAIVER", bold: true, font: FONT, size: 28, color: TERRA })] }));
children.push(new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 240 }, children: [new TextRun({ text: "Mild Hyperbaric Chamber Placed at a Business Location", font: FONT, size: 22, color: MUTED })] }));
children.push(new Paragraph({ spacing: { after: 200 }, border: { top: { style: BorderStyle.SINGLE, size: 6, color: "E6DCCD" }, bottom: { style: BorderStyle.SINGLE, size: 6, color: "E6DCCD" } }, children: [new TextRun({ text: "THIS AGREEMENT CONTAINS A RELEASE OF LIABILITY, AN ASSUMPTION OF RISK, AND AN INDEMNITY. IT LIMITS PUREBARIC'S LIABILITY AND AFFECTS YOUR LEGAL RIGHTS. READ IT CAREFULLY BEFORE SIGNING.", bold: true, font: FONT, size: 20 })] }));

children.push(p("This Business Rental Agreement and Liability Waiver (the \"Agreement\") is made on the Effective Date below between:"));
children.push(kv([
  ["Purebaric", "Matthew Bailie, doing business as Purebaric, Salt Lake City, Utah (\"Purebaric\", \"we\", \"us\"). hello@purebaric.com · (801) 901-0873"],
  ["Business", "______________________________________ (legal name), a ______________ (entity type and state), doing business as ______________________________ (\"Business\", \"you\")"],
  ["Business address", "______________________________________________________________"],
  ["Authorized signer", "Name: ______________________________  Title: ______________________"],
  ["Installation location", "______________________________________________________________"],
  ["Effective Date", "______________________, 20____"],
]));
children.push(...blank());

// ---------- 1 ----------
children.push(h1("1. Equipment and Services"));
children.push(p("1.1 **Equipment.** Purebaric rents to the Business the equipment listed in Exhibit A (the \"Equipment\"): one soft-shell mild hyperbaric chamber rated to 1.5 atmospheres absolute (ATA), one air compressor, one oxygen concentrator, and the accessories listed. The Equipment remains Purebaric's property at all times. The Business acquires no ownership interest and will keep the Equipment free of liens."));
children.push(p("1.2 **Services included.** Purebaric will (a) deliver and install the Equipment at the Installation Location; (b) provide initial hands-on training to the Business's designated staff; (c) supply a written operating runbook; (d) supply template client consent and waiver forms; (e) assist the Business in preparing a client-facing informational pamphlet in the Business's branding; (f) service and maintain the Equipment as described in Section 6; and (g) provide ongoing phone and text support during business hours."));
children.push(p("1.3 **Initial supplies.** The one-time setup fee covers the initial supplies listed in Exhibit A. Replacement masks, cleaning supplies, and other consumables are the Business's responsibility after the initial supplies are used."));

// ---------- 2 ----------
children.push(h1("2. Term, Fees, and Termination"));
children.push(p("2.1 **Term.** This Agreement begins on the Effective Date and continues month to month until terminated under this Section. There is no minimum term unless one is written in Exhibit A."));
children.push(p("2.2 **Fees.** The Business will pay the monthly rental fee and the one-time setup fee stated in Exhibit A. The first month's rental fee and the setup fee are due before installation. Each later monthly fee is due in advance on the same day of each month. Fees are payable by the method stated in Exhibit A. Fees more than 10 days late accrue a late charge of 1.5% per month (or the highest rate allowed by law, if lower) and Purebaric may suspend service or remove the Equipment."));
children.push(p("2.3 **Setup fee is non-refundable.** The setup fee covers installation, training, and initial supplies that are provided before or at installation and is not refundable once installation has occurred."));
children.push(p("2.4 **Termination for convenience.** Either party may end this Agreement for any reason with at least 30 days' written notice (email is sufficient). Rental fees are prorated to the removal date. Purebaric will remove the Equipment on or within 7 days after the termination date at no charge."));
children.push(p("2.5 **Termination for cause.** Purebaric may end this Agreement immediately, and remove the Equipment, if the Business (a) fails to pay fees when due; (b) uses or permits use of the Equipment in violation of Section 4 or Exhibit C; (c) makes medical or health claims in violation of Section 5; (d) damages the Equipment through misuse or neglect; or (e) becomes insolvent or ceases operating at the Installation Location."));
children.push(p("2.6 **Access for removal.** The Business will give Purebaric reasonable access to the Installation Location during business hours to inspect, service, or remove the Equipment. The Business will not move the Equipment to another location without Purebaric's written consent."));

// ---------- 3 ----------
children.push(h1("3. Delivery, Installation, and Training"));
children.push(p("3.1 **Site requirements.** The Business will provide a clean, dry, indoor area of at least 5 feet by 8 feet, a standard grounded wall outlet on a circuit able to supply the Equipment, and reasonable temperature control. The Business is responsible for confirming that its premises, lease, and zoning permit the Equipment and the offering of sessions."));
children.push(p("3.2 **Training.** Before any client session, the Business's staff who will operate the Equipment must complete Purebaric's training. The Business will keep a list of trained staff and will not allow untrained staff to run sessions. Purebaric will provide refresher training on request at no additional charge, and training for new staff at the rate in Exhibit A."));
children.push(p("3.3 **Acceptance.** The Business will inspect the Equipment at installation and note any existing damage on the Installation Checklist in Exhibit A. Otherwise the Equipment is accepted as delivered in good working order."));

// ---------- 4 ----------
children.push(h1("4. Operation of the Equipment and Client Sessions"));
children.push(p("4.1 **Business operates the sessions.** The Business, not Purebaric, offers sessions to its clients, sets prices, schedules sessions, collects payment, and supervises every session. Purebaric is an equipment lessor and service provider only and has no relationship with the Business's clients."));
children.push(p("4.2 **Trained staff present.** A trained staff member will be on the premises and available for the whole of every session, will start and end each session, and will be able to depressurize and open the chamber at any time."));
children.push(p("4.3 **Client consent before every first session.** Before a client's first session, the Business will obtain the client's signature on a client consent, assumption of risk, and release form that (a) is at least as protective of Purebaric as the template Purebaric supplies; (b) names Purebaric and Matthew Bailie as released parties; and (c) requires the client to confirm that none of the conditions in Exhibit C apply, or that a physician has cleared the client. The Business will keep each signed form for at least four years and will give Purebaric a copy within 5 business days of any request."));
children.push(p("4.4 **Who may not use the chamber.** The Business will not allow a session for any person who (a) is under 18 unless a parent or legal guardian signs the consent form and is present; (b) reports any condition listed in Exhibit C without written physician clearance; (c) appears ill, intoxicated, or impaired; or (d) refuses to sign the consent form."));
children.push(p("4.5 **Operating rules.** The Business will operate the Equipment only as trained and as described in the runbook and the manufacturer's instructions, and will follow the safety rules in Exhibit C, including the rules on flammable and oil-based products, items brought into the chamber, maximum session length, and cleaning between sessions."));
children.push(p("4.6 **Incidents.** If a client or staff member experiences distress, injury, or a medical symptom during or after a session, the Business will stop the session, depressurize and open the chamber, obtain appropriate medical help (calling 911 in an emergency), and notify Purebaric by phone within 24 hours and in writing within 3 days. The Business will preserve the Equipment and any records relating to the incident."));
children.push(p("4.7 **Records.** The Business will keep a session log (date, time, client initials or ID, staff member, session length, and any issues) and make it available to Purebaric on request."));

// ---------- 5 ----------
children.push(h1("5. No Medical Claims; Compliance with Law"));
children.push(p("5.1 **Wellness amenity only.** The Equipment is offered as a general wellness and relaxation amenity. It is not a medical device as used here, and neither Purebaric nor the Business provides medical diagnosis, treatment, or advice through it."));
children.push(p("5.2 **Business's marketing.** The Business is solely responsible for everything it says about the sessions to clients and the public, in any medium. The Business will not state or imply that sessions diagnose, treat, cure, prevent, or mitigate any disease or medical condition, or make any claim that would require regulatory approval, and will describe the sessions as a wellness amenity. The Business will not use Purebaric's name or logo in marketing without Purebaric's written approval, except for the pamphlet prepared with Purebaric under Section 1.2."));
children.push(p("5.3 **Laws, licenses, and insurance.** The Business will comply with all laws applicable to its offering of sessions, including consumer protection, advertising, health and safety, privacy, and any licensing requirements, and will obtain any permits required for its premises. The Business will maintain commercial general liability insurance of at least $1,000,000 per occurrence and $2,000,000 aggregate that covers the sessions, will name Matthew Bailie d/b/a Purebaric as an additional insured, and will give Purebaric a certificate of insurance before the first session and on each renewal."));

// ---------- 6 ----------
children.push(h1("6. Care, Maintenance, Damage, and Loss"));
children.push(p("6.1 **Purebaric's maintenance.** Purebaric will service and maintain the Equipment for normal wear and will repair or replace Equipment that fails in normal use at no charge. Purebaric will respond to a reported malfunction within 2 business days and will use reasonable efforts to repair or replace the affected item within 7 business days. If the Equipment is out of service for more than 7 consecutive days for reasons not caused by the Business, the monthly fee is prorated for the additional days out of service. This proration is the Business's sole remedy for Equipment downtime."));
children.push(p("6.2 **Business's care.** The Business will keep the Equipment clean and in the installed location, use only the cleaning products approved in the runbook, not modify, open, or attempt to repair the Equipment, not remove labels or safety markings, and not allow anyone other than trained staff to operate it."));
children.push(p("6.3 **Damage and loss.** The Business is responsible for loss of, theft of, or damage to the Equipment while at the Installation Location, other than normal wear and tear and failures covered by Section 6.1, including damage caused by its staff, clients, visitors, or premises conditions (such as water, fire, or power surge). Purebaric will document any damage with photographs and give the Business a written, itemized assessment within 7 business days. Charges may include parts, labor, and lost rental fees for the days the Equipment is being repaired or replaced, up to the replacement values in Exhibit A."));

// ---------- 7 ----------
children.push(h1("7. Assumption of Risk"));
children.push(p("7.1 The Business acknowledges that it has been informed, and understands, that use of a mild hyperbaric chamber involves risks that cannot be eliminated even with proper operation. These risks include, without limitation: ear, sinus, and dental discomfort or injury from pressure changes; claustrophobia, anxiety, or panic; dizziness, fatigue, or headache; worsening of certain pre-existing conditions, including those listed in Exhibit C; fire risk associated with oxygen-enriched environments, flammable products, and electrical devices; injury while entering or leaving the chamber; equipment malfunction or power failure; and the risk that a client provides inaccurate health information."));
children.push(p("7.2 The Business voluntarily assumes all risks of offering sessions at its premises, known and unknown, and accepts full responsibility for the supervision of sessions, the screening of clients, and the condition of its premises."));

// ---------- 8 ----------
children.push(h1("8. Release of Liability"));
children.push(caps("8.1 TO THE FULLEST EXTENT PERMITTED BY LAW, THE BUSINESS, FOR ITSELF AND ITS OWNERS, OFFICERS, EMPLOYEES, CONTRACTORS, INSURERS, SUCCESSORS, AND ASSIGNS, RELEASES, WAIVES, AND DISCHARGES MATTHEW BAILIE, PUREBARIC, AND THEIR RESPECTIVE AGENTS, CONTRACTORS, HEIRS, AND ASSIGNS (THE \"RELEASED PARTIES\") FROM ALL CLAIMS, DEMANDS, LOSSES, AND LIABILITIES OF EVERY KIND, INCLUDING CLAIMS FOR PERSONAL INJURY, ILLNESS, DEATH, PROPERTY DAMAGE, LOST PROFITS, OR BUSINESS INTERRUPTION, ARISING OUT OF OR RELATED TO THE EQUIPMENT, ITS INSTALLATION, USE, MALFUNCTION, OR REMOVAL, OR THE SESSIONS OFFERED BY THE BUSINESS, INCLUDING CLAIMS CAUSED IN WHOLE OR IN PART BY THE ORDINARY NEGLIGENCE OF A RELEASED PARTY."));
children.push(p("8.2 This release does not apply to liability that cannot be released under Utah law, including liability for a Released Party's gross negligence, willful misconduct, or fraud."));
children.push(p("8.3 The Business will not bring, and will not permit anyone claiming through it to bring, any claim against a Released Party that has been released under this Section."));

// ---------- 9 ----------
children.push(h1("9. Indemnification"));
children.push(p("9.1 The Business will defend, indemnify, and hold harmless the Released Parties from and against all claims, demands, suits, losses, damages, judgments, settlements, fines, costs, and expenses (including reasonable attorney fees and costs) brought by or arising from any third party, including the Business's clients, employees, contractors, visitors, landlord, or insurers, that arise out of or relate to: (a) the sessions offered by the Business or any person's use of the Equipment at the Installation Location; (b) any act or omission of the Business or its staff, including failure to screen clients, obtain consent, supervise sessions, or follow the runbook or Exhibit C; (c) any statement, advertisement, or claim made by the Business about the sessions; (d) the condition of the Business's premises; (e) any breach of this Agreement by the Business; or (f) any violation of law by the Business."));
children.push(p("9.2 This obligation applies regardless of whether a Released Party is alleged to have been negligent, except to the extent a court finally determines that the loss was caused by that Released Party's gross negligence or willful misconduct."));
children.push(p("9.3 Purebaric will give the Business prompt notice of any claim for which it seeks indemnity and may participate in the defense with its own counsel at its own expense. The Business will not settle any claim in a way that admits fault by, or imposes any obligation on, a Released Party without Purebaric's written consent."));
children.push(p("9.4 Purebaric will defend and indemnify the Business against third-party claims to the extent caused by Purebaric's gross negligence or willful misconduct in installing or servicing the Equipment."));

// ---------- 10 ----------
children.push(h1("10. Disclaimer of Warranties and Limitation of Liability"));
children.push(caps("10.1 EXCEPT FOR THE MAINTENANCE OBLIGATIONS IN SECTION 6.1, THE EQUIPMENT AND SERVICES ARE PROVIDED \"AS IS,\" AND PUREBARIC DISCLAIMS ALL OTHER WARRANTIES, EXPRESS OR IMPLIED, INCLUDING ANY WARRANTY OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, OR NON-INFRINGEMENT."));
children.push(p("10.2 **No revenue guarantee.** Any estimate of session demand, pricing, or revenue that Purebaric has shared, in a prospectus, pamphlet, email, or conversation, is an illustration based on stated assumptions, not a promise. The Business has made its own assessment of the opportunity and is not relying on any revenue projection."));
children.push(caps("10.3 TO THE FULLEST EXTENT PERMITTED BY LAW, PUREBARIC WILL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, CONSEQUENTIAL, SPECIAL, OR PUNITIVE DAMAGES, OR FOR LOST PROFITS, LOST REVENUE, OR BUSINESS INTERRUPTION, HOWEVER CAUSED. PUREBARIC'S TOTAL LIABILITY ARISING OUT OF OR RELATED TO THIS AGREEMENT WILL NOT EXCEED THE RENTAL FEES PAID BY THE BUSINESS IN THE THREE MONTHS BEFORE THE EVENT GIVING RISE TO THE CLAIM. THESE LIMITS DO NOT APPLY TO LIABILITY FOR GROSS NEGLIGENCE, WILLFUL MISCONDUCT, OR FRAUD."));

// ---------- 11 ----------
children.push(h1("11. General Terms"));
children.push(p("11.1 **Independent parties.** The parties are independent contractors. Nothing in this Agreement creates a partnership, joint venture, franchise, agency, or employment relationship. Neither party may bind the other."));
children.push(p("11.2 **Notices.** Notices must be in writing and sent by email with confirmation of receipt, or by mail, to the addresses in this Agreement (for Purebaric: hello@purebaric.com)."));
children.push(p("11.3 **Assignment.** The Business may not assign this Agreement or sublet the Equipment without Purebaric's written consent. Purebaric may assign this Agreement to a successor to its business."));
children.push(p("11.4 **Governing law and venue.** This Agreement is governed by the laws of the State of Utah, without regard to conflict-of-law rules. Any dispute will be brought exclusively in the state or federal courts located in Salt Lake County, Utah, and each party consents to that jurisdiction."));
children.push(p("11.5 **Attorney fees.** In any action to enforce this Agreement, the prevailing party may recover its reasonable attorney fees and costs."));
children.push(p("11.6 **Severability.** If any provision is held unenforceable, it will be enforced to the maximum extent permitted and the rest of the Agreement remains in effect. The parties intend the release, indemnity, and limitation of liability to be enforced to the fullest extent the law allows."));
children.push(p("11.7 **Survival.** Sections 4.3 (record keeping), 5, 6.3, 7, 8, 9, 10, and 11 survive termination."));
children.push(p("11.8 **Entire agreement; changes.** This Agreement, with its Exhibits, is the entire agreement between the parties about the Equipment and supersedes all prior proposals, prospectuses, and discussions. Changes must be in writing and signed by both parties."));
children.push(p("11.9 **Counterparts and electronic signatures.** This Agreement may be signed in counterparts and electronically, each of which is an original."));
children.push(p("11.10 **Opportunity to review.** The Business confirms that it has read this Agreement, has had the opportunity to consult an attorney, understands that it is giving up legal rights including the right to sue the Released Parties for ordinary negligence, and signs voluntarily."));

// ---------- Signatures ----------
children.push(h1("Signatures"));
children.push(p("By signing below, each party agrees to this Agreement, including the Release of Liability in Section 8 and the Indemnification in Section 9."));
children.push(...blank());
const sigTable = new Table({ width: { size: 9360, type: WidthType.DXA }, columnWidths: [4680, 4680], borders: { top: { style: BorderStyle.NONE }, bottom: { style: BorderStyle.NONE }, left: { style: BorderStyle.NONE }, right: { style: BorderStyle.NONE }, insideHorizontal: { style: BorderStyle.NONE }, insideVertical: { style: BorderStyle.NONE } },
  rows: [new TableRow({ children: [
    new TableCell({ width: { size: 4680, type: WidthType.DXA }, margins: { right: 300 }, children: [
      new Paragraph({ spacing: { after: 300 }, children: [new TextRun({ text: "BUSINESS", bold: true, font: FONT, size: 22 })] }),
      line("Signature:", 4300), line("Name:", 4300), line("Title:", 4300), line("Date:", 4300)] }),
    new TableCell({ width: { size: 4680, type: WidthType.DXA }, margins: { left: 300 }, children: [
      new Paragraph({ spacing: { after: 300 }, children: [new TextRun({ text: "PUREBARIC", bold: true, font: FONT, size: 22 })] }),
      line("Signature:", 4300), new Paragraph({ spacing: { after: 160 }, children: [new TextRun({ text: "Name: Matthew Bailie", font: FONT, size: 22 })] }), new Paragraph({ spacing: { after: 160 }, children: [new TextRun({ text: "Title: Owner, Purebaric", font: FONT, size: 22 })] }), line("Date:", 4300)] }),
  ] })] });
children.push(sigTable);

// ---------- Exhibit A ----------
children.push(new Paragraph({ children: [new PageBreak()] }));
children.push(h1("Exhibit A: Equipment, Fees, and Installation Checklist"));
children.push(h2("Equipment"));
children.push(kv([
  ["Chamber", "Soft-shell mild hyperbaric chamber, 1.5 ATA.  Serial no.: ______________  Replacement value: $__________"],
  ["Compressor", "Model: ______________  Serial no.: ______________  Replacement value: $__________"],
  ["Oxygen concentrator", "Model: ______________  Serial no.: ______________  Replacement value: $__________"],
  ["Accessories", "Mattress pad, pillow, tubing, pressure gauge, mask kit, owner's manual, runbook."],
  ["Initial supplies", "50 single-use masks, 1 foam pad, 2 washable cover sheets, initial cleaning supplies, printed instructions and runbook."],
]));
children.push(...blank());
children.push(h2("Fees"));
children.push(kv([
  ["Monthly rental fee", "$979.00 per chamber per month, due in advance"],
  ["One-time setup fee", "$500.00 per chamber (installation, staff training, initial supplies). Non-refundable after installation."],
  ["Minimum term", "None (month to month; 30 days' notice to end) unless stated here: ______________"],
  ["Additional staff training", "$__________ per session, on request"],
  ["Payment method", "☐ Card on file (Stripe)   ☐ ACH / bank transfer   ☐ Other: ______________"],
  ["Number of chambers", "______"],
]));
children.push(...blank());
children.push(h2("Installation checklist (completed at delivery)"));
children.push(bullet("Site meets Section 3.1 (5 x 8 ft area, grounded outlet, dry, temperature controlled):  ☐ Yes"));
children.push(bullet("Equipment inspected; existing damage noted here: ______________________________________________"));
children.push(bullet("Staff trained (names): ______________________________________________________________________"));
children.push(bullet("Runbook, consent form template, and safety rules provided:  ☐ Yes"));
children.push(bullet("Certificate of insurance received:  ☐ Yes   ☐ To follow by: ____________"));
children.push(p("Business initials: ________     Purebaric initials: ________     Date: ______________"));

// ---------- Exhibit B ----------
children.push(h1("Exhibit B: Required Client Consent"));
children.push(p("Before a client's first session, the Business will have the client sign a consent form that contains at least the following. Purebaric supplies a template that meets these requirements; the Business may use its own form only if it contains each item."));
children.push(num("A statement that the session is a general wellness and relaxation amenity, is not a medical treatment, and that no diagnosis, treatment, or cure is offered."));
children.push(num("The health screening in Exhibit C, with the client's confirmation that none of the listed conditions apply, or a physician's written clearance."));
children.push(num("A description of the risks in Section 7.1 and the client's voluntary assumption of those risks."));
children.push(num("A release of liability and covenant not to sue in favor of the Business, Matthew Bailie, and Purebaric, covering ordinary negligence to the extent permitted by Utah law."));
children.push(num("The safety rules in Exhibit C and the client's agreement to follow them and to follow staff instructions."));
children.push(num("Emergency contact information and an acknowledgment that staff may end a session at any time."));
children.push(num("For a client under 18, the signature of a parent or legal guardian who will be present during the session."));

// ---------- Exhibit C ----------
children.push(h1("Exhibit C: Health Screening and Safety Rules"));
children.push(h2("Conditions requiring written physician clearance before any session"));
children.push(p("A client who reports any of the following may not use the chamber without written clearance from a licensed physician:", { color: MUTED }));
[
  "Pregnancy or possible pregnancy",
  "Untreated pneumothorax (collapsed lung) or a history of spontaneous pneumothorax",
  "Chronic lung disease, including emphysema, COPD, or severe asthma",
  "Current cold, flu, sinus infection, ear infection, or congestion",
  "Ear surgery, ear injury, or inability to equalize ear pressure",
  "Seizure disorder or a history of seizures",
  "Uncontrolled high blood pressure or significant heart disease",
  "Implanted medical devices such as a pacemaker (check manufacturer guidance)",
  "Fever or an active infection",
  "Claustrophobia or panic disorder",
  "Current chemotherapy, or use of medications known to interact with increased oxygen (for example disulfiram, cisplatin, doxorubicin, or bleomycin)",
  "Any other condition for which a physician has advised against pressure or oxygen exposure",
].forEach(t => children.push(bullet(t)));
children.push(h2("Safety rules for every session"));
[
  "A trained staff member starts and ends every session and remains on the premises throughout.",
  "No smoking, vaping, open flame, or heat source anywhere near the Equipment.",
  "No petroleum-based or oil-based products (lotions, hair oils, lip balm, make-up with mineral oil) on the client's skin or clothing. No alcohol-based sanitizer applied immediately before entering.",
  "No lighters, matches, e-cigarettes, battery packs, hand warmers, or heating devices inside the chamber. Phones and tablets are permitted only if the runbook and manufacturer's instructions allow them.",
  "Clients wear clean, comfortable clothing without metal buckles, exposed zippers, or jewelry that could damage the chamber.",
  "One client per session. Sessions do not exceed the maximum length in the runbook (standard session: 60 minutes).",
  "Pressurize and depressurize gradually. Stop immediately if the client reports ear pain, chest discomfort, dizziness, or distress.",
  "Clients eat lightly before a session and avoid carbonated drinks; clients who are unwell do not have a session.",
  "A fresh mask is used for each client. The chamber interior, mask tubing, and pad are wiped with the approved cleaner between sessions.",
  "Do not operate the Equipment if any part appears damaged, if the pressure gauge is not functioning, or if an unusual smell, sound, or leak is noticed. Contact Purebaric.",
  "Any incident is handled under Section 4.6 and reported to Purebaric within 24 hours.",
].forEach(t => children.push(bullet(t)));
children.push(...blank());
children.push(p("Prepared for Purebaric. This template is provided for review by the Business's and Purebaric's own legal counsel and is not legal advice.", { size: 18, color: MUTED, italics: true }));

const doc = new Document({
  creator: "Purebaric", title: "Purebaric Business Rental Agreement and Liability Waiver",
  styles: { default: { document: { run: { font: FONT, size: 22 } } } },
  numbering: { config: [
    { reference: "bullets", levels: [{ level: 0, format: LevelFormat.BULLET, text: "•", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 540, hanging: 270 } } } }] },
    { reference: "numbers", levels: [{ level: 0, format: LevelFormat.DECIMAL, text: "%1.", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 540, hanging: 360 } } } }] },
  ] },
  sections: [{
    properties: { page: { size: { width: 12240, height: 15840 }, margin: { top: 1440, bottom: 1296, left: 1440, right: 1440 } } },
    footers: { default: new Footer({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [
      new TextRun({ text: "Purebaric Business Rental Agreement and Liability Waiver  ·  Page ", font: FONT, size: 18, color: MUTED }),
      new TextRun({ children: [PageNumber.CURRENT], font: FONT, size: 18, color: MUTED }),
      new TextRun({ text: " of ", font: FONT, size: 18, color: MUTED }),
      new TextRun({ children: [PageNumber.TOTAL_PAGES], font: FONT, size: 18, color: MUTED }),
      new TextRun({ text: "     Business initials: ______", font: FONT, size: 18, color: MUTED }),
    ] })] }) },
    children,
  }],
});
Packer.toBuffer(doc).then(b => { fs.writeFileSync(OUT, b); console.log("wrote", OUT, b.length); });
