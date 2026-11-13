# Estimates: verification

Jubilee ships without verification (ADR 0057). The designs of this subsystem are in
`detailed-designs/moderation/`: browse-listings and take-down-listing replaced the verification
designs (work-verification-queue, review-and-approve-listing, request-changes), and the Jubilee team
looks through published listings and takes down any that misrepresent a business. This file keeps
its name so that the journey prompts that link it still resolve.

| Design | Effort | Complete |
|---|---|---|
| browse-listings | 4 days | 95% |
| feature-businesses | 3 days | 85% |
| handle-reports | 4 days | 80% |
| take-down-listing | 4 days | 95% |

browse-listings and take-down-listing (ADR 0057) are done with tests (`AdminListingsTests`,
`StaffAccessTests`, `keep-listings-honest.spec.ts`): `GET /api/admin/listings?q=` with the summary
counts, newest first, status and "Flagged"; `GET /api/admin/listings/{id}` with the Owner card,
flags, preview and a space's details; `POST /api/admin/listings/{id}/take-down` with its dialog, the
required reason (422 `REQUIRED` or `TOO_LONG`), 403 `OWN_LISTING`, 409 `ALREADY_TAKEN_DOWN`, the
owner's notice and e-mail, the `listing.taken-down` audit record and the result state; the screens
`/listings` and `/listings/:id` under the `moderator` role; and the `ShipWithoutVerification`
migration, which drops the queue, checklist and decision data. Left in browse-listings: the audit
record of a role change made with `jubilee staff grant|revoke` (L2-098 AC4). The Owner card names
the owner's other listings and drafts with their stages (L2-079 AC3, `AdminOtherListing`). Left in
take-down-listing: opening a listing writes no audit record of the access (L2-150 AC1).

handle-reports and feature-businesses (ADR 0033): the reports list (unresolved, open, in review, resolved; oldest first; overdue after 2 business days), one report that opens into review and shows a reported conversation (and records the access), the six actions with a required resolution note and the message dialogs, the audit log, the owner and reporter notifications, and the featured weeks page (live search, order, at most five, start date rules, Toronto day boundary) are done with tests (`ModerationTests`, `moderation.spec.ts`). The notices and e-mails speak for "the Jubilee team" and the role is `moderator` (ADR 0057). The team is e-mailed when a report of a listing arrives (`JubileeTeam.Tell`, report-listing, ADR 0055). Deferred: the realtime `report.created` event, the report count in the top bar, and the outbox handling of holds and removals the design describes (today the handler tells the owner directly and the directory cache is dropped on save). The second factor (L2-098 AC2) and granting and revoking the role with `jubilee staff` (L2-098 AC4) landed with the admin application.
