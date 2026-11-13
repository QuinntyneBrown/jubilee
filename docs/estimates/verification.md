# Estimates: verification

Jubilee ships without verification (ADR 0057). The designs of this subsystem are in
`detailed-designs/moderation/`: browse-listings and take-down-listing replaced the verification
designs (work-verification-queue, review-and-approve-listing, request-changes), and the Jubilee team
looks through published listings and takes down any that misrepresent a business. This file keeps
its name so that the journey prompts that link it still resolve.

| Design | Effort | Complete |
|---|---|---|
| browse-listings | 4 days | 100% |
| feature-businesses | 3 days | 100% |
| handle-reports | 4 days | 100% |
| take-down-listing | 4 days | 100% |

browse-listings and take-down-listing (ADR 0057) are done with tests (`AdminListingsTests`,
`StaffAccessTests`, `StaffCommandTests`, `keep-listings-honest.spec.ts`): `GET /api/admin/listings?q=` with the summary
counts, newest first, status and "Flagged"; `GET /api/admin/listings/{id}` with the Owner card,
flags, preview and a space's details; `POST /api/admin/listings/{id}/take-down` with its dialog, the
required reason (422 `REQUIRED` or `TOO_LONG`), 403 `OWN_LISTING`, 409 `ALREADY_TAKEN_DOWN`, the
owner's notice and e-mail, the `listing.taken-down` audit record and the result state; the screens
`/listings` and `/listings/:id` under the `moderator` role; and the `ShipWithoutVerification`
migration, which drops the queue, checklist and decision data. A role change made with
`jubilee staff grant|revoke` is audited with the operator and the roles before and after (L2-098
AC4), and each opening of a listing records `owner.viewed` with the listing as the reason (L2-150
AC1, ADR 0058). The Owner card names the owner's other listings and drafts with their stages (L2-079
AC3, `AdminOtherListing`). Nothing is left in either design.

handle-reports and feature-businesses (ADR 0033, ADR 0058) are complete: the reports list, one report and its six actions, the audit log, the owner and reporter notifications, the team's e-mail of a report of a listing or a conversation (`ReportNoticeTests`, `ConversationReportNoticeTests`), the count of unresolved reports in the admin bar (`moderation.spec.ts`, `ModerationTests`), holds, removals and featured weeks on every public page on the next request (`ModerationBoundTests`), and the featured weeks page. The notices and e-mails speak for "the Jubilee team" and the role is `moderator` (ADR 0057).
