# Estimates: privacy

| Design | Effort | Complete |
|---|---|---|
| enforce-data-visibility | 3 days | 0% |
| manage-email-consent | 5 days | 90% |
| retain-and-protect-data | 4 days | 0% |

manage-email-consent (ADR 0028, ADR 0053): consent to the two promotional categories is recorded with its time and method, both are off by default, the weekly note of new businesses and the tips for owners go only to members who opted in, name Jubilee's mailing address and carry an unsubscribe, and the unsubscribe page confirms a withdrawal, with tests (`AccountSettingsTests.Preferences`, `NewBusinessTests`, `OwnerTipTests`, `unsubscribe.spec.ts`). Left: how long a consent record is kept, and the owner step of setting `Email__MailingAddress` in Azure, without which no promotional e-mail is sent.
