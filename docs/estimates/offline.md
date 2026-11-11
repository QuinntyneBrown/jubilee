# Estimates: offline

| Design | Effort | Complete |
|---|---|---|
| browse-offline | 4 days | 80% |
| queue-messages-offline | 4 days | 85% |
| show-connection-state | 4 days | 85% |

Journey 24 built the connection state machine and banner, the offline page, the saved directory and
conversations (IndexedDB), the requires-connection directive and the outgoing message queue with its
drainer. What remains is listed in ADR 0032: the service worker and its cached app shell, Background
Sync, the realtime reconnect, clearing the device on sign-out, and the hosted status page.
