# Estimates: system-pages

| Design | Effort | Complete |
|---|---|---|
| handle-session-expiry | 3 days | 100% |
| run-maintenance-mode | 3 days | 100% |
| show-error-pages | 4 days | 100% |

show-error-pages and run-maintenance-mode (ADR 0031, ADR 0056): the server error page with its `JB-500-` reference, the maintenance page with the back-by time, the interceptor that opens them for a failed read, ask for access on the forbidden page with its e-mail to the verification team (`AccessRequestNoticeTests`), the maintenance switch with its middleware (503 and `Retry-After`) and the window record that extends e-mailed links, a listing's slug that follows its name with the old one answered 301 (`KeptSlugTests`), the statuses of page loads from the app's host (`DocumentStatusTests`, `eng/azure/server.test.js`) and the static server error and maintenance pages (`static-pages.spec.ts`) are done with tests. Nothing is left; distributed tracing and metrics alerting (L2-175 AC4, L2-176) belong to the operations designs.

handle-session-expiry (ADR 0013, ADR 0046): the idle and absolute session lifetimes, the interceptor that keeps the drafts of the page, closes its dialogs and opens the session-expired page once however many calls are refused, the return to the page after signing in and the draft restored there with "We kept what you typed" are done with tests (`SignInTests`, `sign-in.spec.ts`, `drafts.spec.ts`, `drafts-forms.spec.ts`). Nothing is left.
