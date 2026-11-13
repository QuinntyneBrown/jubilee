# Estimates: onboarding

| Design | Effort | Complete |
|---|---|---|
| describe-listing | 3 days | 100% |
| describe-space | 5 days | 100% |
| save-draft | 5 days | 100% |
| publish-listing | 4 days | 100% |

Done in journey 10 (ADR 0018 and its amendment of 12 November 2026): drafts and their expiry, the form with its highlight and live preview, the full product and service editors on `/list` with "Members can", publishing with a 10-second limit after which a publish that has not answered gives the form back (L2-127), the stages of the owner's other listings on the Jubilee team's listing page (L2-079 AC3), "List another business" and the switcher (ADR 0052), and agreeing again to an updated statement of faith: the dialog once per opening of the app, "Read and agree" on My business, and the daily job that pauses the listings of an owner who has not agreed after 30 days. The draft expiry and the statement job run once a day across instances and record their last success (L2-182).

publish-listing replaces submit-for-verification (ADR 0057) and is done with tests (`ListingOnboardingTests`, `SpaceOnboardingTests`, `list-business.spec.ts`, `list-a-space.spec.ts`): `POST /api/listing-drafts/{id}/publish` makes a valid listing live at once (`Listing.Publish` sets `PublishedAt`), a repeated idempotency key publishes once, the flags of L2-072 are raised, the stages are Draft and Live, the "{Business} is live" page offers its three actions, the copy of `/list`, the agreement error and "Not published yet" on the preview are in place, and the `ShipWithoutVerification` migration renames `ApprovedAt` to `PublishedAt`, makes the waiting listings live and closes the declined ones. Nothing is left.

Left for the owner, by hand: the visual parity of the new screen states against their mocks (`statement-agreement`, `my-business.statement-due`, `my-business.statement-lapsed`), which only the sweeps check (ADR 0010). Publishing a new statement of faith is a change to `StatementOfFaith.Version` and the page; tell owners by e-mail before it ships, because 30 days later their listings are paused.

describe-space (ADR 0042): List a space with its terms, fields, checks and live preview, its draft and publishing it straight away are done with tests. Excludes deferred work (see ADR 0042): hourly rent and the sign-up intents.
