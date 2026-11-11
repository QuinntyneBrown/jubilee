# ADR 0029: Share or report a listing

Status: accepted

## Context

Journey 21 (L2-038 share, L2-039 report) lets anyone share a listing's link and lets a member privately report a listing to the verification team.

## Decisions

- **A report is private and idempotent.** `POST /api/listings/{slug}/reports` takes the `Idempotency-Key` header; the key is stored with the reporter, and a unique index on reporter and key returns the first answer for a repeat. The reporter is never exposed to the business or in any listing response.
- **Reasons are kebab strings** (`not-real`, `misleading`, `bad-experience`, `other`); the description is required and at most 2,000 characters. Failures are 422 with `REASON_REQUIRED`, `DESCRIPTION_REQUIRED` and `DESCRIPTION_TOO_LONG`.
- **A reporter may add to a report for 24 hours.** A second report of the same listing inside that window is appended as an entry to the first; after it, a new report starts.
- **At most 10 reports an hour per member**; the eleventh answers 429. The dialog keeps what was typed and says to wait.
- **Reporting needs an account.** A visitor sees the sign-in prompt and returns to `/b/{slug}/report`. Sharing needs none.
- **The dialogs are routes of the business page.** `/b/:slug/share` and `/b/:slug/report` open the dialogs over the listing, as message, book and quote do; closing returns to `/b/:slug`.
- **The share link is the canonical `/b/{slug}` of the current origin.** The social preview is served at `/api/listings/{slug}/social-preview` for non-public listings it answers 404.

## Deferred

- The `og-image.png` asset and hosting that routes link-preview crawlers of `/b/{slug}` to the preview endpoint.
- The `ReportSubmitted` notification to the verification team: no team address is configured.
- The moderation queue that reads these reports (journey 25).
