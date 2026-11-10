# 0006. Session and navigation endpoints before sign-in exists

## Status

Accepted, 10 November 2026.

## Context

The site chrome differs for a visitor and a member, and shows a member's unread counts. Journey 1
builds the chrome, but joining, signing in, messaging and notifications are later journeys. Two
designs disagreed on where the unread counts come from (`GET /api/session` or
`GET /api/me/navigation`).

## Decision

- `GET /api/session` is anonymous and says whether the caller is signed in, with the member's
  first name, display name and initials taken from the session's claims.
- `GET /api/me/navigation` requires a session and returns the `NavigationSummary`: unread
  conversations, unread notifications, new requests and whether the member owns a listing. Until
  the features that own those facts exist, it returns zero and false.
- The API registers cookie authentication as its default scheme and answers `401` or `403`
  instead of redirecting. The sign-in journey adds the endpoint that issues the cookie.
- The Playwright suite supplies a member by answering those two requests in the browser. Backend
  tests use a test authentication scheme.
- Entries of the chrome that lead to screens of later journeys (messages, notifications, account,
  join, sign in, search, the policy pages) are real links. Until those screens exist they reach
  the not-found page.

## Consequences

- No one can be a member in a running stack until the sign-in journey lands; the member chrome is
  proven by tests only.
- The sign-in journey must replace the browser-side session in `e2e/fixtures/jb-test.ts` with a
  real sign-in.
- Unread counts are not pushed yet: `L2-065` criterion 4 waits for the real-time hub.
