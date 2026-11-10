# Manage session

## Overview

Jubilee is Toronto's Christian marketplace. A *session* is the server-side
record that keeps a member signed in between requests. The browser holds only
an opaque random identifier in a cookie; `Jubilee API` resolves that identifier
to the session in the `Cache` on every request. This feature covers the life of
a session after sign-in: how long it lasts, what the member sees when it ends,
and how the member ends it.

A session has two limits. The *absolute lifetime* — longest age a session may
reach, counted from sign-in — is 30 days. The *idle timeout* — longest gap
between two requests — is 12 hours and applies to a session started without
"Keep me signed in"; such a session also ends when the browser closes. A session
ends early when the member signs out or when the account's password changes.

When a session ends while the member is working, the member is sent to
`/session-expired`, and any unsent message or form *draft* — text typed but not
yet submitted — is kept on the device and restored after the next sign-in as
the same member. Signing out ends only the current session; the account page
lets the member end all other sessions.

## Description

The feature spans `Jubilee Web`, the middleware of `Jubilee API` and the
`Cache`.

- **`Session`** — record with `Id`, `MemberId`, `Persistent`, `CsrfToken`,
  `DeviceLabel`, `CreatedAt` and `LastActivityAt`. `Id` is an opaque random
  value of at least 128 bits. `Persistent` is true when "Keep me signed in" was
  ticked.
- **`ISessionStore`** — application service implemented by `RedisSessionStore`.
  It stores each session under its identifier and keeps a per-member index, so
  that `CountForMember`, `EndOthers` and `EndAllForMember` work without a scan.
  `Create` always generates a new identifier.
- **`SessionPolicy`** — domain service with `AbsoluteLifetime` of 30 days and
  `IdleTimeout` of 12 hours. `IsExpired` is true for any session older than 30
  days and for a non-persistent session idle for more than 12 hours.
  `CookieMaxAge` returns 30 days for a persistent session and nothing for a
  non-persistent one, which makes the cookie end with the browser.
- **Session cookie** — named `__Host-jubilee-session`, with `Secure`,
  `HttpOnly`, `SameSite=Lax` and `Path=/`. No session token is written to
  `localStorage`.
- **`SessionAuthenticationMiddleware`** — ASP.NET Core middleware. It resolves
  the cookie through `ISessionStore.Find`, evaluates `SessionPolicy`, updates
  `LastActivityAt` for a valid session, and attaches the member to the request.
  For a missing or expired session on a protected endpoint it deletes the
  session, clears the cookie, and answers `401` with code `SESSION_EXPIRED`.
- **`CsrfMiddleware`** — ASP.NET Core middleware. Each `POST`, `PUT`, `PATCH`
  and `DELETE` shall carry the `Session.CsrfToken` in the `X-CSRF-Token` header;
  otherwise the request is rejected with `403`.
- **`SessionController`** — ASP.NET Core controller. `GET /api/session` returns
  the `SessionView` (member summary, e-mail status, `OtherSessionCount`,
  anti-CSRF token). `DELETE /api/session` ends the current session.
  `DELETE /api/session/others` ends every other session of the member.
- **`SessionService`** — Angular service holding the signed-in member as a
  signal. It loads `GET /api/session` at start-up and clears the member on
  sign-out.
- **`SessionExpiredInterceptor`** — Angular HTTP interceptor. On `401` with
  `SESSION_EXPIRED` it saves the draft of the current form through
  `DraftStore`, clears `SessionService`, and navigates to `/session-expired`
  with the current path as the return path.
- **`SessionExpiredPage`** — Angular page at `/session-expired` showing "You've
  been signed out. For your safety we sign you out after 30 days, or when your
  password changes." and "Sign in". After sign-in the member returns to the
  same page with the draft restored.
- **`DraftStore`** — Angular service that keeps drafts in browser storage on
  the device, keyed by member identifier and by route or conversation. `restore`
  returns a draft only to the member who wrote it, so a different member who
  signs in on the device does not see it. Sign-out leaves drafts in place.
- **`SignOutDialog`** — Angular dialog opened from "Sign out" in the account
  menu or on the account page. It asks "Sign out of Jubilee?" with "Stay signed
  in" and "Sign out", shows a busy state during the request, and navigates to
  `/welcome` on completion.
- **`AccountPage` section "Sign out"** — shows the session count, for example
  "Signed in on this phone and 1 other device", from `OtherSessionCount`, and
  offers the action that calls `DELETE /api/session/others`.

A password change or reset calls `ISessionStore.EndOthers` or `EndAllForMember`
from the change password and reset password features (`L2-134`); the ended
sessions then follow the expiry path described here.

## Requirements

The feature realizes the following level-2 (L2) requirements. Each L2
requirement refines a level-1 (L1) requirement, cited by identifier.

| L2 ID | Refines (L1) | Requirement |
|-------|--------------|-------------|
| `L2-010` | `L1-001` | Sessions shall be server-side, shall last up to 30 days when "Keep me signed in" is ticked, and shall end when the password changes. |
| `L2-011` | `L1-001` | A member shall be able to sign out from the account menu or the account page after confirming. |
| `L2-116` | `L1-016` | When an API call returns `401` because the session ended, the app shall save any draft in the current form, navigate to `/session-expired` and, after sign-in, return to the same page with the draft restored. |
| `L2-135` | `L1-019` | A session shall be an opaque random identifier of at least 128 bits in a cookie with `Secure`, `HttpOnly`, `SameSite=Lax`, `Path=/` and the `__Host-` prefix, and no session token shall be stored in `localStorage`. A state-changing request shall carry a valid anti-CSRF token bound to the session or be rejected with `403`. |

## Diagrams

### System context

The member is the only party: sessions are created, checked and ended inside
Jubilee.

![C4 system context for managing a session](diagrams/c4-context.png)

### Containers

`Jubilee Web` sends the session cookie and the anti-CSRF token with each call.
`Jubilee API` reads, renews and deletes sessions in the `Cache` and reads the
member from the `Jubilee database`.

![C4 container view for managing a session](diagrams/c4-container.png)

### Components

In the API, `SessionAuthenticationMiddleware` resolves and expires sessions
with `ISessionStore` and `SessionPolicy`, and `CsrfMiddleware` guards
state-changing requests before `SessionController`. In the web application,
`SessionExpiredInterceptor`, `DraftStore`, `SessionExpiredPage` and
`SignOutDialog` handle the two ways a session ends.

![C4 component view for managing a session](diagrams/c4-component.png)

### Class structure

`RedisSessionStore` implements `ISessionStore`, which stores `Session` records.
`SessionPolicy` evaluates a `Session`; the two middleware classes and
`SessionController` depend on the store.

![Class diagram for managing a session](diagrams/class-structure.png)

### Behaviour — expire a session and restore the draft

The middleware applies the 30-day and 12-hour rules (`L2-010`) and answers
`401`. The interceptor saves the draft and shows `/session-expired`; after
sign-in the page restores the draft of the same member (`L2-116`).

![Sequence diagram for expiring a session and restoring the draft](diagrams/sequence-session-expiry.png)

### Behaviour — sign out of the current session

The dialog confirms first. `DELETE /api/session` passes the anti-CSRF check
(`L2-135`) and deletes only the current session, and the member lands on
`/welcome` (`L2-011`).

![Sequence diagram for signing out of the current session](diagrams/sequence-sign-out.png)

### Behaviour — end all other sessions

The account page shows the count of other sessions and, on request, deletes
every session of the member except the current one (`L2-011`).

![Sequence diagram for ending all other sessions](diagrams/sequence-end-other-sessions.png)
