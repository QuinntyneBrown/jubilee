# Estimates: privacy

| Design | Effort | Complete |
|---|---|---|
| enforce-data-visibility | 3 days | 0% |
| manage-email-consent | 5 days | 90% |
| retain-and-protect-data | 4 days | 15% |

manage-email-consent (ADR 0028, ADR 0053): consent to the two promotional categories is recorded with its time and method, both are off by default, the weekly note of new businesses and the tips for owners go only to members who opted in, name Jubilee's mailing address and carry an unsubscribe, and the unsubscribe page confirms a withdrawal, with tests (`AccountSettingsTests.Preferences`, `NewBusinessTests`, `OwnerTipTests`, `unsubscribe.spec.ts`). Left: how long a consent record is kept, and the owner step of setting `Email__MailingAddress` in Azure, without which no promotional e-mail is sent.

retain-and-protect-data (ADR 0069): a deleted account stays deleted after a database restore, because every deletion is written to the deletion ledger outside the database and the worker re-applies it with its original time; data archives live outside the database and leave with their link, with tests (`AccountDataTests.Restore`, `AccountDataTests.ExportStore`). Left: the weekly retention schedule for everything else, encryption at rest and the owner step of keeping database backups 35 days or less (`eng/azure/README.md`).
