# Estimates: accounts

| Design | Effort | Complete |
|---|---|---|
| change-credentials | 5 days | 90% |
| choose-notification-settings | 4 days | 70% |
| confirm-email | 5 days | 80% |
| continue-with-google | 3 days | 75% |
| delete-account | 4 days | 80% |
| download-data | 4 days | 85% |
| edit-profile | 3 days | 90% |
| join-with-email | 4 days | 90% |
| manage-session | 5 days | 0% |
| reset-password | 4 days | 90% |
| sign-in | 4 days | 0% |

## Not yet built (journey 4)

- Turnstile widget on the join form (the API verifies a token when one is configured; the form sends none).
- `/account` (where "Change e-mail" leads) and the unsubscribe and preferences links of e-mails (journey 24).
- A real e-mail provider (`IEmailSender` logs for now) and reference e-mails (L2-080).
- Session lifetime and `/session-expired` (L2-010), the `__Host-` cookie prefix, a CSP on the SPA host and the TLS redirect.
- Return-to-action after joining beyond the return URL (L2-012).
- Visual states of the join form that need interaction (`invalid`, `submitting`, `success`, `error`) have no `routes.ts` entry; the behaviour spec covers them.

reset-password (ADR 0026): the forgot-password and reset-password pages, the queued request with the 3-an-hour limit, hashed single-use 60-minute links, the reset that ends earlier sessions, the security e-mail and the smallest password sign-in are done with tests. Deferred: the sign-in page and lockout (journey 5), a 429 for reset requests, the on-call alert and the session list (journey 20).

download-data and delete-account (ADR 0034): the "Your data" card with the export request (rate limit, same export while one waits), the worker that builds the JSON archive and mails the 7-day link, the sign-in-bound download page, the expiry job, the delete-account dialog with live counts and DELETE confirmation, the deletion (sessions ended, open requests cancelled and the businesses told, listings unpublished, audit record, confirmation e-mail) and the erasure job after 30 days (messages stay from "Former member") are done with tests (`AccountDataTests`, `account-data.spec.ts`). Deferred: object storage for archives, the backup rotation, the weekly retention schedule beyond account deletion, search-index removal through the outbox, a sign-out control (journey 5) and the data-export e-mail unsubscribe wording.
