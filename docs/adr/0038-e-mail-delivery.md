# 0038. E-mail delivery: Azure Communication Services Email, one HTML layout over the text

## Status

Accepted, 11 November 2026. Fills in the provider and the sending domain the deliver-email design
left as `<TO SUPPLY>`, and settles how the e-mails become HTML. Amended by ADR 0041, 12 November
2026: the reference request and its reminders are no longer among the queued e-mails.

## Context

Every e-mail Jubilee sends is written by a handler as plain text into the outbox, in the same
transaction as the state change; `OutboxDispatcher` in `Jubilee.Worker` sends it and retries a
failure with back-off for 24 hours (L2-179 criterion 3). The only `IEmailSender` was
`LoggingEmailSender`, so no e-mail left any environment, and `IEmailSender` took a text body only.
L2-179 asks for a transactional e-mail provider with SPF, DKIM and DMARC, an HTML and a plain-text
part, light and dark mail clients and no tracking pixels.

Two dozen e-mails are queued today (confirmation, e-mail change, reset, security notices, data export,
account deletion, reference request and reminders, verification decisions, the notification
e-mails of L2-068). Their text is tested and their links are already absolute.

## Decision

- **Provider: Azure Communication Services Email.** Jubilee is already hosted on Azure, so it adds
  no vendor, no second bill and no second sign-in. It signs with DKIM, gives the SPF and DKIM
  records to publish, has no monthly fee, and is called over HTTPS with an HMAC-signed request, so
  the backend takes no new package.
- **Sending domain `notify.jubilee.to`, sender `no-reply@notify.jubilee.to`.** A subdomain,
  because `jubilee.to` itself already has an SPF record, which Namecheap's e-mail forwarding
  owns and locks; a domain may have one SPF record, and the provider's cannot be merged into a
  locked one. The subdomain is a customer-managed domain of the Email Communication Service,
  verified by a TXT record; its SPF record, two DKIM CNAME records and a DMARC record with
  `p=quarantine` at `_dmarc.notify.jubilee.to` are published at Namecheap. Nothing at `@` changes.
- **Configuration keys: `Email:ConnectionString`** (the Communication Services connection string:
  endpoint and access key) **and `Email:From`** (`no-reply@notify.jubilee.to`). The API and the worker
  read the same keys. With no connection string the logging sender is used: nothing leaves the
  system, the recipient and subject are logged, and when `Email:PreviewFolder` is set the HTML and
  the text of each e-mail are written there (L2-179 criterion 7).
- **`IEmailSender` takes an `EmailMessage`**: recipient, subject, text body, HTML body and, for a
  notification e-mail, the unsubscribe address, sent as `List-Unsubscribe` and
  `List-Unsubscribe-Post` (RFC 8058).
- **The HTML is rendered from the text, by one layout, when the e-mail is sent.** `EmailLayout`
  turns the text a handler wrote into the HTML part: each paragraph becomes a paragraph, a link on
  its own line becomes a button with the link repeated as text below it, and everything is
  HTML-encoded. The button's label comes from the link's path (`/verify-email/` is "Confirm your
  e-mail"). The layout adds the header with the wordmark, the preheader (the first paragraph) and
  the footer with the unsubscribe link where there is one. The text part is the text the handler
  wrote, unchanged. So the outbox keeps its shape (no migration), the existing e-mails cannot drift
  from their text, and a new e-mail is branded without a template of its own.
- **The layout is a table, inline-styled, 600 px wide and fluid below it**, with
  `color-scheme: light dark` and a `prefers-color-scheme: dark` block. Colours are the design
  tokens' values by role (`--color-primary`, `--color-surface`, `--color-text`), written as hex
  because a mail client reads no custom property. The wordmark is the text "jubilee" in bold in a
  safe font stack: a mail client loads no web font, and an image would be blocked by default. The
  layout has no image at all, so there is nothing to track with; open and click tracking are
  turned off in each request.
- **Bounces and complaints arrive by Event Grid.** The Communication Service publishes
  `Microsoft.Communication.EmailDeliveryReportReceived`; an Event Grid subscription posts it to
  `POST /api/webhooks/email-events` with the shared secret in the `X-Webhook-Secret` delivery
  header (`Email:WebhookSecret`). The endpoint answers Event Grid's validation handshake and treats
  the statuses `Bounced` and `Suppressed` as a bounce (L2-179 criterion 2).
- **Retry stays in the outbox**: 2, 4, 8 … minutes, capped at 4 hours, until 24 hours after the
  e-mail was queued (`OutboxMessage.MarkAttemptFailed`). The sender throws on any answer other
  than `202 Accepted`; it does not retry by itself.
- **No test calls the provider.** API tests inject `FakeEmailSender`; the sender itself is tested
  against a fake HTTP handler.

## Consequences

- A separate `EmailDelivery` entity, per-template files and the suppression list of the design
  are not built; the outbox message and `Member.EmailBounced` carry what L2-179 needs today. The
  design says so.
- A change to the layout changes every e-mail at once. A message that needs its own structure
  (a digest with a table) would need a template of its own; none exists yet.
- An e-mail queued before a deployment is rendered by the layout of the worker that sends it.
- Azure Communication Services limits a new custom domain to a low sending rate until Microsoft
  raises it on request; the outbox retry absorbs a `429`.
- The steps to repeat the setup are in [`eng/azure/README.md`](../../eng/azure/README.md) under
  "E-mail".
