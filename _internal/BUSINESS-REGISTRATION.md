# Purebaric business registration notes

Last updated: 12 October 2026. What has been filed, what it means, and the step list for forming the LLC when the time comes. Fees quoted are the ones shown or published on the filing dates; check the Division's fee schedule before each filing.

## 1. What exists today

| Item | Status |
|---|---|
| Business name "Purebaric" | Registered in Utah as an **assumed name (DBA)**, "Certificate of Assumed and of True Name". Filed and **accepted 12 October 2026, 1:58 PM**, through businessregistration.utah.gov. Fee $22. |
| Legal owner | Matthew Bailie, **sole proprietor** (an individual doing business as Purebaric). |
| Owner, principal office, mailing and registered-agent address | 3903 West 1700 North, Lehi, UT 84048. Registered agent: Matthew Bailie, same address. |
| Correspondence email with the state | matthewbailie@gmail.com (renewal notices come here). |
| Purpose on file | Rental of mild hyperbaric chambers to households and businesses, with delivery, setup and support, and any other lawful business. |
| Term | **3 years.** Renew before **October 2029** (Renewals menu, same site; renewal fee reported at $18). An expired DBA cannot be reinstated, only refiled, and the name would be open to anyone in between. |
| Certificate | Download from the filing site: Dashboard, Recent Filings or Correspondence History, the "Purebaric" row. Keep a PDF with the business records. |

What the DBA does: it makes trading as "Purebaric" lawful (Utah Code 42-2-5 requires it within 30 days of starting) and puts the name on the Division's records, so a new LLC or corporation name must be distinguishable from it. What it does not do: it gives no trademark rights and does not change taxes or liability; Matthew is still personally liable for business debts until there is an LLC.

Sign-in for the state site: UtahID, with the account email above. The filing dashboard shows drafts, orders and the "Resubmit rejected filing" queue.

## 2. Forming the LLC, when ready

Order matters. Do steps 1 to 4 in one sitting.

1. **Pick the exact LLC name.** "Purebaric LLC" or "Purebaric, LLC". Utah requires "LLC", "L.L.C." or "Limited Liability Company" at the end. Run it through the Name Availability search on the dashboard first.
2. **Cancel the DBA.** Formations and Registrations, Assumed Name, then the DBA Cancellation filing on the Purebaric record. The Division does not convert a DBA into an entity; it has to be cancelled and the LLC filed fresh. Only a current DBA can be cancelled, so do this before October 2029.
3. **File the Certificate of Organization the same day.** Formations, Domestic Formations, Limited Liability Company. Fee reported at **$59** (plus the optional $75 two-business-day expedite). You will enter: the LLC name; purpose (reuse the DBA purpose); principal office and mailing address (Lehi); registered agent (Matthew, Lehi address, or a commercial agent if you want your home address off the public record); whether it is member-managed (yes, Matthew as the member/manager); the organizer's signature; an effective date (leave blank). Approval is usually immediate for a clean name.
4. **Order a Certificate of Existence** if the bank asks for one ($12 short form on the same site).
5. **EIN.** Apply free at irs.gov (Employer Identification Number, online, about 10 minutes). Needed for the bank account, Stripe and the Utah tax account. Do not use a paid third-party EIN service.
6. **Utah tax account.** Register the LLC with the Utah State Tax Commission (TNTAP) for sales tax; equipment rentals are taxable in Utah. Stripe Tax collects at checkout but the account still has to exist and file.
7. **Lehi business licence.** Lehi City requires a licence for a home-based business; apply with the LLC's certificate and EIN.
8. **Bank account** in the LLC's name, then move Stripe payouts to it.
9. **Annual renewal.** The LLC renews every year by the end of its anniversary month, reported at $18, with a $10 late fee. Put it on the calendar when the certificate arrives.

## 3. Everything that must move from "Matthew Bailie, sole proprietor" to the LLC

Do these within the first month after the certificate so contracts and payments line up with the entity.

- **Stripe:** change the account's legal entity to the LLC (business name, EIN, bank account). Existing subscriptions keep running.
- **Netlify, Resend, Twilio, Google Analytics, Google Business Profile, Facebook page and Marketplace listing:** update the business name on the accounts where it is shown; billing stays on whichever card you choose.
- **Website:** `terms.html`, `privacy.html` and the footer name the business; change the operating entity to the LLC's name. `_internal/RUNBOOK.md` section 1 should record the entity.
- **Documents in `_internal/outreach/source/`:** `make_loi.js` (`entity` and `signer` in the STATES table), `make_waiver.js` (`person` per state), `make_renewal_rider.js`; the home rental waiver and home chamber instructions (the provider line). Regenerate and re-export the Utah and Tennessee sets.
- **Insurance:** the liability policy must name the LLC as the insured, and the certificate-holder wording in the business rental agreement changes to match.
- **Tennessee:** if the LLC will contract in Tennessee, it needs a certificate of authority from the Tennessee Secretary of State and the registrations in `_internal/research/knoxville-tennessee/knoxville/legal_blockers_summary.md` before the first Tennessee signing; the Tennessee LOI and agreement currently name "Michael Bailie, doing business as Purebaric" and will need the entity line changed.
- **Existing rental agreements** signed by Matthew personally stay valid; new ones are signed by the LLC. An assignment letter to current customers is optional but tidy.

## 4. Decisions to make before filing the LLC

- **Registered agent:** yourself at the Lehi address (free, address becomes public) or a commercial registered agent (roughly $50 to $150 a year, keeps the home address off the record).
- **Single-member or add a member** (for example Michael for the Tennessee territory). A single-member LLC is simplest and taxed as a sole proprietorship by default.
- **Tax election:** default pass-through is right at this revenue level; an S-corp election is worth a conversation with an accountant once net income is comfortably above a reasonable salary.
- **Operating agreement:** Utah does not file it, but the bank and insurer often ask for one. Keep a signed copy with the records.

## 5. Sources

- Utah Division of Corporations, DBA page: https://commerce.utah.gov/corporations/business-entities/dba/
- Utah business registration site (filings, renewals, name search): https://businessregistration.utah.gov/
- LLC and renewal fees as reported for 2026 ($59 formation, $18 annual renewal, $10 late fee): https://www.llcuniversity.com/utah-llc/ and https://startbusinessbystate.com/?p=15060 ; confirm against the Division's fee schedule before filing.
