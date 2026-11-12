# Estimates: operations

| Design | Effort | Complete |
|---|---|---|
| back-up-and-recover | 5 days | 0% |
| deliver-email | 4 days | 85% |
| deploy-safely | 4 days | 20% |
| observe-the-system | 5 days | 30% |
| record-audit-log | 3 days | 60% |
| run-background-jobs | 4 days | 45% |
| stay-available | 5 days | 0% |

deliver-email (ADR 0038): the outbox with retry for 24 hours, the HTML layout rendered from each e-mail's text, the Azure Communication Services Email sender, the logging sender with its preview folder, the bounce webhook over Event Grid and the bounced-address banner are done with tests (`EmailLayoutTests`, `EmailSenderTests`, `AccountTests.JoinCompletion`, `EmailNotificationTests`). Not built: a per-e-mail delivery record, a suppression list for addresses without an account, delivery metrics and the DNS pipeline check. The diagrams of the design are not redrawn.

run-background-jobs (ADR 0050): the jobs run as hosted services of the worker, each idempotent per row. The once-per-occurrence guard and the last-success record of `L2-182` AC1 are built as `JobRun` and `ScheduledJobs.RunOnceAsync` and used by the response-time job (`ResponseTimeJobTests`). Not built: the other jobs on `ScheduledJobs`, the retries with back-off and the dead-letter queue of AC2, and the job metrics. The diagrams of the design are not redrawn.
