# Deliver e-mail

## Overview

Jubilee is Toronto's Christian marketplace. It sends e-mail for account security
(confirmation and reset links), for church reference requests, for verification decisions and
for the notifications a member has turned on. This feature covers the delivery path shared by
each of those: how an e-mail leaves the system, how a failed send is retried, and how the
system reacts when an address stops accepting mail.

Five terms recur. *transactional e-mail provider* — external service that accepts a message
over an API and delivers it to the recipient's mail server. *hard bounce* — permanent
rejection of a message by the recipient's mail server. *spam complaint* — report by a
recipient that a message is unwanted. *undeliverable address* — address for which a hard
bounce or a spam complaint has been received. *security e-mail* — message that protects the
account, such as an e-mail confirmation or a password reset.

No request handler calls the provider. A handler writes an outbox message in the same
transaction as its state change, and `Jubilee Worker` sends the e-mail. The provider vendor
and the sending domain are `<TO SUPPLY>`.

## Description

The slice runs from the outbox to the provider and from the provider's webhook back to a
banner in `Jubilee Web`.

- **`EmailDelivery`** — entity for one e-mail to one address. It stores the template key, the
  `EmailCategory`, the `EmailDeliveryStatus`, the attempt count, `FirstAttemptAt` and
  `NextAttemptAt`. `OutboxDispatcherJob` creates it from an `EmailRequested` outbox message.
- **`SendEmailJob`** — hosted job in `Jubilee Worker` that sends each due delivery. On a
  transient failure (timeout, `5xx` or `429` from the provider) it calls `ScheduleRetry`.
  On a permanent failure it sets the status `Failed` without a retry.
- **`EmailDelivery.ScheduleRetry`** — retry rule. It sets `NextAttemptAt` by an exponential
  back-off and sets the status `Failed` when the next attempt would fall more than 24 hours
  after `FirstAttemptAt`. The back-off intervals are `<TO SUPPLY>`. This window replaces the
  5-attempt limit of other jobs (`L2-182`) for e-mail sends.
- **`EmailTemplateRenderer`** — renders each template to an `EmailMessage` with an HTML part
  and a plain-text part. Each HTML template declares `color-scheme: light dark` and uses
  colours that hold in both. No template contains a tracking pixel, and open and click
  tracking are turned off at the provider.
- **Template tests** — build check that renders each template with sample data and fails
  when the plain-text part is empty, when an image points outside the Jubilee media domain,
  or when the dark-scheme styles are missing.
- **`ProviderEmailSender`** — `IEmailSender` adapter in `Jubilee.Infrastructure`. It calls
  the provider's send API, forwards the correlation ID, and maps the response to a
  `SendOutcome` of `Accepted`, `TransientFailure` or `PermanentFailure`.
- **Sending domain records** — SPF, DKIM and DMARC records for the sending domain, defined in
  the infrastructure definitions. The DMARC policy is `quarantine` or `reject`. A pipeline
  check resolves the three records and fails when one is absent or the policy is `none`.
- **`EmailWebhooksController`** — receives `POST /api/webhooks/email` from the provider.
  `WebhookSignatureVerifier` checks the provider signature; an invalid signature returns
  `401`. The endpoint has no session and is exempt from `CsrfMiddleware`.
- **`RecordEmailEventCommandHandler`** — handles a hard bounce or a spam complaint. It adds a
  `SuppressedAddress`, calls `Member.MarkEmailUndeliverable` when the address belongs to a
  member, and writes an outbox event. The provider event identifier makes a repeated webhook
  a no-op.
- **`SuppressedAddress`** — record of an undeliverable address, keyed by a hash of the
  normalized address so that it also covers recipients without an account, such as a church
  reference.
- **`DeliverabilityGuard`** — checked by `SendEmailJob` before each send. It refuses each
  e-mail to an undeliverable address unless the category is `Security`; the delivery then
  takes the status `Suppressed`.
- **`EmailUndeliverableBanner`** — Angular banner fed by `SessionService`, which receives the
  change over `EventsHub` and on the next session load. It shows the danger banner "We
  couldn't deliver e-mail to {address}. Check the address for a typo." with the action
  "Change e-mail". The banner is persistent; a confirmed new address removes the suppression
  flag on the member and clears the banner.
- **Delivery metrics** — `SendEmailJob` and the webhook handler count sends and bounces
  through `JubileeMetrics`, which feeds the bounce-rate alert of `L2-176`.

## Requirements

The feature realizes the following level-2 (L2) requirements. Each L2 requirement refines a
level-1 (L1) requirement, cited by identifier.

| L2 ID | Refines (L1) | Requirement |
|-------|--------------|-------------|
| `L2-179` | `L1-025` | E-mail shall be sent through a transactional e-mail provider with SPF, DKIM and DMARC (policy at least `quarantine`) on the sending domain, and each template shall have a plain-text part, work in light and dark mail clients, and contain no tracking pixels. A hard bounce or spam complaint received by webhook shall mark the address undeliverable and stop further non-security e-mail to it, and a transient send failure shall be retried with back-off for up to 24 hours. |
| `L2-004` | `L1-001` | A confirmation link at `/verify-email/:token` shall confirm the member's e-mail once within 24 hours. When a confirmation e-mail bounces, the member shall see the danger banner "We couldn't deliver e-mail to {address}. Check the address for a typo." with "Change e-mail". |
| `L2-068` | `L1-010` | The system shall send an e-mail within 2 minutes for each event the member has e-mail turned on for, and shall send none for an event the member has turned off. Each transactional e-mail shall be sent regardless of preferences from a domain authenticated with SPF, DKIM and DMARC. |

## Diagrams

### System context

Jubilee sends through the e-mail provider, which delivers to members and church references
and reports bounces and complaints back by webhook. DNS records authorise the provider as a
sender for the domain.

![C4 system context for delivering e-mail](diagrams/c4-context.png)

### Containers

`Jubilee Worker` reads the outbox and sends. `Jubilee API` receives the provider's webhook
and pushes the result to `Jubilee Web`. Delivery state lives in the `Jubilee database`.

![C4 container view for delivering e-mail](diagrams/c4-container.png)

### Components

`SendEmailJob` consults `DeliverabilityGuard`, renders with `EmailTemplateRenderer` and
sends through `ProviderEmailSender`. `EmailWebhooksController` verifies the signature and
dispatches to `RecordEmailEventCommandHandler`; `EventsHub` carries the change to the banner.

![C4 component view for delivering e-mail](diagrams/c4-component.png)

### Class structure

`EmailDelivery` holds an `EmailDeliveryStatus` and an `EmailCategory`. `ProviderEmailSender`
implements `IEmailSender` and returns a `SendResult`. `DeliverabilityGuard` decides from the
category and a `SuppressedAddress` lookup.

![Class diagram for delivering e-mail](diagrams/class-structure.png)

### Behaviour — send an e-mail with retry

`SendEmailJob` skips a non-security e-mail to an undeliverable address. Otherwise it renders
and sends; a transient failure schedules a retry with back-off for up to 24 hours after the
first attempt (`L2-179`).

![Sequence diagram for sending an e-mail with retry](diagrams/sequence-send-with-retry.png)

### Behaviour — handle a hard bounce or spam complaint

The webhook is verified, the address is recorded as undeliverable once per provider event,
and the member's open page shows the danger banner of `L2-004`.

![Sequence diagram for handling a bounce](diagrams/sequence-handle-bounce.png)
