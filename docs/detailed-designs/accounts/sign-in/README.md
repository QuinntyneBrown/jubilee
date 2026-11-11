# Sign in

## Overview

Jubilee is Toronto's Christian marketplace. A visitor signs in at `/sign-in`,
the Log in screen, with the e-mail and password of an account and may tick
"Keep me logged in". A successful sign-in starts a *session* — server-side
record that identifies the member on later requests through an opaque cookie.
The lifetime of that session is the subject of the manage session feature
(`L2-010`).

The Log in screen shares one frame with the Sign up screen (`/join`), drawn
from the Magic Patterns design (`L2-187`, ADR 0038). Under 1024 px the
*lockup* — mark and wordmark of Jubilee drawn as one unit — is centred above a
card that holds the form. From 1024 px a dark brand panel on the left holds the
lockup and the form is on the right with no card. When Google sign-in is
configured, "Continue with Google" comes first, above the form; that flow is
the subject of the continue with Google feature (`L2-003`). The "Password"
control offers to show the password being typed.

Two protections surround the form. *Throttling* slows password guessing: 5
failed sign-ins for one account within 15 minutes block that account's sign-in
for 15 minutes, and 20 failed sign-ins from one IP address within 15 minutes
block that address. *Enumeration resistance* keeps the form from revealing
whether an e-mail has an account: a wrong password and an unknown e-mail
produce the same message, status, body shape and timing.

The feature also covers the *sign-in prompt* — dialog shown when a visitor
starts an action that requires an account (message, book, ask, order, save). The
visitor joins or signs in from the dialog and returns to the same listing, where
the started action continues.

## Description

The feature is a vertical slice from the sign-in page and prompt to the `Cache`
that holds sessions and counters.

- **`SignInPage`** — Angular page at `/sign-in`, the Log in screen. It composes
  `jb-auth-layout` with `split` and passes the `heading` "Welcome back" and the
  `lead` "Log in to message businesses and manage your listing." The form has
  "Email" (placeholder "you@example.com"), "Password", the checkbox "Keep me
  logged in" and the button "Log in". "Forgot password?" sits on the line of
  the "Password" label and links to `/forgot-password`. "Keep me logged in" is
  not ticked until the visitor ticks it (ADR 0038). Under the form "New to
  Jubilee?" offers "Create a free account" linking to `/join`. When Google
  sign-in is configured, the button "Continue with Google", carrying
  `jb-google-mark`, comes first, above the form, and the `jb-divider-text` "or
  use email" separates it from the form; when it is not configured, neither
  the button nor the divider is shown (`L2-003`). The page builds the form
  from `jb-field`, `jb-input`, `jb-password-input`, `jb-checkbox`, `jb-button`,
  `jb-alert` and `jb-form-summary` of the `components` library, and the link
  under the form is a `jb-auth-link`. A malformed e-mail shows "Enter the
  e-mail address you joined with, like name@example.com". While the request is
  in flight the fields are read-only, the button shows a busy state, and a
  second press sends nothing. A `GuestGuard` redirects a signed-in member to
  `/`. A load failure shows error reference `JB-AUTH-503`.
- **`jb-auth-layout`** — frame component of the `components` library, used
  with `split` by the Log in and Sign up screens (`L2-187`). It takes the
  `heading` and the `lead` of the page as inputs and projects the form. Under
  1024 px it shows `jb-lockup` centred above a card that holds the form, and
  the link to the other screen is under the card. From 1024 px it shows a dark
  brand panel on the left with `jb-lockup`, "Hire, shop and book with your
  church family.", "Christian-owned businesses across Toronto, all in one
  place." and "© Jubilee · Toronto", and the form on the right with no card.
  The lockup links to `/welcome`.
- **`jb-password-input`** — component of the `components` library. It wraps
  the password control and adds a button inside it named "Show password".
  Pressed, the button shows the password as typed and is named "Hide
  password"; pressed again, it hides the password and is named "Show password"
  (`L2-187`). The typed value is kept, focus stays on the button, and the form
  is not submitted. The button follows the password in the tab order and works
  with Enter and with Space. It changes only the `type` of the control in the
  browser; nothing is sent to `Jubilee API`.
- **`AccountApi`** — typed HTTP client. `signIn(email, password, keepSignedIn)`
  sends `POST /api/session`.
- **`RateLimitMiddleware`** — ASP.NET Core middleware. It reads the failed
  sign-in counter of the caller's IP address and answers `429` with
  `Retry-After` once 20 failures across any accounts fall within 15 minutes.
- **`SessionController`** — ASP.NET Core controller exposing `/api/session`. It
  sends `SignInCommand` and, on success, sets the session cookie and returns the
  member summary.
- **`SignInCommandHandler`** — MediatR handler. It checks the lock, loads the
  `Member` by normalised e-mail, and verifies the password with
  `IPasswordHasher`. When no member exists it verifies against a fixed dummy
  Argon2id hash so that both paths take the same time. It returns a
  `SignInOutcome`.
- **`ISignInAttemptTracker`** — application service backed by the `Cache`. It
  keeps a 15-minute failure counter per account key and per IP address. The
  account key is a hash of the normalised e-mail, so an unknown e-mail is
  counted and locked exactly as an existing one. `RecordFailure` starts a
  15-minute lock at the fifth failure; `Reset` clears the account counter after
  a successful sign-in.
- **`SignInOutcome`** — `SignedIn` returns `200`; `InvalidCredentials` returns
  `401` with code `INVALID_CREDENTIALS` and the page shows "That password
  doesn't match this e-mail. Try again or reset it." with the typed e-mail
  kept; `Locked` returns `429` with code `SIGN_IN_LOCKED` and `Retry-After`, and
  the page shows "Too many tries. Wait 15 minutes or reset your password." A
  locked account is refused even when the password is right.
- **`SignInBlockedEmailRequested`** — outbox message written when a lock starts
  for an existing account. `Jubilee Worker` e-mails the account holder that
  sign-in was blocked after repeated failures, with a link to reset the
  password.
- **`ISessionStore`** — application service. `Create(memberId, persistent)`
  issues a new session identifier at every sign-in, so a pre-existing cookie
  value is never reused.
- **`SignInRequiredDialog`** — Angular dialog opened by an action button when
  `SessionService` reports no member. For "Message" on Legacy Financial its
  title is "Join to message Legacy Financial"; it offers "Sign in" and "Join
  free".
- **`PendingActionService`** — Angular service. `remember` stores a
  `PendingAction` (`kind`, `targetId`, `returnPath`) in `sessionStorage` for
  the tab. `resume`, called after sign-in or join, navigates to the return path
  and reopens the dialog of the started action; for `Save` it saves the item
  through `SavedApi` without a further press.
- **`ReturnUrlService`** — Angular service. `sanitise` accepts only a
  same-origin relative path that starts with a single `/`; any other value
  becomes `/`. After a plain sign-in the member sees the toast "Welcome back,
  {first name}" and lands on the sanitised return path, or `/` if none.

## Requirements

The feature realizes the following level-2 (L2) requirements. Each L2
requirement refines a level-1 (L1) requirement, cited by identifier.

| L2 ID | Refines (L1) | Requirement |
|-------|--------------|-------------|
| `L2-006` | `L1-001` | The system shall let a visitor sign in at `/sign-in`, the Log in screen, with e-mail and password, optionally staying signed in. |
| `L2-007` | `L1-001` | Repeated failed sign-ins shall be slowed and then temporarily blocked to stop password guessing. |
| `L2-012` | `L1-001` | When a visitor tries an action that requires an account (message, book, ask, order, save), the system shall prompt the visitor to join or sign in and shall bring the visitor straight back. |
| `L2-141` | `L1-019` | The sign-in endpoint shall respond with the same status, body shape and timing for existing and non-existing e-mails. |
| `L2-137` | `L1-019` | The server shall respond `429` with `Retry-After` when the sign-in limits of `L2-007` are exceeded, and the UI shall show "You're doing that a lot. Try again in {n} minutes." |
| `L2-010` | `L1-001` | A new session identifier shall be issued when a member signs in, and the session shall last 30 days when "Keep me logged in" is ticked. |
| `L2-187` | `L1-001` | The Log in screen (`/sign-in`) and the Sign up screen (`/join`) shall share one frame: a brand panel beside the form from 1024 px, and a card under the lockup below that width. Both screens shall offer to show the password being typed. |

## Diagrams

### System context

The visitor signs in through Jubilee. The e-mail provider delivers the notice
that Jubilee sends when an account is temporarily locked.

![C4 system context for signing in](diagrams/c4-context.png)

### Containers

`Jubilee Web` posts credentials to `Jubilee API`, which reads the member from
the `Jubilee database` and keeps counters and sessions in the `Cache`.
`Jubilee Worker` sends the lockout notice.

![C4 container view for signing in](diagrams/c4-container.png)

### Components

`SignInRequiredDialog` records the started action and opens `SignInPage`. In
the API the request passes `RateLimitMiddleware` and `SessionController` to
`SignInCommandHandler`, which uses `ISignInAttemptTracker`, `IPasswordHasher`
and `ISessionStore`. The `jb-*` components that `SignInPage` composes are
presentation and are not drawn.

![C4 component view for signing in](diagrams/c4-component.png)

### Class structure

`SignInCommandHandler` handles `SignInCommand` and returns a `SignInResult`
with a `SignInOutcome`. On the frontend, `PendingActionService` holds at most
one `PendingAction` and uses `ReturnUrlService`.

![Class diagram for signing in](diagrams/class-structure.png)

### Behaviour — sign in with e-mail and password

The IP limit is checked first, then the account lock (`L2-007`). A wrong
password and an unknown e-mail take the same path and receive the same answer
(`L2-141`). A success resets the counter and issues a new session identifier.
Showing or hiding the password changes only the control in the browser and
adds no message to the sequence (`L2-187`).

![Sequence diagram for signing in with e-mail and password](diagrams/sequence-sign-in.png)

### Behaviour — sign-in prompt and return to origin

The dialog stores the started action, the visitor signs in, and
`PendingActionService` returns to the sanitised path and either reopens the
action's dialog or saves the item (`L2-012`).

![Sequence diagram for the sign-in prompt and return to origin](diagrams/sequence-return-to-origin.png)
