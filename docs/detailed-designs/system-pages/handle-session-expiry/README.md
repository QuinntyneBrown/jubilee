# Handle session expiry

## Overview

Jubilee keeps sessions on the server. A session lasts up to 30 days when "Keep
me signed in" is ticked, ends after 12 hours without activity otherwise, and
ends when the password changes (`L2-010`). A member can therefore be signed out
in the middle of writing a message or filling in a form. This feature makes that
moment harmless: the work in progress is kept, the member is told what happened,
and after sign-in the member returns to the same page with the draft restored.

*Draft* — field values of a form or message that the member has entered and not
yet sent. *Return URL* — address of the page the member was on when the session
ended.

The slice is mostly client-side. `Jubilee API` contributes one precise signal: a
401 response that states the session ended. `Jubilee Web` reacts to that signal
in one place, an HTTP interceptor, so every form in the product gains the
behaviour by registering as a draft source. The outgoing message queue of the
`Jubilee service worker` (`L2-119`–`L2-122`) is a separate mechanism for
connectivity loss and is not part of this slice.

## Description

- **`SessionAuthenticationMiddleware`** — validates the session cookie on each
  API request. When the session is missing or `Session.IsExpired` is true, it
  returns HTTP 401 as `ProblemDetails` with the code `SESSION_EXPIRED`. A
  request that never carried a session receives 401 without that code.
- **`Session`** — server-side record in the `Cache`. `IsExpired` is true 30 days
  after sign-in, or after 12 hours without activity when `KeepSignedIn` is
  false. `SessionStore.EndAllFor` ends every session of a member when the
  password changes.
- **`SessionExpiryInterceptor`** — Angular HTTP interceptor. On a 401 with
  `SESSION_EXPIRED` it asks `DraftRegistry` for the drafts of the current page,
  saves them through `DraftStore`, stores the current URL in
  `ReturnUrlService`, clears `SessionService`, and navigates to
  `/session-expired`. It handles concurrent 401 responses once.
- **`DraftSource`** — TypeScript interface with `key`, `snapshot()` and
  `restore(payload)`. Each form or message composer that holds unsent input
  implements it.
- **`FormDraftDirective`** — directive that implements `DraftSource` for a
  reactive form. It registers with `DraftRegistry` when the form appears and,
  on initialisation, asks `DraftStore` for a draft to restore. Password fields
  and file inputs are excluded from the snapshot.
- **`DraftRegistry`** — service that holds the draft sources of the current page
  and returns their snapshots as `Draft` records.
- **`DraftStore`** — service that persists `Draft` records in browser storage,
  keyed by member, route and form key. `take` returns and removes a draft, so a
  draft is restored once. `clearFor` removes drafts when a different member
  signs in on the same browser. Drafts live in `localStorage` of the device
  and are kept for 30 days (ADR 0013); the first form that holds drafts arrives with the messaging journey.
- **`ReturnUrlService`** — remembers the return URL and accepts only same-origin
  paths when it is read back.
- **`SessionExpiredPage`** — Angular page at `/session-expired`. It shows
  "You've been signed out. For your safety we sign you out after 30 days, or
  when your password changes." and "Sign in".
- **`SignInPage`** — after a successful sign-in it reads the return URL and
  navigates to it; the forms on that page restore their drafts.
- **`AuthController`** and **`SignInCommandHandler`** — `POST /api/auth/sign-in`
  creates a `Session` with a new identifier through `SessionStore`, so the
  expired identifier is never reused.

## Requirements

The feature realizes the following level-2 (L2) requirements. Each L2
requirement refines a level-1 (L1) requirement, cited by identifier.

| L2 ID | Refines (L1) | Requirement |
|-------|--------------|-------------|
| `L2-116` | `L1-016` | When an API call returns 401 because the session ended, the application shall save any draft in the current form, navigate to `/session-expired` and, after sign-in, return to the same page with the draft restored. |
| `L2-010` | `L1-001` | Sessions shall be server-side, shall last up to 30 days when "Keep me signed in" is ticked, shall end after 12 hours without activity otherwise, and shall end when the password changes. The system shall send a member whose session has ended to `/session-expired`, shall restore an unsent message or form draft after the next sign-in, and shall issue a new session identifier at each sign-in. |

## Diagrams

### System context

The member is signed out by Jubilee and signs in again, through Jubilee's own
form or through Google Identity.

![C4 system context for handling session expiry](diagrams/c4-context.png)

### Containers

`Jubilee API` reads sessions from the `Cache` and answers 401 when one has
ended. `Jubilee Web` keeps the draft in the browser and restores it after
sign-in.

![C4 container view for handling session expiry](diagrams/c4-container.png)

### Components

`SessionExpiryInterceptor` coordinates `DraftRegistry`, `DraftStore` and
`ReturnUrlService` before it navigates to `SessionExpiredPage`.
`FormDraftDirective` both supplies and restores the draft.

![C4 component view for handling session expiry](diagrams/c4-component.png)

### Class structure

`FormDraftDirective` realises `DraftSource`; `DraftRegistry` aggregates draft
sources and `DraftStore` aggregates `Draft` records. On the server,
`SessionStore` stores `Session`, which owns the lifetime rules.

![Class diagram for handling session expiry](diagrams/class-structure.png)

### Behaviour — save the draft when the session ends

The middleware answers 401 with `SESSION_EXPIRED`; the interceptor saves the
drafts and the return URL, then shows `/session-expired`.

![Sequence diagram for saving the draft when the session ends](diagrams/sequence-expire-and-save-draft.png)

### Behaviour — sign in and restore the draft

Sign-in issues a new session identifier. The member returns to the remembered
page, where the form takes its draft from `DraftStore`.

![Sequence diagram for signing in and restoring the draft](diagrams/sequence-sign-in-and-restore.png)
