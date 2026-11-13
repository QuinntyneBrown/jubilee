# Estimates: notifications

| Design | Effort | Complete |
|---|---|---|
| deliver-real-time-events | 4 days | 100% |
| send-email-notifications | 5 days | 100% |
| show-toasts-and-banners | 3 days | 100% |
| view-notification-centre | 4 days | 100% |

stay-notified (ADR 0025, ADR 0053, journey 17): the notification centre, mark read, the event stream that the browser reconnects and the app opens again when the browser gives up, toasts with their timing, alert role and limit of three, the banners, preference-gated e-mail with combining, the unsubscribe link and its page, meeting reminders, the daily summary at 7:00 a.m. in Toronto, the "new business" notification with its weekly note, and the tips for business owners are done with tests (`NotificationTests`, `EmailNotificationTests`, `NewBusinessTests`, `OwnerTipTests`, `EventStreamTests`, `EmailLayoutTests`, `notifications.spec.ts`, `toasts.spec.ts`, `unsubscribe.spec.ts`).

ADR 0057 is done: the approved, changes-requested, declined and re-check e-mails and notices are gone, a takedown tells the owner "We’ve taken down {Business}" in the notification centre (kind `listing-removed`) and by e-mail with the team's reason (`AdminListingsTests`), and the "new business" notification is sent when a listing is published, by `PublishListingCommandHandler`, and its weekly note lists the businesses published in the week (`NewBusinessTests`).

## Left in journey 17 (ADR 0053)

- Owner step: set `Email__MailingAddress` on the API and the worker in Azure. Until it is set the weekly note of new businesses and the tips for owners are not sent (L2-149 AC1); the switches are saved and their consent recorded.
- Owner step: the 2 seconds of L2-070 AC1 are measured by `EventStreamDeliveryTests` inside the API. Over the network between Azure and a phone they can only be read from production monitoring.
- Outside this journey: push while the app is closed (journey 24), and the retries and dead-letter queue of scheduled jobs (L2-182 AC2, the design "Run background jobs").
