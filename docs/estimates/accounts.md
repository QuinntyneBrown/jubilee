# Estimates: accounts

| Design | Effort | Complete |
|---|---|---|
| change-credentials | 5 days | 0% |
| choose-notification-settings | 4 days | 0% |
| confirm-email | 5 days | 80% |
| continue-with-google | 3 days | 75% |
| delete-account | 4 days | 0% |
| download-data | 4 days | 0% |
| edit-profile | 3 days | 0% |
| join-with-email | 4 days | 90% |
| manage-session | 5 days | 65% |
| reset-password | 4 days | 0% |
| sign-in | 4 days | 90% |

## Not yet built (journey 4)

- Turnstile widget on the join form (the API verifies a token when one is configured; the form sends none).
- `/account` (where "Change e-mail" leads) and the unsubscribe and preferences links of e-mails (journey 24).
- A real e-mail provider (`IEmailSender` logs for now) and reference e-mails (L2-080).
- Session lifetime and `/session-expired` (L2-010), the `__Host-` cookie prefix, a CSP on the SPA host and the TLS redirect.
- Return-to-action after joining beyond the return URL (L2-012).
- Visual states of the join form that need interaction (`invalid`, `submitting`, `success`, `error`) have no `routes.ts` entry; the behaviour spec covers them.

## Not yet built (journey 5)

- Draft saving and restoring (`DraftStore`): L2-010 AC4, L2-011 AC3 and the draft half of L2-116 wait for the first form that holds a draft (messaging).
- The account page section "Sign out" with the count of other devices and the button that calls `DELETE /api/session/others` (the endpoint exists).
- Save-after-sign-in (L2-012 AC4) for "Save"; the one action built is the stock alert.
- The `__Host-` cookie prefix, CORS allowlist, approximate location of sessions (L2-143 AC3), security alert on mass failures (L2-143 AC2), a clean-up job for old sessions.
- Forgot and reset password (journey 6).
