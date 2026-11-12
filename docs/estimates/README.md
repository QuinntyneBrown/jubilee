# Estimates

- Overall effort: 407 days
- Complete: 73%

| Subsystem | Effort | Complete |
|---|---|---|
| [directory](directory.md) | 22 days | 100% |
| [trust-content](trust-content.md) | 11 days | 74% |
| [responsive-design](responsive-design.md) | 6 days | 40% |
| [design-system](design-system.md) | 6 days | 30% |
| [interaction-states](interaction-states.md) | 17 days | 5% |
| [system-pages](system-pages.md) | 10 days | 86% |
| [listings](listings.md) | 20 days | 100% |
| [accounts](accounts.md) | 50 days | 93% |
| [security](security.md) | 34 days | 32% |
| [messaging](messaging.md) | 17 days | 98% |
| [requests](requests.md) | 39 days | 98% |
| [notifications](notifications.md) | 16 days | 100% |
| [onboarding](onboarding.md) | 17 days | 100% |
| [admin](admin.md) | 7 days | 90% |
| [verification](verification.md) | 20 days | 84% |
| [owner-workspace](owner-workspace.md) | 20 days | 96% |
| [privacy](privacy.md) | 12 days | 38% |
| [accessibility](accessibility.md) | 10 days | 0% |
| [performance](performance.md) | 9 days | 6% |
| [operations](operations.md) | 30 days | 31% |
| [offline](offline.md) | 12 days | 83% |
| [marketing](marketing.md) | 13 days | 98% |
| [feedback](feedback.md) | 9 days | 97% |

## Roadmap

1. design-system, interaction-states: move the remaining presentation into the components library with a parity spec each (ADR 0035, 0036), then validation, dialog confirmation and date and money formats
2. security, privacy, accessibility: authorization and rate limits, data visibility and retention, screen-reader and keyboard coverage
3. operations, performance, admin, marketing: backups, availability, latency and page budgets; set up the admin application in production (`eng/azure/README.md`)
4. Polish the remaining 60–90% designs: offline details, and set `Email__MailingAddress` so that promotional e-mail can go out (ADR 0053)
5. Deferred: the launch-day e-mail, pre-registrations as listing drafts and a staff screen for them (ADR 0044); hourly rent, the sign-up intents, and payment, leases, calendars and double booking for spaces (ADR 0042)
