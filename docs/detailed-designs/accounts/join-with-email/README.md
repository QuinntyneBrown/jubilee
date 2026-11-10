# Join with e-mail

## Overview

Jubilee is Toronto's Christian marketplace. A *visitor* is a person who is not
signed in; a *member* is a signed-in account holder. This feature covers the
first step from one to the other: a visitor creates a free account at `/join`
with a first name, a last name, an e-mail address, a password, an optional home
church, and agreement to the statement of faith and the terms.

The account starts *unconfirmed* — e-mail status of an account whose address
has not yet been proven by opening an e-mailed link. Joining sends a
*confirmation e-mail* carrying a single-use link that works for 24 hours. The
page then shows "Check your e-mail", names the address, and offers "Send it
again". Opening the link is the subject of the confirm e-mail feature
(`L2-004`); continuing with Google from the same page is the subject of the
continue with Google feature (`L2-003`).

The join form validates on submit, in the browser and again on the server, and
reports every problem at once. The server treats the browser as untrusted: a
request that bypasses browser validation receives `422` with per-field error
codes and creates nothing. The join endpoint is public, so the slice also
carries the abuse controls for it: a rate limit of 5 joins per IP address per
hour, an invisible bot challenge, and a breached-password check.

## Description

The feature is a vertical slice from the `/join` page to the `Jubilee database`,
with the confirmation e-mail sent by `Jubilee Worker`.

- **`JoinPage`** — Angular page at `/join`. It renders the form with "First
  name", "Last name", "E-mail" and "Password" marked "(required)" and "Home
  church" marked "(optional)" with the hint "Shown to no one. Helps us recommend
  businesses near you." The agreement checkbox links "statement of faith" to
  `/statement-of-faith` and "terms" to `/terms`; both open in a new tab so that
  typed values are kept. The inputs limit length to 50 characters for each name,
  254 for the e-mail and 128 for the password. After a successful join the page
  shows "Check your e-mail" with "Send it again". A `GuestGuard` on the route
  redirects a signed-in member to `/`.
- **`ErrorSummary`** — shared Angular component. On an invalid submit it shows a
  summary titled "Fix {n} things to continue" above the form, lists each problem
  as a link to its field, and receives focus. Every typed value except the
  password is kept.
- **`AccountApi`** — typed Angular HTTP client. `join()` sends
  `POST /api/account/join` with the form values and the bot challenge token;
  `resendConfirmation()` sends `POST /api/account/confirmation/resend`.
- **`RateLimitMiddleware`** — ASP.NET Core middleware in `Jubilee.Api`. It
  counts joins per IP address in the `Cache` and answers `429` with
  `Retry-After` above 5 per hour, and counts confirmation resends per member
  above 5 per hour. The page then shows "You're doing that a lot. Try again in
  {n} minutes."
- **`AccountController`** — ASP.NET Core controller exposing `/api/account`. For
  a join it verifies the challenge token with the `Bot challenge provider`
  through `IBotChallengeVerifier`, sends `JoinWithEmailCommand` through MediatR,
  and sets the session cookie on success.
- **`JoinWithEmailCommand`** — request object carrying `FirstName`, `LastName`,
  `Email`, `Password`, `HomeChurch`, `AgreementAccepted` and `ChallengeToken`.
- **`JoinWithEmailCommandValidator`** — FluentValidation validator. It applies
  the field lengths, the password length of 10 to 128 characters with no
  composition rules, the agreement, the uniqueness of the normalised e-mail, and
  the breached-password check through `IBreachedPasswordChecker`. It returns all
  failures together; `ProblemDetailsMiddleware` maps them to `422` with the
  field codes `REQUIRED`, `TOO_LONG`, `EMAIL_INVALID`, `EMAIL_TAKEN`,
  `PASSWORD_TOO_SHORT`, `PASSWORD_BREACHED` and `AGREEMENT_REQUIRED`.
- **`JoinWithEmailCommandHandler`** — MediatR handler. It hashes the password
  with `IPasswordHasher`, creates the `Member`, issues the confirmation
  `LinkToken`, and saves the member, the token hash and a
  `ConfirmationEmailRequested` outbox message in one unit of work. It then
  stores a new `Session` so that the unconfirmed member can resend the link.
- **`Member`** — domain entity. `Member.Join(...)` sets `EmailStatus` to
  `Unconfirmed` and records `AgreementAcceptedAt`.
- **`EmailAddress`** — value object. `Parse` trims the input and lower-cases the
  domain, so the stored address is normalised.
- **`IPasswordHasher`** — application service implemented by
  `Argon2idPasswordHasher`: Argon2id with at least 19 MiB of memory, at least 2
  iterations and a unique salt. The plain password is never stored and never
  written to logs.
- **`ILinkTokenService`** and **`LinkToken`** — the service creates a token with
  at least 128 bits of randomness, stores only its SHA-256 hash with the purpose
  `EmailConfirmation` and an expiry of 24 hours, and returns the raw value once
  for the e-mail. `SupersedeOutstanding` makes earlier links for the same member
  and purpose stop working.
- **`ResendConfirmationCommandHandler`** — handles "Send it again". It
  supersedes the outstanding confirmation tokens, issues a new one and queues a
  new e-mail.
- **`OutboxDispatcherJob`** — hosted job in `Jubilee.Worker`. It reads the
  outbox message and sends the confirmation e-mail through `IEmailSender` to the
  `E-mail provider`.

When the e-mail already belongs to an account, the server returns `EMAIL_TAKEN`
only after the bot challenge passes and within the join rate limit. The field
shows "An account already uses this e-mail. Sign in instead, or use another
address.", no second account is created, and the handler queues a notice to the
existing account holder that someone tried to join with the address. A join
that cannot be loaded or completed because the service is unavailable shows the
error reference `JB-AUTH-503`.

## Requirements

The feature realizes the following level-2 (L2) requirements. Each L2
requirement refines a level-1 (L1) requirement, cited by identifier.

| L2 ID | Refines (L1) | Requirement |
|-------|--------------|-------------|
| `L2-001` | `L1-001` | The system shall let a visitor create an account at `/join` with first name, last name, e-mail, password, an optional home church, and agreement to the statement of faith and terms, with a Google option on the same page. On success the account shall be created unconfirmed and a confirmation e-mail shall be sent. |
| `L2-002` | `L1-001` | The join form shall validate on submit, in the browser and again on the server, and shall report every problem at once. |
| `L2-134` | `L1-019` | A stored password shall be hashed with Argon2id (memory at least 19 MiB, iterations at least 2) with a unique salt and shall never reach logs. A password shall be 10 to 128 characters with no composition rules and shall be checked against a breached-password list. |
| `L2-137` | `L1-019` | The server shall respond `429` with `Retry-After` above 5 joins per IP per hour and above 5 e-mail confirmation resends per hour, and the join form shall be protected by a privacy-respecting bot challenge. |
| `L2-140` | `L1-019` | An e-mail confirmation token shall have at least 128 bits of randomness, shall be stored only as a SHA-256 hash, shall have a single purpose, and shall expire after 24 hours. |
| `L2-141` | `L1-019` | For a join with an e-mail that already has an account, the inline message of `L2-002` shall be shown only after the bot challenge passes and within the join rate limit, and an e-mail shall be sent to the existing account holder. |

## Diagrams

### System context

The visitor joins through Jubilee. Jubilee verifies the bot challenge, checks
the password against the breached-password service, and sends the confirmation
link through the e-mail provider.

![C4 system context for joining with e-mail](diagrams/c4-context.png)

### Containers

`Jubilee Web` posts the join request to `Jubilee API`, which writes the member,
the token hash and the outbox message to the `Jubilee database` and keeps the
rate-limit counter and the session in the `Cache`. `Jubilee Worker` sends the
e-mail.

![C4 container view for joining with e-mail](diagrams/c4-container.png)

### Components

`JoinPage` submits through `AccountApi`. Inside `Jubilee API` the request passes
`RateLimitMiddleware`, then `AccountController` validates the command and sends
it to `JoinWithEmailCommandHandler`, which creates the `Member` and the
confirmation token.

![C4 component view for joining with e-mail](diagrams/c4-component.png)

### Class structure

`Member` owns an `EmailAddress` and an `EmailStatus` and receives `LinkToken`
records. The handlers depend on `IPasswordHasher` and `ILinkTokenService`; the
validator depends on `IBreachedPasswordChecker`.

![Class diagram for joining with e-mail](diagrams/class-structure.png)

### Behaviour — join with e-mail

The page validates first and shows every problem at once. The server counts the
attempt, verifies the bot challenge, validates again (`L2-002`), hashes the
password (`L2-134`), and commits the member, the token hash (`L2-140`) and the
outbox message in one unit of work.

![Sequence diagram for joining with e-mail](diagrams/sequence-join.png)

### Behaviour — send the confirmation e-mail again

"Send it again" supersedes the earlier link, issues a new one valid for 24
hours, and is limited to 5 resends per hour (`L2-137`). `OutboxDispatcherJob`
sends the new e-mail after the commit.

![Sequence diagram for sending the confirmation e-mail again](diagrams/sequence-resend-confirmation.png)
