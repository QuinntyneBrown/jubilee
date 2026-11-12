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
| join-with-email | 4 days | 95% |
| manage-session | 5 days | 100% |
| reset-password | 4 days | 90% |
| sign-in | 4 days | 100% |
| sign-in-as-staff | 5 days | 90% |

## Not yet built (journey 4)

- A Turnstile widget and its keys in Azure: the join form shows the bot challenge and sends its token once `BotChallenge__SiteKey` and `BotChallenge__SecretKey` are set (`jb-bot-challenge`, `join.spec.ts`).
- "Use another e-mail" and the banner's "Change e-mail" lead to `/account`; no screen calls the change of an unconfirmed address yet (L2-004 AC5).
- A CSP on the SPA host, the TLS redirect and the redaction of tokens in logs (L2-140 AC3).
- Return-to-action after joining: after confirming, the member is offered the page they were going to (L2-012 AC5); the action itself (the message dialog) is not reopened.
- Visual states of the join form that need interaction (`invalid`, `submitting`, `success`, `error`) have no `routes.ts` entry; the behaviour spec covers them.

reset-password (ADR 0026): the forgot-password and reset-password pages, the queued request with the 3-an-hour limit, hashed single-use 60-minute links, the reset that ends earlier sessions, the security e-mail and the smallest password sign-in are done with tests. Deferred: a 429 for reset requests, the on-call alert and the session list (journey 20).

download-data and delete-account (ADR 0034): the "Your data" card with the export request (rate limit, same export while one waits), the worker that builds the JSON archive and mails the 7-day link, the sign-in-bound download page, the expiry job, the delete-account dialog with live counts and DELETE confirmation, the deletion (sessions ended, open requests cancelled and the businesses told, listings unpublished, audit record, confirmation e-mail) and the erasure job after 30 days (messages stay from "Former member") are done with tests (`AccountDataTests`, `account-data.spec.ts`). Deferred: object storage for archives, the backup rotation, the weekly retention schedule beyond account deletion, search-index removal through the outbox and the data-export e-mail unsubscribe wording.

sign-in and manage-session (ADR 0013, ADR 0045, journey 5): server-side sessions with idle and absolute expiry, the sign-in page with throttling and lockout, the session-expired page and interceptor, the sign-out dialog, ending other sessions on password change, reset and deletion, the return to the action a visitor started (message, book, quote, order request, save and stock alert), "Sign out of other devices" on the account page, drafts kept on the device at sign-out and at session expiry and restored to the same member (`jbDraft`, `DraftRegistry`, `DraftStore`), and the session cookie issued as `__Host-jubilee.session` outside Development with no other origin approved are done with tests (`SignInTests`, `SessionCookieTests`, `sign-in.spec.ts`, `return-to-origin.spec.ts`, `sign-out-others.spec.ts`, `drafts.spec.ts`, `drafts-forms.spec.ts`). Nothing is left in these two designs; the list of sessions with approximate location (L2-143 AC3) belongs to journey 20.

continue-with-google (ADR 0037): the OAuth client exists and its two settings are set on `jubilee-to-app`; the session reports whether Google sign-in is available and the pages hide the button when it is not; a cancellation, a refusal and a failure return to the page the visitor started on, with tests (`AccountTests.JoinCompletion`, `join.spec.ts`, `sign-in.spec.ts`). The owner signed in with Google against the live app on 11 November 2026. Left: the PlantUML diagrams of the design, which do not show the new paths yet.
