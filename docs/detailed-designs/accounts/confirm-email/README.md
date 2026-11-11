# Confirm e-mail

## Overview

Jubilee is Toronto's Christian marketplace. A member who joins with an e-mail
and password starts *unconfirmed* — e-mail status of an account whose address
has not yet been proven. A *confirmation link* is an e-mailed address of the
form `/verify-email/:token` that proves the address when opened. The link works
once, for 24 hours.

Until the e-mail is confirmed, a member may browse, search and save, and shall
not message, book, request or list a business. A persistent banner on every
signed-in page explains the restriction and offers "Send it again" and "Change
e-mail". The restriction exists so that every business receives requests only
from people whose address is reachable.

This feature covers opening the link and its expired, used and failed states,
replacing a mistyped address before confirmation, the reaction to a bounced
confirmation e-mail, and the enforcement of the restriction in `Jubilee Web`
and in `Jubilee API`. Creating the account and issuing the first link belong to
the join with e-mail feature (`L2-001`).

## Description

The feature is a vertical slice from the verification page and banner to the
`Jubilee database`.

- **`VerifyEmailPage`** — Angular page with two routes. `/verify-email` is the
  waiting page "Confirm your e-mail" with "Send it again", "Use another e-mail"
  and "Sign out". `/verify-email/:token` reads the token, removes it from the
  address bar with `history.replaceState`, shows "Confirming your e-mail…" and
  then one of three states: "E-mail confirmed" with "Start browsing" and "List
  your business"; "This link has expired" with "Send a new link"; or "We
  couldn't load your verification" with error reference `JB-VERIFY-502` and
  "Try again".
- **`VerifyEmailBanner`** — Angular component shown on every signed-in page
  while `SessionService` reports an unconfirmed e-mail. It shows "Confirm your
  e-mail to message businesses. We sent a link to {address}." with "Send it
  again" and "Change e-mail" and has no dismiss button. Its danger variant
  shows "We couldn't deliver e-mail to {address}. Check the address for a
  typo." with "Change e-mail"; its success variant shows "E-mail confirmed. You
  can now message businesses and book meetings."
- **`SessionService`** — Angular service holding the member's e-mail status. It
  calls `GET /api/session` again when the tab regains focus, so a confirmation
  in another tab changes the banner and enables the blocked actions without a
  reload.
- **`AccountApi`** — typed HTTP client: `confirmEmail(token)` sends
  `POST /api/account/confirmation` with the token in the body,
  `resendConfirmation()` sends `POST /api/account/confirmation/resend`, and
  `changeUnconfirmedEmail(address)` sends `PUT /api/account/unconfirmed-email`.
- **`AccountController`** — ASP.NET Core controller for these endpoints. The
  confirmation endpoint needs no session, because the link may be opened on
  another device. Responses to token requests carry
  `Referrer-Policy: no-referrer`.
- **`ConfirmEmailCommandHandler`** — MediatR handler. It finds the `LinkToken`
  by SHA-256 hash and the purpose `EmailConfirmation`, and returns a
  `ConfirmEmailOutcome`. A valid token is redeemed and the member confirmed in
  one unit of work. A used token changes nothing and yields `AlreadyConfirmed`
  when the member is confirmed, otherwise `Expired`. An unknown, malformed,
  superseded or older-than-24-hours token yields `Expired` with no account data.
- **`LinkToken`** — domain entity with `TokenHash`, `Purpose`, `ExpiresAt`,
  `UsedAt` and `SupersededAt`. `IsRedeemable(now)` is true only for an unused,
  unsuperseded, unexpired token; `Redeem(now)` sets `UsedAt`.
- **`ChangeUnconfirmedEmailCommandHandler`** — handles "Use another e-mail" and
  "Change e-mail" for an unconfirmed member. It replaces the address with
  `Member.ReplaceUnconfirmedEmail`, supersedes outstanding confirmation tokens,
  issues a new 24-hour token, and queues the e-mail to the new address.
- **`Member`** — domain entity. `ConfirmEmail(now)` sets `EmailStatus` to
  `Confirmed`. `MarkEmailBounced()` sets `EmailBounced`, which the session view
  exposes to the banner. `CanTransact()` is true only for a confirmed member.
- **`ConfirmedEmailRequirement`** — authorization requirement applied to the
  endpoints that send a message, a booking, a quote or an order request, and
  that submit a listing. For an unconfirmed member it answers `403` with code
  `EMAIL_UNCONFIRMED`. The save endpoints do not carry it, so saving succeeds.
- **`EmailEventsController`** and **`RecordEmailBounceCommandHandler`** —
  receive the `E-mail provider` bounce event at
  `POST /api/webhooks/email-events` and mark the member. The webhook is
  authenticated by a shared secret in `X-Webhook-Secret` (ADR 0012).
- **`RateLimitMiddleware`** — limits confirmation resends to 5 per hour. A
  further press sends no e-mail; the response is `429` with `Retry-After`, and
  the banner states when the member may try again.
- **`ILinkTokenRedactor`** — logging filter that replaces token values in
  request logs with a fixed marker.

## Requirements

The feature realizes the following level-2 (L2) requirements. Each L2
requirement refines a level-1 (L1) requirement, cited by identifier.

| L2 ID | Refines (L1) | Requirement |
|-------|--------------|-------------|
| `L2-004` | `L1-001` | A confirmation link at `/verify-email/:token` shall confirm the member's e-mail. The link shall work once, for 24 hours. |
| `L2-005` | `L1-001` | Until the e-mail is confirmed, a member may browse, search and save, and shall not message, book, request or list a business. |
| `L2-140` | `L1-019` | An e-mail confirmation token shall have at least 128 bits of randomness, shall be stored only as a SHA-256 hash, shall have a single purpose, shall expire after 24 hours, and shall be single-use. A token page shall set `Referrer-Policy: no-referrer`, the token shall be removed from the address bar after it is read, and the token value shall be redacted from logs. |
| `L2-137` | `L1-019` | The server shall respond `429` with `Retry-After` when e-mail confirmation resends exceed 5 per hour. |
| `L2-118` | `L1-016` | An unexpected failure shall be reported in the standard failure layout with an error reference, here `JB-VERIFY-502`, that leads to the request's correlation ID in the logs. |

## Diagrams

### System context

The member opens the link delivered by the e-mail provider. The provider also
reports a bounced confirmation e-mail back to Jubilee.

![C4 system context for confirming an e-mail](diagrams/c4-context.png)

### Containers

`Jubilee Web` calls `Jubilee API` to confirm, resend and change the address.
`Jubilee Worker` sends the e-mail from the outbox, and the `E-mail provider`
posts bounce events to the API.

![C4 container view for confirming an e-mail](diagrams/c4-container.png)

### Components

`VerifyEmailPage` and `VerifyEmailBanner` work through `AccountApi` and
`SessionService`. In the API, two handlers change the `Member` through
`ILinkTokenService`, and `ConfirmedEmailRequirement` guards the restricted
endpoints.

![C4 component view for confirming an e-mail](diagrams/c4-component.png)

### Class structure

`Member` holds an `EmailStatus` and receives `LinkToken` records.
`ConfirmEmailCommandHandler` returns a `ConfirmEmailOutcome`;
`ConfirmedEmailRequirement` reads the member to decide `EMAIL_UNCONFIRMED`.

![Class diagram for confirming an e-mail](diagrams/class-structure.png)

### Behaviour — open the confirmation link

The page removes the token from the address bar (`L2-140`) and posts it. The
handler answers with one outcome per case of `L2-004`: confirmed, already
confirmed, or expired, and reveals nothing for an unknown token.

![Sequence diagram for opening the confirmation link](diagrams/sequence-confirm-link.png)

### Behaviour — use another e-mail

An unconfirmed member replaces the address. Earlier links stop working, and a
new 24-hour link goes to the new address through the outbox.

![Sequence diagram for using another e-mail](diagrams/sequence-change-unconfirmed-email.png)

### Behaviour — restrict an unconfirmed member

The banner blocks the restricted actions in the UI, and the API refuses them
with `403` and `EMAIL_UNCONFIRMED` (`L2-005`). When the tab regains focus,
`SessionService` reloads the session and the banner changes to its success state.

![Sequence diagram for restricting an unconfirmed member](diagrams/sequence-unconfirmed-restriction.png)
