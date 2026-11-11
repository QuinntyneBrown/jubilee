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
| manage-session | 5 days | 0% |
| reset-password | 4 days | 0% |
| sign-in | 4 days | 0% |

## Not yet built (journey 4)

- Turnstile widget on the join form (the API verifies a token when one is configured; the form sends none).
- `/account` (where "Change e-mail" leads) and the unsubscribe and preferences links of e-mails (journey 24).
- A real e-mail provider (`IEmailSender` logs for now) and reference e-mails (L2-080).
- Session lifetime and `/session-expired` (L2-010), the `__Host-` cookie prefix, a CSP on the SPA host and the TLS redirect.
- Return-to-action after joining beyond the return URL (L2-012).
- Visual states of the join form that need interaction (`invalid`, `submitting`, `success`, `error`) have no `routes.ts` entry; the behaviour spec covers them.
