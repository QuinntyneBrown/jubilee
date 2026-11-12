# 0045. Finish sign in and out: drafts kept on the device, the action carried in the return path, the `__Host-` cookie and no cross-origin allowlist

## Status

Accepted, 12 November 2026. Completes ADR 0013 (server-side sessions), which deferred the draft
store and the `__Host-` prefix, and replaces its last decision: the sign-in prompt carries the
started action in the return path, and `PendingActionService` keeps only an action that has no
address. Applies ADR 0009 (tests without a backend or database) and ADR 0035 (presentation in the
components library).

## Context

Journey 5 was recorded at 76%. Six things were left: no draft was kept when a session ended
(`L2-010` AC4, `L2-011` AC3, `L2-116`), the account page could not end the other sessions
(`L2-011` AC4), the session cookie had no `__Host-` prefix (`L2-135` AC1), nothing said how the API
treats another origin (`L2-135` AC3), and the designs named a `PendingActionService.resume`, a
`ReturnUrlService` and cache-backed stores that were never built.

The designs describe drafts for reactive forms. The app has none: every form is a `<form>` of named
native controls bound to signals with `ngModel`.

## Decision

- **A draft is the named controls of a form, kept in `localStorage`.** `FormDraftDirective`
  (`jbDraft`, on a `<form>`) is a `DraftSource`: its snapshot is the value of every named control
  except passwords, files, hidden fields and buttons, and its restore writes the values back and
  dispatches the browser's own `input` and `change` events, so the page's signals follow as if the
  member had typed. A source that is not a form (the message composer) registers a `DraftSource`
  of its own. `DraftRegistry` holds the sources of the page on screen; `DraftStore` keeps what they
  return.
- **Drafts are saved at two moments, not as the member types:** when the API answers 401
  `SESSION_EXPIRED` (the interceptor, before it leaves the page) and when the member confirms
  "Sign out". A form with nothing typed leaves no draft.
- **A draft is keyed by member, address and form.** The member is a 53-bit hash of the e-mail
  address the session reports, so the device keeps no address in clear. `take` gives a draft once,
  to its own member, and removes it. When a different member is signed in on the device, every
  other member's drafts are removed. A draft older than 30 days is dropped. Drafts never reach the
  server.
- **A restored draft is announced by a toast**, "We kept what you typed": one component the app
  already has, so no form needs a state of its own. Nothing is sent without a press.
- **The listing-a-business wizard is not a draft source.** Its text is saved to the server as the
  owner goes (ADR 0018) and comes back from there. The password, e-mail-change and delete-account
  dialogs are not sources either: all they hold is a password.
- **The started action travels in the return path.** Every action that opens a dialog has an
  address (`/b/{slug}/message`, `/book`, `/quote`, `/request`, `/b/{slug}/p/{product}/request`),
  and "Save" is `?save=1` on the listing or product. The sign-in prompt passes that address as
  `returnUrl`; after sign-in or join the page at that address opens the dialog or saves the item.
  `PendingActionService` remains for the one action with no address, "Tell me when it’s back".
  `sanitiseReturnUrl` accepts same-origin paths only; there is no `ReturnUrlService`.
- **"Sign out of other devices" is a row of the account page and a dialog of its own**,
  `SignOutOthersDialog`. It is offered only when `otherSessionCount` is above zero. The count is
  re-read from `GET /api/session` after the request, never assumed.
- **The session-expired page opens once.** The interceptor acts only while the app still holds a
  member; the first refusal clears the member, so later refusals of the same moment do nothing.
- **The member cookie is `__Host-jubilee.session`, `Secure` always.** Browsers refuse a `__Host-`
  cookie over plain HTTP, and the app and the e2e API run on `http://localhost` on a developer's
  machine, so the Development environment alone issues `jubilee.session` with `Secure` following
  the request. `Session:HostPrefix` overrides the default either way; the API tests set it to
  prove the prefix.
- **The API has no CORS allowlist, because it has no cross-origin caller.** The app is served with
  the API; the marketing site and the admin application forward `/api` from their own hosts
  (ADR 0040, ADR 0044). No CORS middleware is registered, so no answer carries an
  `Access-Control-Allow-*` header and a browser denies every cross-origin read and every
  preflighted request. A cross-origin state change that needs no preflight is refused by the
  anti-CSRF token and by `SameSite=Lax`.

## Consequences

- The first deployment after this change signs every member out once: the old `jubilee.session`
  cookie is no longer read. Jubilee has not launched, so no member is affected.
- A third party that should call the API from a browser needs an allowlist and a new record.
- A draft restores what a native control holds. Photos chosen for a message, and state a form keeps
  outside its controls, are not restored; the member chooses them again.
- A draft is saved only if the page is on screen when the session ends or the member signs out.
  Text typed in a tab that is then closed is not kept.
- The hash that names a draft's member is not a secret; it keeps the address out of sight, it does
  not protect the text. The text is as private as the device.
