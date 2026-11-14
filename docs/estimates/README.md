# Estimates

- Overall effort: 449 days
- Complete: 78%

| Subsystem | Effort | Complete |
|---|---|---|
| [merchandise](merchandise.md) | 8 days | 90% |
| [directory](directory.md) | 25 days | 100% |
| [trust-content](trust-content.md) | 10 days | 91% |
| [responsive-design](responsive-design.md) | 6 days | 40% |
| [design-system](design-system.md) | 6 days | 30% |
| [interaction-states](interaction-states.md) | 17 days | 5% |
| [system-pages](system-pages.md) | 10 days | 100% |
| [listings](listings.md) | 32 days | 100% |
| [accounts](accounts.md) | 50 days | 99% |
| [security](security.md) | 36 days | 37% |
| [messaging](messaging.md) | 17 days | 98% |
| [requests](requests.md) | 39 days | 100% |
| [notifications](notifications.md) | 16 days | 100% |
| [onboarding](onboarding.md) | 21 days | 100% |
| [admin](admin.md) | 7 days | 95% |
| [verification](verification.md) | 15 days | 100% |
| [owner-workspace](owner-workspace.md) | 20 days | 100% |
| [privacy](privacy.md) | 12 days | 43% |
| [accessibility](accessibility.md) | 10 days | 0% |
| [performance](performance.md) | 9 days | 6% |
| [operations](operations.md) | 30 days | 31% |
| [offline](offline.md) | 12 days | 99% |
| [marketing](marketing.md) | 13 days | 98% |
| [feedback](feedback.md) | 9 days | 99% |
| [reviews](reviews.md) | 19 days | 96% |

Jubilee ships without verification (ADR 0057), and that work is done: owners publish and are live
at once (publish-listing), the Jubilee team browses published listings and takes one down
(browse-listings, take-down-listing), the `moderator` role replaces `verifier`, and the "Verified"
mark and the verification copy are gone from every screen, e-mail and the marketing site. The
verification subsystem's designs live in `detailed-designs/moderation/`. The access audit on the team's
listing page (L2-150 AC1) and the audit record of a role change (L2-098 AC4) are done too
(ADR 0059), so browse-listings and take-down-listing are at 100%.

Software platforms (journey 33, ADR 0072) are done: browse-platforms, view-platform, describe-platform
and review-a-platform, 16 days, each with its tests.

The Purpose Tee (journey 34, ADR 0073) is built and tested against a fake payment gateway: the
page, the bag, checkout, the signed webhook, the return page, holds, expiry and retention. What is
left is the owner's: a Stripe account, its keys and webhook endpoint, GST/HST registration, and the
settings on `jubilee-to-app` (`eng/azure/README.md`); and the owner's run of the responsive and
visual sweeps of L2-271.

## Roadmap

1. merchandise: the owner sets up Stripe and its settings by the checklist in `eng/azure/README.md`, then runs the sweeps of L2-271
2. Done: ship without verification (ADR 0057): publish-listing, browse-listings and take-down-listing, the `ShipWithoutVerification` migration, the `moderator` role, and removing the "Verified" mark and the verification copy, with the access audit on the team's listing page and the audit record of a role change (ADR 0059)
3. design-system, interaction-states: move the remaining presentation into the components library with a parity spec each (ADR 0035, 0036), then validation, dialog confirmation and date and money formats
4. security, privacy, accessibility: authorization and rate limits, data visibility and retention, screen-reader and keyboard coverage
5. operations, performance, admin, marketing: backups, availability, latency and page budgets; set up the admin application in production by the owner's checklist (`eng/azure/README.md`, ADR 0070)
6. Polish the remaining 60–90% designs: the hosted status page of the offline banner (owner step, ADR 0068), the choice of product when a shop's review is edited, and set `Email__MailingAddress` so that promotional e-mail can go out (ADR 0053); the owner publishes the real privacy contact and the final legal wording from `/policies` in the admin application (ADR 0067)
7. Deferred: the launch-day e-mail, pre-registrations as listing drafts and a staff screen for them (ADR 0044); hourly rent, the sign-up intents, and payment, leases, calendars and double booking for spaces (ADR 0042)
