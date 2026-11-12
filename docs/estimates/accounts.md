# Estimates: accounts

| Design | Effort | Complete |
|---|---|---|
| change-credentials | 5 days | 90% |
| choose-notification-settings | 4 days | 100% |
| confirm-email | 5 days | 100% |
| continue-with-google | 3 days | 100% |
| delete-account | 4 days | 80% |
| download-data | 4 days | 85% |
| edit-profile | 3 days | 90% |
| join-with-email | 4 days | 95% |
| manage-session | 5 days | 100% |
| reset-password | 4 days | 90% |
| sign-in | 4 days | 100% |
| sign-in-as-staff | 5 days | 90% |

## Left in journey 4 (ADR 0049)

- Owner step, which keeps join-with-email at 95%: a Turnstile widget and its keys in Azure. The join form shows the bot challenge and sends its token once `BotChallenge__SiteKey` and `BotChallenge__SecretKey` are set on `jubilee-to-app` (`eng/azure/README.md`); until then L2-137 AC2 is proven by tests only (`BotChallengeTests`, `join.spec.ts`).
- Outside this journey (`docs/detailed-designs/security/`): a CSP on the SPA host and the TLS redirect.
- The states that need a press (`limit` of the waiting page and of the banner, the `unconfirmed*` states of the change e-mail dialog, and `invalid`, `submitting`, `success` and `error` of the join form) have no `routes.ts` entry; the behaviour spec covers them.

confirm-email (ADR 0049): the unconfirmed address is changed in `ChangeUnconfirmedEmailDialog` from the waiting page and the banner, with its invalid, sending, in-use and limit states (L2-004 AC5, AC8 to AC10); the resend limit is said in the banner, on the waiting page and on "Check your e-mail" (L2-005 AC5); `LoggedPath` keeps tokens out of the logs (L2-140 AC3). With tests: `join.spec.ts`, `TokenRedactionTests`. The return to the started action after joining (L2-012 AC2) and the `__Host-` cookie (L2-135 AC1) were built by journey 5 (ADR 0046).

reset-password (ADR 0026): the forgot-password and reset-password pages, the queued request with the 3-an-hour limit, hashed single-use 60-minute links, the reset that ends earlier sessions, the security e-mail and the smallest password sign-in are done with tests. Deferred: a 429 for reset requests, the on-call alert and the session list (journey 20).

download-data and delete-account (ADR 0034): the "Your data" card with the export request (rate limit, same export while one waits), the worker that builds the JSON archive and mails the 7-day link, the sign-in-bound download page, the expiry job, the delete-account dialog with live counts and DELETE confirmation, the deletion (sessions ended, open requests cancelled and the businesses told, listings unpublished, audit record, confirmation e-mail) and the erasure job after 30 days (messages stay from "Former member") are done with tests (`AccountDataTests`, `account-data.spec.ts`). Deferred: object storage for archives, the backup rotation, the weekly retention schedule beyond account deletion, search-index removal through the outbox and the data-export e-mail unsubscribe wording.

sign-in and manage-session (ADR 0013, ADR 0046, journey 5): server-side sessions with idle and absolute expiry, the sign-in page with throttling and lockout, the session-expired page and interceptor, the sign-out dialog, ending other sessions on password change, reset and deletion, the return to the action a visitor started (message, book, quote, order request, save and stock alert), "Sign out of other devices" on the account page, drafts kept on the device at sign-out and at session expiry and restored to the same member (`jbDraft`, `DraftRegistry`, `DraftStore`), and the session cookie issued as `__Host-jubilee.session` outside Development with no other origin approved are done with tests (`SignInTests`, `SessionCookieTests`, `sign-in.spec.ts`, `return-to-origin.spec.ts`, `sign-out-others.spec.ts`, `drafts.spec.ts`, `drafts-forms.spec.ts`). Nothing is left in these two designs; the list of sessions with approximate location (L2-143 AC3) belongs to journey 20.

continue-with-google (ADR 0037): the OAuth client exists and its two settings are set on `jubilee-to-app`; the session reports whether Google sign-in is available and the pages hide the button when it is not; a cancellation, a refusal and a failure return to the page the visitor started on, with tests (`AccountTests.JoinCompletion`, `join.spec.ts`, `sign-in.spec.ts`). The owner signed in with Google against the live app on 11 November 2026. The diagrams show the cancelled, refused and failed paths (`sequence-google-sign-in-not-completed`). Nothing is left.

choose-notification-settings (ADR 0028, ADR 0053): the five switches and "How often" save one at a time with their saving, saved and failed states, and "One daily summary" now holds the e-mail of "New messages" and "Request updates" for one e-mail at 7:00 a.m. in Toronto, with tests (`AccountSettingsTests.Preferences`, `EmailNotificationTests.DailySummary`, `account.spec.ts`). Nothing is left.
