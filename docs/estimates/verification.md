# Estimates: verification

| Design | Effort | Complete |
|---|---|---|
| feature-businesses | 3 days | 85% |
| handle-reports | 4 days | 80% |
| request-changes | 5 days | 80% |
| review-and-approve-listing | 4 days | 85% |
| work-verification-queue | 4 days | 90% |

handle-reports and feature-businesses (ADR 0033): the reports list (unresolved, open, in review, resolved; oldest first; overdue after 2 business days), one report that opens into review and shows a reported conversation (and records the access), the six actions with a required resolution note and the message dialogs, the audit log, the owner and reporter notifications, and the featured weeks page (live search, order, at most five, start date rules, Toronto day boundary) are done with tests (`ModerationTests`, `moderation.spec.ts`). Deferred: the verifier notification when a report arrives, the realtime `report.created` event, the report count in the top bar, and outbox and search-index handling of holds and removals. The second factor (L2-098 AC2) and granting and revoking the role with `jubilee staff` (L2-098 AC4) landed with the admin application; the audit record of a role change is left.
