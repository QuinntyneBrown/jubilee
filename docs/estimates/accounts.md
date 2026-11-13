# Estimates: accounts

| Design | Effort | Complete |
|---|---|---|
| change-credentials | 5 days | 100% |
| choose-notification-settings | 4 days | 100% |
| confirm-email | 5 days | 100% |
| continue-with-google | 3 days | 100% |
| delete-account | 4 days | 80% |
| download-data | 4 days | 85% |
| edit-profile | 3 days | 100% |
| join-with-email | 4 days | 95% |
| manage-session | 5 days | 100% |
| reset-password | 4 days | 100% |
| sign-in | 4 days | 100% |
| sign-in-as-staff | 5 days | 90% |

## Left in journey 4 (ADR 0049)

- Owner step, which keeps join-with-email at 95%: a Turnstile widget and its keys in Azure. The join form shows the bot challenge and sends its token once `BotChallenge__SiteKey` and `BotChallenge__SecretKey` are set on `jubilee-to-app` (`eng/azure/README.md`); until then L2-137 AC2 is proven by tests only (`BotChallengeTests`, `join.spec.ts`).
- Outside this journey (`docs/detailed-designs/security/`): a CSP on the SPA host and the TLS redirect.
- The states that need a press (`limit` of the waiting page and of the banner, the `unconfirmed*` states of the change e-mail dialog, and `invalid`, `submitting`, `success` and `error` of the join form) have no `routes.ts` entry; the behaviour spec covers them.

confirm-email (ADR 0049): the unconfirmed address is changed in `ChangeUnconfirmedEmailDialog` from the waiting page and the banner, with its invalid, sending, in-use and limit states (L2-004 AC5, AC8 to AC10); the resend limit is said in the banner, on the waiting page and on "Check your e-mail" (L2-005 AC5); `LoggedPath` keeps tokens out of the logs (L2-140 AC3). With tests: `join.spec.ts`, `TokenRedactionTests`. The return to the started action after joining (L2-012 AC2) and the `__Host-` cookie (L2-135 AC1) were built by journey 5 (ADR 0046).

reset-password (ADR 0026, ADR 0064): the forgot-password and reset-password pages, the request that counts the address’s requests and answers a fourth in an hour with 429 and `Retry-After` the same for any address (with the page’s warning and its `rate-limited` mock and route), hashed single-use 60-minute links, the reset that ends every other session, the security e-mail, the median-time test of 100 requests each, the proof that no reset token reaches the API’s or the worker’s log, and the alert to the on-call contact on more than 100 reset requests in 5 minutes are done with tests (`PasswordResetTests`, `PasswordResetAlertTests`, `TokenRedactionTests`, `PasswordResetJobTests`, `password-reset.spec.ts`). Nothing is left in the design. Owner step: set `Security__OnCallEmail` on `jubilee-to-app` (`eng/azure/README.md`); until then the alert goes to the Jubilee team’s address. Outside this journey: the alerts on failed sign-ins and role changes (L2-143 AC2). The session list (L2-143 AC3) was built by journey 20.

download-data and delete-account (ADR 0034): the "Your data" card with the export request (rate limit, same export while one waits), the worker that builds the JSON archive and mails the 7-day link, the sign-in-bound download page, the expiry job, the delete-account dialog with live counts and DELETE confirmation, the deletion (sessions ended, open requests cancelled and the businesses told, listings unpublished, audit record, confirmation e-mail) and the erasure job after 30 days (messages stay from "Former member") are done with tests (`AccountDataTests`, `account-data.spec.ts`). Deferred: object storage for archives, the backup rotation, the weekly retention schedule beyond account deletion, search-index removal through the outbox and the data-export e-mail unsubscribe wording.

sign-in and manage-session (ADR 0013, ADR 0046, journey 5): server-side sessions with idle and absolute expiry, the sign-in page with throttling and lockout, the session-expired page and interceptor, the sign-out dialog, ending other sessions on password change, reset and deletion, the return to the action a visitor started (message, book, quote, order request, save and stock alert), "Sign out of other devices" on the account page, drafts kept on the device at sign-out and at session expiry and restored to the same member (`jbDraft`, `DraftRegistry`, `DraftStore`), and the session cookie issued as `__Host-jubilee.session` outside Development with no other origin approved are done with tests (`SignInTests`, `SessionCookieTests`, `sign-in.spec.ts`, `return-to-origin.spec.ts`, `sign-out-others.spec.ts`, `drafts.spec.ts`, `drafts-forms.spec.ts`). Nothing is left in these two designs; the list of sessions (L2-143 AC3) is built in change-credentials by journey 20.

continue-with-google (ADR 0037): the OAuth client exists and its two settings are set on `jubilee-to-app`; the session reports whether Google sign-in is available and the pages hide the button when it is not; a cancellation, a refusal and a failure return to the page the visitor started on, with tests (`AccountTests.JoinCompletion`, `join.spec.ts`, `sign-in.spec.ts`). The owner signed in with Google against the live app on 11 November 2026. The diagrams show the cancelled, refused and failed paths (`sequence-google-sign-in-not-completed`). Nothing is left.

edit-profile and change-credentials (ADR 0028, ADR 0041, ADR 0065, journey 20): the profile with its rules, the leave guard, the home church and its address, the e-mail change by link and the password change are done with tests (`AccountSettingsTests`, `account.spec.ts`). Journey 20 added "Where you're signed in" (each device with its network and when it was last active, this device first, any other signed out on its own, another member's session not found and the attempt logged; `AccountSessionsTests`, `account-sessions.spec.ts`), the security log of each password and e-mail change with its address and outcome, a refused one included (`AccountSettingsTests.Credentials`), pronouns shown to the Jubilee team in the Owner panel and to no other reader, and the proof that no other reader is given the home church or its address (`MemberPrivacyTests`, `keep-listings-honest.spec.ts`). Nothing is left in these two designs. The location is the network with its last part hidden; naming a city would need a geolocation service (ADR 0065).

choose-notification-settings (ADR 0028, ADR 0053): the five switches and "How often" save one at a time with their saving, saved and failed states, and "One daily summary" now holds the e-mail of "New messages" and "Request updates" for one e-mail at 7:00 a.m. in Toronto, with tests (`AccountSettingsTests.Preferences`, `EmailNotificationTests.DailySummary`, `account.spec.ts`). Nothing is left.

ADR 0057 is done in sign-in-as-staff: the staff role is `moderator` ("Moderator") on the wire, in the admin bar and in `jubilee staff grant --role moderator|admin`, and the stored flag keeps the value of the former `verifier` role. Left, as before ADR 0057: the owner's Entra ID registration and Conditional Access (`eng/azure/README.md`).
