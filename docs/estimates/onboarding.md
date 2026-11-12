# Estimates: onboarding

| Design | Effort | Complete |
|---|---|---|
| describe-listing | 3 days | 100% |
| describe-space | 5 days | 100% |
| save-draft | 5 days | 100% |
| submit-for-verification | 4 days | 100% |

Done in journey 10 (ADR 0018 and its amendment of 12 November 2026): drafts and their expiry, the form with its highlight and live preview, the full product and service editors on `/list` with "Members can", submission with a 10-second limit, the review screen's "No products or services yet" and the stages of the owner's other listings, "List another business" and the switcher (ADR 0052), and agreeing again to an updated statement of faith: the dialog once per opening of the app, "Read and agree" on My business, and the daily job that pauses the listings of an owner who has not agreed after 30 days. The draft expiry and the statement job run once a day across instances and record their last success (L2-182). Since ADR 0041 a submitted listing goes straight to "Ready to review".

Left for the owner, by hand: the visual parity of the new screen states against their mocks (`statement-agreement`, `my-business.statement-due`, `my-business.statement-lapsed`), which only the sweeps check (ADR 0010). Publishing a new statement of faith is a change to `StatementOfFaith.Version` and the page; tell owners by e-mail before it ships, because 30 days later their listings are paused.

describe-space (ADR 0042): List a space with its terms, fields, checks and live preview, its draft and submission, and the verification review of a space are done with tests. Excludes deferred work (see ADR 0042): hourly rent and the sign-up intents.
