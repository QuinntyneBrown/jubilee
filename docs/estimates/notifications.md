# Estimates: notifications

| Design | Effort | Complete |
|---|---|---|
| deliver-real-time-events | 4 days | 90% |
| send-email-notifications | 5 days | 85% |
| show-toasts-and-banners | 3 days | 85% |
| view-notification-centre | 4 days | 95% |

stay-notified (ADR 0025): the notification centre, mark read, real-time event stream with reconnect, toasts, the confirmed banner, preference-gated e-mail with combining, unsubscribe and meeting reminders are done with tests. The preference screens, the offline banner, the branded mail layout and the Azure Communication Services sender with its unsubscribe headers have landed since, with tests. Deferred: the daily summary (L2-016 AC6, L2-068 AC1), back-in-stock and new-business notifications (L2-064 AC6), and behaviour specs for the toast timing, the alert role and the limit of three (L2-066 AC1 to AC3).
