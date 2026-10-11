# Tennessee automatic-renewal rule: summary and where it now appears (10 October 2026)

Research, not legal advice. Source read: Tenn. Code Ann. § 47-18-133 as published on FindLaw (current as of 2 January 2024). The 2024 amendment (SB 1894, reported effective 1 July 2024) could not be read on a primary source today; the FindLaw text already contains the 60-day notice duty, so the summary below reflects the statute as it stands on that page. Counsel should confirm the current text.

## What the statute requires
1. **Clear and conspicuous terms before consent.** Automatic-renewal terms must be presented clearly, near the request for consent, before the agreement is fulfilled; if there is a free trial or gift, the price after the trial must be explained.
2. **Affirmative consent before charging.** No charge to a consumer's card or account without a "clear, affirmative act signifying a consumer's freely given, specific, informed, and unambiguous agreement".
3. **A copy the consumer can keep.** An acknowledgment of the terms, the cancellation policy and how to cancel.
4. **Notice of a late first charge.** If the automatic renewal will occur more than 60 days after consent, the business must give clear and conspicuous notice of when the charge will occur.
5. **Easy cancellation.** A toll-free number, an email address, a postal address if the business bills directly, or another cost-effective, timely and easy mechanism; a consumer who accepted online must be able to cancel online.
6. **Notice of material changes**, with how to cancel.
7. **Refund right.** A charge made without affirmative consent is refunded on request made within 7 days of the charge.
8. **Who it protects.** "Consumer" means an individual acquiring goods or services for personal, family or household purposes. Home rentals are squarely covered. Business rentals are not consumer transactions, but the same disclosure is applied to them as good practice and costs nothing.
9. **Exemptions** cover banks, credit unions, utilities and insurers, none of which apply to Purebaric.

## Where it now appears
| Document | Where | Status |
|---|---|---|
| Tennessee Business Rental Agreement and Liability Waiver (`Purebaric_TN_Business_Rental_Agreement_and_Liability_Waiver.docx/.pdf`) | New Section 2.7 "Automatic continuation and recurring charges (Tennessee)" with an initials line; Section 2.1 now ties the rate to the initial term; Exhibit A lists the initial term and the air-only configuration; Tennessee contact details; Tennessee law and Knox County venue | Generated from `make_waiver.js` with `STATE=tennessee`; for Tennessee counsel's review before use |
| Tennessee letter of intent (`Purebaric_LOI_Business_Chamber_Rental_Tennessee.docx/.pdf`) | New Section 1.9a summarizing the same terms and pointing to Section 2.7 of the agreement | Regenerated |
| Automatic Renewal and Recurring Charge Disclosure (`Purebaric_TN_Automatic_Renewal_Disclosure.docx/.pdf`) | One-page rider with the term, fee, charge date, continuation choice, 60-day notice, cancellation channels, change notice, refund right, consent signature and initials | New; attach to the home rental agreement and waiver and to business agreements, and show before payment in online booking |

## Sales tax
Owner decision (10 Oct 2026): any applicable sales tax is calculated and collected through Stripe at the time of each charge. No document quotes a tax rate or adds tax to a price; the agreement, LOI, rider and pamphlets say so in one line.

## Owner actions
- **Home rental agreement and waiver.** Those documents are not in the site repo, so the rider is the Tennessee statement for home rentals until the home documents themselves are revised. Decide which continuation option applies to home rentals (ends on the end date unless extended, or continues month to month) and tick it on the rider.
- **Online booking.** When booking is opened to Tennessee addresses, the booking page must show the renewal terms before payment, capture affirmative consent (a checkbox is the usual form), send the acknowledgment email, and offer online cancellation. That is a website change and is not made here.
- **Contracting entity and governing law.** The Tennessee agreement keeps "Michael Bailie, doing business as Purebaric" and uses Tennessee law and Knox County venue to match the LOI; both are flagged for counsel in `README-LOI-Tennessee.md`.
- **Utah documents are unchanged.** The generator now carries the term-rate rule and the state switch, but the Utah agreement file was not regenerated.
