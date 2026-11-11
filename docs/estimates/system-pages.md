# Estimates: system-pages

| Design | Effort | Complete |
|---|---|---|
| handle-session-expiry | 3 days | 0% |
| run-maintenance-mode | 3 days | 85% |
| show-error-pages | 4 days | 75% |

show-error-pages and run-maintenance-mode (ADR 0031): the server error page with its `JB-500-` reference, the maintenance page with the back-by time, the interceptor that opens them for a failed read, ask for access on the forbidden page, the maintenance switch with its middleware (503 and `Retry-After`) and the window record that extends e-mailed and reference links are done with tests. Deferred: the static copies of the pages for a failure of the page load itself, the 301 for a renamed listing slug (nothing renames one yet), document-request statuses (the host serves the app shell), the e-mail to the team for an access request.
