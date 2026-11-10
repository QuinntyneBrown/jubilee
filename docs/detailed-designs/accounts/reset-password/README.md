# Reset password

## Overview

Jubilee is Toronto's Christian marketplace. A person who has forgotten the
password of an account recovers access in two steps. At `/forgot-password` the
visitor enters an e-mail and asks for a *reset link* — e-mailed address of the
form `/reset-password/:token` that works once, for 60 minutes. Opening the link
shows a form for a new password.

The first step is public and takes any e-mail, so it is built to reveal
nothing. The page shows the same message whether or not an account exists, the
response has the same status and body, and the median response times for
existing and non-existing e-mails differ by less than 50 ms. The design reaches
this by doing no account lookup in the request: `Jubilee API` only queues the
request, and `Jubilee Worker` decides afterwards whether an e-mail is sent.

The second step changes the credential. The new password follows the same
policy as at joining: 10 to 128 characters, no composition rules, and not
present in a known-breached password list. A successful change ends every
session of the account, invalidates outstanding reset links, and sends a
security e-mail to the account holder.

## Description

The feature is a vertical slice from the two pages to the `Jubilee database`,
with link issuing and e-mail in `Jubilee Worker`.

- **`ForgotPasswordPage`** — Angular page at `/forgot-password`. An empty or
  malformed e-mail shows the summary "Fix 1 thing to continue" and the field
  error "Enter an e-mail address like name@example.com". After submit it shows
  "Check your e-mail. If {address} has an account, a reset link is on its way.
  It works for 60 minutes."
- **`ResetPasswordPage`** — Angular page at `/reset-password/:token`. It reads
  the token, removes it from the address bar, and asks the API for the link
  state. A valid link shows "Choose a new password" and "For {e-mail}", with
  "New password" (hint "At least 10 characters.") and "Repeat new password". An
  expired link shows "This link has expired. Reset links work once, for 60
  minutes." with "Send a new link", which leads to `/forgot-password`.
- **`AccountApi`** — typed HTTP client: `requestPasswordReset(email)`,
  `inspectResetLink(token)` and `resetPassword(token, newPassword,
  repeatPassword)`. The token travels in the request body, never in an API URL.
- **`PasswordResetController`** — ASP.NET Core controller with
  `POST /api/account/password-reset-requests` (always `202`),
  `POST /api/account/password-resets/inspect` and
  `POST /api/account/password-resets`. Responses carry
  `Referrer-Policy: no-referrer`.
- **`RequestPasswordResetCommandHandler`** — MediatR handler. It writes one
  `PasswordResetRequested` outbox message carrying the normalised e-mail and
  returns. It reads no member, so its duration does not depend on the account.
- **`SendPasswordResetLinkHandler`** — outbox message handler run by
  `OutboxDispatcherJob` in `Jubilee.Worker`. It increments the per-e-mail
  counter in the `Cache` and stops when more than 3 requests fall within one
  hour. Otherwise, when a member exists, it supersedes that member's earlier
  unused reset tokens, issues a new token, and sends the reset e-mail.
- **`LinkToken`** — domain entity with the purpose `PasswordReset`: at least
  128 bits of randomness, stored only as a SHA-256 hash, expiring after 60
  minutes, single-use.
- **`InspectResetLinkQueryHandler`** — returns a `ResetLinkView` with
  `ResetLinkState` `Valid` and the account e-mail, or `Expired` with no e-mail
  for a used, superseded, unknown or older-than-60-minutes token.
- **`ResetPasswordCommandValidator`** — FluentValidation validator. Field codes
  and messages: `PASSWORD_TOO_SHORT` — "Use at least 10 characters. This one
  has 5."; `PASSWORDS_DIFFER` — "The two passwords don't match. Type the same
  password again."; `PASSWORD_BREACHED` — "This password has appeared in a data
  breach. Choose another.", decided through `IBreachedPasswordChecker`. Failures
  return `422`.
- **`ResetPasswordCommandHandler`** — MediatR handler. It loads the redeemable
  token and its `Member`, hashes the password with Argon2id, calls
  `Member.ChangePassword`, marks the token used, supersedes every other
  outstanding reset token, and queues the security e-mail, all in one unit of
  work. It then calls `ISessionStore.EndAllForMember`. A token that is no longer
  redeemable returns `410` with code `LINK_EXPIRED`.
- **`Member`** — domain entity. `ChangePassword(passwordHash, now)` replaces the
  hash and records `PasswordChangedAt`.

After the change the page shows "Password changed. You're signed out everywhere
else. Sign in with your new password." The reset does not sign the visitor in.

## Requirements

The feature realizes the following level-2 (L2) requirements. Each L2
requirement refines a level-1 (L1) requirement, cited by identifier.

| L2 ID | Refines (L1) | Requirement |
|-------|--------------|-------------|
| `L2-008` | `L1-001` | The system shall let a visitor ask for a password reset link at `/forgot-password`. |
| `L2-009` | `L1-001` | The reset link at `/reset-password/:token` shall let the member choose a new password. |
| `L2-134` | `L1-019` | A password shall be 10 to 128 characters, shall be checked against a breached-password list, and shall be stored as an Argon2id hash. When an account's password changes, every other session and every outstanding reset link shall be invalidated. |
| `L2-140` | `L1-019` | A password reset token shall have at least 128 bits of randomness, shall be stored only as a SHA-256 hash, shall have a single purpose, shall expire after 60 minutes, and shall be single-use. |
| `L2-141` | `L1-019` | The forgot-password endpoint shall respond with the same status, body shape and timing for existing and non-existing e-mails. |
| `L2-137` | `L1-019` | Password reset requests shall be limited to 3 per e-mail per hour. |

## Diagrams

### System context

The visitor requests and uses the reset link through Jubilee. Jubilee sends the
link and the security e-mail through the e-mail provider and checks the new
password with the breached-password service.

![C4 system context for resetting a password](diagrams/c4-context.png)

### Containers

`Jubilee API` queues the reset request and later changes the password.
`Jubilee Worker` looks up the account, applies the per-e-mail limit, and sends
the link.

![C4 container view for resetting a password](diagrams/c4-container.png)

### Components

`PasswordResetController` sends the request command, the inspect query and the
reset command. `SendPasswordResetLinkHandler` in the worker is the only
component that reads the account for a reset request.

![C4 component view for resetting a password](diagrams/c4-component.png)

### Class structure

`Member` receives `LinkToken` records with the purpose `PasswordReset`.
`ResetPasswordCommandHandler` depends on `ILinkTokenService` and
`ISessionStore` and changes the member's password.

![Class diagram for resetting a password](diagrams/class-structure.png)

### Behaviour — request a reset link

The API answers `202` after writing the outbox message, with no account lookup
(`L2-141`). The worker counts the request, and sends a 60-minute link only for
an existing account within 3 requests per hour (`L2-008`).

![Sequence diagram for requesting a reset link](diagrams/sequence-request-reset-link.png)

### Behaviour — choose a new password

The page inspects the link, then submits the new password. The server validates
length, match and breach status, changes the password, and ends every session
of the account (`L2-009`, `L2-134`).

![Sequence diagram for choosing a new password](diagrams/sequence-choose-new-password.png)
