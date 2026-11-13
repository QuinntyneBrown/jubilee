# Estimates

- Overall effort: 399 days
- Complete: 74%

| Subsystem | Effort | Complete |
|---|---|---|
| [directory](directory.md) | 22 days | 100% |
| [trust-content](trust-content.md) | 8 days | 83% |
| [responsive-design](responsive-design.md) | 6 days | 40% |
| [design-system](design-system.md) | 6 days | 30% |
| [interaction-states](interaction-states.md) | 17 days | 5% |
| [system-pages](system-pages.md) | 10 days | 100% |
| [listings](listings.md) | 20 days | 100% |
| [accounts](accounts.md) | 50 days | 93% |
| [security](security.md) | 34 days | 32% |
| [messaging](messaging.md) | 17 days | 98% |
| [requests](requests.md) | 39 days | 100% |
| [notifications](notifications.md) | 16 days | 100% |
| [onboarding](onboarding.md) | 17 days | 100% |
| [admin](admin.md) | 7 days | 90% |
| [verification](verification.md) | 15 days | 100% |
| [owner-workspace](owner-workspace.md) | 20 days | 100% |
| [privacy](privacy.md) | 12 days | 38% |
| [accessibility](accessibility.md) | 10 days | 0% |
| [performance](performance.md) | 9 days | 6% |
| [operations](operations.md) | 30 days | 31% |
| [offline](offline.md) | 12 days | 83% |
| [marketing](marketing.md) | 13 days | 98% |
| [feedback](feedback.md) | 9 days | 99% |

Jubilee ships without verification (ADR 0057), and that work is done: owners publish and are live
at once (publish-listing), the Jubilee team browses published listings and takes one down
(browse-listings, take-down-listing), the `moderator` role replaces `verifier`, and the "Verified"
mark and the verification copy are gone from every screen, e-mail and the marketing site. The
verification subsystem's designs live in `detailed-designs/moderation/`. The access audit on the team's
listing page (L2-150 AC1) and the audit record of a role change (L2-098 AC4) are done too
(ADR 0059), so browse-listings and take-down-listing are at 100%.

## Roadmap

1. Done: ship without verification (ADR 0057): publish-listing, browse-listings and take-down-listing, the `ShipWithoutVerification` migration, the `moderator` role, and removing the "Verified" mark and the verification copy, with the access audit on the team's listing page and the audit record of a role change (ADR 0059)
2. design-system, interaction-states: move the remaining presentation into the components library with a parity spec each (ADR 0035, 0036), then validation, dialog confirmation and date and money formats
3. security, privacy, accessibility: authorization and rate limits, data visibility and retention, screen-reader and keyboard coverage
4. operations, performance, admin, marketing: backups, availability, latency and page budgets; set up the admin application in production (`eng/azure/README.md`)
5. Polish the remaining 60–90% designs: offline details, and set `Email__MailingAddress` so that promotional e-mail can go out (ADR 0053)
6. Deferred: the launch-day e-mail, pre-registrations as listing drafts and a staff screen for them (ADR 0044); hourly rent, the sign-up intents, and payment, leases, calendars and double booking for spaces (ADR 0042)
