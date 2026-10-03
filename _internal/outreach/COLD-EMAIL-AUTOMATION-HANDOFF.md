# Purebaric small-batch B2B email automation — implementation handoff

Prepared October 3, 2026. This is a build brief for the next AI agent, not authorization to purchase subscriptions, register domains, or activate sending without Matthew's approval.

## Objective and current safety boundary

Create a low-volume, daily business-outreach workflow without using Resend for unsolicited email. Keep Purebaric customer/reservation notifications on their existing transactional mailer. Do not promise inbox placement: compliant mail can still be filtered, and separate domains do not fully isolate brand reputation.

The Netlify `outreach-daily` schedule has been removed. Its handler is a no-op; `/api/admin/outreach/send` and `/run` return `403 outreach_disabled`; settings reads/writes force `autoSend: false`. The shared outreach delivery function permits only explicitly requested tests to the owner's inbox. Prospect records, prior send history, templates, and unsubscribe links are preserved. Do not undo these guards or fall back to Resend when another provider fails. Resend explicitly prohibits cold outreach regardless of batch size. [Resend policy](https://resend.com/legal/acceptable-use)

## 1. Provider selection and owner decisions — before any purchases

Recommended candidate: Instantly with its AirMail infrastructure, rather than an ordinary mailbox connected to software that merely sequences messages. AirMail is purpose-built for corporate B2B outreach, but drops personal-provider recipients, including Gmail/Yahoo/Outlook addresses used by business owners. It has no separate mailbox login and limits campaign sends to 20/day/mailbox. Its guidance recommends three weeks of preparation before campaigns. [AirMail documentation](https://help.instantly.ai/en/articles/14893942-instantly-airmail-done-for-you-email-setup)

First contact Instantly support/sales and obtain confirmation that Purebaric's hyperbaric equipment rental use case, intended copy, and researched business-contact sources are allowed. Their policy calls for sales consultation for regulated activities such as medicine. Do not assume a wellness description exempts this business. If refused, stop and present another provider's written permission and terms; do not disguise the use case. Their policy also requires domains at least one month old and immediate opt-out handling. [Sending policy](https://instantly.ai/instantly-sending-policy)

Ask Matthew to approve:

- Provider, actual plan, recurring/initial total, and cancellation terms.
- One clearly Purebaric-associated secondary sending domain and one mailbox to start; do not invent a brand or claim a domain is available without checking.
- Full valid business mailing address (or appropriate PO Box), reply handling, and final email copy.
- Initial five-message/day pilot, weekdays only, with later increases requiring review.

Published monthly platform prices are Growth $47 and Hypergrowth $97; API/webhook and reply capabilities must be verified on the chosen plan. AirMail lists $4/mailbox/month and $15/domain/year. Indicative totals are $51/month plus $15/year for Growth or $101/month plus $15/year for Hypergrowth, before taxes, verification, or a custom-account quote. These are not approved purchases. [Platform pricing](https://instantly.ai/pricing), [AirMail billing](https://help.instantly.ai/en/articles/14893942-instantly-airmail-done-for-you-email-setup)

Verify that Matthew can actually read and answer replies before buying: AirMail lacks a standalone inbox. Confirm whether Unibox reply access and the API/webhooks needed below require an upgraded plan. Avoid paying for lead databases or AI enrichment for this existing small list.

## 2. Sending identity and deliverability setup

1. Obtain the approved provider account and secondary domain; keep `purebaric.com` and its customer-mail DNS intact.
2. Configure the sending domain's SPF, DKIM, and DMARC using provider-supplied values. Validate alignment from received-message headers, not just green dashboard badges. Do not create duplicate SPF records.
3. Make the sending domain transparently identify Purebaric and reach its real website/legal pages. Use Matthew's truthful name and an actual monitored reply mailbox. Do not impersonate an unrelated business.
4. Meet provider domain-age and mailbox preparation requirements before launch. Any preparation/warmup must be provider-permitted; do not generate fake prospect engagement or buy fabricated reviews/replies.
5. Use plain, concise emails without attachments, tracking pixels, or redirect-heavy links initially. Link directly to the relevant business-rental page. Do not make unsupported treatment/medical claims.

## 3. Audit and migrate the existing list safely

Work in `/Users/bailie/projects/purebaric-newsite`; remote is `matthewbailie/purebaric-newsite`. Inspect the current implementation before changing anything:

- `netlify/functions/admin-outreach.js` — authenticated admin endpoints.
- `netlify/functions/_lib/outreach-io.js` — live Blobs records, rendering, legacy delivery sync.
- `netlify/functions/_lib/outreach.js` — IDs, statuses, settings, history.
- `netlify/functions/_lib/outreach-template.js` — category-specific copy.
- `netlify/functions/outreach-unsubscribe.js` — existing public opt-out handling.
- `admin.html` — Outreach controls; `netlify.toml` — schedules.
- `_internal/outreach/prospects.json` — bundled research feed, NOT authoritative sending history.

Back up live outreach data privately. Import suppressions before uploading candidates. Never re-import the JSON file as a fresh list and resend to everyone. Preserve IDs, existing tokens, timestamps, prior provider IDs, owner edits, replies, and status history. Retain legacy Resend sync/webhook processing for messages already sent.

Select only relevant US business contacts in the current service area with documented public business source and recently verified corporate email. Research confidence is not verification. Exclude personal-provider addresses for AirMail, invalid/unknown/catch-all results pending review, unsubscribes, complaints, bounces, declined contacts, customers, prior replies, and already-contacted prospects. Do not infer consent from publication of an address. No purchased bulk consumer lists. Show excluded counts/reasons rather than silently dropping addresses.

## 4. Automation architecture — one sender, one scheduling authority

Prefer the provider's campaign scheduler for actual email delivery. Do not restore Netlify's Resend sending schedule. Do not add a desktop/Cloud Code task that clicks Send Next Batch: it is not a durable scheduler.

For the first version, use a one-message campaign and no automatic follow-ups. Load only an owner-reviewed pilot cohort. Schedule Monday–Friday, 10 a.m.–noon `America/Denver`, five TOTAL campaign messages per day across the pilot, not five per batch or per mailbox. Let the provider spread messages through the window. Count all sequences/follow-ups against any future total cap. Do not preload the entire list.

Build the provider adapter server-side using its current official API documentation: [Instantly developer documentation](https://developer.instantly.ai/). Verify actual endpoints, scopes, limits, plan access, event authentication, and lead-removal/pause capabilities before coding. Store keys only in protected server environment variables; never in source, browser storage, exports, screenshots, or logs. No generic user-configurable outbound URL.

- Admin UI: provider status, preparation/approval state, daily cap, schedule, campaign state, pending cohort, last sync/error, and an obvious pause button. Default new campaigns to paused.
- Distinguish reviewed, queued, provider-accepted, actually sent, bounced, replied, unsubscribed, and customer outcomes. API upload acceptance is NOT an email send; do not fabricate `sentAt` or increment sent counts.
- Use stable prospect/campaign identifiers, durable duplicate protection, and a queue claim that prevents concurrent runs submitting the same prospect. Reconcile ambiguous API timeouts before retrying; never blindly retry an email submission.
- Provider failures or missing credentials must fail closed. Keep transactional and prospect transports separate.
- If API access is too expensive, ship authenticated CSV export/import with suppression export and native provider scheduling first, clearly labeled as manual synchronization. Prevent spreadsheet formula injection. Do not claim this fallback has automatic two-way suppression sync.

## 5. Unsubscribe, replies, and measurement

Every message must identify the business and commercial nature honestly, include its valid postal address, and offer an easy opt-out. B2B email is not exempt from CAN-SPAM. FTC requires honoring opt-outs within ten business days; implement immediate suppression as the stricter operating rule. [FTC guide](https://www.ftc.gov/business-guidance/resources/can-spam-act-compliance-guide-business)

Preserve old Purebaric unsubscribe URLs indefinitely. A legacy opt-out must also remove/block the address in the new provider before any future delivery. New provider unsubscribes/complaints/hard bounces must suppress in both systems. Keep suppression separate from editable sales statuses so an import or status change cannot revive an opted-out contact. Block when synchronization is stale or failing. Verify webhook authenticity using the provider's supported mechanism, deduplicate events, and prevent older events from undoing a later opt-out.

Stop sequences on any reply; send replies to Matthew for personal follow-up. Do not auto-send AI responses or treat every reply as positive. Track sends, hard bounces, opt-outs, complaints where exposed, positive replies, reservations, confirmed rentals, and attributable revenue. Do not optimize on open rates. State explicitly if the provider cannot expose complaints.

Recommended pilot guardrails (our conservative choices, not universal industry rules): pause on any spam complaint or authentication failure; pause on the first hard bounce in the five/day pilot and review the remaining list. No daily cap increase until Matthew reviews the first week. Provider stricter limits always win. Include all live outcomes in a simple daily summary; internal summaries may use the transactional mailer, but must not contain prospect outreach content or act as a delivery fallback.

## 6. Launch gate and acceptance tests

Before activating, provide evidence that:

1. The old scheduled handler remains a no-op and neither manual nor automated cold outreach reaches Resend. Reservation/customer notifications still use their existing mailer.
2. A missing account, refused use case, invalid DNS, missing address, insufficient domain age, or provider failure leaves campaigns paused.
3. Requested preview tests use owned inboxes; no real prospect is contacted during development. Matthew can receive and answer replies.
4. Double-clicks, concurrent runs, retries, and an accepted-but-timed-out API call do not duplicate leads/messages.
5. Five/day is a total cap; timezone/DST and weekends behave correctly. Uploaded leads are not incorrectly counted as sent.
6. Old and new unsubscribe paths stop future delivery in both systems; repeat/out-of-order events and re-imports cannot revive suppression.
7. Reply, complaint, and hard-bounce events stop further outreach. Failures are visible, with no secrets exposed.
8. `npm test` passes; new transport/queue/suppression tests exist. Commit/push/deploy only scoped changes and verify production settings.

Deliver a short owner runbook with costs, account/domain/campaign identifiers (no secrets), actual caps and launch date, how to pause, how to answer replies, and evidence gaps. Show Matthew the final cohort and content, then obtain explicit approval to activate. If an external prerequisite is missing, report it precisely; do not mark the workflow live.
