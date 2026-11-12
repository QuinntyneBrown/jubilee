# 0025. Stay notified decisions

Status: accepted

## Context

A member learns what happened to their requests, messages and account in the notification centre, in toasts while the app is open, and by e-mail according to their preferences (L2-004, L2-005, L2-016, L2-061, L2-064 to L2-070, L2-118, L2-121, L2-133, L2-157, L2-159, L2-179). The designs left open the real-time transport, how events survive a reconnect, when e-mail is sent or combined, and how unsubscribe is signed.

## Decision

- **Endpoints.** `GET /api/notifications` (last 90 days, newest first, with the unread count; 503 `JB-NTF-503` when it fails), `POST /api/notifications/{id}/read`, `POST /api/notifications/read-all`. Another member's notification answers 404 `NOTIFICATION_NOT_FOUND`. `GET /api/events` is the member's server-sent event stream. `GET/POST /api/unsubscribe` takes a signed link.
- **Real time is server-sent events, not WebSockets.** The browser's `EventSource` sends the session cookie, reconnects by itself and echoes `Last-Event-ID`; nothing else is needed on the client. Events are `notification` and `counts` (the same shape as `/api/me/navigation`).
- **The server polls the database per connection.** The API and the Worker are separate processes, and the Worker creates most notifications, so the stream reads the notifications table instead of relying on in-memory fan-out. The event id is the notification's `CreatedAt` in ticks; after a reconnect the server sends only what is newer than `Last-Event-ID`. The client also remembers the ids it has shown, so a toast is never repeated.
- **Toasts.** 8 seconds, danger toasts stay until dismissed, at most 3 shown at once. The action label comes from the kind: "Open conversation", "View request", "View details", "Open My business", "View account", "View business". A notification of kind `account` re-reads the session, which is how the "E-mail confirmed" banner replaces the "Confirm your e-mail" banner without a reload.
- **E-mail.** Sent only to a confirmed address, per category and the member's preference (all on by default), through the existing outbox. A message e-mail waits 2 minutes, is skipped if the member read the conversation in the meantime ("reading now" means activity in the last 2 minutes), and messages in the same conversation within 10 minutes are combined into one. A meeting reminder goes out 1 hour before the start (Worker job, every minute).
- **Unsubscribe.** Each e-mail carries a link signed with HMAC-SHA256 over member and category; the key is `Email:UnsubscribeKey`, which production must set. The link is passed as the `unsubscribeUrl` of the e-mail sender, which uses it for `List-Unsubscribe`. No sign-in is needed.
- **Subject.** `Notification.MemberSubject` is the member's subject string.

## Deferred

ADR 0053 has since closed the daily summary, the unsubscribe page and the "new businesses" notification below, and the settings screens, the banners and the mail layout landed with journeys 4, 20 and 24 and ADR 0038.

- Choosing preferences and the daily-summary frequency (L2-016 AC6): the settings screens belong to journeys 4 and 20.
- The in-browser unsubscribe page: the endpoint works; its page arrives with journey 20.
- The offline and connection banners (L2-121): journey 24.
- Mail templates and branding (L2-179 AC1 and AC4): no mail provider is chosen.
- The "new businesses" notification: it needs the public listing work of journey 21. The "product back in stock" notification was built with journey 2 (ADR 0045).
- Provider bounce webhooks beyond what exists.
