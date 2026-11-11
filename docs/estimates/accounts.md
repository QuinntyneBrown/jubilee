# Estimates: accounts

| Design | Effort | Complete |
|---|---|---|
| change-credentials | 5 days | 90% |
| choose-notification-settings | 4 days | 70% |
| confirm-email | 5 days | 80% |
| continue-with-google | 3 days | 95% |
| delete-account | 4 days | 80% |
| download-data | 4 days | 85% |
| edit-profile | 3 days | 90% |
| join-with-email | 4 days | 90% |
| manage-session | 5 days | 65% |
| reset-password | 4 days | 90% |
| sign-in | 4 days | 90% |

## Not yet built (journey 4)

- A Turnstile widget and its keys in Azure: the join form shows the bot challenge and sends its token once `BotChallenge__SiteKey` and `BotChallenge__SecretKey` are set (`jb-bot-challenge`, `join.spec.ts`).
- `/account` (where "Change e-mail" leads) and the unsubscribe and preferences links of e-mails (journey 24).
- Reference e-mails (L2-080). The e-mail provider is in place (ADR 0038, `docs/estimates/operations.md`).
- Session lifetime and `/session-expired` (L2-010), the `__Host-` cookie prefix, a CSP on the SPA host and the TLS redirect.
- Return-to-action after joining: after confirming, the member is offered the page they were going to (L2-012 AC5); the action itself (the message dialog) is not reopened.
- Visual states of the join form that need interaction (`invalid`, `submitting`, `success`, `error`) have no `routes.ts` entry; the behaviour spec covers them.

reset-password (ADR 0026): the forgot-password and reset-password pages, the queued request with the 3-an-hour limit, hashed single-use 60-minute links, the reset that ends earlier sessions, the security e-mail and the smallest password sign-in are done with tests. Deferred: a 429 for reset requests, the on-call alert and the session list (journey 20).

download-data and delete-account (ADR 0034): the "Your data" card with the export request (rate limit, same export while one waits), the worker that builds the JSON archive and mails the 7-day link, the sign-in-bound download page, the expiry job, the delete-account dialog with live counts and DELETE confirmation, the deletion (sessions ended, open requests cancelled and the businesses told, listings unpublished, audit record, confirmation e-mail) and the erasure job after 30 days (messages stay from "Former member") are done with tests (`AccountDataTests`, `account-data.spec.ts`). Deferred: object storage for archives, the backup rotation, the weekly retention schedule beyond account deletion, search-index removal through the outbox and the data-export e-mail unsubscribe wording.

sign-in and manage-session (ADR 0013, journey 5): server-side sessions with idle and absolute expiry, the sign-in page with throttling and lockout, the session-expired page and interceptor, the sign-out dialog from the account menu, and ending other sessions on password change, reset and deletion are done with tests (`SignInTests`, `sign-in.spec.ts`). Deferred: draft saving, the account-page "Sign out of other devices" section, save-after-sign-in beyond the stock alert, the `__Host-` cookie prefix and approximate session location.

continue-with-google (ADR 0037): the OAuth client exists and its two settings are set on `jubilee-to-app`; the session reports whether Google sign-in is available and the pages hide the button when it is not; a cancellation, a refusal and a failure return to the page the visitor started on, with tests (`AccountTests.JoinCompletion`, `join.spec.ts`, `sign-in.spec.ts`). The owner signed in with Google against the live app on 11 November 2026. Left: the PlantUML diagrams of the design, which do not show the new paths yet.
